import { Alert, Button, Card, CircularProgress, Stack, TextField, Typography, } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../services/postServices";

export default function CreatePost() {
    const navigate = useNavigate();

    // Testo della descrizione digitato dall'utente
    const [content, setContent] = useState('');

    // ! NUOVO: URL dell'immagine.
    // Per ora gestiamo l'immagine come URL testuale inserito dall'utente,
    // perché l'upload vero (inviare il file binario al server e salvarlo)
    // richiede una gestione separata con multer o un servizio cloud come Cloudinary.
    // È una scelta deliberata: prima facciamo funzionare il flusso base, poi aggiungiamo l'upload.
    const [media, setMedia] = useState('');

    // Feedback visivo durante l'invio: blocca il bottone e mostra uno spinner
    const [loading, setLoading] = useState(false);

    // Messaggio di errore da mostrare se la chiamata al backend fallisce
    const [error, setError] = useState(null);

    // ! NUOVO: funzione chiamata quando l'utente clicca "Condividi il post".
    // È async perché al suo interno aspettiamo la risposta del backend con await.
    async function handleSubmit(e) {
        // e.preventDefault() blocca il comportamento default del browser:
        // senza di esso, il form farebbe un reload della pagina all'invio,
        // perdendo tutto lo stato React e interrompendo la chiamata al backend.
        e.preventDefault();

        // Validazione minima: il contenuto è obbligatorio
        if (!content.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // Chiamiamo POST /api/v1/posts con i dati del form.
            // Il service aggiunge automaticamente il token JWT nell'header
            // grazie all'interceptor configurato in axios.js.
            // Il backend legge l'ID dell'autore dal token, non dal body.
            await createPost({ content: content.trim(), media: media.trim() });

            // Post creato con successo: torniamo alla Home per vederlo nel feed
            navigate('/');
        } catch (err) {
            // Mostriamo il messaggio specifico inviato dal backend (es. validazione) o un fallback chiaro
            const errorMessage = err.response?.data?.message || 'Errore durante la pubblicazione. Riprova.';
            setError(errorMessage);
            console.error('Errore nella creazione del post:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Stack sx={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <Card sx={{ width: '80%', borderRadius: 5, padding: 5 }}>
                {/* ! MODIFICATO: da <form> a onSubmit su Stack.
                    I form HTML con <form> in React + MUI possono causare comportamenti anomali,
                    specialmente con i Dialog. È più idiomatico gestire l'invio
                    con onSubmit direttamente sullo Stack che funge da contenitore. */}
                <Stack spacing={5} component="form" onSubmit={handleSubmit}>
                    <Typography variant="h5" align="center" color="primary" sx={{ fontWeight: 'bold' }}>
                        Crea un nuovo post
                    </Typography>

                    {/* Messaggio di errore: appare solo se error non è null */}
                    {error && <Alert severity="error">{error}</Alert>}

                    {/* ! MODIFICATO: ora è un controlled input.
                        value e onChange collegano il campo allo stato React,
                        così possiamo leggere il testo al momento dell'invio. */}
                    <TextField
                        label="Scrivi la descrizione del post"
                        multiline
                        minRows={4}
                        fullWidth
                        required
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />

                    {/* ! MODIFICATO: campo URL immagine al posto dell'input file.
                        Semplifica il flusso iniziale: l'utente incolla un link a un'immagine
                        invece di caricare un file. Il campo non è required perché i post
                        possono essere solo testuali. */}
                    <TextField
                        label="URL immagine (opzionale)"
                        fullWidth
                        value={media}
                        onChange={(e) => setMedia(e.target.value)}
                        placeholder="https://esempio.com/foto.jpg"
                    />

                    {/* ! MODIFICATO: il bottone mostra uno spinner durante il caricamento
                        ed è disabilitato per evitare invii doppi.
                        disabled={loading} impedisce click multipli mentre la chiamata è in corso. */}
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Condividi il post'}
                    </Button>
                </Stack>
            </Card>
        </Stack>
    );
}
