# 🎵 JamPulse

**JamPulse** è un social network dedicato ai musicisti. Permette di connettersi con altri artisti, condividere post, commentare in tempo reale, scambiarsi messaggi privati e costruire una rete di contatti musicali basata su strumenti e generi musicali condivisi.

---

## 📋 Indice

- [Panoramica](#panoramica)
- [Funzionalità](#funzionalità)
- [Stack Tecnologico](#stack-tecnologico)
- [Architettura](#architettura)
- [Struttura del Progetto](#struttura-del-progetto)
- [Modelli dei Dati](#modelli-dei-dati)
- [API REST](#api-rest)
- [Real-Time con Socket.IO](#real-time-con-socketio)
- [Avvio con Docker](#avvio-con-docker)
- [Avvio in Sviluppo (senza Docker)](#avvio-in-sviluppo-senza-docker)
- [Variabili d'Ambiente](#variabili-dambiente)
- [Documentazione API](#documentazione-api)

---

## Panoramica

JamPulse nasce come piattaforma social pensata per musicisti: ogni utente può indicare gli strumenti che suona e i generi musicali preferiti, pubblicare post (con testo e link media), mettere like, commentare, seguire altri artisti e chattare in privato. Tutte le interazioni di commento e messaggistica avvengono **in tempo reale** tramite WebSocket (Socket.IO).

---

## Funzionalità

| Area | Funzionalità |
|---|---|
| **Autenticazione** | Registrazione con username/email/password, login con JWT (2h), logout, sessione persistente via localStorage |
| **Profilo** | Visualizzazione e modifica di bio, strumenti e generi musicali; visualizzazione post di un utente |
| **Social** | Follow / Unfollow di altri utenti, visualizzazione lista following |
| **Post** | Creazione, modifica, eliminazione di post (testo + link media opzionale); feed cronologico; like/unlike toggle |
| **Commenti** | CRUD completo; aggiornamento in tempo reale per tutti gli utenti che hanno il post aperto |
| **Chat** | Creazione di chat private 1-to-1, eliminazione, messaggi in tempo reale via Socket.IO |
| **Ricerca** | Ricerca utenti con filtri per strumento e genere musicale |
| **Tema** | Dark / Light mode con ThemeContext |
| **API Docs** | Swagger UI integrato su `/api-docs` |

---

## Stack Tecnologico

### Backend
| Tecnologia | Versione | Ruolo |
|---|---|---|
| Node.js | LTS | Runtime |
| Express | 5.x | Framework HTTP |
| MongoDB | 7 | Database NoSQL |
| Mongoose | 9.x | ODM per MongoDB |
| Socket.IO | 4.x | WebSocket / Real-time |
| JWT (jsonwebtoken) | 9.x | Autenticazione stateless |
| bcryptjs | 3.x | Hashing password |
| Swagger (swagger-jsdoc + swagger-ui-express) | — | Documentazione API |
| dotenv | 17.x | Gestione variabili d'ambiente |

### Frontend
| Tecnologia | Versione | Ruolo |
|---|---|---|
| React | 19.x | UI Framework |
| Vite | 8.x | Build tool / Dev server |
| React Router DOM | 7.x | Routing SPA |
| MUI (Material UI) | 9.x | Component library |
| Axios | 1.x | Client HTTP |
| Socket.IO Client | 4.x | WebSocket client |

### Infrastruttura
| Tecnologia | Ruolo |
|---|---|
| Docker + Docker Compose | Containerizzazione |
| Nginx | Reverse proxy (serve frontend + proxying API) |

---

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                   │
│  ┌──────────────┐  HTTP/REST   ┌────────────────────────┐   │
│  │    Axios     │ ──────────── │                        │   │
│  └──────────────┘              │       Nginx :80        │   │
│  ┌──────────────┐  WebSocket   │  (reverse proxy)       │   │
│  │  Socket.IO   │ ──────────── │                        │   │
│  │   Client     │              └──────────┬─────────────┘   │
└──┴──────────────┴─────────────────────────┼─────────────────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │           Backend Node.js              │
                        │   Express (REST) + Socket.IO (WS)      │
                        │                                        │
                        │  Routes → Controllers → Mongoose       │
                        └───────────────────────────────────────┘
                                            │
                                     ┌──────┴──────┐
                                     │   MongoDB   │
                                     └─────────────┘
```

Il backend espone un **server HTTP unificato** (`http.createServer`) condiviso da Express (per le REST API) e da Socket.IO (per i WebSocket). Nginx funge da reverse proxy che smista il traffico verso frontend e backend.

---

## Struttura del Progetto

```
JamPulse/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Registrazione e login
│   │   ├── chatController.js       # CRUD chat
│   │   ├── commentController.js    # CRUD commenti
│   │   ├── healthController.js     # Health check
│   │   ├── messageController.js    # CRUD messaggi
│   │   ├── postController.js       # CRUD post + like
│   │   └── userController.js       # Profilo, follow/unfollow, ricerca
│   ├── middlewares/
│   │   └── authMiddleware.js       # Verifica JWT su tutte le rotte protette
│   ├── models/
│   │   ├── User.js                 # Schema utente (con bcrypt pre-save hook)
│   │   ├── Post.js                 # Schema post (con likes array)
│   │   ├── Comment.js              # Schema commento
│   │   ├── Chat.js                 # Schema chat (participants)
│   │   └── Message.js              # Schema messaggio
│   ├── routes/
│   │   ├── authRoute.js
│   │   ├── chatRoute.js
│   │   ├── commentRoute.js
│   │   ├── healthRoute.js
│   │   ├── messageRoute.js
│   │   ├── postRoute.js
│   │   └── userRoute.js
│   ├── server.js                   # Entry point: Express + Socket.IO + MongoDB
│   ├── swagger.js                  # Configurazione Swagger/OpenAPI
│   ├── seed.js                     # Script per popolare il DB con dati demo
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Registrazione e login
│   │   │   ├── Home.jsx            # Feed dei post
│   │   │   ├── Search.jsx          # Ricerca utenti con filtri
│   │   │   ├── Profile.jsx         # Profilo proprio e altrui
│   │   │   ├── PostDetail.jsx      # Dettaglio post + commenti real-time
│   │   │   ├── Chat.jsx            # Chat privata real-time
│   │   │   └── CreatePost.jsx      # Creazione nuovo post
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Navigazione laterale
│   │   │   ├── PostCard.jsx        # Card post (like, delete, link a dettaglio)
│   │   │   ├── UserCard.jsx        # Card utente (follow/unfollow)
│   │   │   ├── UserBadge.jsx       # Badge utente compatto
│   │   │   ├── MessageBubble.jsx   # Bolla messaggio in chat
│   │   │   ├── SearchBar.jsx       # Input di ricerca
│   │   │   ├── MultiSelectFilter.jsx # Filtro multi-selezione (generi, strumenti)
│   │   │   └── PageLayout.jsx      # Layout con Sidebar + Outlet
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Stato autenticazione globale
│   │   │   └── ThemeContext.jsx    # Dark/Light mode globale
│   │   ├── hooks/
│   │   │   └── useSocket.js        # Hook custom per Socket.IO (chat + commenti)
│   │   ├── services/               # Funzioni Axios per ogni entità
│   │   │   ├── authServices.js
│   │   │   ├── chatServices.js
│   │   │   ├── commentServices.js
│   │   │   ├── messageServices.js
│   │   │   ├── postServices.js
│   │   │   └── userServices.js
│   │   ├── utils/
│   │   │   ├── musicOptions.js     # Costanti: strumenti e generi disponibili
│   │   │   └── timeUtils.js        # Formattazione timestamp
│   │   ├── axios.js                # Configurazione globale Axios (baseURL + interceptors)
│   │   ├── App.jsx                 # Router principale + ProtectedRoute
│   │   └── main.jsx                # Entry point React
│   ├── public/Logo/                # Logo in varianti (desktop/mobile, dark/light)
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
│
├── Documentazione - Esame/
│   ├── Descrizione Componenti React.docx
│   ├── Modello dei Dati.docx
│   ├── UseCase.png / .txt
│   ├── SequenceLogin.png / .txt
│   ├── SequenceCreatePost.png / .txt
│   └── SequenceChatMessage.png / .txt
│
├── docker-compose.yml
└── README.md
```

---

## Modelli dei Dati

### User
```js
{
  username:    String (unique, required),
  email:       String (unique, required),
  password:    String (hashed con bcrypt, required),
  bio:         String (default: ''),
  instruments: [String] (default: []),
  genres:      [String] (default: []),
  following:   [ObjectId → User],
  followers:   [ObjectId → User],
  createdAt, updatedAt  // timestamps automatici
}
```

### Post
```js
{
  userID:    ObjectId → User (required),
  content:   String (required),
  media:     String (URL opzionale, default: ''),
  likes:     [ObjectId → User] (default: []),
  createdAt, updatedAt
}
```

### Comment
```js
{
  postId:    ObjectId → Post (required),
  authorId:  ObjectId → User (required),
  text:      String (required, trimmed),
  createdAt, updatedAt
}
```

### Chat
```js
{
  participants: [ObjectId → User] (required),
  createdAt, updatedAt
}
```

### Message
```js
{
  chatID:    ObjectId → Chat (required),
  senderID:  ObjectId → User (required),
  content:   String (required),
  createdAt, updatedAt
}
```

---

## API REST

Tutte le rotte (eccetto `/api/v1/auth/*` e `/api/v1/health`) richiedono il token JWT nell'header:

```
Authorization: Bearer <token>
```

### Auth — `/api/v1/auth`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/register` | Registrazione nuovo utente |
| POST | `/login` | Login, restituisce JWT + dati utente |

### Users — `/api/v1/users`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/me` | Profilo utente loggato |
| PUT | `/me` | Aggiorna bio, strumenti, generi |
| GET | `/me/following` | Lista utenti seguiti (popolati) |
| GET | `/` | Lista tutti gli utenti |
| GET | `/:id` | Profilo utente per ID |
| GET | `/:id/posts` | Post di un utente specifico |
| POST | `/:id/follow` | Segui un utente |
| DELETE | `/:id/follow` | Smetti di seguire |

### Posts — `/api/v1/posts`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/` | Tutti i post (decrescente per data) |
| POST | `/` | Crea nuovo post |
| GET | `/:id` | Singolo post |
| PUT | `/:id` | Modifica post (solo autore) |
| DELETE | `/:id` | Elimina post (solo autore) |
| POST | `/:id/like` | Toggle like/unlike |

### Comments — `/api/v1/posts/:id/comments`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/` | Commenti di un post |
| POST | `/` | Crea commento |
| PUT | `/:commentId` | Modifica commento |
| DELETE | `/:commentId` | Elimina commento |

### Chats — `/api/v1/chats`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/` | Chat dell'utente loggato |
| POST | `/` | Crea una nuova chat |
| DELETE | `/:id` | Elimina una chat |

### Messages — `/api/v1/chats/:id/messages`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/` | Messaggi di una chat |
| POST | `/` | Invia messaggio |
| PUT | `/:messageId` | Modifica messaggio |
| DELETE | `/:messageId` | Elimina messaggio |

### Health — `/api/v1/health`
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/` | Stato del server |

---

## Real-Time con Socket.IO

Il backend gestisce due tipologie di stanze (rooms):

### Chat Room
- Il client emette `join_chat` con il `chatId` all'apertura di una conversazione.
- I messaggi sono prima **salvati nel DB via REST**, poi il client emette `send_message`.
- Il server fa broadcast con `receive_message` a tutti gli altri partecipanti nella stanza.
- Al cambio conversazione o chiusura, il client emette `leave_chat`.

### Post Room
- Il client emette `join_post` con il `postId` all'apertura di un PostDetail.
- I commenti sono prima **salvati nel DB via REST**, poi il client emette `send_comment`.
- Il server fa broadcast con `receive_comment` agli altri utenti che hanno lo stesso post aperto.
- All'uscita dal PostDetail il client emette `leave_post`.

Il hook custom `useSocket` (in `src/hooks/useSocket.js`) centralizza tutta questa logica e offre `emitSendMessage` e `emitSendComment` ai componenti.

---

## Avvio con Docker

### Prerequisiti
- [Docker](https://www.docker.com/) e Docker Compose installati

### Procedura

1. **Clona il repository**
   ```bash
   git clone <url-repository>
   cd JamPulse
   ```

2. **Configura le variabili d'ambiente del backend**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Poi modifica `backend/.env` con i tuoi valori (vedi sezione [Variabili d'Ambiente](#variabili-dambiente)).

3. **Avvia tutti i servizi**
   ```bash
   docker-compose up --build
   ```

4. **Accedi all'applicazione**
   - Frontend: [http://localhost](http://localhost)
   - Swagger API Docs: [http://localhost/api-docs](http://localhost/api-docs)

> **Nota:** Docker Compose gestisce automaticamente MongoDB, Backend, Frontend e Nginx. I dati MongoDB vengono persistiti nel volume `mongo_data`.

---

## Avvio in Sviluppo (senza Docker)

### Prerequisiti
- Node.js 18+
- MongoDB in esecuzione in locale (porta 27017)

### Backend

```bash
cd backend
cp .env.example .env
# Configura .env (vedi sezione variabili d'ambiente)
npm install
npm run dev        # avvio con nodemon (hot reload)
```

Il server sarà disponibile su `http://localhost:<PORT>` (porta definita in `.env`).

### Frontend

```bash
cd frontend
npm install
npm run dev        # avvio con Vite
```

Il frontend sarà disponibile su `http://localhost:5173`.

> **Attenzione:** In modalità sviluppo locale, aggiorna l'URL del Socket.IO in `src/hooks/useSocket.js` con la porta effettiva del tuo backend (default `4000`).

### (Opzionale) Popolamento con dati demo

```bash
cd backend
node seed.js
```

---

## Variabili d'Ambiente

Crea il file `backend/.env` partendo da `.env.example`:

```env
PORT=4000
MONGO_URI=mongodb://mongo:27017/jampulse   # oppure mongodb://localhost:27017/jampulse in locale
JWT_SECRET=la_tua_chiave_segreta_jwt
CORS_ORIGIN=http://localhost               # URL del frontend (usare * per sviluppo)
```

| Variabile | Descrizione | Esempio |
|---|---|---|
| `PORT` | Porta su cui ascolta il backend | `4000` |
| `MONGO_URI` | URI di connessione a MongoDB | `mongodb://mongo:27017/jampulse` |
| `JWT_SECRET` | Chiave segreta per firmare i JWT | `supersecretkey123` |
| `CORS_ORIGIN` | Origine consentita per CORS | `http://localhost` |

---

## Documentazione API

La documentazione interattiva Swagger/OpenAPI è disponibile all'endpoint:

```
http://localhost/api-docs        (con Docker)
http://localhost:4000/api-docs   (sviluppo locale)
```

Permette di esplorare e testare tutte le rotte REST direttamente dal browser.

---

## Strumenti e Generi Disponibili

### Strumenti
Arpa, Basso, Batteria, Chitarra, Pianoforte, Sassofono, Sintetizzatore, Tastiera, Voce

### Generi Musicali
Blues, Classica, Elettronica, Funk, Hip Hop, Indie, Jazz, Metal, Pop, Rock
