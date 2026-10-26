const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Chat = require('./models/Chat');
const Post = require('./models/Post');

// ! REAL-TIME: il socket serve solo per ricevere aggiornamenti e scegliere le stanze.
// ! Messaggi e commenti vengono emessi esclusivamente dai controller REST dopo il salvataggio.
function configureSocket(io) {
    // Come nelle REST API, verifichiamo firma, scadenza e algoritmo del JWT.
    // L'identità arriva dal token: non accettiamo mai un userId dichiarato dal client.
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
            if (!mongoose.isObjectIdOrHexString(decoded.userId)) {
                return next(new Error('Identità utente non valida'));
            }
            socket.data.userId = decoded.userId;
            next();
        } catch (error) {
            next(new Error('Token mancante, scaduto o non valido'));
        }
    });

    io.on('connection', (socket) => {
        // Accettiamo solo stringhe ObjectId: oggetti, array e nomi di room arbitrari
        // non devono mai arrivare alle query o a socket.join().
        const isValidId = (id) => typeof id === 'string' && mongoose.isObjectIdOrHexString(id);

        socket.on('join_chat', async (chatId) => {
            if (!isValidId(chatId)) return;
            try {
                // Lo stesso controllo di partecipazione usato dalle REST protegge la lettura real-time.
                const chat = await Chat.exists({ _id: chatId, participants: socket.data.userId });
                if (chat) await socket.join(`chat_${chatId.toLowerCase()}`);
            } catch (error) {
                console.error('ERRORE SOCKET JOIN CHAT:', error);
            }
        });

        socket.on('leave_chat', (chatId) => {
            if (isValidId(chatId)) socket.leave(`chat_${chatId.toLowerCase()}`);
        });

        socket.on('join_post', async (postId) => {
            if (!isValidId(postId)) return;
            try {
                // I post sono visibili a tutti gli utenti autenticati, come nelle REST API.
                // Verifichiamo comunque che il post richiesto esista davvero.
                const post = await Post.exists({ _id: postId });
                if (post) await socket.join(`post_${postId.toLowerCase()}`);
            } catch (error) {
                console.error('ERRORE SOCKET JOIN POST:', error);
            }
        });

        socket.on('leave_post', (postId) => {
            if (isValidId(postId)) socket.leave(`post_${postId.toLowerCase()}`);
        });

        // Nessun handler send_message/send_comment: un client non può diffondere
        // contenuti falsificati, cambiare autore o ripubblicare vecchi eventi.
    });
}

module.exports = configureSocket;
