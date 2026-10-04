// Importiamo il modello Mongoose 'User' per poter interagire con la collezione degli utenti nel database
const User = require('../models/User')
// Importiamo la libreria jsonwebtoken per poter generare un token per l'utente loggato
const jwt = require('jsonwebtoken')

// Questa funzione estrae i dati dal frontend, verifica che non ci siano duplicati 
// (email o username) nel database, crea un nuovo documento User e lo salva.
async function register(req, res) {
    try {
        // Estrazione delle variabili dall'oggetto req.body inviato dal frontend.
        const { email, username, password, instruments, genres } = req.body

        // Cerchiamo nel DB se esiste già un utente con questa email OPPURE questo username.
        const userExist = await User.findOne({
            $or: [{ email }, { username }]
        })

        // Se userExist contiene qualcosa (non è null), fermiamo l'esecuzione e restituiamo un errore 400 (Bad Request)
        if (userExist)
            return res.status(400).json({ message: 'Email o Username già utilizzati' })

        // Istanziamo un nuovo documento utente passando i dati ricevuti.
        // ! SICUREZZA: Forziamo esplicitamente role: 'user'.
        // In questo modo, anche se un utente malintenzionato tentasse di inviare "role": "admin"
        // nel body della richiesta HTTP, non potrà mai auto-assegnarsi privilegi amministrativi.
        const newUser = new User({ 
            email, 
            username, 
            password, 
            instruments, 
            genres,
            role: 'user' 
        })

        // Scriviamo fisicamente i dati su MongoDB.
        await newUser.save()

        // Restituiamo status 201 (Created) per confermare l'avvenuta creazione.
        // Includiamo anche il ruolo dell'utente appena registrato.
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
        // Se Mongoose fallisce catturiamo l'errore e restituiamo un 500 (Internal Server Error)
        res.status(500).json({ message: 'Errore nella registrazione utente', error })
    }
}

// Verifica le credenziali dell'utente, confronta la password criptata e, se tutto è corretto, genera un Token JWT valido per l'accesso alle rotte protette.
async function login(req, res) {
    try {
        // Recuperiamo username e password dal body della richiesta
        const { username, password } = req.body

        // Cerchiamo nel database un utente con l'username inserito
        const user = await User.findOne({ username })

        // Se l'utente non viene trovato nel database mandiamo la risposta con un messaggio generico
        if (!user) {
            return res.status(401).json({ message: 'Username o password errati' })
        }

        // confrontiamo le password con il metodo del modello User comparePassword
        const isMatch = await user.comparePassword(password)

        // Se le password non corrispondono mandiamo la risposta con un messaggio generico
        if (!isMatch) {
            return res.status(401).json({ message: 'Username o password errati' })
        }

        // ! SICUREZZA POTENZIATA DEL TOKEN JWT:
        // 1. Includiamo nel payload sia l'ID dell'utente che il suo RUOLO ('user' o 'admin').
        //    Questo permette al server di autorizzare le richieste senza dover interrogare il DB ad ogni chiamata.
        // 2. Specifichiamo l'algoritmo di firma crittografica 'HS256' in modo esplicito.
        // 3. La durata del token è configurabile da variabile d'ambiente (default: 2 ore).
        const token = jwt.sign(
            { 
                userId: user._id, 
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { 
                algorithm: 'HS256',
                expiresIn: process.env.JWT_EXPIRES_IN || '2h' 
            }
        )

        // inviamo la risposta positiva che contiene il token e le informazioni essenziali dell'utente (compreso il ruolo)
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        })

        // Se c'è un problema tecnico rispondiamo con l'errore
    } catch (error) {
        console.log('ERRORE LOGIN:', error);
        res.status(500).json({ message: 'Errore nel Login', error })
    }
}

module.exports = {
    register,
    login
}