import { Box, Stack, Typography, Tab, TextField, Button, Alert } from "@mui/material";
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { useState } from "react";
import MultiSelectFilter from "../components/MultiSelectFilter";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { instruments, genres } from "../utils/musicOptions";
import { useTheme } from "@mui/material/styles";
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Luna
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Sole
import { useColorMode } from "../context/ThemeContext";

// Pagina di accesso e registrazione dell'applicazione.
// Qui vengono mostrati i due form principali e il passaggio tra le due modalità avviene tramite tab.
// La pagina è divisa in due blocchi: testo introduttivo a sinistra e form di autenticazione a destra.
export default function Login() {
    const { login, register } = useAuth(); // Prendiamo le funzioni dal Context
    const theme = useTheme()
    const colorMode = useColorMode()
    const navigate = useNavigate(); // Inizializziamo il navigatore
    // Stato che controlla quale tab è attiva: accesso o registrazione.
    const [tabValue, setTabValue] = useState('1');

    // -------------------------------------------------------
    // State per il form di LOGIN
    // Ogni campo del form ha il suo "pezzo di stato".
    // loginData è un oggetto con due proprietà: username e password.
    // setLoginData è la funzione che lo aggiorna.
    // -------------------------------------------------------
    const [loginData, setLoginData] = useState({
        username: '',
        password: ''
    });

    // -------------------------------------------------------
    // State per il form di REGISTRAZIONE
    // Stessa cosa, ma con più campi.
    // -------------------------------------------------------
    const [registerData, setRegisterData] = useState({
        email: '',
        username: '',
        password: '',
        instruments: [],
        genres: []
    });

    // -------------------------------------------------------
    // State per i messaggi di errore
    // Servirà per mostrare errori all'utente,
    // -------------------------------------------------------
    const [error, setError] = useState('');

    // Aggiorna la tab attiva quando l'utente seleziona un'altra voce.
    const tabChange = (event, newValue) => {
        setTabValue(newValue)
        setError(''); // Puliamo gli errori quando si cambia tab
    }

    // -------------------------------------------------------
    // Handler generico per i campi di testo
    //
    // Invece di scrivere una funzione separata per ogni campo
    // (setUsername, setPassword, setEmail...), usiamo UN SOLO
    // handler che funziona per tutti i TextField.
    //
    // Come? Grazie all'attributo "name" del campo:
    // quando l'utente digita in <TextField name="username">,
    // event.target.name è "username" e event.target.value
    // è quello che ha scritto.
    //
    // Lo spread operator "...prev" copia tutti i campi
    // esistenti, e poi sovrascriviamo solo quello cambiato
    // con la sintassi [name]: value (nome di chiave dinamico).
    // -------------------------------------------------------
    const handleLoginChange = (event) => {
        const { name, value } = event.target;
        setLoginData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegisterChange = (event) => {
        const { name, value } = event.target;
        setRegisterData(prev => ({ ...prev, [name]: value }));
    };

    // -------------------------------------------------------
    // Handler per i MultiSelectFilter
    // I MultiSelectFilter non sono TextField standard,
    // quindi hanno bisogno di handler dedicati che aggiornano
    // solo il campo corretto nell'oggetto registerData.
    // -------------------------------------------------------

    const handleInstrumentsChange = (event) => {
        setRegisterData(prev => ({ ...prev, instruments: event.target.value }));
    };

    const handleGenresChange = (event) => {
        setRegisterData(prev => ({ ...prev, genres: event.target.value }));
    };

    // Helper per estrarre in modo chiaro e leggibile il messaggio di errore da una risposta Axios
    const extractErrorMessage = (err, defaultMsg) => {
        // Caso 1: il server non risponde o la connessione di rete è fallita
        if (!err.response) {
            return 'Impossibile contattare il server. Verifica la connessione o che il backend sia attivo.';
        }
        // Caso 2: la rotta richiesta non esiste (404 Not Found)
        if (err.response.status === 404) {
            return 'Servizio non trovato (404). Verifica la configurazione del server.';
        }
        // Caso 3: il server ha restituito un messaggio di errore strutturato in JSON
        if (err.response.data && err.response.data.message) {
            return err.response.data.message;
        }
        return defaultMsg;
    };

    // -------------------------------------------------------
    // Submit handlers 
    // Gestisce l'invio del form di Login
    const handleLogin = async (event) => {
        event.preventDefault(); // Evita il ricaricamento della pagina al momento del submit
        setError(''); // Resetta eventuali messaggi di errore mostrati in precedenza

        // Validazione preventiva lato client: entrambi i campi sono obbligatori
        if (!loginData.username.trim() || !loginData.password.trim()) {
            setError('Inserisci sia username che password.');
            return;
        }

        try {
            // Richiama la funzione dal Context per autenticare l'utente e salvare il token
            await login({
                username: loginData.username.trim(),
                password: loginData.password
            });
            // Reindirizza l'utente alla rotta principale (Home) dopo l'accesso
            navigate('/');
        } catch (err) {
            // Cattura l'errore (401 credenziali errate, 404 endpoint non trovato, o server spento)
            const message = extractErrorMessage(err, 'Errore durante il login');
            setError(message);
        }
    };

    // Gestisce l'invio del form di Registrazione con auto-login
    const handleRegister = async (event) => {
        event.preventDefault(); // Evita il ricaricamento della pagina al momento del submit
        setError(''); // Resetta eventuali messaggi di errore

        // Validazione preventiva lato client
        if (!registerData.email.trim() || !registerData.username.trim() || !registerData.password.trim()) {
            setError('Email, username e password sono obbligatori.');
            return;
        }

        try {
            // Effettua la chiamata al backend per creare il nuovo utente nel database
            await register({
                ...registerData,
                email: registerData.email.trim(),
                username: registerData.username.trim()
            });

            // Esegue il Login automatico subito dopo la registrazione
            await login({
                username: registerData.username.trim(),
                password: registerData.password
            });

            // Reindirizza il nuovo utente (ora loggato) alla Home
            navigate('/');
        } catch (err) {
            // Cattura errori (es. duplicati 400, o server offline)
            const message = extractErrorMessage(err, 'Errore durante la registrazione');
            setError(message);
        }
    };

    return (
        <>
            <Stack direction={'row-reverse'}>
                <Button onClick={colorMode.toggleColorMode}
                    startIcon={theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}>
                    <Typography>
                        {/* Cambiamo testo in base al tema attuale */}
                        {theme.palette.mode === 'dark' ? 'Tema Chiaro' : 'Tema Scuro'}
                    </Typography>
                </Button>

            </Stack>
            {/* Stack principale che contiene tutto il contenuto della pagina di accesso.
            //È usata come contenitore flessibile per organizzare il lato testo e il lato form.*/}
            <Stack direction={{ sm: "column", md: 'row' }} spacing={2} sx={{ flexGrow: 1, height: '93vh', padding: 2, justifyContent: 'space-evenly' }}>
                {/* Stack verticale che contiene il testo introduttivo dell'applicazione. */}
                <Stack sx={{ width: { sm: '100%', md: '40%' }, justifyContent: 'center' }}>
                    {/* Titolo principale della pagina. */}
                    <Typography component='h1' variant='h2' align="center">Benvenuto su JamPulse!</Typography>

                    {/* Descrizione introduttiva dell'applicazione. */}
                    <Typography component='h2' variant='h6' align="justify">
                        Connettiti con i musicisti intorno a te.
                        Che tu stia cercando la voce perfetta per la tua band,
                        un chitarrista per una jam session o semplicemente un posto dove condividere la tua musica,
                        JamPulse è il palco giusto per te.
                    </Typography>
                </Stack>

                {/* Box sul lato destro che contiene il form di accesso e registrazione. */}
                <Box sx={{ width: { sm: '100%', md: '40%' }, alignContent: 'center' }}>
                    {/* Contesto dei tab che gestisce lo stato attivo tra accesso e registrazione. */}
                    <TabContext value={tabValue}>
                        {/* Box che contiene i tab di selezione tra accesso e registrazione. */}
                        <Box sx={{ justifyItems: 'center' }}>
                            <TabList onChange={tabChange}>
                                <Tab label='ACCEDI' value='1'></Tab>
                                <Tab label='REGISTRATI' value='2'></Tab>
                            </TabList>
                        </Box>

                        {/* Mostriamo l'errore sopra i form, se presente */}
                        {error && (
                            <Alert severity="error" sx={{ mx: 3, mt: 1 }}>
                                {error}
                            </Alert>
                        )}

                        {/* Pannello dedicato al login. */}
                        <TabPanel value='1'>
                            <form onSubmit={handleLogin}>
                                {/* Stack verticale per impilare i campi del form con spazio uniforme. */}
                                <Stack spacing={2}>
                                    <TextField
                                        fullWidth
                                        required
                                        label='Username'
                                        name="username"
                                        value={loginData.username}
                                        onChange={handleLoginChange}
                                    />
                                    <TextField
                                        fullWidth
                                        required
                                        label='Password'
                                        type="password"
                                        name="password"
                                        value={loginData.password}
                                        onChange={handleLoginChange}
                                    />
                                    <Button type="submit" variant="contained">Accedi</Button>
                                </Stack>
                            </form>
                        </TabPanel>

                        {/* Pannello dedicato alla registrazione. */}
                        <TabPanel value='2'>
                            <form onSubmit={handleRegister}>
                                {/* Stack verticale per organizzare i campi di registrazione in modo ordinato. */}
                                <Stack spacing={2}>
                                    <TextField
                                        fullWidth
                                        required
                                        label='Email'
                                        type="email"
                                        name="email"
                                        value={registerData.email}
                                        onChange={handleRegisterChange}
                                    />
                                    <TextField
                                        fullWidth
                                        required
                                        label='Username'
                                        name="username"
                                        value={registerData.username}
                                        onChange={handleRegisterChange}
                                    />
                                    <TextField
                                        fullWidth
                                        required
                                        label='Password'
                                        type="password"
                                        name="password"
                                        value={registerData.password}
                                        onChange={handleRegisterChange}
                                    />
                                    <MultiSelectFilter
                                        labelId='instrument-select-label'
                                        value={registerData.instruments}
                                        handleChange={handleInstrumentsChange}
                                        label='Strumenti Musicali'
                                        options={instruments}
                                    />
                                    <MultiSelectFilter
                                        labelId='genre-select-label'
                                        value={registerData.genres}
                                        handleChange={handleGenresChange}
                                        label='Generi Musicali'
                                        options={genres}
                                    />
                                    <Button type="submit" variant="contained">Registrati</Button>
                                </Stack>
                            </form>
                        </TabPanel>
                    </TabContext>
                </Box>
            </Stack>
        </>
    );
}
