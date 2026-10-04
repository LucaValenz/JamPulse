// * IMPORTIAMO LE VARIABILI D'AMBIENTE ----------------------------------------------------------------------------------------------------------------------------------------------------
require('dotenv').config();

// ! CONTROLLO DI SICUREZZA VARIABILI D'AMBIENTE
// Verifichiamo che la chiave segreta per la firma dei token JWT sia definita e sicura
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ [AVVISO SICUREZZA]: JWT_SECRET non impostato nel file .env! Verrà utilizzato un valore di fallback temporaneo.');
    process.env.JWT_SECRET = 'jampulse_default_development_secret_key_change_in_production';
} else if (process.env.JWT_SECRET === 'your_jwt_secret') {
    console.warn('⚠️ [AVVISO SICUREZZA]: JWT_SECRET utilizza il valore predefinito di esempio "your_jwt_secret". Si consiglia di sostituirlo con una chiave casuale complessa.');
}

// * IMPORTIAMO I MODULI NECESSARI -----------------------------------------------------------------------------------------------------------------------------------------------------------
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// ! REAL-TIME: importiamo 'http' (modulo nativo di Node) e Server di socket.io.
// ! Socket.IO ha bisogno di un server HTTP "grezzo" a cui agganciarsi, non può usare
// ! direttamente l'app Express. Quindi creiamo prima il server HTTP e poi lo passiamo a socket.io.
const http = require('http');
const { Server } = require('socket.io');

const authRoute = require('./routes/authRoute');
const chatRoute = require('./routes/chatRoute');
const postRoute = require('./routes/postRoute');
const userRoute = require('./routes/userRoute');
const commentRoute = require('./routes/commentRoute');
const messageRoute = require('./routes/messageRoute');
const healthRoute = require('./routes/healthRoute');
const verifyToken = require('./middlewares/authMiddleware');

// * CREIAMO L'APPLICAZIONE EXPRESS -----------------------------------------------------------------------------------------------------------------------------------------------------------
const app = express();

// ! REAL-TIME: creiamo il server HTTP agganciando l'app Express.
// ! Questo server verrà condiviso sia da Express (per le REST API) che da Socket.IO (per i WebSocket).
const httpServer = http.createServer(app);

// ! REAL-TIME: creiamo l'istanza di Socket.IO passandole il server HTTP.
// ! La configurazione cors è identica a quella di Express: accettiamo solo richieste
// ! dal nostro frontend in locale.
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*'
    }
});

