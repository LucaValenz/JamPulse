// Importiamo i modelli che ci servono per interagire con il database
const Message = require('../models/Message')
const Chat = require('../models/Chat')

// GET /chats/:id/messages
// Restituisce la cronologia completa dei messaggi di una specifica conversazione.
async function getMessages(req, res) {
    try {
        // Leggiamo l'ID della chat dall'URL. Funziona grazie a 'mergeParams: true'
        // nel router dei messaggi, che ci permette di ereditare i parametri delle rotte genitore.
        const currentChatId = req.params.id;

        // Controllo di sicurezza: verifichiamo che la chat esista
        const chat = await Chat.findById(currentChatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat non trovata' });
        }

        // Controllo privacy: assicuriamoci che l'utente loggato (req.user.id) 
        // faccia effettivamente parte dell'array dei partecipanti di questa chat.
        // Usiamo .some e .toString() perché participants contiene ObjectId e req.user.id è una stringa
        const isParticipant = chat.participants.some(p => p.toString() === req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Non hai il permesso di leggere questa chat' });
        }

        // Cerchiamo tutti i messaggi collegati a questa chat tramite il campo chatID.
        const messages = await Message.find({ chatID: currentChatId })
            // Sostituiamo il senderID con l'oggetto utente reale (ci serve per mostrare l'username)
            .populate('senderID', 'username')
            // Ordiniamo dal più vecchio al più nuovo (1 = crescente), 
            // così i messaggi nuovi appaiono in fondo.
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID chat non valido' });
        }
        console.error('ERRORE GET MESSAGES:', error);
        res.status(500).json({ message: 'Errore nel recupero dei messaggi' });
    }
}

// POST /chats/:id/messages
// Crea e salva un nuovo messaggio inviato dall'utente in una specifica chat.
async function createMessage(req, res) {
    try {
        const currentChatId = req.params.id;

        // Estraiamo il 'content' dal corpo della richiesta (inviato dal frontend)
        const { content } = req.body;

        // Validazione di base per evitare di salvare messaggi vuoti nel database
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Il contenuto del messaggio è obbligatorio' });
        }

        // Verifichiamo prima che la chat di destinazione esista
        const chat = await Chat.findById(currentChatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat non trovata' });
        }

        // Verifichiamo che l'utente loggato sia effettivamente un partecipante della chat
        const isParticipant = chat.participants.some(p => p.toString() === req.user.id);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Non hai il permesso di inviare messaggi in questa chat' });
        }

        // Creiamo fisicamente il documento del messaggio nel DB.
        // Il mittente (senderID) viene preso dal token di autenticazione in modo sicuro.
        const newMessage = await Message.create({
            chatID: currentChatId,
            senderID: req.user.id,
            content: content.trim()
        });

        // Aggiorniamo il timestamp 'updatedAt' della Chat.
        // In questo modo, quando il frontend chiederà la lista delle chat ordinate per data,
        // questa conversazione balzerà automaticamente in cima.
        await Chat.findByIdAndUpdate(currentChatId, { updatedAt: new Date() });

        // Popoliamo il messaggio appena creato per restituire al frontend anche l'username.
        await newMessage.populate('senderID', 'username');

        res.status(201).json(newMessage);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID chat non valido' });
        }
        console.error('ERRORE CREATE MESSAGE:', error);
        res.status(500).json({ message: 'Errore nell\'invio del messaggio' });
    }
}

// PUT /chats/:id/messages/:messageId
// Modifica il testo di un messaggio esistente.
async function updateMessage(req, res) {
    try {
        const { messageId } = req.params;
        const { content } = req.body;

        // Troviamo il messaggio specifico
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Messaggio non trovato' });

        // Sicurezza: controlliamo che chi sta provando a modificare il messaggio
        // sia effettivamente colui che l'ha inviato.
        // Usiamo .toString() perché senderID è un ObjectId di Mongoose, non una stringa semplice.
        if (message.senderID.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Azione non autorizzata' });
        }

        // Aggiorniamo il campo e salviamo
        message.content = content;
        await message.save();

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Errore nella modifica del messaggio', error });
    }
}

// DELETE /chats/:id/messages/:messageId
// Elimina definitivamente un singolo messaggio dal database.
async function deleteMessage(req, res) {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Messaggio non trovato' });

        // Stesso identico controllo di sicurezza usato nell'update
        if (message.senderID.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Azione non autorizzata' });
        }

        // Eliminiamo il documento eseguendo la funzione deleteOne()
        await message.deleteOne();

        res.json({ message: 'Messaggio eliminato con successo' });
    } catch (error) {
        res.status(500).json({ message: 'Errore nell\'eliminazione del messaggio', error });
    }
}

module.exports = {
    getMessages,
    createMessage,
    updateMessage,
    deleteMessage
};