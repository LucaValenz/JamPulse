// ! Questo file contiene il contesto di autenticazione per l'applicazione React. Fornisce lo stato dell'utente autenticato e le funzioni per gestire il login e il logout.
// ! Ad esempio, la sidebar e la navbar possono utilizzare questo contesto per mostrare informazioni sull'utente autenticato o per nascondere/mostrare determinate funzionalità in base allo stato di autenticazione.

import { createContext, useContext, useState } from "react";
import { login as loginService, register as registerService } from "../services/authServices";

// 1. Creiamo il Context (il "contenitore vuoto")
const AuthContext = createContext(null);

// 2. Il Provider è il componente che "avvolge" l'app e mette i dati a disposizione
export function AuthProvider({ children }) {
    // Leggiamo subito dal localStorage se c'era già una sessione
    const [user, setUser] = useState(() => { // ! useState serve per creare uno stato locale per l'utente autenticato. Inizialmente, cerca di leggere l'utente dal localStorage. Se trova un utente salvato, lo imposta come stato iniziale; altrimenti, imposta lo stato iniziale a null.
        const saved = localStorage.getItem('user'); // ! localStorage.getItem('user') legge dal localStorage del browser la chiave 'user'.
        return saved ? JSON.parse(saved) : null; // ! Se trova un utente salvato, lo converte da stringa JSON a oggetto JavaScript usando JSON.parse(saved). Se non trova nulla, ritorna null.
    });
    const [token, setToken] = useState(() => localStorage.getItem('token')); // ! useState serve per creare uno stato locale per il token di autenticazione. Inizialmente, cerca di leggere il token dal localStorage. Se trova un token salvato, lo imposta come stato iniziale; altrimenti, imposta lo stato iniziale a null.

    // Funzioni per gestire il login, il logout e la registrazione

    async function login(credentials) {
        const data = await loginService(credentials); // chiama il service che fa la POST
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // il token lo salva già authServices.js
        return data;
    }

    async function register(userData) {
        return await registerService(userData);
    }

    function logout() {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Proprietà di comodo: true se l'utente loggato è un amministratore
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, isAdmin, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Hook custom per usare il context in modo comodo
export function useAuth() {
    return useContext(AuthContext);
}