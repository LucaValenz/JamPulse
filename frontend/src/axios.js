// ====================================================================================================================
// CONFIGURAZIONE GLOBALE AXIOS & SILENT REFRESH INTERCEPTOR
// ====================================================================================================================
// Questo modulo centralizza tutte le chiamate HTTP dell'applicazione verso il backend.
//
// PROBLEMA RISOLTO (DISCONNESSIONE DOPO LA SCADENZA DEL TOKEN):
// In precedenza, quando il token JWT scadeva (dopo 2 ore), qualsiasi chiamata API riceveva un errore HTTP 401
// e l'utente veniva bruscamente reindirizzato al login, perdendo eventuali dati o interazioni in corso.
//
// SOLUZIONE ADOTTATA (SILENT REFRESH CONDIVISO):
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

// Una Promise condivisa coordina le richieste REST e i rinnovi richiesti dal socket.
let refreshPromise = null

export function notifySessionChanged() {
    window.dispatchEvent(new Event('session-changed'))
}

// REST e Socket.IO condividono una sola rotazione del refresh token.
export function refreshSession() {
    if (refreshPromise) return refreshPromise
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        notifySessionChanged()
        return Promise.reject(new Error('Sessione non disponibile'))
    }
    refreshPromise = axios.post('/auth/refresh', { refreshToken })
        .then(({ data }) => {
            if (localStorage.getItem('refreshToken') !== refreshToken) {
                throw new Error('La sessione e cambiata durante il rinnovo')
            }
            const token = data.token || data.accessToken
            if (!token) throw new Error('Access token mancante nella risposta')
            localStorage.setItem('token', token)
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
            notifySessionChanged()
            return token
        })
        .catch(error => {
            if ([401, 403].includes(error.response?.status) && localStorage.getItem('refreshToken') === refreshToken) {
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                notifySessionChanged()
            }
            throw error
        })
        .finally(() => { refreshPromise = null })
    return refreshPromise
}

axios.interceptors.response.use(response => response, async error => {
    const request = error.config
    if (error.response?.status !== 401 || !request || request._retry ||
        /\/auth\/(login|register|refresh|logout)/.test(request.url || '')) {
        return Promise.reject(error)
    }
    request._retry = true
    // Una risposta tardiva puo riferirsi al token precedente, gia rinnovato.
    const currentToken = localStorage.getItem('token')
    const token = currentToken && request.headers.Authorization !== 'Bearer ' + currentToken
        ? currentToken : await refreshSession()
    request.headers.Authorization = 'Bearer ' + token
    return axios(request)
})

export default axios
