// ====================================================================================================================
// CONTROLLER AUTENTICAZIONE (AuthController)
// ====================================================================================================================
// Questo controller gestisce l'intero ciclo di vita dell'identità utente:
// 1. Registrazione (creazione account con validazione e hashing password)
// 2. Login (verifica credenziali ed emissione coppia Access Token + Refresh Token)
// 3. Rinnovo Token / Refresh (prolungamento trasparente della sessione con Token Rotation)
// 4. Logout (revoca e rimozione del Refresh Token dal database)
// ====================================================================================================================

const crypto = require('crypto')
const User = require('../models/User')
const RefreshToken = require('../models/RefreshToken')
const jwt = require('jsonwebtoken')

// ====================================================================================================================
// FUNZIONI DI SUPPORTO (HELPER) PER LA GESTIONE DEI TOKEN
// ====================================================================================================================

/**
 * Restituisce la chiave segreta utilizzata per firmare e verificare i Refresh Token.
 * - In produzione è buona norma separare la chiave dell'Access Token da quella del Refresh Token (REFRESH_TOKEN_SECRET).
 * - Se non è stata definita esplicitamente nel file .env, viene generata una chiave di fallback derivata da JWT_SECRET.
 */
function getRefreshSecret() {
    return process.env.REFRESH_TOKEN_SECRET || `${process.env.JWT_SECRET}_refresh`;
}

/**
 * Genera un ACCESS TOKEN a breve scadenza (default: 15 minuti).
 * 
 * Perché una scadenza breve?
 * L'Access Token viene inviato ad OGNI singola chiamata API nell'header HTTP "Authorization: Bearer <token>".
 * Essendo stateless, il server non interroga il database per validarlo (massima velocità e scalabilità).
 * Se un malintenzionato riuscisse a intercettarlo, il token scadrà automaticamente dopo pochi minuti,
 * limitando enormemente la finestra di vulnerabilità.
 * 
 * Payload:
 * - userId: per identificare univocamente l'autore delle richieste
 * - role: per consentire al middleware RBAC di verificare i privilegi (es. 'admin' o 'user') senza query al DB
 */
function generateAccessToken(user) {
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
    return jwt.sign(
        { 
            userId: user._id, 
            role: user.role 
        }, 
        process.env.JWT_SECRET, 
        { 
            algorithm: 'HS256', // Forziamo esplicitamente l'algoritmo HS256 per impedire manomissioni
            expiresIn 
        }
    );
}

/**
 * Genera un REFRESH TOKEN a lunga scadenza (default: 7 giorni) e lo salva nel database MongoDB.
 * 
 * Perché includiamo 'jti: crypto.randomUUID()'?
 * Lo standard JWT (RFC 7519) definisce il claim 'jti' (JWT ID) come identificatore crittografico univoco.
 * Poiché i timestamp di creazione 'iat' nei JWT sono espressi in secondi interi, se due token venissero
 * generati nello stesso secondo (es. durante una rotazione rapida o chiamate multiple), avrebbero lo stesso identico
 * hash crittografico. L'UUID casuale garantisce che ogni singolo token generato sia al 100% unico nel database.
 * 
 * Il token viene poi salvato nella collezione 'RefreshToken' per tracciare la sessione e consentire la revoca.
 */
async function generateAndSaveRefreshToken(userId) {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const secret = getRefreshSecret();
    const token = jwt.sign(
        { 
            userId,
            jti: crypto.randomUUID() // Identificatore univoco casuale anti-collisione
        },
        secret,
        {
            algorithm: 'HS256',
            expiresIn
        }
    );

    // Decodifichiamo il token (senza riverificarlo) per leggere il claim standard 'exp' (timestamp Unix in secondi)
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    // Creiamo il record della sessione nel database
    const refreshTokenDoc = new RefreshToken({
        token,
        user: userId,
        expiresAt
    });

    await refreshTokenDoc.save();
    return token;
}

