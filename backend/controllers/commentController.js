// Importiamo il modello Comment per interagire con la collezione dei commenti nel database
const Comment = require('../models/Comment')

// GET /posts/:id/comments
// Restituisce tutti i commenti associati a un post specifico.
// L'ID del post viene letto dai parametri dinamici dell'URL.
async function getComments(req, res) {
    try {
        // Grazie a mergeParams: true nel router, possiamo leggere l'ID del post 
        // dall'URL padre
        const postId = req.params.id

        // Cerchiamo tutti i commenti che appartengono a questo postId.
        const comments = await Comment.find({ postId })
            // .populate sostituisce l'ID dell'autore con un oggetto contenente i suoi dati reali.
            // Chiediamo solo l'username per alleggerire la risposta inviata al client.
            .populate('authorId', 'username')
            // .sort ordina i risultati. { createdAt: 1 } significa ordine cronologico crescente 
            // (dal più vecchio al più nuovo, come nei classici feed di commenti).
            .sort({ createdAt: 1 }) 

        res.json(comments)
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei commenti', error })
    }
}

// POST /posts/:id/comments
// Aggiunge un nuovo commento a un post specifico.
// L'utente deve essere loggato (sappiamo chi è grazie a req.user.id dal middleware).
async function createComment(req, res) {
    try {
        const postId = req.params.id
        // Estraiamo solo il testo inviato dal client usando la destrutturazione
        const { text } = req.body

        // Validazione di base: non permettiamo di salvare commenti vuoti
        if (!text)
            return res.status(400).json({ message: 'Il testo del commento è obbligatorio' })
            
        // Creiamo il commento nel database. L'authorId viene impostato in modo sicuro
        // usando il token JWT dell'utente, in modo che nessuno possa fingere di essere un altro.
        const newComment = await Comment.create({
            postId,
            authorId: req.user.id,
            text
        })
        
        // POPOLAMENTO ISTANTANEO: Dopo aver creato il documento, lo popoliamo subito
        // con l'username dell'autore. Questo è fondamentale per permettere al frontend
        // di mostrare immediatamente l'avatar e il nome a schermo senza ricaricare la pagina.
        await newComment.populate('authorId', 'username');
        
        // 201 Created è lo status code HTTP corretto per la creazione di una nuova risorsa
        res.status(201).json({ newComment })
    } catch (error) {
        res.status(500).json({ message: 'Errore nella creazione del commento', error })
    }
}

// PUT /posts/:id/comments/:commentId
// Modifica il testo di un commento esistente.
// Solo l'autore originale del commento può eseguire questa operazione.
async function updateComment(req, res) {
    try {
        const { commentId } = req.params
        const { text } = req.body
        
        // Troviamo il commento da modificare
        const comment = await Comment.findById(commentId)
        
        if (!comment)
            return res.status(404).json({ message: 'Commento non trovato' })
            
        // Controllo di sicurezza: verifichiamo che l'utente loggato (req.user.id) 
        // sia effettivamente colui che ha scritto il commento.
        // .toString() è necessario perché authorId è un ObjectId di Mongoose (oggetto), non una stringa.
        if (comment.authorId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Azione non autorizzata' })
            
        // Aggiorniamo il campo testo e salviamo le modifiche nel DB
        comment.text = text
        await comment.save()
        
        res.json(comment)
    } catch (error) {
        res.status(500).json({ message: 'Errore nella modifica del commento', error })
    }
}

// DELETE /posts/:id/comments/:commentId
// Elimina definitivamente un commento dal database.
// L'operazione è permessa all'autore originale del commento OPPURE a un amministratore (moderazione).
async function deleteComment(req, res) {
    try {
        const { commentId } = req.params
        
        const comment = await Comment.findById(commentId)
        
        if (!comment)
            return res.status(404).json({ message: 'Commento non trovato' })
            
        // Controllo di sicurezza: verifichiamo che l'utente loggato sia l'autore oppure un admin
        const isAuthor = comment.authorId.toString() === req.user.id
        const isAdmin = req.user.role === 'admin'

        if (!isAuthor && !isAdmin)
            return res.status(403).json({ message: 'Azione non autorizzata' })
            
        // Rimuove il commento dal database.
        await comment.deleteOne()
        
        res.json({ message: 'Commento eliminato correttamente' })
    } catch (error) {
        res.status(500).json({ message: "Errore nell'eliminazione", error })
    }
}

// Esportiamo le funzioni per poterle agganciare alle rotte in commentRoute.js
module.exports = {
    getComments,
    createComment,
    updateComment,
    deleteComment
}