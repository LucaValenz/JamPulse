// ====================================================================================================================
// MODELLO MONGOOSE: REFRESH TOKEN
// ====================================================================================================================
// In un'architettura di autenticazione moderna "Dual-Token" (Access Token + Refresh Token):
//
// 1. L'Access Token (JWT) è a vita breve (es. 15 minuti) e viaggia nelle intestazioni HTTP (Authorization: Bearer).
//    È stateless: il server ne verifica solo la firma crittografica senza interrogare il database ad ogni chiamata.
//
// 2. Il Refresh Token è a vita più lunga (es. 7 giorni) e serve ESCLUSIVAMENTE per chiedere al server un nuovo
//    Access Token quando il vecchio scade, senza costringere l'utente a reinserire username e password.
//
// Perché salviamo i Refresh Token su MongoDB?
// Se i JWT fossero puramente stateless, non potremmo revocare una sessione prima della sua scadenza naturale.
// Memorizzando il Refresh Token nel database:
// - Quando l'utente fa Logout, eliminiamo il token dal DB: non potrà più essere usato per ottenere nuovi access token.
// - Se un amministratore revoca una sessione o se un utente cambia password, possiamo invalidare tutti i suoi refresh token.
// - Supportiamo la "Token Rotation": ogni volta che un refresh token viene utilizzato, viene cancellato e ne viene
//   generato uno nuovo, neutralizzando tentativi di riutilizzo (Replay Attack).
// ====================================================================================================================

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    // La stringa cifrata del Refresh Token JWT
    token: {
        type: String,
        required: true,
        unique: true
    },
    // Riferimento all'ID dell'utente a cui appartiene la sessione (relazione con il modello User)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Data e ora esatta in cui il token cesserà di essere valido
    expiresAt: {
        type: Date,
        required: true
    },
    // Timestamp di creazione del token nel database
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ====================================================================================================================
// INDICE TTL (Time-To-Live) AUTOMATICO DI MONGODB:
// MongoDB include una funzionalità nativa per la rimozione automatica dei documenti obsoleti.
// Impostando un indice su un campo Data con { expireAfterSeconds: 0 }:
// - Un processo in background interno a MongoDB controlla periodicamente i documenti.
// - Non appena la data corrente supera il valore presente in 'expiresAt', MongoDB cancella fisicamente
//   il documento dalla collezione senza bisogno di script cron o pulizie manuali.
// ====================================================================================================================
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
