# 🎵 JamPulse — The Musicians' Social Network

<p align="center">
  <img src="frontend/public/Logo/DesktopLight.png" alt="JamPulse Logo" width="380" />
</p>

<p align="center">
  <strong>La piattaforma social e di networking dedicata ai musicisti: connettiti con altri artisti, condividi produzioni, scambia messaggi privati e partecipa a discussioni in tempo reale basate su affinità musicali, strumenti e generi condivisi.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Material--UI-9.2-007FFF?style=for-the-badge&logo=mui&logoColor=white" alt="Material UI" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Nginx-Reverse--Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/OpenAPI-3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
</p>

---

## Immagini caricate: salvataggio in MongoDB

Gli upload fino a 5 MB sono salvati come binari nella collezione `postimages`, separata dai post. Il campo `media` del post mantiene l'URL relativo `/api/v1/uploads/<nome>`; il backend legge il contenuto da MongoDB. Le immagini sono quindi disponibili da tutte le installazioni collegate allo stesso database tramite `MONGO_URI`. Due MongoDB locali distinti, anche con lo stesso nome del database, non condividono i dati.

Per applicare l'aggiornamento al backend Docker:

```sh
docker compose up -d --build backend
docker compose logs backend
```

Eseguire prima sul PC che conserva gli upload originali: dopo la connessione al DB il backend importa automaticamente i file usati dai post da `backend/uploads` (in Docker, il volume `post_uploads`). L'importazione mantiene gli URL, può essere ripetuta e non cancella i file originali. I log segnalano file importati, mancanti o non validi. I file mancanti devono essere recuperati dal PC/volume originale; i soli percorsi nel database non permettono di ricostruirli. Il volume precedente rimane montato per consentire questa migrazione; i nuovi upload non lo utilizzano.

## 📋 Indice dei Contenuti

