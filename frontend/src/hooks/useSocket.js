import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { refreshSession } from '../axios';

// Il proxy Vite/Nginx inoltra /socket.io allo stesso backend delle API.
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export function useSocket(activeChatId, onMessageReceived, activePostId, onCommentReceived, onReady) {
    const { token } = useAuth();

    useEffect(() => {
        if (!token || (!activeChatId && !activePostId)) return;
        let disposed = false;
        let refreshing = false;
        let retryTimer;
        let syncController;
        const socket = io(SOCKET_SERVER_URL, {
            auth: callback => callback({ token: localStorage.getItem('token') })
        });
        const recoverSession = async () => {
            if (disposed || refreshing) return;
            refreshing = true;
            try {
                await refreshSession();
                if (!disposed) socket.connect();
            } catch (error) {
                console.error('[Socket.IO] Rinnovo sessione fallito:', error.message);
                if (!disposed && localStorage.getItem('token')) {
                    retryTimer = setTimeout(recoverSession, 5000);
                }
            } finally {
                refreshing = false;
            }
        };
        socket.on('connect', () => {
            syncController?.abort();
            syncController = new AbortController();
            const signal = syncController.signal;
            const event = activeChatId ? 'join_chat' : 'join_post';
            const roomId = activeChatId || activePostId;
            const joinRoom = () => {
                socket.timeout(10000).emit(event, roomId, (error, result) => {
                    if (disposed || signal.aborted) return;
                    if (error || result?.code === 'TEMPORARY_ERROR') {
                        retryTimer = setTimeout(joinRoom, 2000);
                    } else if (result?.ok) {
                        Promise.resolve(onReady?.(signal)).catch(error => {
                            if (!disposed && !signal.aborted) {
                                console.error('[Socket.IO] Sincronizzazione fallita:', error.message);
                                retryTimer = setTimeout(joinRoom, 5000);
                            }
                        });
                    }
                });
            };
            joinRoom();
        });
        socket.on('disconnect', () => {
            syncController?.abort();
            clearTimeout(retryTimer);
        });
        socket.on('session_expired', () => {
            // La nuova connessione parte solo dopo la chiusura di quella scaduta.
            socket.disconnect();
            recoverSession();
        });
        socket.on('connect_error', error => {
            if (error.data?.code === 'TOKEN_EXPIRED') recoverSession();
            else console.error('[Socket.IO] Connessione rifiutata:', error.message);
        });
        if (onMessageReceived) socket.on('receive_message', onMessageReceived);
        if (onCommentReceived) socket.on('receive_comment', onCommentReceived);
        return () => {
            disposed = true;
            clearTimeout(retryTimer);
            syncController?.abort();
            socket.disconnect();
        };
    }, [token, activeChatId, activePostId, onMessageReceived, onCommentReceived, onReady]);
}