// ====================================================================================================================
// CONTROLLER: REGISTRAZIONE NUOVO UTENTE
// ====================================================================================================================
// Estrae i dati dal frontend, verifica l'assenza di duplicati per email o username nel DB,
// istanzia il nuovo utente (con ruolo forzato a 'user' per sicurezza) e lo salva.
async function register(req, res) {
    try {
        const { email, username, password, instruments, genres } = req.body

        // 1. Validazione di base: verifichiamo che i campi indispensabili non siano vuoti o spazi bianchi
        if (!email || !username || !password || !email.trim() || !username.trim() || !password.trim()) {
            return res.status(400).json({ message: 'Email, username e password sono obbligatori' })
        }

        // 2. Controllo duplicati: cerchiamo se esiste già un utente con la stessa email O lo stesso username
        const userExist = await User.findOne({
            $or: [{ email: email.trim().toLowerCase() }, { username: username.trim() }]
        })

        if (userExist) {
            return res.status(400).json({ message: 'Email o Username già utilizzati' })
        }

        // 3. Creazione del nuovo documento utente
        // ! SICUREZZA FONDAMENTALE: Forziamo esplicitamente role: 'user'.
        // In questo modo, anche se un client malizioso provasse ad inviare { "role": "admin" } nel body,
        // non potrà mai auto-attribuirsi permessi di amministratore durante la registrazione.
        const newUser = new User({ 
            email: email.trim().toLowerCase(), 
            username: username.trim(), 
            password, // Verrà automaticamente hashata con bcrypt tramite l'hook pre('save') definito nel modello User
            instruments: instruments || [], 
            genres: genres || [],
            role: 'user' 
        })

        // 4. Salvataggio su MongoDB
        await newUser.save()

        // 5. Risposta HTTP 201 (Created) con i dati pubblici dell'utente registrato
        res.status(201).json({
            message: 'Utente registrato correttamente',
            user: {
                id: newUser._id,
                email: newUser.email,
                username: newUser.username,
                role: newUser.role,
                instruments: newUser.instruments,
                genres: newUser.genres
            }
        })

    } catch (error) {
        console.error('ERRORE REGISTRAZIONE:', error);
        res.status(500).json({ message: 'Errore nella registrazione utente' })
    }
}

// ====================================================================================================================
// CONTROLLER: LOGIN UTENTE & EMISSIONE DUAL-TOKEN
// ====================================================================================================================
// Verifica le credenziali (username e password criptata con bcrypt) e genera:
// 1. Access Token (15 minuti): per le chiamate API
// 2. Refresh Token (7 giorni): salvato nel DB per prolungare la sessione in modo silenzioso
async function login(req, res) {
    try {
        const { username, password } = req.body

        // 1. Validazione input
        if (!username || !password || !username.trim()) {
            return res.status(400).json({ message: 'Inserisci username e password' })
        }

        // 2. Ricerca utente nel DB
        const user = await User.findOne({ username: username.trim() })
        if (!user) {
            // Messaggio generico per evitare di rivelare se l'utente esiste o meno (Enumeration Attack prevention)
            return res.status(401).json({ message: 'Username o password errati' })
        }

        // 3. Confronto crittografico della password inserita con l'hash salvato nel database
        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({ message: 'Username o password errati' })
        }

        // 4. Generazione della coppia Dual-Token:
        // - accessToken: a breve durata (es. 15 minuti) per le richieste ordinarie
        // - refreshToken: a lunga durata (es. 7 giorni) memorizzato nel DB per il rinnovo automatico
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateAndSaveRefreshToken(user._id);

        // 5. Risposta al client:
        // NOTA: il campo 'token' viene mantenuto come alias di 'accessToken' per garantire retrocompatibilità
        // con eventuali componenti frontend legacy che leggevano data.token.
        res.json({
            token: accessToken,
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        })

    } catch (error) {
        console.error('ERRORE LOGIN:', error);
        res.status(500).json({ message: 'Errore durante il login' })
    }
}

