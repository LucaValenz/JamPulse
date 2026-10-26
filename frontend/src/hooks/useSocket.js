// Hook condiviso da Chat e PostDetail per ricevere gli aggiornamenti real-time.
// Gli invii passano dalle REST API: il server trasmette solo documenti salvati nel DB.
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_SERVER_URL = 'http://localhost:4000';

/**
 * @param {string|null} activeChatId - Chat aperta (oppure null).
 * @param {function|null} onMessageReceived - Callback per i messaggi salvati.
 * @param {string|null} activePostId - Post aperto (oppure null).
 * @param {function|null} onCommentReceived - Callback per i commenti salvati.
 */
export function useSocket(activeChatId, onMessageReceived, activePostId, onCommentReceived) {
    const { token } = useAuth();

    useEffect(() => {
        // Senza sessione non apriamo connessioni. Al logout il cleanup chiude il socket.
        if (!token) return;

        const socket = io(SOCKET_SERVER_URL, {
            // Leggiamo il token aggiornato anche nelle riconnessioni: il refresh REST
            // potrebbe averlo rinnovato nel localStorage dopo il montaggio della pagina.
            auth: (callback) => callback({ token: localStorage.getItem('token') })
        });

        // Il server perde le room alla disconnessione: ci iscriviamo nuovamente
        // ad ogni connect, anche quando Socket.IO si riconnette automaticamente.
        socket.on('connect', () => {
            if (activeChatId) socket.emit('join_chat', activeChatId);
            if (activePostId) socket.emit('join_post', activePostId);
        });
        socket.on('connect_error', (error) => {
            console.error('[Socket.IO] Connessione rifiutata:', error.message);
        });

        if (onMessageReceived) socket.on('receive_message', onMessageReceived);
        if (onCommentReceived) socket.on('receive_comment', onCommentReceived);

        // Cambiando pagina, stanza o sessione chiudiamo la vecchia connessione.
        // Socket.IO rimuove automaticamente il client da tutte le room.
        return () => socket.disconnect();
    }, [token, activeChatId, activePostId, onMessageReceived, onCommentReceived]);
}
