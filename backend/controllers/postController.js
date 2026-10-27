const Post = require('../models/Post')
const User = require('../models/User')
// La gestione dei file resta separata dalla persistenza dei documenti MongoDB.
const { savePostImage, removePostImage } = require('../services/postImages')

// GET /posts
// Restituisce tutti i post, dal più recente al più vecchio.
// Per ogni post "popola" i dati dell'autore: invece di restituire solo l'ID dell'utente
// (che è quello che c'è fisicamente nel DB), Mongoose va a cercare il documento User
// corrispondente e lo incorpora nella risposta.
// Questo ci permette di mostrare username e avatar dell'autore direttamente nella card
// senza fare una seconda chiamata al backend per ogni post.
async function getPosts(req, res) {
    try {
        const posts = await Post.find({})
            // .populate(campo, campi_da_includere) sostituisce l'ObjectId con il documento reale.
            // 'username' è l'unico campo dell'utente che ci serve nel feed (non la password, non i followers ecc.)
            .populate('userID', 'username')
            // .sort({ createdAt: -1 }) ordina dal più recente: -1 = decrescente, 1 = crescente.
            // createdAt è aggiunto automaticamente da Mongoose grazie a { timestamps: true } nel modello.
            .sort({ createdAt: -1 })

        res.json(posts)
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei post', error })
    }
}

// GET /posts/:id
// Restituisce un singolo post tramite il suo ID (letto da req.params.id).
// Anche qui popoliamo l'autore, perché nella pagina di dettaglio mostriamo username e avatar.
async function getPostById(req, res) {
    try {
        const post = await Post.findById(req.params.id).populate('userID', 'username')

        if (!post)
            return res.status(404).json({ message: 'Post non trovato' })

        res.json(post)
    } catch (error) {
        // Se l'ID passato non è un ObjectId MongoDB valido
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID post non valido' })
        }
        console.error('ERRORE GET POST BY ID:', error)
        res.status(500).json({ message: 'Errore nel recupero del post' })
    }
}

// POST /posts
// Crea un nuovo post per l'utente loggato.
// L'ID dell'autore lo prendiamo da req.user.id (aggiunto dal middleware JWT),
// così l'utente non può fingere di essere qualcun altro.
async function createPost(req, res) {
    // Conserviamo il percorso per poter annullare l'upload se MongoDB fallisce.
    let uploadedMedia;
    try {
        // express.json gestisce i client JSON; Multer popola body e file nei multipart.
        const { content, media } = req.body || {}

        // Validazione essenziale: il contenuto del post non può essere vuoto
        if (typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ message: 'Il contenuto del post è obbligatorio' })
        }

        // Controlliamo il tipo prima di usare trim: il body può essere costruito
        // anche da un client diverso dal nostro frontend.
        if (media !== undefined && typeof media !== 'string') {
            return res.status(400).json({ message: 'URL immagine non valido' })
        }
        // File e URL sono alternative: rifiutiamo richieste con entrambe le fonti.
        if (req.file && media?.trim()) {
            return res.status(400).json({ message: 'Scegli un file oppure un URL immagine.' })
        }
        // Scriviamo su disco solo dopo aver validato i campi testuali.
        if (req.file) uploadedMedia = await savePostImage(req.file)

        // Creiamo il documento Post con i dati del body e l'ID dell'autore dal token
        const newPost = new Post({
            userID: req.user.id,
            content: content.trim(),
            // Un unico campo mantiene compatibili feed, dettaglio e post solo testuali.
            media: uploadedMedia || media?.trim() || ''
        })

        await newPost.save()

        res.status(201).json(newPost)
    } catch (error) {
        // File e documento non condividono una transazione: compensiamo un errore
        // di salvataggio eliminando l'immagine appena creata.
        if (uploadedMedia) await removePostImage(uploadedMedia)
        console.error('ERRORE CREATE POST:', error)
        // Esporremo il motivo della validazione, ma non i dettagli degli errori interni.
        res.status(error.status || 500).json({ message: error.status === 400 ? error.message : 'Errore nella creazione del post' })
    }
}