// ====================================================================================================================
// CONTROLLER: RINNOVO ACCESS TOKEN (Silent Refresh con Token Rotation)
// ====================================================================================================================
// Quando l'Access Token dell'utente scade (dopo 15m), il frontend chiama automaticamente questo endpoint
// inviando il Refresh Token salvato.
//
// Pipeline di Sicurezza a 4 Fasi:
// Fase 1: Verifica presenza del token nella richiesta
// Fase 2: Verifica crittografica (firma valida e token non scaduto matematicamente)
// Fase 3: Verifica nel database (il token è ancora registrato? O è stato revocato da logout o admin?)
// Fase 4: Token Rotation (cancellazione del vecchio token ed emissione di una nuova coppia)
async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;

        // Fase 1: Controllo presenza
        if (!refreshToken) {
            return res.status(400).json({ 
                message: 'Refresh token mancante', 
                code: 'REFRESH_TOKEN_MISSING' 
            });
        }

        // Fase 2: Verifica crittografica della firma e della data di scadenza
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, getRefreshSecret(), { algorithms: ['HS256'] });
        } catch (err) {
            // Se il token è scaduto nel tempo (oltre i 7 giorni), lo rimuoviamo dal DB e notifichiamo il client
            if (err.name === 'TokenExpiredError') {
                await RefreshToken.deleteOne({ token: refreshToken });
                return res.status(401).json({ 
                    message: 'Sessione scaduta: effettua nuovamente il login', 
                    code: 'REFRESH_TOKEN_EXPIRED' 
                });
            }
            // Se la firma non corrisponde o il token è manomesso
            return res.status(401).json({ 
                message: 'Refresh token non valido', 
                code: 'REFRESH_TOKEN_INVALID' 
            });
        }

        // Fase 3: Controllo esistenza nel Database (Controllo Revoca)
        // Se un utente fa logout, il token viene cancellato dal DB. Se qualcuno tentasse di riutilizzare
        // un vecchio token già usato o revocato, qui viene bloccato!
        const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
        if (!tokenDoc) {
            return res.status(401).json({ 
                message: 'Refresh token non valido o revocato', 
                code: 'REFRESH_TOKEN_REVOKED' 
            });
        }

        // Fase 4: Verifica esistenza dell'utente associato nel DB
        const user = await User.findById(decoded.userId);
        if (!user) {
            await RefreshToken.deleteOne({ _id: tokenDoc._id });
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Fase 5: TOKEN ROTATION (Standard OAuth2 / IETF Best Practice)
        // Per evitare che un token rubato possa essere usato all'infinito:
        // 1. Eliminiamo subito il vecchio Refresh Token appena utilizzato
        // 2. Emettiamo un NUOVO Access Token e un NUOVO Refresh Token
        // In questo modo, ogni Refresh Token è "monouso" (single-use).
        await RefreshToken.deleteOne({ _id: tokenDoc._id });
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = await generateAndSaveRefreshToken(user._id);

        res.json({
            token: newAccessToken,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('ERRORE REFRESH TOKEN:', error);
        res.status(500).json({ message: 'Errore durante il rinnovo del token' });
    }
}

// ====================================================================================================================
// CONTROLLER: LOGOUT (Revoca Sessione)
// ====================================================================================================================
// Quando l'utente preme "Esci" dal profilo o dalla barra laterale, il client invia il suo Refresh Token.
// Il server lo cancella definitivamente da MongoDB, rendendo impossibile ottenere nuovi Access Token da quel dispositivo.
async function logout(req, res) {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            // Cancelliamo la sessione dal database MongoDB
            await RefreshToken.deleteOne({ token: refreshToken });
        }
        res.json({ message: 'Logout effettuato con successo' });
    } catch (error) {
        console.error('ERRORE LOGOUT:', error);
        res.status(500).json({ message: 'Errore durante il logout' });
    }
}

module.exports = {
    register,
    login,
    refreshToken,
    logout
}