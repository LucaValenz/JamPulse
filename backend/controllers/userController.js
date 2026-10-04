// Importiamo i modelli che ci servono per interagire con MongoDB
const User = require('../models/User')
const Post = require('../models/Post')

// GET /users/me
// Restituisce il profilo completo dell'utente attualmente loggato.
// Sappiamo chi è l'utente loggato grazie a req.user.id, che viene
// aggiunto dal middleware authMiddleware dopo aver verificato il token JWT.
async function getLoggedUser(req, res) {
    try {
        // Cerchiamo l'utente per ID e usiamo .select('-password') per
        // escludere la password dalla risposta (non va mai mandata al client)
        const user = await User.findById(req.user.id).select('-password')

        if (!user)
            return res.status(404).json({ message: 'Utente non trovato' })

        res.json(user) // Rispondiamo con i dati dell'utente loggato
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero del profilo', error })
    }
}

// GET /users/me/following
// Restituisce la lista completa degli utenti che l'utente loggato sta seguendo.
// Ogni utente viene "popolato" per avere username e _id pronti per il frontend.
async function getFollowing(req, res) {
    try {
        // Cerchiamo l'utente loggato e popoliamo l'array "following":
        // invece di avere solo array di ID, avremo array di oggetti utente
        // con i campi username e _id (escludiamo la password per sicurezza).
        const user = await User.findById(req.user.id)
            .populate('following', 'username _id')
            .select('following')

        if (!user)
            return res.status(404).json({ message: 'Utente non trovato' })

        // Restituiamo solo l'array dei following popolati
        res.json(user.following)
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei following', error })
    }
}

// PUT /users/me
// Aggiorna i campi del profilo dell'utente loggato.
// L'utente può modificare: bio, instruments, genres.
// NON permettiamo di cambiare username, email o password da questa rotta
// perché sono operazioni più delicate che richiederebbero controlli aggiuntivi.
async function updateProfile(req, res) {
    try {
        // Estraiamo solo i campi che vogliamo permettere di modificare.
        // Anche se il client mandasse altri campi (es. password), li ignoriamo.
        const { bio, instruments, genres } = req.body

        // findByIdAndUpdate cerca l'utente per ID e applica le modifiche.
        // { new: true } fa sì che venga restituito il documento AGGIORNATO
        // (di default restituirebbe quello vecchio, prima della modifica).
        // .select('-password') esclude la password dalla risposta.
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { bio, instruments, genres },
            { new: true }
        ).select('-password')

        if (!updatedUser)
            return res.status(404).json({ message: 'Utente non trovato' })

        res.json(updatedUser)
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'aggiornamento del profilo', error })
    }
}

// GET /users
// Restituisce la lista di tutti gli utenti (utile per la ricerca).
// Escludiamo la password da ogni utente per sicurezza.
async function getUsers(req, res) {
    try {
        // .find({}) senza filtri restituisce tutti i documenti della collezione.
        const users = await User.find({}).select('-password')
        res.json(users)
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero degli utenti', error })
    }
}

// GET /users/:id
// Restituisce il profilo pubblico di un utente specifico tramite il suo ID.
// L'ID viene letto da req.params.id, che Express popola automaticamente
// dalla parte dinamica dell'URL (es. /users/abc123 → req.params.id = "abc123").
async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id).select('-password')

        if (!user)
            return res.status(404).json({ message: 'Utente non trovato' })

        res.json(user)
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dell\'utente', error })
    }
}

// GET /users/:id/posts
// Restituisce tutti i post pubblicati da un utente specifico.
// Usiamo il modello Post invece di User perché i post non sono
// salvati dentro l'utente, ma come documenti separati con il campo userID.
async function getPosts(req, res) {
    try {
        // Cerchiamo tutti i post dove il campo userID corrisponde all'ID dell'utente
        const posts = await Post.find({ userID: req.params.id })
            // Popoliamo l'autore per avere username e ID corretti nel frontend
            .populate('userID', 'username')
            // Ordiniamo in modo decrescente (-1) per vedere prima i post più recenti
            .sort({ createdAt: -1 });
        res.json(posts)
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei post', error })
    }
}

