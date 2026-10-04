// ! MODIFICATO: aggiunti useState, useEffect, useParams per rendere la pagina dinamica.
// Prima tutto era hardcoded (immagine fissa, commenti finti, utente finto).
// Ora carichiamo i dati reali dal backend usando l'ID del post che arriva dall'URL.
// ! AGGIORNATO: aggiunto supporto real-time per i commenti tramite Socket.IO.
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Avatar, Box, CircularProgress, List, ListItem,
    ListItemAvatar, ListItemText, Stack, Typography, TextField, IconButton,
    useTheme
} from "@mui/material";
import UserBadge from "../components/UserBadge";
import SendIcon from '@mui/icons-material/Send';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteIcon from '@mui/icons-material/Delete';
import { getPostById, toggleLike } from "../services/postServices";
import { getComments, createComment, deleteComment } from "../services/commentServices";
import { useAuth } from "../context/AuthContext";
import CloseIcon from '@mui/icons-material/Close';
import { getTimeAgo } from "../utils/timeUtils";
// ! NUOVO REAL-TIME: importiamo l'hook useSocket per gestire la connessione WebSocket
import { useSocket } from "../hooks/useSocket";

// Pagina di dettaglio di un singolo post.
// L'ID del post viene letto dall'URL (es. /posts/abc123) tramite useParams.
//
// Struttura principale:
// - area sinistra: immagine del post (se presente)
// - area destra: autore (UserBadge), descrizione, lista commenti, input nuovo commento
export default function PostDetail() {
    // ! NUOVO: leggiamo l'ID del post dall'URL (parametro :id definito in App.jsx)
    const { id } = useParams();

    // ! NUOVO: utente loggato, ci serve per inviare commenti e mostrare l'avatar di chi commenta
    const { user } = useAuth();

    // ! NUOVO: hook per tornare alla pagina precedente quando si clicca la X
    const navigate = useNavigate();

    const theme = useTheme();

    // ! NUOVO: stato per i dati del post (immagine, descrizione, autore...)
    const [post, setPost] = useState(null);

    // ! NUOVO: stato per la lista dei commenti del post
    const [comments, setComments] = useState([]);

    // ! NUOVO: testo attualmente scritto nel campo "Scrivi un commento..."
    const [commentText, setCommentText] = useState('');

    // ! NUOVO: spinner durante il caricamento del post
    const [loading, setLoading] = useState(true);

    // ! NUOVO: messaggio di errore se qualcosa va storto
    const [error, setError] = useState(null);

    // ! NUOVO REAL-TIME: callback chiamata quando arriva un commento da Socket.IO
    // (cioè quando un ALTRO utente ha aperto lo stesso post e ha commentato).
    // ! useCallback è fondamentale: stabilizza il riferimento della funzione tra i render.
    // ! Senza useCallback, ad ogni render di PostDetail verrebbe creata una nuova funzione,
    // ! causando l'effetto in useSocket di smontare e rimontare il listener continuamente.
    const handleCommentReceived = useCallback((newComment) => {
        // Aggiungiamo in coda il commento arrivato via WebSocket
        setComments(prev => [...prev, newComment]);
    }, []); // [] = nessuna dipendenza, la funzione non cambia mai

    // ! NUOVO REAL-TIME: usiamo l'hook useSocket.
    // - I primi due parametri (chat) sono null perché PostDetail non usa la chat
    // - Passiamo l'id del post corrente come activePostId
    // - Passiamo handleCommentReceived come callback per i commenti in arrivo
    // - Otteniamo emitSendComment per notificare gli altri utenti quando commentiamo noi
    const { emitSendComment } = useSocket(null, () => { }, id, handleCommentReceived);

    // ! NUOVO: al montaggio del componente (o quando cambia l'ID nell'URL)
    // carichiamo il post e i suoi commenti dal backend in parallelo con Promise.all.
    // Promise.all aspetta che ENTRAMBE le chiamate finiscano prima di aggiornare lo stato,
    // così evitiamo render parziali con dati a metà.
    useEffect(() => {
        async function loadPostAndComments() {
            try {
                setLoading(true);
                // Eseguiamo le due chiamate in parallelo per risparmiare tempo
                const [postData, commentsData] = await Promise.all([
                    getPostById(id),   // GET /api/v1/posts/:id
                    getComments(id)    // GET /api/v1/posts/:id/comments
                ]);
                setPost(postData);
                setComments(commentsData);
            } catch (err) {
                setError('Impossibile caricare il post. Riprova più tardi.');
                console.error('Errore nel caricamento del post:', err);
            } finally {
                setLoading(false);
            }
        }

        loadPostAndComments();
    }, [id]); // Rieseguiamo se l'ID cambia (es. navigazione tra post diversi)

    // ! NUOVO: funzione per inviare un nuovo commento.
    // Chiamata al click del bottone "Invia" o alla pressione di Invio.
    async function handleSendComment() {
        // Non inviamo commenti vuoti o composti solo da spazi
        if (!commentText.trim()) return;

        try {
            // POST /api/v1/posts/:id/comments — il backend aggiunge l'autore tramite il token JWT.
            // ! createComment ora restituisce direttamente il commento (non wrappato),
            // ! grazie al fix nel commentServices.js
            const newComment = await createComment(id, { text: commentText });

            // Aggiungiamo il nuovo commento in fondo alla lista senza ricaricare tutto.
            // ! Questo aggiorna l'UI dell'utente che ha scritto il commento (ottimistico).
            setComments(prev => [...prev, newComment]);

            // ! NUOVO REAL-TIME: notifichiamo via Socket.IO tutti gli altri utenti
            // ! che hanno lo stesso post aperto, inviando loro il commento completo.
            emitSendComment(id, newComment);

            // Puliamo il campo di input dopo l'invio
            setCommentText('');
        } catch (err) {
            console.error('Errore nell\'invio del commento:', err);
            const msg = err.response?.data?.message || 'Impossibile inviare il commento. Riprova.';
            alert(msg);
        }
    }

    // ! NUOVO: funzione per eliminare un commento (consentito all'autore o all'admin)
    async function handleDeleteComment(commentId) {
        try {
            await deleteComment(id, commentId);
            // Aggiorniamo la lista locale rimuovendo il commento eliminato
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch (err) {
            console.error("Errore nell'eliminazione del commento:", err);
            const msg = err.response?.data?.message || 'Impossibile eliminare il commento.';
            alert(msg);
        }
    }

    // Capiamo se l'utente loggato ha già messo like a questo post
    const liked = post?.likes?.includes(user?.id);

    async function handleToggleLike() {
        try {
            // Chiamiamo l'API usando la funzione del servizio
            const data = await toggleLike(id);
            // Aggiorniamo lo stato locale del post per vedere subito il cuore colorato
            // senza dover ricaricare l'intera pagina!
            setPost(prevPost => {
                // Se il backend ci dice che ora c'è il like, aggiungiamo l'ID dell'utente all'array
                if (data.liked) {
                    return { ...prevPost, likes: [...prevPost.likes, user.id] };
                }
                // Altrimenti lo rimuoviamo
                else {
                    return { ...prevPost, likes: prevPost.likes.filter(likeId => likeId !== user.id) };
                }
            });
        } catch (error) {
            console.error('Errore durante il like', error);
        }
    }

    // Mostriamo uno spinner mentre carichiamo i dati
    if (loading) {
        return (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                <CircularProgress />
            </Stack>
        );
    }

    // Mostriamo un errore se il caricamento è fallito
    if (error || !post) {
        return (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                <Typography color="error">{error || 'Post non trovato.'}</Typography>
            </Stack>
        );
    }

    return (
        <Stack sx={{ height: '100vh', justifyContent: 'center', padding: 2 }}>
            {/* Area principale del dettaglio post: immagine + colonna delle informazioni.*/}
            <Stack
                direction={{ xs: 'column', lg: 'row' }}
                sx={{
                    flexGrow: 1,
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 4,
                    maxHeight: { xs: 'none', lg: '90vh' },
                    overflow: 'hidden'
                }}
            >
                {/*
                Immagine del post: occupa circa metà della larghezza disponibile.
                ! MODIFICATO: prima era un'immagine fissa di Unsplash hardcoded.
                Ora mostriamo post.media (URL reale salvato nel DB).
                Se il post non ha immagine (post.media è stringa vuota), mostriamo
                un placeholder grigio per mantenere il layout bicolonna.
                */}
                {post.media ? (
                    <Box
                        component='img'
                        src={post.media}
                        alt="Immagine del post"
                        sx={{
                            width: { xs: '100%', lg: '50%' },
                            height: { xs: '50vh', lg: '100%' },
                            objectFit: 'contain',
                            backgroundColor: 'black',
                        }}
                    />
                ) : (
                    // Placeholder quando il post non ha immagine
                    <Box
                        sx={{
                            width: { xs: '100%', lg: '50%' },
                            height: { xs: '50vh', lg: '100%' },
                            backgroundColor: 'black',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Typography color="textSecondary">Nessuna immagine</Typography>
                    </Box>
                )}

                {/* Colonna destra: badge autore, descrizione, lista commenti e input per nuovi commenti */}
                <Stack sx={{

                    justifyContent: 'space-between',
                    width: { xs: '100%', lg: '50%' },
                    padding: 1,
                    height: { xs: '48%', lg: '100%' }
                }}>
                    {/*
                    Bottone X in alto a destra per chiudere il dettaglio e tornare indietro.
                    Usiamo navigate(-1) per tornare alla pagina precedente nella cronologia.
                    */}
                    <Stack direction='row' sx={{ width: '100%', justifyContent: 'space-between' }}>
                        <Stack onClick={() => navigate(`/profile/${post.userID?._id}`)} sx={{ cursor: "pointer" }}>
                            <UserBadge
                                username={post.userID?.username}
                                userId={post.userID?._id}
                            />
                        </Stack>
                        <IconButton onClick={() => navigate(-1)} aria-label="Chiudi" sx={{ cursor: 'pointer' }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    {/*
                    Descrizione del post: testo libero inserito dall'autore.
                    ! MODIFICATO: prima era testo hardcoded, ora è post.content reale.
                    */}
                    <Typography variant="body1" sx={{ padding: 1, maxHeight: '20vh' }}>
                        {post.content}
                    </Typography>

                    {/*
                    Lista dei commenti:
                    - Uso List per avere una struttura semantica e accessibile
                    - overflowY: 'auto' mantiene la lista scrollabile senza espandere l'altezza
                    - Ogni elemento è una ListItem con avatar e testo (autore + contenuto)

                    ! MODIFICATO: prima c'era un array di commenti mock hardcoded.
                    Ora mappiamo i commenti reali arrivati dal backend.
                    ! AGGIORNATO REAL-TIME: la lista si aggiorna automaticamente anche
                    quando arrivano commenti via Socket.IO da altri utenti.
                    Se non ci sono commenti, mostriamo un messaggio invitante.
                    */}
                    <List sx={{ width: '100%', overflowY: 'auto', flexGrow: 1 }}>
                        {comments.length > 0
                            ? comments.map((comment) => (
                                <ListItem key={comment._id} alignItems="start" sx={{ borderBottom: 'gray solid 1px' }}>
                                    <ListItemAvatar
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/profile/${comment.authorId._id}`)}>
                                        {/*
                                        Avatar del commentatore generato dalle sue iniziali.
                                        comment.authorId viene popolato dal backend con username.
                                        */}
                                        <Avatar
                                            src={`https://ui-avatars.com/api/?name=${comment.authorId?.username || 'U'}`}
                                            alt={comment.authorId?.username}
                                        />
                                    </ListItemAvatar>
                                    {/* ! MODIFICATO: prima erano author e text hardcoded, ora sono dati reali */}
                                    <ListItemText
                                        primary={
                                            <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle2"
                                                    onClick={() => navigate(`/profile/${comment.authorId._id}`)}
                                                    sx={{ fontWeight: 'bold', cursor: 'pointer' }}>
                                                    {comment.authorId?.username || 'Utente'}
                                                </Typography>
                                                <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                                                    <Typography variant="caption">
                                                        {getTimeAgo(comment.createdAt)}
                                                    </Typography>
                                                    {/* Pulsante di eliminazione visibile per l'autore del commento o per gli admin (moderazione) */}
                                                    {(user?.id === comment.authorId?._id || user?.role === 'admin') && (
                                                        <IconButton 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => handleDeleteComment(comment._id)} 
                                                            title={user?.role === 'admin' && user?.id !== comment.authorId?._id ? "Elimina commento (Admin)" : "Elimina commento"}
                                                            sx={{ padding: '2px' }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        }
                                        secondary={comment.text}
                                    />
                                </ListItem>
                            ))
                            : (
                                <Typography variant="body2" color="text.secondary" sx={{ padding: 2 }}>
                                    Nessun commento ancora. Sii il primo a commentare!
                                </Typography>
                            )
                        }
                    </List>

                    {/*
                    Input per aggiungere un nuovo commento:
                    - TextField per l'input testuale, controllato dallo stato commentText
                    - IconButton con SendIcon per inviare il commento

                    ! MODIFICATO: prima era puramente decorativo (nessun handler).
                    Ora è collegato allo stato e alla funzione handleSendComment.
                    Supporta anche l'invio tramite il tasto Invio (Enter).
                    ! AGGIORNATO REAL-TIME: handleSendComment ora emette anche l'evento
                    Socket.IO per notificare gli altri utenti in tempo reale.
                    */}
                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{ width: '100%', padding: 1, alignSelf: 'center', alignItems: 'center', borderTop: 'thin solid' }}>

                        {/* Bottone Like e Conteggio */}
                        <Stack direction="row" sx={{ alignItems: 'center' }}>
                            <IconButton onClick={handleToggleLike} color="error" aria-label="like">
                                {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                            </IconButton>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                {/* Se l'array esiste mostra la lunghezza, altrimenti 0 */}
                                {post?.likes?.length || 0}
                            </Typography>
                        </Stack>

                        {/* Campo di testo */}
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Scrivi un commento..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            // Invia il commento alla pressione di Invio (senza Shift)
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendComment();
                                }
                            }}
                        />
                        <IconButton onClick={handleSendComment} disabled={!commentText.trim()}>
                            <SendIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
}