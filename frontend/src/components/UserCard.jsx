import { Button, Card, CardActionArea, CardActions, CardContent, CardHeader, CardMedia, Chip, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";


// Le props sono il meccanismo di React per passare dati da un componente padre a un figlio.
// È come passare argomenti a una funzione: il padre decide cosa dare, il figlio lo usa.
//
// Qui destrutturiamo direttamente l'oggetto props per estrarre solo "user":
//   <UserCard user={utenteReale} />
//        ↑ il padre passa questo
//                  ↑ qui lo riceviamo
//
// Destrutturare significa estrarre una proprietà da un oggetto direttamente nella firma:
//   function UserCard({ user })  equivale a  function UserCard(props) { const user = props.user }
export default function UserCard({ user }) {
    const navigate = useNavigate();

    return (
        <Card sx={{ width: 370 }}>
            {/* Cliccando sulla card si naviga al profilo dell'utente.
                Prima era hardcoded '/profile', ora passiamo l'ID reale dell'utente:
                '/profile/abc123' → React Router lo legge come :id in <Route path="/profile/:id"> */}
            <CardActionArea onClick={() => navigate(`/profile/${user._id}`)}>

                {/* CardHeader mostra il nome dell'utente e il badge Admin se presente */}
                <CardHeader 
                    title={
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="h6">{user.username}</Typography>
                            {user.role === 'admin' && (
                                <Chip label="Admin" size="small" color="error" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 'bold' }} />
                            )}
                        </Stack>
                    } 
                />

                {/* Immagine profilo generata dinamicamente in base al nome utente.
                    ui-avatars.com è un servizio gratuito che genera avatar con le iniziali.
                    Prima era un'immagine fissa di Unsplash, ora è personalizzata per ogni utente. */}
                <CardMedia
                    component="img"
                    image={`https://ui-avatars.com/api/?name=${user.username}&size=300`}
                    alt={`Foto profilo di ${user.username}`}
                />

                <CardContent>
                    <Typography fontWeight="bold">Suona:</Typography>

                    {/* Usiamo Stack con direction="row" e flexWrap per disporre i chip in orizzontale.
                        flexWrap: 'wrap' fa andare a capo i chip se non ci sta spazio. */}
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
                        {/* user.instruments è un array di stringhe (es. ["Chitarra", "Basso"]).
                            .map() trasforma ogni elemento dell'array in un componente React.
                            Chip è un componente MUI che mostra un'etichetta arrotondata, 
                            più leggibile di una semplice Typography per le liste di tag.
                            
                            key={instrument}: in React, quando mappi una lista, ogni elemento 
                            deve avere una key univoca. Serve a React per capire quale elemento 
                            aggiornare se la lista cambia, senza rifare il render di tutti. */}
                        {user.instruments.length > 0
                            ? user.instruments.map((instrument) => (
                                <Chip key={instrument} label={instrument} size="small" color="primary" />
                            ))
                            : <Typography variant="body2" color="textSecondary">Non specificati</Typography>
                        }
                    </Stack>

                    <Typography fontWeight="bold">Generi:</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {user.genres.length > 0
                            ? user.genres.map((genre) => (
                                <Chip key={genre} label={genre} size="small" variant="contained" color="secondary" />
                            ))
                            : <Typography variant="body2" color="textSecondary">Non specificati</Typography>
                        }
                    </Stack>
                </CardContent>
            </CardActionArea>

            <CardActions>
                {/* I bottoni per ora navigano solo al profilo.
                    Nella prossima fase aggiungeremo la logica di follow/unfollow
                    e la navigazione alla chat direttamente da qui. */}
                <Button
                    variant="contained"
                    sx={{ width: '50%' }}
                    onClick={() => navigate(`/profile/${user._id}`)}
                >
                    Profilo
                </Button>
                {/* Al click navighiamo alla pagina Chat passando l'oggetto utente
                    nello "state" di navigazione. React Router lo rende disponibile
                    in Chat.jsx tramite l'hook useLocation(), senza sporcare l'URL. */}
                <Button
                    variant="contained"                    
                    sx={{ width: '50%' }}
                    onClick={() => navigate('/chat', { state: { targetUser: user } })}
                >
                    Scrivi
                </Button>
            </CardActions>
        </Card>
    );
}
