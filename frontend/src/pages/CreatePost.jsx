import { Alert, Box, Button, Card, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../services/postServices';

// Stessi formati e limite del backend: il controllo locale dà un feedback immediato,
// ma la validazione del server resta necessaria per qualsiasi client dell'API.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function CreatePost() {
    const navigate = useNavigate();
    // Campi controllati del form. media contiene l'URL remoto alternativo al file.
    const [content, setContent] = useState('');
    const [media, setMedia] = useState('');
    // image contiene { file, preview }: il File da inviare e l'URL locale dell'anteprima.
    const [image, setImage] = useState(null);
    // loading blocca modifiche e invii ripetuti; error mostra il motivo del fallimento.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Gli URL creati con createObjectURL occupano risorse nel browser.
    // Il cleanup libera quello precedente quando cambia image o la pagina si smonta.
    useEffect(() => () => {
        if (image) URL.revokeObjectURL(image.preview);
    }, [image]);

    // La selezione prepara file e anteprima; l'upload avviene solo alla pubblicazione.
    function handleImageChange(event) {
        const file = event.target.files?.[0];
        event.target.value = ''; // Consente di riselezionare lo stesso file dopo un errore.
        if (!file) return; // Chiudere il selettore senza scegliere conserva lo stato corrente.
        if (!IMAGE_TYPES.includes(file.type)) {
            setError('Seleziona un’immagine JPG, PNG, GIF o WebP.');
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            setError('L’immagine non può superare 5 MB.');
            return;
        }
        // Un file valido sostituisce l'eventuale URL: le due fonti sono alternative.
        setError(null);
        setMedia('');
        // L'URL blob serve solo all'anteprima: al server inviamo il File originale.
        setImage({ file, preview: URL.createObjectURL(file) });
    }

    // Invia testo e immagine in una sola richiesta autenticata tramite il service.
    async function handleSubmit(event) {
        event.preventDefault(); // Evita il reload del browser all'invio del form HTML.
        if (loading || !content.trim()) return;
        setLoading(true);
        setError(null);

        try {
            // FormData permette di inviare dati binari insieme al testo.
            // Non impostiamo Content-Type manualmente: Axios/browser aggiungono
            // multipart/form-data con il boundary necessario a separare le parti.
            const data = new FormData();
            data.append('content', content.trim());
            // image è il nome atteso da Multer; media mantiene il supporto agli URL.
            if (image) data.append('image', image.file);
            else data.append('media', media.trim());
            await createPost(data);
            navigate('/'); // Torniamo al feed solo dopo la conferma del server.
        } catch (err) {
            // Conserviamo testo e file, così l'utente può correggere o riprovare.
            setError(err.response?.data?.message || 'Errore durante la pubblicazione. Riprova.');
        } finally {
            setLoading(false); // Riabilita il form anche in caso di errore.
        }
    }

    return (
        // Limita la scheda allo spazio disponibile, includendo il padding nell'altezza.
        <Stack sx={{ height: '100%', maxHeight: '100dvh', minHeight: 0, boxSizing: 'border-box', justifyContent: 'center', alignItems: 'center', py: { xs: 2, sm: 3 } }}>
            <Card sx={{ width: { xs: '95%', sm: '80%' }, maxHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', borderRadius: 5, p: { xs: 2, sm: 5 } }}>
                {/* Stack genera un form HTML, mantenendo invio e validazione nativi. */}
                <Stack spacing={3} component="form" onSubmit={handleSubmit} sx={{ minHeight: 0 }}>
                    {/* Scorrono solo i campi e l'anteprima: il pulsante resta sempre visibile. */}
                    <Stack spacing={3} sx={{ minHeight: 0, overflowY: 'auto' }}>
                        <Typography variant="h5" align="center" color="primary" sx={{ fontWeight: 'bold' }}>
                            Crea un nuovo post
                        </Typography>

                        {/* Qui compaiono sia gli errori locali sia quelli restituiti dall'API. */}
                        {error && <Alert severity="error">{error}</Alert>}

                        <TextField
                            label="Scrivi la descrizione del post"
                            multiline
                            minRows={4}
                            fullWidth
                            required
                            disabled={loading}
                            value={content}
                            onChange={event => setContent(event.target.value)}
                        />

                        {/* La label apre l'input file nascosto. accept filtra il selettore,
                            mentre handleImageChange e il backend verificano i file ricevuti. */}
                        <Stack spacing={1}>
                            <Button component="label" variant="outlined" disabled={loading}>
                                {image ? 'Cambia immagine' : 'Carica immagine dal dispositivo'}
                                <input
                                    type="file"
                                    accept={IMAGE_TYPES.join(',')}
                                    hidden
                                    disabled={loading}
                                    onChange={handleImageChange}
                                />
                            </Button>
                            <Typography variant="caption" color="text.secondary">
                                Immagine opzionale · JPG, PNG, GIF o WebP · Massimo 5 MB
                            </Typography>
                            {/* L'anteprima usa il file locale senza chiamare il server. */}
                            {image && (
                                <>
                                    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{image.file.name}</Typography>
                                    <Box
                                        component="img"
                                        src={image.preview}
                                        alt="Anteprima dell’immagine selezionata"
                                        sx={{ maxHeight: 320, maxWidth: '100%', objectFit: 'contain', borderRadius: 2 }}
                                    />
                                    <Button disabled={loading} onClick={() => setImage(null)}>Rimuovi immagine</Button>
                                </>
                            )}
                        </Stack>

                        {/* L'URL resta disabilitato finché è presente un file, evitando ambiguità. */}
                        <TextField
                            label="Oppure inserisci un URL immagine"
                            type="url"
                            fullWidth
                            disabled={loading || Boolean(image)}
                            value={media}
                            onChange={event => setMedia(event.target.value)}
                            placeholder="https://esempio.com/foto.jpg"
                            helperText={image ? 'Rimuovi il file selezionato per utilizzare un URL.' : 'Opzionale'}
                        />
                    </Stack>

                    {/* Blocca invii vuoti o ripetuti e mostra l'attesa della risposta. */}
                    <Button type="submit" variant="contained" size="large" sx={{ flexShrink: 0 }} disabled={loading || !content.trim()}>
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Condividi il post'}
                    </Button>
                </Stack>
            </Card>
        </Stack>
    );
}
