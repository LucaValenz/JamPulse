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
const { uploadDirectory, mediaPrefix } = require('./services/postImages');

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
// La configurazione separata mantiene qui solo l'avvio del server.
require('./socket')(io);

// Rendiamo Socket.IO disponibile ai controller REST, unici responsabili dei broadcast.
app.set('io', io);

// * ROUTES --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
app.use((req, res, next) => { // !  questo serve per creare un middleware che stampa il path e il metodo della richiesta in arrivo per avere un log delle richieste in arrivo
    console.log(req.path, req.method);
    next();
});

app.use('/api/v1/health', healthRoute); // ! questo serve per utilizzare la rotta per controllare lo stato del server
app.use('/api/v1/auth', authRoute); // ! questo serve per utilizzare le rotte di autenticazione
// Le immagini dei post sono pubbliche come le immagini esterne già presenti nel feed.
// Questa rotta precede verifyToken perché gli elementi <img> non inviano il JWT
// aggiunto dall'interceptor Axios. La creazione del post resta autenticata.
app.use(mediaPrefix, express.static(uploadDirectory, {
    index: false, // Non cercare un file index nelle directory richieste.
    dotfiles: 'deny', // Non esporre eventuali file nascosti presenti nella cartella.
    fallthrough: false, // Un file assente restituisce 404 senza passare alle rotte protette.
    // Il browser deve rispettare il tipo del file senza tentare di reinterpretarlo.
    setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); }
}));
app.use(verifyToken);
app.use('/api/v1/chats', chatRoute); // ! questo serve per utilizzare le rotte dei chat
app.use('/api/v1/posts', postRoute); // ! questo serve per utilizzare le rotte dei post
app.use('/api/v1/users', userRoute); // ! questo serve per utilizzare le rotte degli utenti
app.use('/api/v1/posts/:id/comments', commentRoute); // ! questo serve per utilizzare le rotte dei commenti
app.use('/api/v1/chats/:id/messages', messageRoute); // ! questo serve per utilizzare le rotte dei messaggi

// * GESTIONE ERRORI ED ENDPOINT NON TROVATI --------------------------------------------------------------------------------------------------------------------------------------------------
// Middleware per intercettare qualsiasi rotta non definita nel server e restituire una risposta JSON coerente (404 Not Found)
app.use((req, res) => {
    res.status(404).json({
        message: `Endpoint non trovato: ${req.method} ${req.originalUrl}`
    });
});

// Middleware globale per la gestione centralizzata degli errori Express (a 4 parametri)
// Evita che eccezioni non catturate facciano crashare il processo o restituiscano pagine HTML al client
app.use((err, req, res, next) => {
    console.error('⚠️ [ERRORE NON GESTITO SERVER]:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Errore interno del server'
    });
});

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
