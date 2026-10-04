//Configurazione globale di axios. 
//Serve per indicare l'URL base per le chiamate API e per aggiungere ad ogni richiesta il token
import axios from 'axios'
//prefisso globale per tutti gli URL delle richieste
axios.defaults.baseURL = '/api/v1'
//Interceptor che interviene prima che ogni richiesta parta verso il backend
//config contiene tutte le informazioni della richiesta
axios.interceptors.request.use((config) => {
    //recupero del token dal local Storage
    const token = localStorage.getItem('token')
    if (token)
        //Aggiunta del token nell'Authorization Header della richiesta
        config.headers.Authorization = `Bearer ${token}`
    return config
},
    //funzione che gestisce i casi in cui la generazione della richiesta fallisce
    //restituisce una promise rifiutata in modo da attivare il blocco catch
    (error) => {
        return Promise.reject(error)
    })

// Interceptor che interviene sulle risposte dal backend
axios.interceptors.response.use(
    (response) => {
        // Se la richiesta va a buon fine, restituiamo i dati normalmente
        return response;
    },
    (error) => {
        // Se il backend risponde con 401 per rotte protette (token mancante, non valido o scaduto)
        // ! Evitiamo il reindirizzamento forzato se il 401 proviene dalla richiesta di login stessa (credenziali errate)
        const isAuthLogin = error.config?.url?.includes('/auth/login');

        if (error.response && error.response.status === 401 && !isAuthLogin) {
            console.error("Sessione non valida o scaduta. Reindirizzamento al login.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Forziamo il riavvio dell'app sulla pagina di login solo se non siamo già sulla pagina di login
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axios