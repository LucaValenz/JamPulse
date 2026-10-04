import { useState, useEffect, useCallback } from "react";

// ! REAL-TIME: importiamo il nostro hook custom per la gestione del socket
import { useSocket } from "../hooks/useSocket"; import { Box, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";

import SearchBar from "../components/SearchBar";
import UserBadge from "../components/UserBadge";
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MessageBubble from "../components/MessageBubble";

// Importiamo gli hook e le chiamate API necessarie
import { useAuth } from "../context/AuthContext";
import { getChats, createChat } from "../services/chatServices";
import { getMessages, createMessage } from "../services/messageServices";
import { getFollowing } from "../services/userServices";

// useLocation ci permette di leggere lo "state" passato da navigate()
// quando arriviamo in questa pagina da un'altra (es. dal tasto "Scrivi" in Search)
import { useLocation, useNavigate } from 'react-router-dom';

// Pagina dedicata alla sezione chat dell'applicazione.
// La sidebar sinistra mostra due sezioni:
//   1. Gli utenti che segui (puoi avviare o aprire una chat con loro)
//   2. Le chat arrivate da utenti che NON segui (stile "messaggi richiesta")
export default function Chat() {
    // Recuperiamo l'utente loggato dal contesto di autenticazione.
    // Ci serve per identificare quale parte del messaggio è "nostra"
    // e per escludere noi stessi dalla lista dei partecipanti.
    const { user } = useAuth();

    // location.state può contenere un oggetto { targetUser } se arriviamo
    // dalla pagina Cerca tramite il tasto "Scrivi". Se arriviamo navigando
    // normalmente, location.state è null.
    const location = useLocation();
    const navigate = useNavigate()

    // --- STATI PRINCIPALI ---
    const [chats, setChats] = useState([]);         // Tutte le chat di cui siamo partecipanti (dal backend)
    const [following, setFollowing] = useState([]); // Gli utenti che seguiamo
    const [activeChat, setActiveChat] = useState(null);   // La conversazione attualmente aperta
    const [messages, setMessages] = useState([]);         // Messaggi della conversazione aperta
    const [newMessageText, setNewMessageText] = useState(''); // Testo in digitazione nell'input

    // Testo digitato nella barra di ricerca della sidebar.
    // Viene usato per filtrare sia i following che le chat già esistenti.
    const [searchText, setSearchText] = useState('');

    // REAL-TIME: callback chiamata dal socket quando arriva un messaggio dall'altro utente.
    //  useCallback è fondamentale qui: senza di esso, ad ogni re-render di Chat verrebbe creata
    //  una NUOVA funzione, causando un loop infinito nell'useEffect di useSocket
    //  (ogni render -> nuova funzione -> useEffect si riesegue -> nuovo render -> ...).
    // useCallback garantisce che la funzione venga ricreata SOLO se setMessages cambia (mai).
    const handleReceiveMessage = useCallback((message) => {
        setMessages(prev => [...prev, message]);
    }, [setMessages]);

    // REAL-TIME: attiviamo il nostro hook socket.
    // - activeChatId: quando cambia, il socket cambia automaticamente stanza
    // - handleReceiveMessage: viene chiamata ogni volta che arriva un messaggio real-time
    // - emitSendMessage: la usiamo in handleSendMessage per notificare l'altro utente
    const { emitSendMessage } = useSocket(activeChat?._id ?? null, handleReceiveMessage);

    // Carichiamo sia le chat esistenti sia la lista dei following
    // all'apertura della pagina (array vuoto = esegui solo al primo render).
    useEffect(() => {
        async function loadData() {
            try {
                // Eseguiamo entrambe le chiamate in parallelo con Promise.all
                // per ridurre il tempo di attesa complessivo.
                const [chatsData, followingData] = await Promise.all([
                    getChats(),
                    getFollowing()
                ]);
                setChats(chatsData);
                setFollowing(followingData);
            } catch (error) {
                console.error("Errore nel caricamento dei dati iniziali:", error);
            }
        }
        loadData();
    }, []);

    // --- FUNZIONI HELPER ---

    // Trova "l'altra persona" in una chat a due partecipanti.
    // I participants arrivano già popolati (con _id e username) dal backend.
    const getOtherUser = (chat) => {
        if (!user || !chat.participants) return null;
        // .find() ritorna il primo elemento che soddisfa la condizione
        return chat.participants.find(p => p._id !== user.id);
    };

    // Controlla se un dato userId è tra gli utenti che seguiamo.
    // Ci serve per dividere le chat in "principali" e "richieste".
    const isFollowing = (userId) => {
        return following.some(f => f._id === userId);
    };

    // Carica i messaggi di una chat e la imposta come attiva.
    async function handleSelectChat(chat) {
        setActiveChat(chat);
        try {
            const msgs = await getMessages(chat._id);
            setMessages(msgs);
        } catch (error) {
            console.error("Errore nel caricamento dei messaggi:", error);
        }
    }

    // Gestisce il click su un utente che seguiamo ma con cui non abbiamo ancora una chat.
    // Chiama createChat sul backend: se la chat esiste già la riusa, altrimenti la crea.
    async function handleSelectFollowing(followedUser) {
        try {
            // createChat è già idempotente lato backend: se la chat esiste, la ritorna.
            const chat = await createChat({ targetUserId: followedUser._id });

            // Aggiorniamo la lista locale di chat se quella ritornata non c'era già
            setChats(prev => {
                const exists = prev.find(c => c._id === chat._id);
                return exists ? prev : [chat, ...prev];
            });

            // Apriamo subito la chat e carichiamo i messaggi
            await handleSelectChat(chat);
        } catch (error) {
            console.error("Errore nell'apertura della chat:", error);
        }
    }

    // Quando i dati iniziali (chats + following) sono pronti E siamo arrivati
    // qui tramite il tasto "Scrivi", apriamo subito la chat con quell'utente.
    // Le dipendenze [chats, following] garantiscono che questo venga eseguito
    // solo DOPO che i dati sono stati caricati, non prima.
    useEffect(() => {
        const targetUser = location.state?.targetUser;

        // Se non c'è un utente target nello state (navigazione normale), non facciamo nulla
        if (!targetUser) return;

        // Se i dati non sono ancora pronti, aspettiamo il prossimo render
        if (chats.length === 0 && following.length === 0) return;

        // Avviamo o apriamo la chat con l'utente target automaticamente
        handleSelectFollowing(targetUser);

        // Puliamo lo state di navigazione per evitare che al refresh
        // si riapra di nuovo la stessa chat automaticamente.
        // replace: true sovrascrive la voce nella cronologia del browser.
        window.history.replaceState({}, '');

    }, [chats, following]); // eslint-disable-line react-hooks/exhaustive-deps

    // Invia un nuovo messaggio nella chat attiva.
    // Invia un nuovo messaggio nella chat attiva.
    const handleSendMessage = async () => {
        // Blocchiamo l'invio se il testo è vuoto o se non c'è una chat aperta
        if (!newMessageText.trim() || !activeChat) return;

        try {
            // 1. Salviamo il messaggio nel database tramite REST API (come prima)
            const newMsg = await createMessage(activeChat._id, { content: newMessageText });

            // 2. Aggiorniamo la nostra UI localmente per un'esperienza immediata,
            //    senza aspettare che il socket ci rimandi indietro il messaggio.
            setMessages(prev => [...prev, newMsg]);

            // REAL-TIME: 3. Notifichiamo il server via socket, che a sua volta
            // inoltrerà il messaggio a TUTTI gli altri client nella stessa stanza (chat).
            // Passiamo il messaggio già popolato (con senderID.username) restituito dal backend,
            // così l'altro utente può mostrarlo direttamente senza altre chiamate API.
            emitSendMessage(activeChat._id, newMsg);

            // Puliamo il campo di testo dopo l'invio
            setNewMessageText('');
        } catch (error) {
            console.error("Errore nell'invio del messaggio:", error);
        }
    };


    // --- DIVISIONE CHAT: principali vs richieste ---

    // Le chat "principali" sono quelle con utenti che seguiamo.
    // Filtriamo anche per il testo digitato nella barra di ricerca (case-insensitive).
    const mainChats = chats.filter(chat => {
        const other = getOtherUser(chat);
        if (!other || !isFollowing(other._id)) return false;
        // Se searchText è vuoto, tutti passano; altrimenti filtriamo per username
        return other.username.toLowerCase().includes(searchText.toLowerCase());
    });

    // Le chat "richieste" sono quelle da utenti che non seguiamo.
    // Anche qui applichiamo il filtro per testo.
    const requestChats = chats.filter(chat => {
        const other = getOtherUser(chat);
        if (!other || isFollowing(other._id)) return false;
        return other.username.toLowerCase().includes(searchText.toLowerCase());
    });

    // Following senza chat ancora aperta, filtrati per testo di ricerca.
    const followingWithoutChat = following.filter(f => {
        const hasChat = chats.some(chat => {
            const other = getOtherUser(chat);
            return other && other._id === f._id;
        });
        if (hasChat) return false;
        return f.username.toLowerCase().includes(searchText.toLowerCase());
    });

    // --- RENDERING ---
    return (
        <Stack direction={"row"} divider={<Divider orientation="vertical" sx={{ display: { xs: "none", md: 'block' } }} />} sx={{ height: '100%' }}>

            {/* SIDEBAR SINISTRA: Lista contatti e conversazioni */}
            <Stack spacing={2} sx={{
                padding: 1,
                width: { xs: '100%', md: '30%' },
                maxWidth: { xs: '100%', md: 400 },
                flexShrink: 0,
                overflowY: 'auto',
                display: { xs: activeChat ? 'none' : 'flex', md: 'flex' }
            }}>

                {/* Barra di ricerca collegata allo stato searchText.
                    value e onChange la rendono un "controlled component":
                    il valore mostrato è sempre sincronizzato con lo stato React. */}
                <SearchBar
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />

                {/* ------- SEZIONE 1: FOLLOWING (chat esistenti + contatti senza chat) ------- */}
                <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Messaggi
                </Typography>

                {/* Chat già esistenti con utenti che seguiamo */}
                <Stack divider={<Divider />}>
                    {mainChats.map((chat) => {
                        const otherUser = getOtherUser(chat);
                        return (
                            // Stack orizzontale: UserBadge a sinistra, cestino a destra
                            <Box
                                key={chat._id}
                                onClick={() => handleSelectChat(chat)}
                                sx={{
                                    cursor: 'pointer',
                                    backgroundColor: activeChat?._id === chat._id ? 'action.hover' : 'transparent',
                                    borderRadius: 1,
                                }}
                            >
                                <UserBadge
                                    username={otherUser?.username || "Utente Sconosciuto"}
                                    userId={otherUser?._id}
                                    role={otherUser?.role}
                                />
                            </Box>
                        );
                    })}

                    {/* Following senza chat ancora aperta: cliccando si crea/apre la chat */}
                    {followingWithoutChat.map((followedUser) => (
                        <Box
                            key={followedUser._id}
                            onClick={() => handleSelectFollowing(followedUser)}
                            sx={{
                                cursor: 'pointer',
                                backgroundColor: 'transparent',
                                borderRadius: 1
                            }}
                        >
                            <UserBadge
                                username={followedUser.username}
                                userId={followedUser._id}
                                role={followedUser.role}
                            />
                        </Box>
                    ))}

                    {/* Messaggio di fallback se non seguiamo nessuno */}
                    {mainChats.length === 0 && followingWithoutChat.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            Non stai ancora seguendo nessuno.
                        </Typography>
                    )}
                </Stack>

                {/* ------- SEZIONE 2: RICHIESTE (messaggi da non-following) ------- */}
                {requestChats.length > 0 && (
                    <>
                        <Divider />
                        {/* Intestazione della sezione richieste */}
                        <Typography variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Messaggi da account non seguiti
                        </Typography>

                        <Stack divider={<Divider />}>
                            {requestChats.map((chat) => {
                                const otherUser = getOtherUser(chat);
                                return (
                                    <Box
                                        key={chat._id}
                                        onClick={() => handleSelectChat(chat)}
                                        sx={{
                                            cursor: 'pointer',
                                            backgroundColor: activeChat?._id === chat._id ? 'action.hover' : 'transparent',
                                            borderRadius: 1,
                                            opacity: 0.75,
                                        }}
                                    >
                                        <UserBadge
                                            username={otherUser?.username || "Utente Sconosciuto"}
                                            userId={otherUser?._id}
                                            role={otherUser?.role}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </>
                )}
            </Stack>

            {/* AREA PRINCIPALE DESTRA: Messaggi della conversazione attiva */}
            <Stack sx={{
                flexGrow: 1,
                height: '100%',
                padding: 2,
                display: { xs: activeChat ? 'flex' : 'none', md: 'flex' }
            }}>
                {activeChat ? (
                    <>
                        {/* HEADER: Nome dell'utente con cui stiamo chattando */}
                        <Stack direction='row' spacing={2} sx={{ p: 1 }}>
                            <IconButton
                                onClick={() => setActiveChat(null)}
                                sx={{ display: { xs: 'flex', md: 'none' } }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Stack
                                onClick={() => navigate(`/profile/${getOtherUser(activeChat)?._id}`)}
                                sx={{ cursor: 'pointer' }}>
                                <UserBadge
                                    username={getOtherUser(activeChat)?.username || "Utente"}
                                    userId={getOtherUser(activeChat)?._id}
                                />
                            </Stack>
                        </Stack>
                        <Divider />

                        {/* AREA MESSAGGI: lista dei MessageBubble.
                            Usiamo Box invece di Stack perché flexGrow deve funzionare
                            correttamente con overflow verticale senza rompere il layout. */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                            {messages.length > 0 ? (
                                messages.map((message) => {
                                    // Confrontiamo l'ID del mittente con il nostro per sapere
                                    // se il messaggio è "nostro" (isMine) o dell'altro utente.
                                    const isMine = message.senderID?._id === user.id;
                                    return (
                                        <MessageBubble
                                            key={message._id}
                                            text={message.content}
                                            isMine={isMine}
                                        />
                                    );
                                })
                            ) : (
                                <Typography variant="body2" align="center" sx={{ mt: 5 }}>
                                    Inizia la conversazione! Manda il primo messaggio.
                                </Typography>
                            )}
                        </Box>

                        {/* INPUT: Campo di testo + pulsante invia */}
                        <Stack direction='row'>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Scrivi un messaggio..."
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                // Invio con il tasto Enter (Shift+Enter va a capo senza inviare)
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            />
                            <IconButton onClick={handleSendMessage} disabled={!newMessageText.trim()} color="primary">
                                <SendIcon />
                            </IconButton>
                        </Stack>
                    </>
                ) : (
                    // Stato iniziale: nessuna chat selezionata
                    <Stack sx={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Typography>
                            Seleziona una conversazione per iniziare a chattare
                        </Typography>
                    </Stack>
                )}
            </Stack>
        </Stack>
    );
}