// * MIDDLEWARES ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
app.use(express.json()); // ! questo serve per utilizzare il middleware express.json() che permette di gestire le richieste con body in formato JSON
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
})); // ! questo serve per utilizzare il middleware cors che permette di accettare le richieste HTTP in arrivo dal frontend
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// * SOCKET.IO: GESTIONE CONNESSIONI REAL-TIME ----------------------------------------------------------------------------------------------------------------------------------------------
// ! io.on('connection', ...) viene chiamato ogni volta che UN client (browser) si connette.
// ! La variabile 'socket' rappresenta quel singolo client connesso.
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Nuovo client connesso: ${socket.id}`);

    // ! EVENTO 'join_chat': il frontend lo emette quando l'utente apre una conversazione.
    // ! socket.join(chatId) aggiunge questo client a una "stanza" (room) con nome = ID della chat.
    // ! Le stanze sono gruppi logici: possiamo poi inviare messaggi SOLO ai client in quella stanza.
    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`[Socket.IO] Client ${socket.id} è entrato nella stanza: ${chatId}`);
    });

    // ! EVENTO 'leave_chat': il frontend lo emette quando l'utente cambia conversazione.
    // ! socket.leave(chatId) rimuove il client dalla stanza, così non riceve più i messaggi di quella chat.
    socket.on('leave_chat', (chatId) => {
        socket.leave(chatId);
        console.log(`[Socket.IO] Client ${socket.id} ha lasciato la stanza: ${chatId}`);
    });

    // ! EVENTO 'send_message': il frontend lo emette quando l'utente invia un messaggio.
    // ! Riceviamo i dati del messaggio già salvato nel DB (con _id, senderID popolato, ecc.)
    // ! e li "broadcastiamo" a tutti gli altri client nella stessa stanza.
    socket.on('send_message', ({ chatId, message }) => {
        // ! socket.to(chatId).emit(...) invia l'evento SOLO agli altri client nella stanza 'chatId',
        // ! escluso chi ha emesso 'send_message' (che ha già aggiornato la sua UI localmente).
        socket.to(chatId).emit('receive_message', message);
        console.log(`[Socket.IO] Messaggio inoltrato nella stanza: ${chatId}`);
    });

    // ! REAL-TIME COMMENTI: il frontend emette 'join_post' quando l'utente apre un PostDetail.
    // ! Aggiungiamo il client alla "stanza" del post (identificata dal suo ID),
    // ! così potrà ricevere solo i commenti di quel post specifico.
    socket.on('join_post', (postId) => {
        socket.join(`post_${postId}`);
        console.log(`[Socket.IO] Client ${socket.id} è entrato nella stanza del post: post_${postId}`);
    });

    // ! REAL-TIME COMMENTI: il frontend emette 'leave_post' quando l'utente
    // ! chiude il dettaglio del post (smontaggio componente).
    // ! Usciamo dalla stanza per non ricevere più aggiornamenti inutili.
    socket.on('leave_post', (postId) => {
        socket.leave(`post_${postId}`);
        console.log(`[Socket.IO] Client ${socket.id} ha lasciato la stanza del post: post_${postId}`);
    });

    // ! REAL-TIME COMMENTI: il frontend emette 'send_comment' dopo aver salvato
    // ! il commento nel DB via REST. Il server lo broadcast a tutti gli altri
    // ! client nella stessa stanza (es. un amico che ha lo stesso post aperto).
    socket.on('send_comment', ({ postId, comment }) => {
        // ! socket.to(...) esclude chi ha emesso l'evento (che aggiorna già la sua UI localmente)
        socket.to(`post_${postId}`).emit('receive_comment', comment);
        console.log(`[Socket.IO] Commento inoltrato nella stanza: post_${postId}`);
    });

    // ! EVENTO 'disconnect': viene chiamato automaticamente quando il client chiude il browser/tab.
    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnesso: ${socket.id}`);
    });
});

// * ROUTES --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
app.use((req, res, next) => { // !  questo serve per creare un middleware che stampa il path e il metodo della richiesta in arrivo per avere un log delle richieste in arrivo
    console.log(req.path, req.method);
    next();
});

app.use('/api/v1/health', healthRoute); // ! questo serve per utilizzare la rotta per controllare lo stato del server
app.use('/api/v1/auth', authRoute); // ! questo serve per utilizzare le rotte di autenticazione
app.use(verifyToken);
app.use('/api/v1/chats', chatRoute); // ! questo serve per utilizzare le rotte dei chat
app.use('/api/v1/posts', postRoute); // ! questo serve per utilizzare le rotte dei post
app.use('/api/v1/users', userRoute); // ! questo serve per utilizzare le rotte degli utenti
app.use('/api/v1/posts/:id/comments', commentRoute); // ! questo serve per utilizzare le rotte dei commenti
app.use('/api/v1/chats/:id/messages', messageRoute); // ! questo serve per utilizzare le rotte dei messaggi

// * CONNESSIONE AL DATABASE E AVVIO DEL SERVER ----------------------------------------------------------------------------------------------------------------------------------------------
mongoose.connect(process.env.MONGO_URI) // ! questo serve per connettersi al database MongoDB utilizzando l'URI definito nelle variabili d'ambiente
    .then(() => {
        // ! NOVITÀ: ora facciamo ascoltare httpServer invece di app.
        // ! È lo stesso risultato finale, ma httpServer include anche il supporto WebSocket di Socket.IO.
        httpServer.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT} !!  CONFERMATO CHE LA CONNESSIONE AL DATABASE È STATA EFFETTUATA CON SUCCESSO !!`);
        });
    })
    .catch((error) => { // ! questa parte di codice serve per gestire eventuali errori nella connessione al database
        console.log(error);
    });