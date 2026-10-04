// ====================================================================================================================
// CONFIGURAZIONE GLOBALE AXIOS & SILENT REFRESH INTERCEPTOR
// ====================================================================================================================
// Questo modulo centralizza tutte le chiamate HTTP dell'applicazione verso il backend.
//
// PROBLEMA RISOLTO (DISCONNESSIONE DOPO LA SCADENZA DEL TOKEN):
// In precedenza, quando il token JWT scadeva (dopo 2 ore), qualsiasi chiamata API riceveva un errore HTTP 401
// e l'utente veniva bruscamente reindirizzato al login, perdendo eventuali dati o interazioni in corso.
//
// SOLUZIONE ADOTTATA (SILENT REFRESH CON CODA DI RICHIESTE):
// 1. Ogni richiesta include l'Access Token (breve durata: 15m) nell'header 'Authorization: Bearer <token>'.
// 2. Se l'Access Token scade, il server risponde con HTTP 401.
// 3. L'interceptor di risposta intercetta questo errore PRIMA che raggiunga i componenti React.
// 4. In background, Axios chiama l'endpoint '/auth/refresh' inviando il Refresh Token (lunga durata: 7d).
// 5. Ricevuto il nuovo token, Axios riesegue automaticamente la richiesta originale fallita:
//    l'utente NON viene disconnesso e non si accorge di alcuna interruzione!
// ====================================================================================================================

import axios from 'axios'

// Prefisso globale di default per tutti gli endpoint REST del backend
axios.defaults.baseURL = '/api/v1'

// ====================================================================================================================
// 1. REQUEST INTERCEPTOR: Esecuzione PRIMA dell'invio di ogni chiamata HTTP
// ====================================================================================================================
// Ispeziona il localStorage: se è presente un Access Token salvato, lo inserisce
// automaticamente nell'intestazione Authorization secondo lo standard Bearer.
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// ====================================================================================================================
// GESTIONE DELLA CONCORRENZA: CODA DELLE RICHIESTE PENDENTI (Request Queue Pattern)
// ====================================================================================================================
// Perché serve una coda?
// Quando un utente apre una pagina complessa (es. la Home o una Chat), il browser invia più chiamate API
// quasi contemporaneamente (es. carica feed, carica profilo, carica chat non lette).
// Se l'Access Token è scaduto, TUTTE queste chiamate riceveranno 401 nello stesso millisecondo.
// Senza una coda, partirebbero 3 o 4 chiamate parallele a '/auth/refresh', provocando errori di concorrenza
// a causa della Token Rotation (il primo refresh invaliderebbe subito il token per gli altri!).
//
// Con questo pattern:
// - Solo la PRIMA chiamata attiva il refresh effettivo (isRefreshing = true).
// - Le altre richieste ricevono una Promise "in sospeso" e vengono parcheggiate nell'array 'failedQueue'.
// - Non appena il nuovo token arriva, 'processQueue' sblocca tutte le richieste parcheggiate,
//   rieseguendole tutte in parallelo con il nuovo Access Token!
// ====================================================================================================================

let isRefreshing = false
let failedQueue = []

/**
 * Risolve o rifiuta tutte le richieste parcheggiate nella coda 'failedQueue'
 * @param {Error|null} error - Eventuale errore se il refresh è fallito
 * @param {string|null} token - Il nuovo Access Token ottenuto con successo
 */
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

// ====================================================================================================================
// 2. RESPONSE INTERCEPTOR: Esecuzione alla RICEZIONE di ogni risposta dal backend
// ====================================================================================================================
axios.interceptors.response.use(
    // Caso A: La risposta ha avuto successo (status code 2xx) -> la restituiamo inalterata
    (response) => {
        return response
    },
    // Caso B: Si è verificato un errore HTTP -> gestiamo il possibile rinnovo trasparente del token
    async (error) => {
        const originalRequest = error.config

        // Se non c'è una risposta dal server o lo status non è 401 (Unauthorized), inoltriamo l'errore al chiamante
        if (!error.response || error.response.status !== 401 || !originalRequest) {
            return Promise.reject(error)
        }

        // ! CONTROLLO DI SICUREZZA ANTI-LOOP:
        // Evitiamo tentativi di refresh se l'errore 401 proviene già da rotte di autenticazione:
        // - /auth/login: credenziali errate (non c'è alcun token da rinnovare)
        // - /auth/register: registrazione fallita
        // - /auth/refresh: il Refresh Token stesso è scaduto o invalido (fermiamo il ciclo!)
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                               originalRequest.url?.includes('/auth/register') ||
                               originalRequest.url?.includes('/auth/refresh')

        if (isAuthEndpoint) {
            return Promise.reject(error)
        }

        // Se la richiesta originale era già stata ritentata una volta, non riproviamo ulteriormente per evitare loop
        if (originalRequest._retry) {
            return Promise.reject(error)
        }

        const refreshToken = localStorage.getItem('refreshToken')

        // Se non esiste alcun Refresh Token nel browser (l'utente non si è mai loggato o è anonimo):
        // ripuliamo la memoria locale e, se necessario, reindirizziamo alla pagina di login.
        if (!refreshToken) {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
            return Promise.reject(error)
        }

        // Se un'altra richiesta sta già eseguendo il refresh in questo istante:
        // non facciamo una seconda chiamata a /auth/refresh, ma mettiamo in coda la richiesta corrente.
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject })
            })
                .then((newToken) => {
                    // Quando la chiamata di refresh primaria si conclude con successo,
                    // aggiorniamo l'header di questa richiesta parcheggiata e la rieseguiamo
                    originalRequest.headers.Authorization = `Bearer ${newToken}`
                    return axios(originalRequest)
                })
                .catch((err) => {
                    return Promise.reject(err)
                })
        }

        // Contrassegniamo la richiesta corrente come ritentata e impostiamo il flag di refresh attivo
        originalRequest._retry = true
        isRefreshing = true

        try {
            // Chiamata al server per richiedere un nuovo Access Token usando il Refresh Token
            const res = await axios.post('/auth/refresh', { refreshToken })
            const newToken = res.data.token || res.data.accessToken
            const newRefreshToken = res.data.refreshToken

            // Aggiorniamo i token salvati nel localStorage
            if (newToken) {
                localStorage.setItem('token', newToken)
            }
            if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken)
            }

            // Sblocchiamo tutte le altre richieste rimaste in coda passandogli il nuovo Access Token
            processQueue(null, newToken)

            // Aggiorniamo l'header della richiesta originale e la rieseguiamo subito
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return axios(originalRequest)

        } catch (refreshError) {
            // Se anche il refresh fallisce (es. il Refresh Token è scaduto dopo 7 giorni o è stato revocato da un altro dispositivo):
            // La sessione è definitivamente terminata. Svuotiamo la coda con errore, puliamo i dati e mandiamo al login.
            processQueue(refreshError, null)
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')

            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
            return Promise.reject(refreshError)

        } finally {
            // In ogni caso (successo o fallimento), reimpostiamo il flag a false per le future chiamate
            isRefreshing = false
        }
    }
)

export default axios