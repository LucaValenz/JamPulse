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
            if (!mongoose.isObjectIdOrHexString(decoded.userId) || !Number.isFinite(decoded.exp)) {
                return next(new Error('Identità utente non valida'));
            }
            socket.data.userId = decoded.userId;
            socket.data.expiresAt = decoded.exp * 1000;
            next();
        } catch (error) {
            const authError = new Error('Token mancante, scaduto o non valido');
            authError.data = { code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' };
            next(authError);
        }
    });

    io.on('connection', (socket) => {
        const expireSession = () => {
            socket.emit('session_expired');
            socket.disconnect(true);
        };
        // I timer Node hanno un limite di circa 24 giorni: ricontrolliamo a intervalli.
        let expiryTimer;
        const scheduleExpiry = () => {
            const remaining = socket.data.expiresAt - Date.now();
            if (remaining <= 0) return expireSession();
            if (Number.isFinite(remaining)) {
                expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining, 2147483647));
                expiryTimer.unref();
            }
        };
        scheduleExpiry();
        socket.on('disconnect', () => clearTimeout(expiryTimer));
        const sessionValid = () => {
            if (!socket.connected) return false;
            if (Date.now() >= socket.data.expiresAt) {
                expireSession();
                return false;
            }
            return true;
        };
        // Accettiamo solo stringhe ObjectId: oggetti, array e nomi di room arbitrari
        // non devono mai arrivare alle query o a socket.join().
        const isValidId = (id) => typeof id === 'string' && mongoose.isObjectIdOrHexString(id);

        socket.on('join_chat', async (chatId, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};
            if (!sessionValid() || !isValidId(chatId)) return reply({ ok: false });
            try {
                // Lo stesso controllo di partecipazione usato dalle REST protegge la lettura real-time.
                const chat = await Chat.exists({ _id: chatId, participants: socket.data.userId });
                if (!chat || !sessionValid()) return reply({ ok: false });
                await socket.join(`chat_${chatId.toLowerCase()}`);
                reply({ ok: true });
            } catch (error) {
                console.error('ERRORE SOCKET JOIN CHAT:', error);
                reply({ ok: false, code: 'TEMPORARY_ERROR' });
            }
        });

        socket.on('leave_chat', (chatId) => {
            if (isValidId(chatId)) socket.leave(`chat_${chatId.toLowerCase()}`);
        });

        socket.on('join_post', async (postId, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};
            if (!sessionValid() || !isValidId(postId)) return reply({ ok: false });
            try {
                // I post sono visibili a tutti gli utenti autenticati, come nelle REST API.
                // Verifichiamo comunque che il post richiesto esista davvero.
                const post = await Post.exists({ _id: postId });
                if (!post || !sessionValid()) return reply({ ok: false });
                await socket.join(`post_${postId.toLowerCase()}`);
                reply({ ok: true });
            } catch (error) {
                console.error('ERRORE SOCKET JOIN POST:', error);
                reply({ ok: false, code: 'TEMPORARY_ERROR' });
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
