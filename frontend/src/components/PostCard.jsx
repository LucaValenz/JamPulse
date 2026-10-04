import { Avatar, Card, CardContent, CardHeader, CardMedia, Typography, CardActionArea, Stack, IconButton, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from "../context/AuthContext";
import { deletePost } from "../services/postServices";
import { getTimeAgo } from "../utils/timeUtils";

// ! MODIFICATO: il componente ora accetta una prop "post".
// L'oggetto post ha questa forma (quella restituita dal backend con .populate):
// {
//   _id: "...",
//   content: "Testo del post",
//   media: "url_immagine oppure stringa vuota",
//   userID: { _id: "...", username: "Mario" },  ← grazie a .populate()
//   likes: [...],
//   createdAt: "..."
// }

export default function PostCard({ post, onDelete }) {
    const navigate = useNavigate();

    // utente loggato, serve per verificare se il post è nostro
    const { user } = useAuth();

    // stato per il menu "..." (null = chiuso, elemento DOM = aperto)
    const [menuAnchor, setMenuAnchor] = useState(null);

    // true se il post appartiene all'utente loggato.
    // post.userID._id è l'ID dell'autore (stringa dopo il populate del backend).
    // lo confrontiamo con user.id, l'ID dell'utente loggato salvato nel contesto.
    const isOwner = user?.id === post.userID?._id;

    // true se l'utente loggato possiede i privilegi di amministratore
    const isAdmin = user?.role === 'admin';

    // L'utente può eliminare il post se ne è l'autore oppure se è un admin (moderazione)
    const canDelete = isOwner || isAdmin;

    // ! NUOVO: chiama DELETE /posts/:id e, se va a buon fine, notifica il padre
    // tramite onDelete così la card sparisce dalla lista senza ricaricare la pagina.
    async function handleDelete() {
        setMenuAnchor(null); // chiude il menu
        try {
            await deletePost(post._id);
            onDelete?.(post._id); // onDelete?.() = lo chiama solo se è stato passato
        } catch (err) {
            console.error("Errore nell'eliminazione del post:", err);
        }
    }

    return (
        <Card sx={{ width: 370 }}>
            {/* Header: cliccando si va al profilo dell'autore del post.
                post.userID._id è l'ID dell'autore, disponibile grazie al populate nel backend. */}            
                {/* Header: avatar e nome autore a sinistra, menu "..." a destra se è nostro o siamo admin */}
                <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <CardActionArea onClick={() => navigate(`/profile/${post.userID._id}`)}>
                        <CardHeader
                            avatar={
                                <Avatar
                                    src={`https://ui-avatars.com/api/?name=${post?.userID?.username}`}
                                    alt={post?.userID?.username}
                                />
                            }
                            title={
                                <Stack direction='row' sx={{ justifyContent: 'space-between' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                        {post.userID?.username}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {getTimeAgo(post.createdAt)}
                                    </Typography>
                                </Stack>
                            }
                        />
                    </CardActionArea>

                    {/* Bottone "..." visibile se il post è dell'utente oppure se l'utente è un admin */}
                    {canDelete && (
                        <>
                            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small" sx={{ mr: 1 }}>
                                <MoreVertIcon color="textSecondary" />
                            </IconButton>
                            {/* Menu con le azioni disponibili sul proprio post o per moderazione */}
                            <Menu
                                anchorEl={menuAnchor}
                                open={Boolean(menuAnchor)}
                                onClose={() => setMenuAnchor(null)}
                            >
                                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                                    {isOwner ? "Elimina post" : "Elimina post (Admin)"}
                                </MenuItem>
                            </Menu>
                        </>
                    )}
                </Stack>
            

            {/* Corpo: cliccando si va alla pagina di dettaglio del post specifico.
                ! MODIFICATO: prima era hardcoded '/posts/1', ora usa l'ID reale del post */}
            <CardActionArea onClick={() => navigate(`/posts/${post._id}`)}>
                {/* Mostriamo l'immagine solo se il post ce l'ha (media non è stringa vuota).
                    L'operatore && in JSX: se la condizione a sinistra è truthy, renderizza
                    il componente a destra; altrimenti non mostra nulla. */}
                {post.media && (
                    <CardMedia
                        component="img"
                        height="220"
                        image={post.media}
                        alt="Immagine del post"
                    />
                )}

                <CardContent>
                    {/* ! MODIFICATO: prima era testo fisso, ora è il contenuto reale del post */}
                    <Typography variant="body1">{post.content}</Typography>

                    {/* Numero di like, se presenti */}
                    {post.likes?.length > 0 && (
                        <Typography variant="caption" color="textSecondary">
                            ❤️ {post.likes.length} {post.likes.length === 1 ? 'like' : 'like'}
                        </Typography>
                    )}
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
