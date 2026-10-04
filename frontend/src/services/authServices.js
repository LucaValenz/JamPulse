// ====================================================================================================================
// SERVIZI DI AUTENTICAZIONE (authServices.js)
// ====================================================================================================================
// Questo modulo espone le funzioni helper per comunicare con gli endpoint di autenticazione del backend.
// Gestisce inoltre la persistenza locale dei token di sessione (token e refreshToken) nel localStorage.
// ====================================================================================================================

import axios from '../axios'

/**
 * Invia i dati di registrazione di un nuovo utente al backend.
 * @param {Object} userData - Oggetto contenente: { email, username, password, instruments, genres }
 * @returns {Promise<Object>} Risposta del server con i dati dell'utente creato
 */
export async function register(userData) {
    const response = await axios.post('/auth/register', userData)
    return response.data
}

/**
 * Effettua il login inviando username e password.
 * Se l'autenticazione ha successo, salva sia l'Access Token che il Refresh Token nel localStorage.
 * 
 * @param {Object} userData - Oggetto contenente: { username, password }
 * @returns {Promise<Object>} Risposta del server con { token, accessToken, refreshToken, user }
 */
export async function login(userData) {
    const response = await axios.post('/auth/login', userData)

    // Memorizziamo l'Access Token (utilizzato dall'interceptor di Axios per le chiamate autenticate)
    if (response.data.token) {
        localStorage.setItem('token', response.data.token)
    }

    // Memorizziamo il Refresh Token (utilizzato per rinnovare l'Access Token in background quando scade)
    if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken)
    }

    return response.data
}

/**
 * Richiede esplicitamente un nuovo Access Token inviando il Refresh Token al backend.
 * Nota: questa funzione è solitamente invocata automaticamente in background dall'interceptor di Axios,
 * ma può essere chiamata anche manualmente all'occorrenza.
 * 
 * @param {string} refreshToken - Il token di refresh attualmente salvato nel browser
 * @returns {Promise<Object>} Risposta del server contenente la nuova coppia di token
 */
export async function refreshTokenService(refreshToken) {
    const response = await axios.post('/auth/refresh', { refreshToken })

    if (response.data.token) {
        localStorage.setItem('token', response.data.token)
    }
    if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken)
    }

    return response.data
}

/**
 * Esegue il logout coordinato:
 * 1. Invia una chiamata POST al backend (/auth/logout) con il refreshToken per revocarlo dal database MongoDB.
 * 2. Ripulisce completamente il localStorage del browser (rimuovendo 'token', 'refreshToken' e 'user').
 * 
 * In caso di mancata connessione di rete o errore del server, il blocco 'finally' garantisce
 * che la sessione locale venga comunque ripulita per proteggere l'utente.
 */
export async function logoutService() {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
        if (refreshToken) {
            await axios.post('/auth/logout', { refreshToken })
        }
    } catch (err) {
        console.warn('Avviso: revoca server non riuscita, disconnessione completata in locale:', err)
    } finally {
        // Garantiamo la pulizia dei dati dal client in qualsiasi circostanza
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
    }
}