1. [Panoramica e Value Proposition](#-panoramica-e-value-proposition)
2. [Galleria Interfaccia Utente (UI Showcase)](#-galleria-interfaccia-utente-ui-showcase)
3. [Funzionalità Principali](#-funzionalità-principali)
4. [Architettura del Sistema e Network Flow](#-architettura-del-sistema-e-network-flow)
5. [Stack Tecnologico Dettagliato](#-stack-tecnologico-dettagliato)
6. [Modello Concettuale dei Dati & ER Diagram](#-modello-concettuale-dei-dati--er-diagram)
7. [Flussi Operativi e Diagrammi di Sequenza](#-flussi-operativi-e-diagrammi-di-sequenza)
8. [Architettura Real-Time con Socket.IO](#-architettura-real-time-con-socketio)
9. [Specifiche Complete API REST](#-specifiche-complete-api-rest)
10. [Sicurezza e Controllo Accessi (RBAC)](#-sicurezza-e-controllo-accessi-rbac)
11. [Struttura della Codebase](#-struttura-della-codebase)
12. [Guida all'Avvio Rapido con Docker](#-guida-allavvio-rapido-con-docker)
13. [Guida all'Avvio in Ambiente di Sviluppo](#-guida-allavvio-in-ambiente-di-sviluppo)
14. [Variabili d'Ambiente](#-variabili-dambiente)
15. [Database Seeding & Account Demo di Prova](#-database-seeding--account-demo-di-prova)
16. [Documentazione Interattiva Swagger & Health Check](#-documentazione-interattiva-swagger--health-check)
17. [Tassonomia Musicale Supportata](#-tassonomia-musicale-supportata)
18. [Roadmap & Evolutive Future](#-roadmap--evolutive-future)

---

## 🌟 Panoramica e Value Proposition

Trovare membri per completare una band, avviare collaborazioni per registrare nuovi brani o ricevere feedback qualificati sulle proprie melodie è spesso dispersivo sui social network generalisti.

**JamPulse** è un ecosistema full-stack progettato specificamente per le esigenze dei musicisti. Consente a ciascun artista di:
- **Esibire la propria identità musicale**: profilo arricchito con bio artistica, strumenti suonati e generi di riferimento.
- **Social Feed & Content Sharing**: pubblicazione di post con testo e URL immagine opzionale, con sistema di like interattivo nel dettaglio del post.
- **Commenti e Discussioni Sincrone**: thread di discussione sotto i post con aggiornamento istantaneo real-time per chiunque stia visualizzando il medesimo brano/post.
- **Messaggistica Privata 1-to-1 Real-Time**: conversazioni persistenti con aggiornamenti dei nuovi messaggi nella chat aperta.
- **Ricerca Parametrica per Affinità**: motore di ricerca utenti basato su filtri combinati per strumento (es. Batteria, Basso) e genere (es. Jazz, Rock, Funk).
- **Ruoli e Moderazione (RBAC)**: distinzione tra normali utenti e amministratori abilitati alla moderazione dei contenuti e alla gestione degli account.
- **Adattabilità Visiva (Theme System)**: supporto completo per modalità Dark e Light gestito a livello globale tramite ThemeContext di React e Material UI.

---

## 📸 Galleria Interfaccia Utente (UI Showcase)

Di seguito una panoramica visiva delle schermate principali dell'applicazione:

| Feed Principale (Home) | Dettaglio Post & Commenti Live |
|:---:|:---:|
| ![Home Feed](UI/Home.png) | ![Post Detail](UI/PostDetail.png) |
| *Feed cronologico globale, card con immagini e conteggio like; toggle nel dettaglio* | *Dettaglio del post con sincronizzazione real-time dei commenti* |

| Chat Privata Real-Time | Ricerca Musicisti con Filtri |
|:---:|:---:|
| ![Chat](UI/Chat.png) | ![Cerca Musicisti](UI/Cerca.png) |
| *Conversazioni 1-a-1 via WebSocket con storico persistito* | *Selezione multipla di strumenti suonati e generi musicali* |

| Profilo Utente & Competenze | Autenticazione & Registrazione |
|:---:|:---:|
| ![Profilo](UI/Profilo.png) | ![Login](UI/Login.png) |
| *Visualizzazione bio, badge strumenti, generi e storico post* | *Accesso sicuro con JWT e onboarding con preferenze musicali* |

---

## ⚡ Funzionalità Principali

| Modulo | Descrizione Operativa |
|---|---|
| **Autenticazione & Sessioni** | Architettura **Dual-Token**: Access Token (default 15m) + Refresh Token (default 7d) persistito su MongoDB con indice TTL. REST e Socket.IO condividono `refreshSession()` e una Promise di rinnovo nella scheda corrente; i token ruotano con claim `jti` e il Refresh Token viene revocato al logout. AuthContext viene sincronizzato tramite `session-changed`. Refresh Token assente o rinnovo rifiutato con 401/403 causano la pulizia della sessione; gli errori temporanei mantengono i dati locali. |
| **Controllo Accessi (RBAC)** | Distinzione tra ruolo `user` e `admin`. Gli amministratori possiedono badge visivi dedicati, possono moderare ed eliminare post e commenti altrui, eliminare altri account e promuovere/declassare ruoli tramite API dedicate, senza un pannello amministrativo frontend. |
| **Feed & Gestione Post** | Creazione ed eliminazione di post con testo e immagine da URL oppure dal dispositivo (JPG, PNG, GIF e WebP, massimo 5 MB), con anteprima del file selezionato. Le immagini caricate sono salvate come dati binari nella collezione MongoDB `postimages` e servite da `/api/v1/uploads`. Feed ordinato per data decrescente e Like/Unlike nel dettaglio. La modifica del post è disponibile tramite API; le card del feed mostrano il conteggio dei like. |
| **Commenti Real-Time** | Aggiunta ed eliminazione dei commenti dalla UI; modifica tramite API. I nuovi commenti arrivano via Socket.IO agli utenti iscritti alla room del post. Modifiche e cancellazioni non vengono trasmesse in real-time. |
| **Chat Privata Istantanea** | Conversazioni private 1-to-1 con storico messaggi. Invio tramite REST autenticata e ricezione real-time nelle room Socket.IO `chat_<chatId>`, accessibili solo ai partecipanti. |
| **Social Graph (Follow/Unfollow)** | Possibilità di seguire e smettere di seguire altri artisti, aggiornando le metriche social del profilo e la lista degli utenti seguiti. |
| **Motore di Ricerca Parametrico** | Ricerca testuale per username combinabile con filtri a selezione multipla su 9 strumenti e 10 generi musicali, applicati nel frontend dopo il caricamento degli utenti. |
| **Theme Switcher** | Supporto Dark/Light mode globale tramite Material UI, con tema conservato nello stato React; al reload si riparte dalla modalità chiara. |
| **OpenAPI / Swagger** | Documentazione interattiva esposta dal backend su `/api-docs`; il gateway Docker attuale non inoltra questo percorso. |

---

## 🏛️ Architettura del Sistema e Network Flow

L'applicazione adotta un'architettura **Client-Server a 3 Livelli (3-Tier)** con disaccoppiamento completo tra frontend Single Page Application (SPA), backend API RESTful / WebSocket Gateway, e database persistente NoSQL.

### Diagramma di Flusso di Rete (Deployment in Container)

```mermaid
flowchart TD
    Browser["Browser: React SPA, Axios e Socket.IO Client"]
    Gateway["Gateway Nginx: host porta 80"]
    Frontend["Container frontend: Nginx porta 80, build React e fallback SPA"]
    Backend["Container backend: HTTP Express e Socket.IO porta 4000"]
    Mongo[("MongoDB 7: volume mongo_data")]

    Browser -->|"/ e route SPA"| Gateway
    Gateway -->|"proxy /"| Frontend
    Browser -->|"REST /api/v1/*"| Gateway
    Gateway -->|"proxy /api/"| Backend
    Browser -->|"Socket.IO /socket.io/ sullo stesso dominio"| Gateway
    Gateway -->|"proxy /socket.io/ e upgrade WebSocket"| Backend
    Backend -->|"Mongoose"| Mongo
```

### Routing e Configurazione di Rete

1. **Ambiente Docker**: la porta pubblicata è `80`. Il gateway inoltra `/` al container `frontend:80`, che serve i file compilati e applica il fallback SPA; inoltra `/api/` al backend su `4000`. È configurato anche il proxy `/socket.io/`, con upgrade WebSocket. Il deployment fornito usa HTTP, senza terminazione TLS.
2. **Accesso al backend e limiti del Compose**: REST e Socket.IO passano dal gateway; non è necessario pubblicare la porta `4000` sull'host. Rimane il limite di `/api-docs`: manca una regola di proxy dedicata e il percorso viene inoltrato al frontend anziché a Swagger.
3. **Sviluppo locale**: Vite sulla porta `5173` inoltra `/api` e `/socket.io` verso `http://localhost:4000`, con supporto all'upgrade WebSocket. Axios e Socket.IO usano entrambi questi proxy. Per un backend Socket.IO su un'origine separata si può impostare `VITE_SOCKET_URL` durante l'avvio o la build del frontend, configurando il CORS del backend per l'origine del browser.

---

## 🛠️ Stack Tecnologico Dettagliato

### Backend
| Tecnologia | Versione | Motivazione & Ruolo Architetturale |
|---|---|---|
| **Node.js** | >=20.19.0 (immagine Docker Node 20) | Ambiente di runtime JavaScript asincrono ed event-driven a elevate prestazioni I/O. |
| **Express** | 5.2.x | Router HTTP modulare e middleware pipeline per la definizione delle rotte REST. |
| **MongoDB** | 7.0 | Database NoSQL documentale, ideale per schemi polimorfi e dati musicali annidati. |
| **Mongoose** | 9.9.x | ODM per la modellazione schemi, validazione dati, pre-save hook di hashing e population dei riferimenti. |
| **Socket.IO** | 4.8.x | Gateway bidirezionale basato su WebSocket con fallback automatico a HTTP long-polling per chat e commenti sincroni. |
| **jsonwebtoken** | 9.0.x | Generazione e verifica stateless dei token JWT con algoritmo vincolato `HS256`. |
| **bcryptjs** | 3.0.x | Funzione di hashing unidirezionale sicura con salt factor a 10 round per la protezione delle password. |
| **swagger-ui-express & swagger-jsdoc** | 5.x / 6.x | Generazione e visualizzazione interattiva della documentazione API secondo le specifiche OpenAPI 3.0. |
| **dotenv** | 17.4.x | Iniezione runtime delle variabili d'ambiente da file `.env`. |

### Frontend
| Tecnologia | Versione | Motivazione & Ruolo Architetturale |
|---|---|---|
| **React** | 19.2.x | Libreria UI dichiarativa a componenti reattivi per una SPA fluida. |
| **Vite** | 8.1.x | Next-generation build tool con Hot Module Replacement (HMR) istantaneo. |
| **Material UI (MUI)** | 9.2.x | Design system completo con componenti pre-costruiti e supporto a temi dinamici. |
| **React Router DOM** | 7.18.x | Routing dichiarativo lato client con gestione delle route protette (`ProtectedRoute`). |
| **Axios** | 1.19.x | Client HTTP con interceptor per il token Bearer, rinnovo condiviso con Socket.IO e un retry su HTTP 401; distingue il rinnovo rifiutato dagli errori temporanei. |
| **Socket.IO Client** | 4.8.x | Client WebSocket con gestione del ciclo di vita della connessione e delle stanze. |

### Containerizzazione & Infrastruttura
| Componente | Ruolo |
|---|---|
| **Docker Engine & Compose v3.9** | Orchestrazione multi-container isolata per MongoDB, Backend, Frontend e Nginx. |
| **Nginx (Alpine)** | Server Web ad alte prestazioni per servire il bundle React compilato e reverse proxy unificato verso il backend. |

---

## 🗃️ Modello Concettuale dei Dati & ER Diagram

Il database MongoDB `jampulse` è strutturato in 6 collezioni relazionate tramite `ObjectId` Mongoose:

```mermaid
erDiagram
    USER ||--o{ POST : "pubblica (userID)"
    USER ||--o{ COMMENT : "scrive (authorId)"
    USER ||--o{ MESSAGE : "invia (senderID)"
    USER ||--o{ REFRESH_TOKEN : "possiede (user)"
    USER }o--o{ USER : "follows / following"
    USER }o--o{ POST : "likes"
    USER }o--o{ CHAT : "participants"
    POST ||--o{ COMMENT : "contiene (postId)"
    CHAT ||--o{ MESSAGE : "raccoglie (chatID)"

    REFRESH_TOKEN {
        ObjectId _id PK
        string token "unique, required"
        ObjectId user FK "ref User, required"
        date expiresAt "indice TTL con auto-cancellazione"
        date createdAt
    }

    USER {
        ObjectId _id PK
        string username "unique, required"
        string email "unique, required; lowercase nel controller register"
        string password "hashed bcrypt"
        string role "user | admin (default: user)"
        string bio "optional"
        array instruments "array di stringhe"
        array genres "array di stringhe"
        array followers "ObjectId ref User"
        array following "ObjectId ref User"
        date createdAt
        date updatedAt
    }

    POST {
        ObjectId _id PK
        ObjectId userID FK "ref User, required"
        string content "required"
        string media "url opzionale"
        array likes "ObjectId ref User"
        date createdAt
        date updatedAt
    }

    COMMENT {
        ObjectId _id PK
        ObjectId postId FK "ref Post, required"
        ObjectId authorId FK "ref User, required"
        string text "required, trim"
        date createdAt
        date updatedAt
    }

    CHAT {
        ObjectId _id PK
        array participants "ObjectId ref User; nessun minimo nello schema"
        date createdAt
        date updatedAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId chatID FK "ref Chat, required"
        ObjectId senderID FK "ref User, required"
        string content "required"
        date createdAt
        date updatedAt
    }
```

Il controller crea chat con due partecipanti e la UI gestisce conversazioni 1-a-1. Gli strumenti e i generi sono array di stringhe senza enum lato server; le opzioni del frontend sono suggerimenti di selezione. I riferimenti ObjectId non impongono cancellazioni a cascata: eliminare un post, una chat o un utente non elimina automaticamente i documenti collegati.

### Logica di Protezione & Metodi Mongoose:
- **Pre-save Hook User**:
  ```javascript
  userSchema.pre("save", async function () {
      if (!this.isModified("password")) return;
      this.password = await bcrypt.hash(this.password, 10);
  });
  ```
- **Metodo d'Istanza User**:
  ```javascript
  userSchema.methods.comparePassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
  };
  ```

---

## 🔄 Flussi Operativi e Diagrammi di Sequenza

### 1. Autenticazione e Gestione Sessione Dual-Token

```mermaid
sequenceDiagram
    autonumber
    actor Utente
    participant FE as React SPA
    participant BE as Express Backend
    participant DB as MongoDB

    Utente ->> FE: Inserisce username e password
    FE ->> BE: POST /api/v1/auth/login
    alt Dati mancanti o username vuoto
        BE -->> FE: 400 Bad Request
    else Dati presenti
        BE ->> DB: User.findOne({ username: username.trim() })
        DB -->> BE: User con hash e ruolo oppure null
        opt Utente trovato
            BE ->> BE: user.comparePassword(password)
        end
        alt Utente trovato e password corretta
            BE ->> BE: Genera Access Token HS256 (default 15m)
            BE ->> BE: Genera Refresh Token HS256 (default 7d, jti casuale)
            BE ->> DB: new RefreshToken({ token, user, expiresAt }).save()
            DB -->> BE: Refresh Token salvato, indice TTL su expiresAt
            BE -->> FE: 200 OK + { token, accessToken, refreshToken, user }
            FE ->> FE: Salva token, refreshToken e user in localStorage
            FE ->> FE: Aggiorna AuthContext e naviga alla Home
        else Utente assente o password errata
            BE -->> FE: 401, messaggio generico di credenziali errate
        end
    end
    Note over FE: Mostra gli errori di login all'utente
```

### 2. Creazione Post, Scadenza Access Token e Silent Refresh Trasparente

```mermaid
sequenceDiagram
    autonumber
    actor Utente
    participant FE as React SPA e Axios
    participant Auth as Middleware JWT
    participant BE as Controller REST
    participant DB as MongoDB

    Utente ->> FE: Compila il post e preme Pubblica
    FE ->> Auth: POST /api/v1/posts, Authorization Bearer
    Auth ->> Auth: Verifica JWT HS256 e scadenza
    opt Access Token scaduto e richiesta ammessa al retry
        Auth -->> FE: 401 TOKEN_EXPIRED
        FE ->> BE: POST /api/v1/auth/refresh con refreshToken
        BE ->> BE: Verifica firma HS256 e scadenza del Refresh Token
        BE ->> DB: Cerca il token e l'utente associato
        DB -->> BE: Record trovati
        BE ->> DB: Elimina vecchio Refresh Token
        BE ->> BE: Genera nuovo Access Token stateless
        BE ->> DB: Salva il nuovo Refresh Token
        BE -->> FE: 200 OK + token, accessToken, refreshToken
        FE ->> FE: Aggiorna localStorage, notifica AuthContext e risolve refreshPromise
        FE ->> Auth: Ritenta POST /api/v1/posts con nuovo token
    end
    Note over FE,BE: Il seguito rappresenta il percorso di successo del rinnovo, se necessario
    Auth ->> BE: Token valido, req.user = id e role
    BE ->> BE: Valida content e crea new Post con autore da req.user.id
    BE ->> DB: newPost.save() con content.trim() e media opzionale
    DB -->> BE: Documento Post salvato
    BE -->> FE: 201 Created + Post senza populate
    FE ->> FE: navigate('/') e montaggio di Home
    FE ->> BE: GET /api/v1/posts autenticata
    BE ->> DB: Post.find, populate autore e sort createdAt decrescente
    DB -->> BE: Lista post con autori popolati
    BE -->> FE: 200 OK + feed
    FE -->> Utente: Mostra il feed aggiornato
```

Il controller restituisce 400 se il testo è vuoto; il middleware restituisce 401 per token assenti, scaduti o non validi. Axios valuta il rinnovo sui 401 delle richieste ammesse al retry, senza richiedere il codice `TOKEN_EXPIRED`. `refreshSession()` condivide una sola Promise tra REST e Socket.IO nella stessa scheda. Se una risposta 401 si riferisce a un token già sostituito, Axios ritenta con quello corrente senza un altro refresh. Se manca il Refresh Token o il rinnovo restituisce 401/403 per la sessione corrente, il client pulisce la sessione, aggiorna AuthContext e le route protette riportano al login. Gli errori di rete o del server mantengono i dati della sessione e vengono propagati al chiamante. La lettura e la cancellazione del Refresh Token sono operazioni separate: la rotazione attuale non garantisce il consumo atomico tra schede o client diversi.

### 3. Flusso Real-Time Ibrido (REST Persistence + Socket.IO Broadcast)

JamPulse adotta il pattern **REST-first**: il client invia messaggi e commenti tramite REST autenticata. Dopo il salvataggio e il popolamento dell'autore, il controller emette il broadcast Socket.IO e restituisce la risposta HTTP. Il client non può trasmettere contenuti direttamente agli altri utenti tramite eventi socket.

```mermaid
sequenceDiagram
    autonumber
    actor Mittente as Mittente (Client A)
    participant FE1 as React SPA (Client A)
    participant BE as Express REST API
    participant DB as MongoDB
    participant SocketGateway as Socket.IO Server
    participant FE2 as React SPA (Client B)

    Note over FE1,FE2: Entrambi i client eseguono handshake JWT e join autorizzato
    FE2 ->> SocketGateway: Handshake con auth.token = accessToken
    SocketGateway ->> SocketGateway: io.use verifica JWT HS256 e userId
    SocketGateway -->> FE2: connect oppure connect_error
    FE2 ->> SocketGateway: join_chat(chatId), dopo connect
    SocketGateway ->> DB: Chat.exists({ _id: chatId, participants: userId })
    DB -->> SocketGateway: Chat autorizzata oppure null
    opt ID valido e utente partecipante
        SocketGateway ->> SocketGateway: socket.join('chat_' + chatId)
        SocketGateway -->> FE2: Ack { ok: true }
        FE2 ->> BE: GET /api/v1/chats/:id/messages autenticata
        BE ->> DB: Verifica partecipazione e carica cronologia
        DB -->> BE: Messaggi salvati
        BE -->> FE2: 200 OK + cronologia
        FE2 ->> FE2: Unisce cronologia ed eventi arrivati durante il caricamento
    end

    Mittente ->> FE1: Invia messaggio in chat
    FE1 ->> BE: POST /api/v1/chats/:id/messages { content } + Bearer JWT
    activate BE
    BE ->> BE: Verifica JWT, contenuto e partecipazione alla chat
    Note over BE,DB: Flusso seguente eseguito solo se la richiesta è autorizzata
    BE ->> DB: Message.create({ chatID, senderID: req.user.id, content })
    activate DB
    DB -->> BE: Messaggio salvato
    deactivate DB
    BE ->> DB: Chat.findByIdAndUpdate(chatId, { updatedAt })
    BE ->> DB: newMessage.populate('senderID', 'username')
    DB -->> BE: Messaggio con autore popolato
    BE ->> SocketGateway: io.to('chat_' + newMessage.chatID).emit('receive_message', newMessage)
    SocketGateway ->> FE1: receive_message (se iscritto alla room)
    SocketGateway ->> FE2: receive_message (se iscritto alla room)
    BE -->> FE1: 201 Created + newMessage
    deactivate BE
    FE1 ->> FE1: Aggiorna da REST e socket, deduplicando tramite _id
    FE2 ->> FE2: Aggiorna il thread, deduplicando tramite _id
```

---

## ⚡ Architettura Real-Time con Socket.IO

Il server unificato HTTP di Node.js (`http.createServer(app)`) condivide le porte sia per le REST API che per il gateway WebSocket di Socket.IO.

`backend/server.js` inizializza Socket.IO, delega la configurazione a `backend/socket.js` e rende l'istanza disponibile ai controller tramite `app.set('io', io)`. Il middleware `io.use` autentica l'handshake usando `socket.handshake.auth.token`: verifica firma, scadenza, algoritmo `HS256`, formato di `userId` e presenza di un claim `exp` numerico. Conserva identità e scadenza in `socket.data.userId` e `socket.data.expiresAt`. Alla scadenza invia `session_expired` e disconnette il socket. Prima di completare un join, anche dopo una query asincrona, ricontrolla che la connessione e la sessione siano ancora valide.

### Gestione delle Stanze (Room Topology)

Il server organizza i client connessi in **stanze logiche isolate**:

```
                       ┌───────────────────────────────┐
                       │       Socket.IO Gateway       │
                       └───────────────┬───────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│   Stanza Chat: chat_<chatId>   │             │   Stanza Post: post_<postId>   │
│  - Client 1 (Partecipante A)  │             │  - Client 1 (Lettore Post)    │
│  - Client 2 (Partecipante B)  │             │  - Client 3 (Altro Musicista) │
└───────────────────────────────┘             └───────────────────────────────┘
```

### Tabella degli Eventi WebSocket

| Nome Evento | Direzione | Payload | Scopo / Comportamento |
|---|---|---|---|
| `connect` / `connection` | Ciclo di vita Socket.IO | Handshake: `auth: { token }` | Connessione accettata solo dopo la verifica JWT; `connect` è l'evento client, `connection` quello server. |
| `connect_error` | Server $\rightarrow$ Client | Errore di autenticazione | Handshake rifiutato per token mancante, scaduto, non valido o identità non valida. |
| `join_chat` | Client $\rightarrow$ Server | `chatId` (stringa ObjectId) | Consulta `Chat.exists({ _id: chatId, participants: socket.data.userId })`; iscrive alla room `chat_<chatId>` solo un partecipante. |
| `leave_chat` | Client $\rightarrow$ Server | `chatId` (stringa ObjectId) | Rimuove il socket dalla room `chat_<chatId>`. |
| `receive_message` | Server $\rightarrow$ Client | Messaggio salvato con autore popolato | Emesso dal controller REST alla room della chat, incluso il mittente se iscritto. |
| `join_post` | Client $\rightarrow$ Server | `postId` (stringa ObjectId) | Verifica l'esistenza del post e iscrive alla room `post_<postId>`; i post sono visibili a tutti gli utenti autenticati. |
| `leave_post` | Client $\rightarrow$ Server | `postId` (stringa ObjectId) | Rimuove il socket dalla room `post_<postId>`. |
| `receive_comment` | Server $\rightarrow$ Client | Commento salvato con autore popolato | Emesso dal controller REST alla room del post, incluso l'autore se iscritto. |
| `session_expired` | Server $\rightarrow$ Client | Nessuno | Segnala la scadenza del JWT prima della disconnessione; il client richiede il rinnovo condiviso e si riconnette. |
| `disconnect` | Ciclo di vita Socket.IO | Motivo della disconnessione | Rimozione automatica del socket da tutte le room. |

Gli ID delle room vengono normalizzati in minuscolo. `join_chat` e `join_post` rispondono alla callback di conferma con `{ ok: true }` dopo l'iscrizione, oppure `{ ok: false }` per ID malformati, accessi negati o risorse assenti. Gli errori delle query restituiscono `{ ok: false, code: 'TEMPORARY_ERROR' }`. Gli eventi client `send_message` e `send_comment` non hanno più handler: i broadcast partono esclusivamente dai controller REST dopo la persistenza.

L'hook `useSocket` apre la connessione solo con una sessione e una chat o un post attivo. Usa il dominio del frontend, salvo l'override `VITE_SOCKET_URL`, e legge il token dal `localStorage` ad ogni handshake. Ripete il join ad ogni `connect` e, ricevuto l'ack positivo, richiama `onReady` per ricaricare la cronologia REST: il recupero degli eventi persi è applicativo, non una ritrasmissione automatica di Socket.IO. Chat e PostDetail uniscono lo snapshot agli eventi arrivati durante la richiesta tramite `utils/realtime.js`, deduplicano per `_id`, ordinano per data e scartano risposte superate o riferite a una pagina diversa.

Su `connect_error` con `error.data.code === 'TOKEN_EXPIRED'` o su `session_expired`, l'hook usa `refreshSession()` e riapre la connessione dopo il rinnovo. Se il rinnovo fallisce temporaneamente e la sessione locale esiste ancora, riprova dopo 5 secondi. L'ack del join ha un timeout di 10 secondi: timeout ed errori `TEMPORARY_ERROR` causano un nuovo tentativo dopo 2 secondi; un errore nel caricamento della cronologia causa un tentativo dopo 5 secondi. Il cambio di pagina, stanza o sessione chiude il socket precedente, cancella i timer e invalida la sincronizzazione in corso.

---

## 📡 Specifiche Complete API REST

Tutti gli endpoint applicativi (eccetto le rotte di autenticazione e health check) richiedono l'autenticazione tramite Header HTTP:
```http
Authorization: Bearer <token_jwt>
```

In caso di errore, il backend restituisce un payload JSON standardizzato:
```json
{
  "message": "Descrizione leggibile dell'errore",
  "code": "CODICE_ERRORE_OPZIONALE"
}
```

### 1. Autenticazione — `/api/v1/auth`
| Metodo | Endpoint | Accesso | Descrizione | Request Body | Risposte HTTP |
|---|---|---|---|---|---|
| `POST` | `/register` | Pubblico | Registra un nuovo musicista | `{ email, username, password, instruments?, genres? }` | `201` Created, `400` Dati mancanti/duplicati, `500` Errore Server |
| `POST` | `/login` | Pubblico | Autentica l'utente ed emette Dual-Token | `{ username, password }` | `200` OK + `{ token, accessToken, refreshToken, user }`, `401` Credenziali errate, `400` Campi vuoti |
| `POST` | `/refresh` | Pubblico | Rinnovo trasparente Access Token con Token Rotation | `{ refreshToken }` | `200` OK + `{ token, accessToken, refreshToken }`, `400` Token mancante, `401` Scaduto o revocato |
| `POST` | `/logout` | Pubblico / Autenticato | Revoca la sessione cancellando il Refresh Token dal DB | `{ refreshToken? }` | `200` OK + `{ message }`, `500` Errore Server |

### 2. Utenti & Social Graph — `/api/v1/users`
| Metodo | Endpoint | Accesso | Descrizione | Note e Risposte |
|---|---|---|---|---|
| `GET` | `/me` | Autenticato | Profilo dell'utente corrente | `200` OK con bio, strumenti, generi, followers, following. |
| `PUT` | `/me` | Autenticato | Aggiorna profilo personale | Body: `{ bio, instruments, genres }`. `200` OK. |
| `GET` | `/me/following` | Autenticato | Lista utenti seguiti (popolati) | `200` OK con array `[{ _id, username }]`. |
| `GET` | `/` | Autenticato | Elenco di tutti gli utenti | `200` OK (usato nel motore di ricerca). |
| `GET` | `/:id` | Autenticato | Profilo pubblico di un utente | `200` OK, `404` Utente non trovato, `400` ID non valido. |
| `GET` | `/:id/posts` | Autenticato | Post pubblicati da un utente | `200` OK (ordinamento cronologico decrescente). |
| `POST` | `/:id/follow` | Autenticato | Segui un altro utente | `200` OK, `400` Segui te stesso o già seguito. |
| `DELETE` | `/:id/follow` | Autenticato | Smetti di seguire un utente | `200` OK, `400` Non puoi smettere di seguire te stesso. |
| `DELETE` | `/:id` | **Admin Only** | Eliminazione definitiva utente | `200` OK, `403` Privilegi insufficienti, `400` Auto-eliminazione bloccata. |
| `PATCH` | `/:id/role` | **Admin Only** | Modifica ruolo (`user`/`admin`)| Body: `{ role }`. `200` OK, `403` Forbidden, `400` Ruolo non valido. |

### 3. Post & Like — `/api/v1/posts`
| Metodo | Endpoint | Accesso | Descrizione | Request / Note |
|---|---|---|---|---|
| `GET` | `/` | Autenticato | Feed completo globale | `200` OK con autore popolato (`userID`). |
| `POST` | `/` | Autenticato | Pubblicazione nuovo post | Body: `{ content, media? }`. `201` Created. |
| `GET` | `/:id` | Autenticato | Dettaglio singolo post | `200` OK, `404` Non trovato. |
| `PUT` | `/:id` | Autore Post | Modifica contenuto/media | Body: `{ content, media? }`. `200` OK, `403` Se non autore. |
| `DELETE` | `/:id` | Autore o **Admin** | Eliminazione post | `200` OK, `403` Non autorizzato. |
| `POST` | `/:id/like` | Autenticato | Toggle like/unlike | `200` OK + `{ message, liked: boolean }`. |

### 4. Commenti — `/api/v1/posts/:id/comments`
| Metodo | Endpoint | Accesso | Descrizione | Note |
|---|---|---|---|---|
| `GET` | `/` | Autenticato | Commenti del post | `200` OK (ordinamento cronologico crescente `createdAt: 1`). |
| `POST` | `/` | Autenticato | Scrittura nuovo commento | Body: `{ text }`. `201` Created con autore popolato. |
| `PUT` | `/:commentId` | Autore Commento | Modifica commento proprio | Body: `{ text }`. `200` OK, `403` Azione non autorizzata. |
| `DELETE` | `/:commentId` | Autore o **Admin** | Eliminazione commento | `200` OK, `403` Azione non autorizzata. |

### 5. Chat Private — `/api/v1/chats`
| Metodo | Endpoint | Accesso | Descrizione | Note |
|---|---|---|---|---|
| `GET` | `/` | Partecipante | Elenco chat dell'utente | `200` OK ordinate per data di aggiornamento decrescente. |
| `POST` | `/` | Autenticato | Crea o recupera chat 1-a-1 | Body: `{ targetUserId }`. `200` se già esistente, `201` se nuova. |
| `DELETE` | `/:id` | Partecipante | Elimina conversazione | `200` OK, `403` Non partecipante. |

### 6. Messaggi di Chat — `/api/v1/chats/:id/messages`
| Metodo | Endpoint | Accesso | Descrizione | Note |
|---|---|---|---|---|
| `GET` | `/` | Partecipante | Cronologia messaggi della chat | `200` OK (ordinamento cronologico crescente). |
| `POST` | `/` | Partecipante | Invia nuovo messaggio | Body: `{ content }`. `201` Created (aggiorna `updatedAt` della chat). |
| `PUT` | `/:messageId` | Mittente | Modifica testo messaggio | Body: `{ content }`. `200` OK, `403` Non autorizzato. |
| `DELETE` | `/:messageId` | Mittente | Elimina singolo messaggio | `200` OK, `403` Non autorizzato. |

### 7. Health Check — `/api/v1/health`
| Metodo | Endpoint | Accesso | Descrizione | Risposta |
|---|---|---|---|---|
| `GET` | `/` | Pubblico | Controllo liveness del server | `200` OK + `{ message: "Server is OK" }` |

---

## 🛡️ Sicurezza e Controllo Accessi (RBAC)

**Real-time autenticato**: `io.use` verifica il JWT all’handshake. I join delle chat richiedono la partecipazione verificata sul database; i join dei post richiedono un post esistente. Il client sceglie le room autorizzate e riceve gli eventi; messaggi e commenti vengono trasmessi solo dai controller REST dopo il salvataggio.

JamPulse integra controlli difensivi a più livelli:

1. **Protezione Crittografica delle Password**:
   - Algoritmo `bcryptjs` con fattore di costo a 10 round.
   - Nessuna password in chiaro viene memorizzata o restituita nelle risposte API (uso metodico di `.select('-password')` nelle query Mongoose).
2. **Architettura Dual-Token (Access Token + Refresh Token)**:
   - I JWT sono firmati, non cifrati. Al logout viene revocato il Refresh Token; un Access Token già emesso resta valido fino alla scadenza.
   - **Access Token (15 minuti)**: a vita breve, stateless, inviato nell'header `Authorization: Bearer <token>`. La breve durata minimizza la finestra di vulnerabilità in caso di intercettazione.
   - **Refresh Token (7 giorni)**: a vita più lunga, generato con claim crittografico univoco (`jti: crypto.randomUUID()`) per prevenire collisioni e salvato nel database MongoDB.
   - **Algoritmo Crittografico Forzato**: sia l'Access Token che il Refresh Token forzano esplicitamente l'algoritmo sicuro `{ algorithms: ['HS256'] }`, neutralizzando attacchi di tipo *None-algorithm*.
   - **Token Rotation**: a ogni refresh riuscito il controller elimina il vecchio Refresh Token e ne salva uno nuovo. I riutilizzi successivi alla cancellazione vengono rifiutati. Poiché lettura e cancellazione sono separate, due richieste concorrenti possono superare il controllo sullo stesso record: il consumo monouso atomico non è garantito. Il claim `jti` distingue i token emessi, senza impedire da solo il riuso.
   - **Indice TTL di MongoDB**: i record scaduti vengono rimossi periodicamente in background tramite l'indice su `expiresAt` (`expireAfterSeconds: 0`), senza cron job applicativi. La verifica della scadenza JWT è indipendente dalla rimozione fisica del record.
   - **Revoca della Sessione al Logout**: l'endpoint `/api/v1/auth/logout` cancella il token dal DB, disabilitando istantaneamente la possibilità di ottenere nuovi token per quel dispositivo.
3. **Role-Based Access Control (RBAC)**:
   - Nel payload del JWT viene incluso il ruolo (`'user'` o `'admin'`).
   - Il middleware `requireRole('admin')` blocca accessi non autorizzati restituendo `403 Forbidden` (`FORBIDDEN`).
   - Gli amministratori possiedono speciali privilegi di moderazione (possono cancellare post e commenti ingiuriosi anche se non ne sono gli autori).
   - È presente un controllo che impedisce a un amministratore di declassare o eliminare per sbaglio il proprio account da endpoint dedicati.
4. **Protezione da Auto-Privilege Escalation**:
   - L'endpoint di registrazione (`authController.register`) impone server-side `role: 'user'`, ignorando qualsiasi tentativo malevolo di passare `"role": "admin"` nel body della richiesta.
5. **Silent Refresh condiviso tra REST e Socket.IO**:
   - L'interceptor globale di Axios (`frontend/src/axios.js`) rileva gli errori HTTP 401 delle richieste ammesse al retry, senza filtrare sul codice `TOKEN_EXPIRED`.
   - `refreshSession()` riutilizza `refreshPromise`: richieste REST e recuperi Socket.IO concorrenti attendono la stessa rotazione nella scheda corrente. Login, registrazione, refresh, logout e richieste già ritentate sono esclusi dal refresh automatico dell'interceptor.
   - Ricevuto il nuovo token, le richieste in sospeso vengono rieseguite automaticamente, senza richiedere nuovamente le credenziali se il rinnovo riesce.
   - `session-changed` sincronizza AuthContext con i token salvati; il contesto ascolta anche gli eventi `storage`. Un rinnovo completato dopo un cambio di sessione viene scartato, evitando di ripristinare una sessione chiusa durante il refresh.
   - Se manca il Refresh Token o il rinnovo restituisce 401/403 per la sessione corrente, la sessione locale viene azzerata e le route protette riportano a `/login`. Gli errori di rete e del server non cancellano la sessione. La Promise condivisa non coordina i rinnovi di altre schede o dispositivi.

---

## 📂 Struttura della Codebase

```text
JamPulse/
├── backend/                               # Applicazione Server Node.js / Express
│   ├── controllers/                       # Business logic e gestione delle risorse
│   │   ├── authController.js              # Registrazione, login e firma JWT
│   │   ├── chatController.js              # Gestione conversazioni 1-a-1
│   │   ├── commentController.js           # CRUD commenti ai post
│   │   ├── healthController.js            # Endpoint liveness check
│   │   ├── messageController.js           # Gestione e cronologia messaggi di chat
│   │   ├── postController.js              # CRUD post e logica toggle like
│   │   └── userController.js              # Profili, follow, ricerca e moderazione admin
│   ├── middlewares/
│   │   └── authMiddleware.js              # Middleware JWT (verifyToken) e RBAC (requireRole)
│   ├── models/                            # Schemi Mongoose ODM e hook
│   │   ├── Chat.js                        # Schema conversazione (partecipanti)
│   │   ├── Comment.js                     # Schema commento collegato a Post e User
│   │   ├── Message.js                     # Schema messaggio (chatID, senderID, content)
│   │   ├── Post.js                        # Schema post (userID, content, media, likes)
│   │   ├── RefreshToken.js                # Schema refresh token con indice TTL automatico
│   │   └── User.js                        # Schema utente (role, bcrypt hook, followers)
│   ├── routes/                            # Mappatura endpoint RESTful
│   │   ├── authRoute.js
│   │   ├── chatRoute.js
│   │   ├── commentRoute.js
│   │   ├── healthRoute.js
│   │   ├── messageRoute.js
│   │   ├── postRoute.js
│   │   └── userRoute.js
│   ├── server.js                          # Bootstrap unificato: Express + Socket.IO + Mongoose
│   ├── socket.js                          # Handshake JWT e autorizzazione delle room
│   ├── swagger.js                         # Specifiche OpenAPI 3.0 definite in JavaScript
│   ├── seed.js                            # Script di popolamento database con musicisti demo
│   ├── Dockerfile                         # Configurazione container backend
│   ├── package.json
│   └── .env.example                       # Template variabili d'ambiente
│
├── frontend/                              # Applicazione Client React SPA
│   ├── public/Logo/                       # Varianti logo responsive (Dark/Light)
│   ├── src/
│   │   ├── components/                    # Componenti UI riutilizzabili
│   │   │   ├── MessageBubble.jsx          # Bolla con testo, allineamento e colori per mittente/destinatario
│   │   │   ├── MultiSelectFilter.jsx      # Selettore multiplo per strumenti e generi
│   │   │   ├── PageLayout.jsx             # Shell applicativa con Sidebar e Outlet
│   │   │   ├── PostCard.jsx               # Card post con gestione media, like e delete
│   │   │   ├── SearchBar.jsx              # Input controllato per ricerca immediata, senza debounce
│   │   │   ├── Sidebar.jsx                # Navigazione laterale e theme toggle
│   │   │   ├── UserBadge.jsx              # Badge identificativo utente con ruolo
│   │   │   └── UserCard.jsx               # Scheda musicista con pulsanti Profilo e Scrivi
│   │   ├── context/
│   │   │   ├── AuthContext.jsx            # Stato globale sessione, token e ruolo
│   │   │   └── ThemeContext.jsx           # Gestione tema Dark/Light via MUI
│   │   ├── hooks/
│   │   │   └── useSocket.js               # Connessione autenticata, riconnessione e ricezione eventi
│   │   ├── pages/                         # Viste applicative (React Router)
│   │   │   ├── Chat.jsx                   # Vista chat privata real-time
│   │   │   ├── CreatePost.jsx             # Form creazione nuovo post
│   │   │   ├── Home.jsx                   # Feed cronologico globale
│   │   │   ├── Login.jsx                  # Accesso e registrazione con filtri musicali
│   │   │   ├── PostDetail.jsx             # Dettaglio post con thread commenti sincroni
│   │   │   ├── Profile.jsx                # Profilo personale e di altri utenti
│   │   │   └── Search.jsx                 # Motore di ricerca con filtri avanzati
│   │   ├── services/                      # Client API Axios disaccoppiati per entità
│   │   ├── utils/
│   │   │   ├── realtime.js                # Fusione snapshot REST ed eventi per stanza
│   │   │   ├── musicOptions.js            # Opzioni UI per strumenti e generi musicali
│   │   │   └── timeUtils.js               # Formattazione timestamp date e orari
│   │   ├── App.jsx                        # Definizione albero rotte e ProtectedRoute
│   │   ├── axios.js                       # Configurazione globale Axios con Interceptors
│   │   └── main.jsx                       # Entry point DOM React 19
│   ├── Dockerfile                         # Build multistage con Nginx per produzione
│   ├── nginx.conf                         # Configurazione Nginx per SPA (try_files)
│   ├── vite.config.js                     # Configurazione Vite con proxy /api e /socket.io
│   └── package.json
│
├── nginx/
│   └── nginx.conf                         # Reverse proxy principale gateway di routing
├── UI/                                    # Screenshot dimostrativi dell'interfaccia
├── Documentazione - Esame/                # Modelli, componenti React e sorgenti dei diagrammi UML
├── docker-compose.yml                     # Orchestrazione dei 4 container (mongo, backend, frontend, nginx)
└── README.md
```

---

## 🐳 Guida all'Avvio Rapido con Docker

**Docker Compose** avvia i quattro servizi definiti nel repository. La configurazione attuale permette di usare frontend e API tramite il gateway, ma presenta i limiti di accesso a Socket.IO e Swagger descritti sotto.

### Prerequisiti
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installato e attivo sulla macchina.

### Procedura di Avvio

1. **Clona il repository**:
   ```bash
   git clone https://github.com/LucaValenz/JamPulse.git
   cd JamPulse
   ```

2. **Prepara il file delle variabili d'ambiente**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   > 💡 Nel file `backend/.env`, per l'avvio con Docker assicurati che `MONGO_URI` sia impostato sul nome del servizio del database:
   > ```env
   > MONGO_URI=mongodb://mongo:27017/jampulse
   > CORS_ORIGIN=http://localhost
   > ```

3. **Avvia i container**:
   ```bash
   docker-compose up --build
   ```
   *(Aggiungi il flag `-d` per eseguire i container in background).*

4. **Accedi ai servizi**:
   - 🌐 **Frontend Web App**: [http://localhost](http://localhost)
   - 🩺 **Health Check**: [http://localhost/api/v1/health](http://localhost/api/v1/health)

**Limiti della configurazione fornita**: il gateway non inoltra `/api-docs` al backend e la porta `4000` non è pubblicata sull’host. Swagger non è quindi disponibile tramite `http://localhost/api-docs`; per provarlo usare l'avvio locale descritto nella sezione seguente. REST e Socket.IO utilizzano invece i proxy del gateway sulla porta `80`, senza richiedere l'esposizione diretta del backend.

5. **Arresto dei container**:
   ```bash
   docker-compose down
   ```
   *(Per cancellare anche i dati persistiti nel volume MongoDB, aggiungi `-v`: `docker-compose down -v`).*

---

## 💻 Guida all'Avvio in Ambiente di Sviluppo

Se desideri eseguire il progetto in locale senza Docker per usufruire del reload a caldo sia su Express (`nodemon`) che su React (`Vite HMR`):

### Prerequisiti
- **Node.js** compatibile con tutti i lockfile: `^20.19.0`, `^22.13.0` oppure `>=24` (per esempio Node 22 da 22.13.0).
- **MongoDB** in esecuzione in locale (porta standard `27017`)

---

### Passo 1: Configurazione ed Esecuzione del Backend

```bash
cd backend

# 1. Crea il file .env partendo dall'esempio
cp .env.example .env

# 2. Installa le dipendenze
npm install

# 3. (Opzionale ma consigliato) Popola il database con dati realistici
npm run seed

# 4. Avvia il server in modalità watch con nodemon
npm run dev
```

Il server Express e il gateway Socket.IO si avvieranno sulla porta specificata in `.env` (**4000** nel file `.env.example`, da impostare: il server non definisce un fallback per `PORT`):
- API REST: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api-docs`

---

### Passo 2: Configurazione ed Esecuzione del Frontend

In un secondo terminale:

```bash
cd frontend

# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo Vite
npm run dev
```

L'applicazione sarà accessibile all'indirizzo:
- 🌐 **App Frontend**: [http://localhost:5173](http://localhost:5173)

> ℹ️ **Nota sul Proxy di Sviluppo**: Vite inoltra `/api` e `/socket.io` verso `http://localhost:4000`; sia Axios sia `useSocket` usano l'origine del frontend e i relativi proxy. `VITE_SOCKET_URL` consente un'origine Socket.IO separata, che deve essere raggiungibile dal browser e autorizzata tramite CORS. La variabile viene letta da Vite all'avvio o durante la build, non dal container frontend a runtime.

---

## ⚙️ Variabili d'Ambiente

Il file di configurazione `backend/.env` controlla i parametri operativi del server:

| Variabile | Obbligatoria | Valore Predefinito / Esempio | Descrizione |
|---|:---:|---|---|
| `PORT` | Sì | Esempio: `4000` (nessun fallback nel server) | Porta TCP su cui resta in ascolto il server Node.js HTTP/WebSocket. |
| `MONGO_URI` | Sì | `mongodb://localhost:27017/jampulse` | Stringa di connessione a MongoDB (locale o cluster remoto come MongoDB Atlas). In Docker usare `mongodb://mongo:27017/jampulse`. |
| `JWT_SECRET` | Raccomandata; fallback di sviluppo se omessa | *stringa casuale complessa* | Chiave crittografica segreta per generare e verificare la firma dei token JWT (HS256). |
| `JWT_ACCESS_EXPIRES_IN` | No | Fallback su `JWT_EXPIRES_IN`, poi `15m` | Tempo di validità dell'Access Token a breve durata (es. `15m`, `30m`, `1h`). |
| `REFRESH_TOKEN_SECRET` | No | *fallback su JWT_SECRET + _refresh* | Chiave crittografica dedicata alla firma dei Refresh Token. |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Tempo di validità del Refresh Token a lunga durata (es. `7d`, `30d`). |
| `CORS_ORIGIN` | No | Default `*`; esempio locale `http://localhost:5173` | Origine HTTP autorizzata a effettuare chiamate cross-origin (`*` o indirizzo specifico). |
| `JWT_EXPIRES_IN` | No | Nessun valore autonomo predefinito | Fallback legacy usato se manca `JWT_ACCESS_EXPIRES_IN`; se mancano entrambe, la durata è `15m`. |
| `VITE_SOCKET_URL` | No; variabile frontend | Origine del frontend | Override dell'URL Socket.IO. Impostare nell'ambiente Vite all'avvio o durante la build; se omessa usa `/socket.io/` tramite il proxy Vite o Nginx. |

---

## 🎸 Database Seeding & Account Demo di Prova

Il progetto include uno script di seeding (`backend/seed.js`) che svuota le collezioni User, Post, Comment, Chat e Message (lasciando invariata RefreshToken) e genera una rete musicale con artisti celebri, post con immagini multimediali, commenti incrociati e chat pre-avviate.

Per eseguire il popolamento:
```bash
# Eseguito all'interno della cartella backend/
npm run seed
```

### Account Pronti per il Test:

| Username | Email | Password | Ruolo | Strumenti | Generi Musicali |
|---|---|---|:---:|---|---|
| **`admin`** | `admin@jampulse.com` | `adminpassword123` | **`admin`** | Regia | All *(Accesso di moderazione)* |
| **`freddiemercury`** | `freddie@queen.com` | `password123` | `user` | Voce, Pianoforte | Rock, Pop |
| **`jimihendrix`** | `jimi@experience.com` | `password123` | `user` | Chitarra | Rock, Blues |
| **`milesdavis`** | `miles@cool.com` | `password123` | `user` | Tromba | Jazz |
| **`flea`** | `flea@rhcp.com` | `password123` | `user` | Basso | Funk, Rock |
| **`ludovico`** | `ludo@classica.com` | `password123` | `user` | Pianoforte | Classica |
| **`test`** | `test@test.com` | `test` | `user` | — | *(Utente neutro privo di interazioni)* |

> 🛡️ **Test della Moderazione Admin**: Effettuando il login con l'utente `admin`, noterai il badge rosso distintivo, la possibilità di rimuovere qualsiasi post o commento dalla UI (tramite il pulsante "Elimina (Admin)"), e l'accesso agli endpoint dedicati alla gestione degli utenti.

---

## 📖 Documentazione Interattiva Swagger & Health Check

JamPulse include una suite Swagger/OpenAPI 3.0 completamente navigabile che permette di esplorare gli schemi dati e testare ciascun endpoint direttamente dal browser:

- **Con il Compose attuale**: Swagger non è esposto dal gateway. `/api-docs` viene inoltrato alla SPA; anche il server di prova configurato da Swagger (`http://localhost:4000`) richiede un backend raggiungibile dal browser su quella porta.
- **In Locale**: [http://localhost:4000/api-docs](http://localhost:4000/api-docs)

Per autorizzare le richieste da Swagger:
1. Effettua una chiamata a `POST /api/v1/auth/login`.
2. Copia la stringa `token` restituita.
3. Clicca sul pulsante verde **Authorize** in alto a destra su Swagger UI e incolla soltanto il JWT. Lo schema HTTP Bearer fa aggiungere alla UI il prefisso `Bearer` nell’header `Authorization`.

### Endpoint di Health Check
Per sistemi di monitoraggio o container probe:
```http
GET /api/v1/health
```
Risposta:
```json
{
  "message": "Server is OK"
}
```

---

## 🎷 Tassonomia Musicale Supportata

Il frontend integra opzioni in `src/utils/musicOptions.js` utilizzate in registrazione, modifica profilo e ricerca. Sono liste di selezione della UI, non vincoli enum del backend: il seed include anche `Tromba`, `Regia` e `All`, assenti da queste opzioni.

### Strumenti Musicali:
`Arpa`, `Basso`, `Batteria`, `Chitarra`, `Pianoforte`, `Sassofono`, `Sintetizzatore`, `Tastiera`, `Voce`.

### Generi Musicali:
`Blues`, `Classica`, `Elettronica`, `Funk`, `Hip Hop`, `Indie`, `Jazz`, `Metal`, `Pop`, `Rock`.

---

## 🚀 Roadmap & Evolutive Future

- [ ] **WebRTC Jam Session**: implementazione di canali audio/video peer-to-peer per sessioni musicali e prove in streaming real-time a bassa latenza.
- [ ] **Player Audio Integrato**: supporto all'upload diretto di file audio/tracce (.mp3, .wav) con visualizzazione delle waveform ed integrazione con Spotify API / SoundCloud.
- [ ] **Sistema Notifiche Push**: introduzione di WebPush API per avvisare gli utenti di nuovi like, commenti, follow e messaggi anche con l'app in background.
- [ ] **Conversazioni di Gruppo**: estensione del modello `Chat` per supportare band e stanze di prova multi-utente.
- [ ] **Progressive Web App (PWA)**: abilitazione Service Worker per supporto offline e installazione nativa su dispositivi mobili Android/iOS.

---

## 📄 Licenza

Il file [LICENSE](LICENSE) contiene la licenza MIT. Il manifest `backend/package.json` riporta ancora `ISC`: questa dichiarazione del pacchetto è discordante con il file di licenza del repository.
