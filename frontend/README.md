# Frontend JamPulse

SPA React con Material UI, React Router, Axios e Socket.IO. Per architettura, API, configurazione Docker e account demo consultare il [README principale](../README.md).

## Sviluppo locale

Avviare MongoDB e il backend sulla porta `4000`, configurando `backend/.env` dal relativo `.env.example`. Dalla cartella `frontend`:

```sh
npm ci
npm run dev
```

L'app è disponibile su `http://localhost:5173`. Vite inoltra `/api` e `/socket.io` a `http://localhost:4000`; Axios usa `/api/v1` e Socket.IO l'origine del frontend. `VITE_SOCKET_URL` permette un'origine socket alternativa all'avvio o durante la build; il backend deve autorizzare l'origine del browser con `CORS_ORIGIN`.

## Comandi

| Comando | Uso |
|---|---|
| `npm run dev` | Server Vite con aggiornamento durante lo sviluppo |
| `npm run lint` | ESLint su JavaScript e JSX |
| `npm run build` | Build di produzione in `dist/` |
| `npm run preview` | Anteprima della build; non configura i proxy di sviluppo |

Usare Node compatibile con i lockfile: `^20.19.0`, `^22.13.0` oppure `>=24`. Non è presente uno script di test frontend.

## Comportamenti principali

- `AuthContext` mantiene la sessione in React e `localStorage`; Axios e `useSocket` condividono il rinnovo tramite `refreshSession()` nella stessa scheda.
- `ThemeContext` gestisce il tema chiaro/scuro nello stato React: al reload riparte dal tema chiaro.
- `CreatePost` invia `FormData` con testo e immagine opzionale da file JPEG/PNG/GIF/WebP fino a 5 MiB oppure da URL. Il backend salva i file in MongoDB e li serve pubblicamente da `/api/v1/uploads/:filename`.
- `Chat` cerca anche utenti non seguiti, filtrando localmente l'elenco ottenuto da `GET /users`.
- Messaggi e commenti vengono creati tramite REST e ricevuti via Socket.IO; dopo il join autorizzato si ricarica la cronologia e si deduplica per `_id`.

In produzione il Dockerfile compila la SPA e Nginx la serve con fallback a `index.html`. Il gateway del Compose inoltra API e Socket.IO al backend. Verifica documentale: 28 ottobre 2026.
