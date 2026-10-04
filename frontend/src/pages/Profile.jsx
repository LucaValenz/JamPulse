// frontend/src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Button, CircularProgress, Stack, Typography, Box, TextField, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import PostCard from "../components/PostCard";
import MultiSelectFilter from "../components/MultiSelectFilter";
import { useAuth } from "../context/AuthContext";
import { getLoggedUser, getUserById, getPosts, follow, unfollow, updateProfile } from "../services/userServices";
import { instruments, genres } from "../utils/musicOptions";

// Dimensione dell'avatar del profilo.
// Ho scelto di tenerla in una costante per evitare valori hard-coded sparsi nel componente
// e rendere più semplice eventuali modifiche future al layout.
const avatarSize = 250;

// Pagina del profilo utente.
// Mostra l'avatar, le informazioni principali e la lista dei post pubblicati dall'utente.
// Funziona sia per il profilo proprio (/profile) che per quello altrui (/profile/:id).
export default function Profile() {

    // useParams legge i parametri dinamici dall'URL.
    // Se siamo su /profile/:id, id sarà l'ID dell'utente da visualizzare.
    // Se siamo su /profile (senza ID), id sarà undefined → stiamo guardando il nostro profilo.
    const { id } = useParams();

    // Dal contesto di autenticazione prendiamo l'utente attualmente loggato.
    // Serve per confrontare se il profilo visualizzato è il nostro oppure no.
    const { user: loggedUser } = useAuth();

    // Stato per i dati del profilo che stiamo visualizzando (potrebbe essere il nostro o di un altro utente)
    const [profileUser, setProfileUser] = useState(null);

    // Stato per i post dell'utente del profilo visualizzato
    const [posts, setPosts] = useState([]);

    // Stato per sapere se l'utente loggato sta già seguendo il profilo visualizzato.
    // Serve per mostrare "Segui" oppure "Smetti di seguire" sul bottone.
    const [isFollowing, setIsFollowing] = useState(false);

    // Stato per mostrare uno spinner mentre i dati vengono caricati dal backend
    const [loading, setLoading] = useState(true);

    // controlla se il dialogo delle impostazioni è aperto o chiuso
    const [settingsOpen, setSettingsOpen] = useState(false);

    // campi del form impostazioni, inizializzati quando il profilo viene caricato.
    // Sono separati da profileUser così l'utente può modificarli senza alterare
    // i dati visualizzati finché non salva.
    const [editBio, setEditBio] = useState('');
    const [editInstruments, setEditInstruments] = useState([]);
    const [editGenres, setEditGenres] = useState([]);

    // feedback visivo durante il salvataggio (disabilita il bottone Salva)
    const [saving, setSaving] = useState(false);

    // Calcoliamo se il profilo che stiamo guardando è il nostro:
    // - se non c'è un :id nell'URL → è il nostro profilo
    // - se c'è un :id ma coincide con il nostro → è sempre il nostro profilo
    const isOwnProfile = !id || id === loggedUser?.id;

    // useEffect si attiva ogni volta che cambia l'id nell'URL.
    // Questo permette di ricaricare i dati se navighi da un profilo all'altro
    // senza smontare e rimontare il componente.
    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            try {
                let user;

                if (isOwnProfile) {
                    // Siamo sul nostro profilo: usiamo getLoggedUser()
                    // che chiama GET /users/me, protetta dal nostro token JWT
                    user = await getLoggedUser();
                } else {
                    // Stiamo guardando il profilo altrui: usiamo getUserById(id)
                    // che chiama GET /users/:id
                    user = await getUserById(id);
                }

                setProfileUser(user);

                // popoliamo i campi del form con i valori attuali dell'utente.
                // Gli array instruments e genres li convertiamo in stringa separata da virgola
                // per renderli editabili in un TextField semplice.
                setEditBio(user.bio || '');
                setEditInstruments(user.instruments || []);
                setEditGenres(user.genres || []);

                // Controlliamo se l'utente loggato è già tra i follower del profilo visualizzato.
                // user.followers è un array di ObjectId (che arrivano come stringhe dal JSON).
                // .some() ritorna true se almeno un elemento soddisfa la condizione.
                setIsFollowing(
                    user.followers?.some(followerId => followerId.toString() === loggedUser?.id) || false
                );

                // Carichiamo i post dell'utente tramite GET /users/:id/posts
                const userPosts = await getPosts(user._id);
                setPosts(userPosts);

            } catch (error) {
                console.error("Errore nel caricamento del profilo:", error);
            } finally {
                // finally si esegue sempre, sia in caso di successo che di errore.
                // Garantisce che lo spinner sparisca in ogni caso.
                setLoading(false);
            }
        }

        loadProfile();
    }, [id]); // Riesegui ogni volta che l'id nell'URL cambia

    // Funzione chiamata al click del bottone "Segui" / "Smetti di seguire"
    async function handleFollowToggle() {
        try {
            if (isFollowing) {
                await unfollow(profileUser._id);  // DELETE /users/:id/follow
                setIsFollowing(false);
            } else {
                await follow(profileUser._id);    // POST /users/:id/follow
                setIsFollowing(true);
            }
        } catch (error) {
            console.error("Errore nel follow/unfollow:", error);
        }
    }

    // salva le modifiche al profilo chiamando PUT /users/me.
    // Converte le stringhe di instruments e genres in array puliti:
    // "Chitarra, Basso, " → ["Chitarra", "Basso"]
    async function handleSaveSettings() {
        setSaving(true);
        try {
            const updated = await updateProfile({
                bio: editBio,
                instruments: editInstruments,
                genres: editGenres,
            });
            // Aggiorniamo i dati visualizzati con quelli appena salvati
            setProfileUser(updated);
            setSettingsOpen(false);
        } catch (error) {
            console.error("Errore nel salvataggio delle impostazioni:", error);
        } finally {
            setSaving(false);
        }
    }

    // Mentre carichiamo i dati, mostriamo uno spinner centrato nella pagina
    if (loading) {
        return (
            <Stack sx={{ alignItems: 'center', mt: 10 }}>
                <CircularProgress />
            </Stack>
        );
    }

    // Se i dati non sono arrivati (es. utente non trovato o errore di rete)
    if (!profileUser) {
        return <Typography>Utente non trovato.</Typography>;
    }

    return (

        // Stack verticale principale del profilo: contiene tutte le sezioni della pagina in ordine logico.
        // Ho usato uno Stack in colonna perché gli elementi del profilo devono essere mostrati uno sotto l'altro: intro, azioni, post.
        <Stack spacing={3} sx={{ padding: 2, width: '100%' }}>
            {/* Sezione superiore del profilo: unisce avatar e informazioni dell'utente. */}
            {/* Ho raggruppato questi elementi in uno Stack orizzontale perché l'immagine del profilo e i dati testuali devono apparire affiancati. */}
            <Stack direction={{ sm: 'column', md: 'row' }} spacing={10} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                <Avatar
                    alt={profileUser.username}
                    // Per ora usiamo un avatar generato automaticamente dal nome utente.
                    // In futuro andrà qui l'URL dell'immagine profilo salvata nel database.
                    src={`https://ui-avatars.com/api/?name=${profileUser.username}&size=300`}
                    sx={{ width: avatarSize, height: avatarSize }} />

                <Stack spacing={3} sx={{ justifyContent: 'center', maxWidth: { sm: '100%', md: '50%' } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Typography component='h1' variant='h3' align="center">
                            {profileUser.username}
                        </Typography>
                        {profileUser.role === 'admin' && (
                            <Chip 
                                label="Admin" 
                                color="error" 
                                size="small" 
                                sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} 
                            />
                        )}
                    </Stack>
                    <Typography component='p' variant='h6' color='textSecondary' sx={{ fontStyle: 'italic' }}>
                        {/* Se bio è una stringa vuota (il default del modello), mostriamo un testo alternativo */}
                        {profileUser.bio || "Nessuna bio disponibile."}
                    </Typography>
                    {/* Chip per strumenti e generi musicali, uguali alla UserCard */}
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: "center" }}>
                        <Typography variant="h6" fontWeight="bold">Suona:</Typography>
                        {profileUser.instruments.length > 0
                            ? profileUser.instruments.map(inst => (
                                <Chip key={inst} label={inst} color="primary" size="small" />
                            ))
                            : <Typography variant="body2" color="textSecondary">Non specificati</Typography>
                        }
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: "center" }}>
                        <Typography variant="h6" fontWeight="bold">Generi:</Typography>
                        {profileUser.genres.length > 0
                            ? profileUser.genres.map(genre => (
                                <Chip key={genre} label={genre} color="secondary" size="small" />
                            ))
                            : <Typography variant="body2" color="textSecondary">Non specificati</Typography>
                        }
                    </Stack>
                    <Typography component='p' variant='body1' align="center">
                        {/* Contiamo quanti elementi ci sono negli array followers e following */}
                        {profileUser.followers.length} follower · {profileUser.following.length} seguiti
                    </Typography>
                </Stack>
            </Stack>

            {/* Sezione delle azioni rapide: visibile SOLO se stiamo guardando il profilo di un altro utente. */}
            {/* Sul nostro profilo non ha senso mostrare "Segui" o "Messaggio" a se stessi. */}
            {/* L'operatore && in JSX: se !isOwnProfile è true, renderizza il blocco; altrimenti non mostra nulla. */}
            {!isOwnProfile && (
                <Stack direction='row' spacing={3} sx={{ justifyContent: 'center' }}>
                    <Button
                        variant={isFollowing ? "outlined" : "contained"}
                        sx={{ width: '40%' }}
                        onClick={handleFollowToggle}
                    >
                        {/* Mostriamo testo diverso in base allo stato isFollowing */}
                        {isFollowing ? "Smetti di seguire" : "Segui"}
                    </Button>
                </Stack>
            )}
            {/* Bottone impostazioni: visibile SOLO sul proprio profilo */}
            {isOwnProfile && (
                <Stack direction='row' sx={{ justifyContent: 'center' }}>
                    <Button variant="outlined" onClick={() => setSettingsOpen(true)}>
                        Impostazioni profilo
                    </Button>
                    {/* ! NUOVO: Dialogo modale per le impostazioni del profilo.
                        Appare solo quando settingsOpen è true.
                        Permette di modificare bio, strumenti e generi musicali. */}
                    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm">
                        <DialogTitle>Impostazioni profilo</DialogTitle>
                        <DialogContent>
                            <Stack spacing={3} sx={{ mt: 1 }}>
                                {/* Campo bio: testo libero multilinea */}
                                <TextField
                                    label="Bio"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    placeholder="Raccontati in poche parole..."
                                />
                                {/* ! MultiSelectFilter passandogli la costante instruments */}
                                <MultiSelectFilter
                                    labelId="instruments-select-label"
                                    label="Strumenti musicali"
                                    value={editInstruments}
                                    handleChange={(e) => setEditInstruments(e.target.value)}
                                    options={instruments}
                                />

                                {/* ! MultiSelectFilter passandogli la costante genres */}
                                <MultiSelectFilter
                                    labelId="genres-select-label"
                                    label="Generi musicali"
                                    value={editGenres}
                                    handleChange={(e) => setEditGenres(e.target.value)}
                                    options={genres}
                                />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            {/* Annulla: chiude il dialogo senza salvare */}
                            <Button onClick={() => setSettingsOpen(false)} disabled={saving}>
                                Annulla
                            </Button>
                            {/* Salva: chiama handleSaveSettings e si disabilita durante l'attesa */}
                            <Button variant="contained" onClick={handleSaveSettings} disabled={saving}>
                                {saving ? 'Salvataggio...' : 'Salva'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Stack>
            )}

            {/* Sezione dei post dell'utente: mostra più card in modo ordinato e responsivo. */}
            {/* Ho usato un Box con display: grid, per avere una tabella ordinata e centrata. Auto-fill rende la tabella responsiva */}
            <Box
                sx={{
                    display: 'grid',
                    // 'auto-fill' crea colonne rigide da 370px.                 
                    gridTemplateColumns: 'repeat(auto-fill, 370px)',
                    gap: 3, // Spaziatura di 24px (uguale a spacing={3} dello Stack)
                    justifyContent: 'center', // Centra l'intera griglia rispetto alla pagina                                  
                }}
            >
                {posts.length > 0
                    ? posts.map(post => (
                        // key è obbligatorio in React quando mappi una lista:
                        // aiuta React a identificare quale elemento aggiornare senza rifare il render di tutti
                        // onDelete rimuove il post eliminato dallo stato locale
                        <PostCard
                            key={post._id}
                            post={post}
                            onDelete={(deletedId) => setPosts(prev => prev.filter(p => p._id !== deletedId))}
                        />
                    ))
                    : <Typography variant="body1">Nessun post ancora.</Typography>
                }
            </Box>
        </Stack >
    );
}