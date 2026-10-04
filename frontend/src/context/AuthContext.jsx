// ====================================================================================================================
// CONTESTO GLOBALE DI AUTENTICAZIONE (AuthContext.jsx)
// ====================================================================================================================
// Questo file fornisce uno stato condiviso a tutta l'applicazione React riguardante:
// - L'utente attualmente autenticato ('user')
// - Il token di sessione attivo ('token')
// - Lo stato di amministratore ('isAdmin')
// - Le funzioni per eseguire Login, Logout e Registrazione
//
// Grazie al Context API di React, qualsiasi componente dell'albero (es. Sidebar, Navbar, pagine protette)
// può accedere a queste informazioni semplicemente invocando il custom hook 'useAuth()'.
// ====================================================================================================================

import { createContext, useContext, useState } from "react";
import { login as loginService, register as registerService, logoutService } from "../services/authServices";

// 1. Creazione dell'oggetto Context (il contenitore globale dei dati)
const AuthContext = createContext(null);

// 2. AuthProvider: componente Provider che avvolge l'intera applicazione in App.jsx
export function AuthProvider({ children }) {
    // Inizializzazione dello stato 'user':
    // All'avvio dell'app (o dopo un refresh della pagina F5), controlliamo subito se nel localStorage
    // era già presente un profilo utente salvato, così da ripristinare la sessione all'istante.
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    // Inizializzazione dello stato 'token' leggendo l'Access Token dal localStorage
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    /**
     * Esegue il login tramite authServices.
     * Salva l'utente nello stato React e nel localStorage per renderlo persistente tra i reload di pagina.
     */
    async function login(credentials) {
        const data = await loginService(credentials);
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    }

    /**
     * Esegue la registrazione di un nuovo utente delegando la chiamata API a authServices.
     */
    async function register(userData) {
        return await registerService(userData);
    }

    /**
     * Esegue il logout completo:
     * 1. Resetta lo stato locale di React (user e token a null).
     * 2. Invoca logoutService(), che revoca il Refresh Token su MongoDB e ripulisce il localStorage.
     */
    async function logout() {
        setUser(null);
        setToken(null);
        await logoutService();
    }

    // Proprietà di comodo (booleana): true se l'utente possiede il ruolo speciale 'admin'
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, isAdmin, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Custom Hook per consumare il contesto facilmente: const { user, logout, isAdmin } = useAuth();
export function useAuth() {
    return useContext(AuthContext);
}