// PUT /posts/:id
// Aggiorna il contenuto di un post esistente.
// Prima di modificare verifichiamo che il post appartenga all'utente loggato:
// non vogliamo che un utente possa modificare i post degli altri.
async function updatePost(req, res) {
    try {
        const { content, media } = req.body

        // Validazione contenuto
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Il contenuto del post non può essere vuoto' })
        }

        // Cerchiamo prima il post per controllare chi è l'autore
        const post = await Post.findById(req.params.id)

        if (!post)
            return res.status(404).json({ message: 'Post non trovato' })

        // .toString() è necessario perché post.userID è un ObjectId di Mongoose,
        // non una stringa, quindi il confronto con === fallirebbe senza conversione.
        if (post.userID.toString() !== req.user.id)
            return res.status(403).json({ message: 'Non sei autorizzato a modificare questo post' })

        // Aggiorniamo solo i campi modificabili, non l'autore
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { content: content.trim(), media },
            { new: true } // restituisce il documento aggiornato, non quello vecchio
        )

        res.json(updatedPost)
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID post non valido' })
        }
        console.error('ERRORE UPDATE POST:', error)
        res.status(500).json({ message: 'Errore nella modifica del post' })
    }
}

// DELETE /posts/:id
// Elimina un post. 
// L'operazione è consentita se l'utente è l'autore del post OPPURE se ha il ruolo di 'admin' (moderazione contenuti).
async function deletePost(req, res) {
    try {
        const post = await Post.findById(req.params.id)

        if (!post)
            return res.status(404).json({ message: 'Post non trovato' })

        // Verifichiamo se l'utente loggato è l'autore del post oppure un amministratore
        const isAuthor = post.userID.toString() === req.user.id
        const isAdmin = req.user.role === 'admin'

        if (!isAuthor && !isAdmin)
            return res.status(403).json({ message: 'Non sei autorizzato a eliminare questo post' })

        await Post.findByIdAndDelete(req.params.id)
        // Dopo la cancellazione controlliamo se altri post riutilizzano l'immagine.
        // removePostImage ignora gli URL esterni e rimuove solo i nostri file locali.
        if (!await Post.exists({ media: post.media })) await removePostImage(post.media)

        res.json({ message: 'Post eliminato con successo' })
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID post non valido' })
        }
        console.error('ERRORE DELETE POST:', error)
        res.status(500).json({ message: 'Errore nell\'eliminazione del post' })
    }
}

// POST /posts/:id/like
// Aggiunge o rimuove un like (toggle): se l'utente ha già messo like lo toglie, altrimenti lo aggiunge.
// Per implementarlo dobbiamo prima aggiungere il campo "likes" al modello Post.
// Usiamo la stessa logica di follow/unfollow: $addToSet per aggiungere, $pull per rimuovere.
async function toggleLike(req, res) {
    try {
        const post = await Post.findById(req.params.id)

        if (!post)
            return res.status(404).json({ message: 'Post non trovato' })

        // Controlliamo se l'utente loggato ha già messo like.
        // post.likes è l'array degli ID degli utenti che hanno messo like.
        // .some() restituisce true se almeno un ID nell'array corrisponde all'utente loggato.
        const alreadyLiked = post.likes.some(
            id => id.toString() === req.user.id
        )

        if (alreadyLiked) {
            // Ha già messo like → lo togliamo con $pull
            await Post.findByIdAndUpdate(req.params.id, {
                $pull: { likes: req.user.id }
            })
            return res.json({ message: 'Like rimosso', liked: false })
        } else {
            // Non ha ancora messo like → lo aggiungiamo con $addToSet (evita duplicati)
            await Post.findByIdAndUpdate(req.params.id, {
                $addToSet: { likes: req.user.id }
            })
            return res.json({ message: 'Like aggiunto', liked: true })
        }
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID post non valido' })
        }
        console.error('ERRORE TOGGLE LIKE:', error)
        res.status(500).json({ message: 'Errore nel like' })
    }
}

module.exports = {
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    createPost,
    toggleLike
}