// POST /users/:id/follow
// L'utente loggato inizia a seguire l'utente con l'ID specificato nell'URL.
// Dobbiamo aggiornare due documenti in modo coerente:
//   1. aggiungere l'utente loggato ai "followers" del target
//   2. aggiungere il target al "following" dell'utente loggato
async function follow(req, res) {
    try {
        const currentUserId = req.user.id       // chi sta seguendo
        const targetUserId = req.params.id       // chi viene seguito

        // Evitiamo che un utente segua se stesso
        if (currentUserId === targetUserId)
            return res.status(400).json({ message: 'Non puoi seguire te stesso' })

        // Verifichiamo che l'utente target esista
        const targetUser = await User.findById(targetUserId)
        if (!targetUser)
            return res.status(404).json({ message: 'Utente non trovato' })

        // Controlliamo che non stia già seguendo questo utente.
        // .toString() è necessario perché i valori nell'array sono ObjectId di Mongoose
        // (oggetti JS), non stringhe, quindi il confronto con === fallirebbe senza conversione.
        const alreadyFollowing = targetUser.followers.some(
            id => id.toString() === currentUserId
        )
        if (alreadyFollowing)
            return res.status(400).json({ message: 'Stai già seguendo questo utente' })

        // $addToSet aggiunge un elemento all'array SOLO se non è già presente,
        // evitando duplicati. È più sicuro di $push che aggiungerebbe sempre.
        await User.findByIdAndUpdate(targetUserId, {
            $addToSet: { followers: currentUserId }
        })
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: targetUserId }
        })

        res.json({ message: 'Ora stai seguendo questo utente' })
    } catch (error) {
        res.status(500).json({ message: 'Errore nel follow', error })
    }
}

// DELETE /users/:id/follow
// L'utente loggato smette di seguire l'utente con l'ID specificato.
// Speculare al follow: dobbiamo rimuovere gli ID da entrambi i documenti.
async function unfollow(req, res) {
    try {
        const currentUserId = req.user.id
        const targetUserId = req.params.id

        if (currentUserId === targetUserId)
            return res.status(400).json({ message: 'Non puoi smettere di seguire te stesso' })

        // $pull rimuove dall'array tutti gli elementi che corrispondono al valore indicato.
        // È l'operazione opposta di $addToSet.
        await User.findByIdAndUpdate(targetUserId, {
            $pull: { followers: currentUserId }
        })
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { following: targetUserId }
        })

        res.json({ message: 'Hai smesso di seguire questo utente' })
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'unfollow', error })
    }
}

// DELETE /users/:id (SOLO ADMIN)
// Permette a un amministratore di eliminare un profilo utente dalla piattaforma.
async function deleteUserByAdmin(req, res) {
    try {
        const targetUserId = req.params.id

        // Preveniamo che un amministratore elimini se stesso per sbaglio
        if (targetUserId === req.user.id) {
            return res.status(400).json({ message: 'Non puoi eliminare il tuo stesso account amministratore da qui' })
        }

        const userToDelete = await User.findById(targetUserId)
        if (!userToDelete) {
            return res.status(404).json({ message: 'Utente non trovato' })
        }

        await User.findByIdAndDelete(targetUserId)

        res.json({ message: `Utente ${userToDelete.username} eliminato con successo dall'amministratore` })
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'eliminazione dell\'utente', error })
    }
}

// PATCH /users/:id/role (SOLO ADMIN)
// Permette a un amministratore di modificare il ruolo di un utente (es. promuovere a 'admin' o declassare a 'user').
async function updateUserRole(req, res) {
    try {
        const targetUserId = req.params.id
        const { role } = req.body

        // Validazione dei ruoli consentiti
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Ruolo non valido. Valori ammessi: "user", "admin"' })
        }

        // Impediamo all'admin di declassare se stesso per evitare il blocco accidentale dei privilegi
        if (targetUserId === req.user.id) {
            return res.status(400).json({ message: 'Non puoi modificare il tuo stesso ruolo amministratore' })
        }

        const updatedUser = await User.findByIdAndUpdate(
            targetUserId,
            { role },
            { new: true }
        ).select('-password')

        if (!updatedUser) {
            return res.status(404).json({ message: 'Utente non trovato' })
        }

        res.json({ message: `Ruolo aggiornato a ${role}`, user: updatedUser })
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'aggiornamento del ruolo utente', error })
    }
}

module.exports = {
    getLoggedUser,
    updateProfile,
    getUsers,
    getUserById,
    getPosts,
    follow,
    unfollow,
    getFollowing,
    deleteUserByAdmin,
    updateUserRole
}