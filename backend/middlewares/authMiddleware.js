const jwt = require('jsonwebtoken')

// * MIDDLEWARE DI AUTENTICAZIONE JWT ---------------------------------------------------------------------------------------------------------
// Funzione da chiamare prima delle rotte protette per verificare l'integrità e la validità dei token JWT inviati dal client nell'Authorization Header.
function verifyToken(req, res, next) {
    let token = null
    const authHeader = req.headers.authorization

    // Controlliamo se l'authorization Header esiste e inizia con il prefisso canonico "Bearer "
    if (authHeader && authHeader.startsWith("Bearer ")) {
        // Estraiamo il token rimuovendo la parola "Bearer "
        token = authHeader.split(" ")[1]
    }

    // Se il token non è presente, blocchiamo immediatamente la richiesta con HTTP 401 (Unauthorized)
    if (!token) {
        return res.status(401).json({ message: 'Token mancante', code: 'TOKEN_MISSING' })
    }

    try {
        // ! SICUREZZA POTENZIATA:
        // 1. Verifichiamo la firma del token usando il secret del server.
        // 2. Forziamo esplicitamente l'algoritmo HS256 tramite l'opzione { algorithms: ['HS256'] }
        //    per impedire attacchi di manomissione o confusione dell'algoritmo (es. attacco "None algorithm").
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

        // Nella richiesta aggiungiamo sia l'ID dell'utente sia il suo RUOLO ('user' o 'admin')
        // In questo modo i controller successivi sanno sia chi ha fatto la richiesta sia quali permessi possiede.
        req.user = { 
            id: decoded.userId, 
            role: decoded.role || 'user' 
        }

        next()
    } catch (error) {
        // ! GESTIONE MIRATA DEGLI ERRORI:
        // Distinguiamo se il token è semplicemente scaduto oppure se è stato alterato/manomesso.
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Sessione scaduta: effettua nuovamente il login', 
                code: 'TOKEN_EXPIRED' 
            })
        }

        // Token non valido, firma non corrispondente o token malformato
        return res.status(401).json({ 
            message: 'Token non valido o manomesso', 
            code: 'INVALID_TOKEN' 
        })
    }
}

// * MIDDLEWARE DI AUTORIZZAZIONE BASATO SUI RUOLI (RBAC) ---------------------------------------------------------------------------------------
// Funzione di ordine superiore che accetta uno o più ruoli consentiti (es. requireRole('admin')).
// Ritorna un middleware standard Express che verifica se l'utente loggato possiede uno dei ruoli richiesti.
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        // Se req.user non esiste (verifyToken non è stato eseguito prima) o il ruolo non è presente tra quelli ammessi
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'Accesso negato: privilegi insufficienti per eseguire questa operazione',
                code: 'FORBIDDEN'
            })
        }
        // L'utente ha i privilegi richiesti, procediamo al prossimo middleware o al controller
        next()
    }
}

// Esportiamo la funzione verifyToken come export predefinito per garantire piena retrocompatibilità
// con il codice esistente in server.js, ed esponiamo anche requireRole come proprietà nominata.
module.exports = verifyToken
module.exports.verifyToken = verifyToken
module.exports.requireRole = requireRole
