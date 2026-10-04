const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "JamPulse API",
            version: "1.0.0",
            description: "API backend per il social network JamPulse",
        },
        servers: [
            {
                url: "http://localhost:4000",
                description: "Development server",
            },
        ],
        tags: [
            { name: "Auth", description: "Autenticazione e registrazione" },
            { name: "Posts", description: "Gestione dei post e dei like" },
            { name: "Comments", description: "Gestione dei commenti ai post" },
            { name: "Users", description: "Gestione utenti e follow" },
            { name: "Chats", description: "Gestione chat private" }
        ],
        components: {
            securitySchemes: {                
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Inserisci il token JWT",
                },
            },
            schemas: {
                // Modello Utente completo
                User: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        username: { type: "string" },
                        email: { type: "string" },
                        bio: { type: "string" },
                        instruments: { type: "array", items: { type: "string" } },
                        genres: { type: "array", items: { type: "string" } },
                        following: { type: "array", items: { type: "string" } },
                        followers: { type: "array", items: { type: "string" } },
                        role: { type: "string", enum: ["user", "admin"], example: "user" }
                    },
                },
                // Modello Post
                Post: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        userID: { type: "string" },
                        content: { type: "string" },
                        media: { type: "string" },
                        likes: { type: "array", items: { type: "string" } },
                    },
                },
                // Modello Commento
                Comment: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        postId: { type: "string" },
                        authorId: { type: "string" },
                        text: { type: "string" },
                    }
                },
                // Modello Chat 
                Chat: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        participants: { type: "array", items: { type: "string" } }
                    }
                },
                // Modello Messaggio 
                Message: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        chatID: { type: "string" },
                        senderID: { type: "string" },
                        content: { type: "string" }
                    }
                }
            }
        },
        paths: {
            // --- ROTTA DI HEALTH ---
            "/api/v1/health": {
                get: {
                    tags: ["Health"],
                    summary: "Controllo stato server",
                    description: "Verifica rapidamente se il backend è acceso e in grado di ricevere richieste.",
                    responses: {
                        200: {
                            description: "Il server è online e funzionante",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            message: {
                                                type: "string",
                                                example: "Server is OK"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // --- ROTTE DI AUTENTICAZIONE ---
            "/api/v1/auth/register": {
                post: {
                    tags: ["Auth"],
                    summary: "Registrazione nuovo utente",
                    description: "Crea un nuovo utente verificando che email e username non siano già presenti nel database.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        username: { type: "string", example: "jimihendrix" },
                                        email: { type: "string", example: "jimi@example.com" },
                                        password: { type: "string", example: "password123" },
                                        instruments: { type: "array", items: { type: "string" }, example: ["Chitarra"] },
                                        genres: { type: "array", items: { type: "string" }, example: ["Rock"] }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: "Utente registrato correttamente",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            message: { type: "string", example: "Utente registrato correttamente" },
                                            user: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    email: { type: "string" },
                                                    username: { type: "string" },
                                                    instruments: { type: "array", items: { type: "string" } },
                                                    genres: { type: "array", items: { type: "string" } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Conflitto - Dati duplicati",
                            content: {
                                "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Email o Username già utilizzati" } } } }
                            }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Login utente",
                    description: "Verifica username e password e restituisce un Access Token (JWT) e un Refresh Token.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        username: { type: "string", example: "jimihendrix" },
                                        password: { type: "string", example: "password123" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Login effettuato con successo",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                            accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                            refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                            user: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    username: { type: "string" },
                                                    role: { type: "string", example: "user" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        401: {
                            description: "Non autorizzato - Credenziali errate",
                            content: {
                                "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Username o password errati" } } } }
                            }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/auth/refresh": {
                post: {
                    tags: ["Auth"],
                    summary: "Rinnovo Access Token",
                    description: "Riceve un Refresh Token valido e restituisce una nuova coppia di Access Token e Refresh Token (con rotazione automatica).",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["refreshToken"],
                                    properties: {
                                        refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Token rinnovati con successo",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            token: { type: "string" },
                                            accessToken: { type: "string" },
                                            refreshToken: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Refresh token mancante",
                            content: {
                                "application/json": { schema: { type: "object", properties: { message: { type: "string" }, code: { type: "string", example: "REFRESH_TOKEN_MISSING" } } } }
                            }
                        },
                        401: {
                            description: "Refresh token non valido o scaduto",
                            content: {
                                "application/json": { schema: { type: "object", properties: { message: { type: "string" }, code: { type: "string", example: "REFRESH_TOKEN_EXPIRED" } } } }
                            }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/auth/logout": {
                post: {
                    tags: ["Auth"],
                    summary: "Logout utente",
                    description: "Revoca il Refresh Token invalidando la sessione attiva nel database.",
                    requestBody: {
                        required: false,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Logout effettuato con successo",
                            content: {
                                "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Logout effettuato con successo" } } } }
                            }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            // --- ROTTE DEI POST ---
            "/api/v1/posts": {
                get: {
                    tags: ["Posts"],
                    summary: "Ottieni tutti i post",
                    description: "Restituisce il feed di tutti i post, ordinati dal più recente. L'autore viene popolato con il suo username.",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: "Lista dei post recuperata con successo",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Post" } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                },
                post: {
                    tags: ["Posts"],
                    summary: "Crea un nuovo post",
                    description: "Crea un post assegnandolo automaticamente all'utente loggato.",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        content: { type: "string", example: "Oggi ho provato un nuovo assolo!" },
                                        media: { type: "string", example: "https://link-immagine.com/foto.jpg" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: "Post creato con successo" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/posts/{id}": {
                get: {
                    tags: ["Posts"],
                    summary: "Dettaglio di un singolo post",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: { description: "Post trovato" },
                        404: { description: "Post non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                },
                put: {
                    tags: ["Posts"],
                    summary: "Modifica un post esistente",
                    description: "Aggiorna contenuto o media di un post. Solo l'autore originale può effettuare la modifica.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        content: { type: "string" },
                                        media: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Post aggiornato con successo" },
                        403: { description: "Non sei autorizzato a modificare questo post" },
                        404: { description: "Post non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                },
                delete: {
                    tags: ["Posts"],
                    summary: "Elimina un post",
                    description: "Rimuove un post dal database. Solo l'autore originale può eliminarlo.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: { description: "Post eliminato con successo" },
                        403: { description: "Non sei autorizzato a eliminare questo post" },
                        404: { description: "Post non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/posts/{id}/like": {
                post: {
                    tags: ["Posts"],
                    summary: "Metti o togli like a un post",
                    description: "Funzionamento a interruttore (toggle): se l'utente non ha messo like, lo aggiunge; se lo ha già messo, lo rimuove.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: {
                            description: "Operazione completata con successo",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            message: { type: "string", example: "Like aggiunto" },
                                            liked: { type: "boolean", example: true }
                                        }
                                    }
                                }
                            }
                        },
                        404: { description: "Post non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            // --- ROTTE DEI COMMENTI ---
            "/api/v1/posts/{id}/comments": {
                get: {
                    tags: ["Comments"],
                    summary: "Ottieni i commenti di un post",
                    description: "Restituisce tutti i commenti associati a un post in ordine cronologico. L'autore viene popolato con il suo username.",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "L'ID del post" }
                    ],
                    responses: {
                        200: {
                            description: "Lista dei commenti recuperata",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Comment" } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                },
                post: {
                    tags: ["Comments"],
                    summary: "Aggiungi un commento",
                    description: "Crea un nuovo commento sotto un post. L'autore viene assegnato automaticamente all'utente loggato.",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "L'ID del post" }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { type: "object", properties: { text: { type: "string", example: "Che bello questo assolo!" } } }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: "Commento creato con successo",
                            content: {
                                "application/json": {
                                    schema: { type: "object", properties: { newComment: { $ref: "#/components/schemas/Comment" } } }
                                }
                            }
                        },
                        400: {
                            description: "Testo mancante",
                            content: {
                                "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Il testo del commento è obbligatorio" } } } }
                            }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/posts/{id}/comments/{commentId}": {
                put: {
                    tags: ["Comments"],
                    summary: "Modifica un commento",
                    description: "Aggiorna il testo di un commento esistente. L'operazione è permessa solo all'autore del commento.",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID del post" },
                        { name: "commentId", in: "path", required: true, schema: { type: "string" }, description: "ID del commento" }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { type: "object", properties: { text: { type: "string", example: "Ho corretto il mio commento!" } } }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Commento aggiornato con successo" },
                        403: {
                            description: "Azione non autorizzata (non sei l'autore)",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Azione non autorizzata" } } } } }
                        },
                        404: {
                            description: "Commento non trovato",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Commento non trovato" } } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                },
                delete: {
                    tags: ["Comments"],
                    summary: "Elimina un commento",
                    description: "Rimuove definitivamente un commento dal database. Solo l'autore può effettuare questa operazione.",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID del post" },
                        { name: "commentId", in: "path", required: true, schema: { type: "string" }, description: "ID del commento" }
                    ],
                    responses: {
                        200: {
                            description: "Commento eliminato",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Commento eliminato correttamente" } } } } }
                        },
                        403: {
                            description: "Azione non autorizzata",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Azione non autorizzata" } } } } }
                        },
                        404: {
                            description: "Commento non trovato",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Commento non trovato" } } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            // --- ROTTE UTENTI ---
            "/api/v1/users/me": {
                get: {
                    tags: ["Users"],
                    summary: "Ottieni il profilo dell'utente loggato",
                    description: "Restituisce i dati dell'utente attualmente autenticato (esclusa la password).",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: "Profilo recuperato con successo",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } }
                        },
                        404: { description: "Utente non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                },
                put: {
                    tags: ["Users"],
                    summary: "Aggiorna il profilo dell'utente loggato",
                    description: "Permette di modificare bio, strumenti e generi musicali.",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        bio: { type: "string", example: "Nuova biografia" },
                                        instruments: { type: "array", items: { type: "string" }, example: ["Basso", "Batteria"] },
                                        genres: { type: "array", items: { type: "string" }, example: ["Jazz", "Funk"] }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: "Profilo aggiornato con successo" },
                        404: { description: "Utente non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/users/me/following": {
                get: {
                    tags: ["Users"],
                    summary: "Ottieni gli utenti seguiti",
                    description: "Restituisce la lista degli utenti seguiti dall'utente loggato, popolati con username e ID.",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: "Lista dei following recuperata",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } }
                        },
                        404: { description: "Utente non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/users": {
                get: {
                    tags: ["Users"],
                    summary: "Ottieni tutti gli utenti",
                    description: "Restituisce la lista completa degli iscritti al social network (password escluse).",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: "Lista utenti recuperata",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/users/{id}": {
                get: {
                    tags: ["Users"],
                    summary: "Ottieni un utente specifico",
                    description: "Restituisce il profilo pubblico di un utente tramite il suo ID.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: { description: "Utente trovato" },
                        404: { description: "Utente non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/users/{id}/posts": {
                get: {
                    tags: ["Users"],
                    summary: "Ottieni i post di un utente",
                    description: "Restituisce tutti i post pubblicati da uno specifico utente, ordinati dal più recente.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: {
                            description: "Lista post dell'utente recuperata",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Post" } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/users/{id}/follow": {
                post: {
                    tags: ["Users"],
                    summary: "Segui un utente",
                    description: "L'utente loggato inizia a seguire l'utente specificato nell'ID.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: { description: "Ora stai seguendo questo utente" },
                        400: { description: "Azione non valida (non puoi seguire te stesso o stai già seguendo l'utente)" },
                        404: { description: "Utente non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                },
                delete: {
                    tags: ["Users"],
                    summary: "Smetti di seguire un utente",
                    description: "L'utente loggato rimuove il follow dall'utente specificato.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: { description: "Hai smesso di seguire questo utente" },
                        400: { description: "Azione non valida (non puoi smettere di seguire te stesso)" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            // --- ROTTE DELLE CHAT ---
            "/api/v1/chats": {
                get: {
                    tags: ["Chats"],
                    summary: "Ottieni tutte le chat",
                    description: "Restituisce tutte le conversazioni a cui partecipa l'utente loggato, ordinate dalla più recente. I partecipanti vengono popolati con il loro username.",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: "Lista delle chat recuperata con successo",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Chat" } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                },
                post: {
                    tags: ["Chats"],
                    summary: "Crea o recupera una chat",
                    description: "Avvia una nuova conversazione con un utente. Se esiste già una chat tra i due utenti, non la duplica ma restituisce quella esistente.",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        targetUserId: { type: "string", example: "665a1b2c3d4e5f6789012345" }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Chat esistente recuperata",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/Chat" } } }
                        },
                        201: {
                            description: "Nuova chat creata",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/Chat" } } }
                        },
                        400: {
                            description: "Richiesta non valida (es. ID mancante o tentativo di chattare con se stessi)",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Non puoi avviare una chat con te stesso" } } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/chats/{id}": {
                delete: {
                    tags: ["Chats"],
                    summary: "Elimina una chat",
                    description: "Elimina definitivamente una conversazione dal database. L'operazione è consentita solo se l'utente loggato è uno dei partecipanti.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "L'ID della chat" }],
                    responses: {
                        200: {
                            description: "Chat eliminata correttamente",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Chat eliminata correttamente" } } } } }
                        },
                        403: {
                            description: "Azione non autorizzata (non sei un partecipante della chat)",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Non sei autorizzato ad eliminare questa chat" } } } } }
                        },
                        404: {
                            description: "Chat non trovata",
                            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Chat non trovata" } } } } }
                        },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            // --- ROTTE DEI MESSAGGI ---
            "/api/v1/chats/{id}/messages": {
                get: {
                    tags: ["Chats"],
                    summary: "Ottieni i messaggi di una chat",
                    description: "Restituisce la cronologia dei messaggi. Accessibile solo ai partecipanti della chat.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID della chat" }],
                    responses: {
                        200: { 
                            description: "Messaggi recuperati",
                            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Message" } } } }
                        },
                        403: { description: "Non hai il permesso di leggere questa chat" },
                        404: { description: "Chat non trovata" },
                        500: { description: "Errore interno del server" }
                    }
                },
                post: {
                    tags: ["Chats"],
                    summary: "Invia un nuovo messaggio",
                    description: "Aggiunge un messaggio alla chat e ne aggiorna la data di ultima modifica.",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID della chat" }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": { schema: { type: "object", properties: { content: { type: "string", example: "Ciao, come stai?" } } } }
                        }
                    },
                    responses: {
                        201: { 
                            description: "Messaggio inviato",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/Message" } } }
                        },
                        400: { description: "Il contenuto del messaggio è obbligatorio" },
                        500: { description: "Errore interno del server" }
                    }
                }
            },
            "/api/v1/chats/{id}/messages/{messageId}": {
                put: {
                    tags: ["Chats"],
                    summary: "Modifica un messaggio",
                    description: "Permette al mittente di modificare il testo di un suo messaggio.",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID della chat" },
                        { name: "messageId", in: "path", required: true, schema: { type: "string" }, description: "ID del messaggio" }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": { schema: { type: "object", properties: { content: { type: "string", example: "Messaggio corretto" } } } }
                        }
                    },
                    responses: {
                        200: { description: "Messaggio aggiornato" },
                        403: { description: "Azione non autorizzata (non sei il mittente)" },
                        404: { description: "Messaggio non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                },
                delete: {
                    tags: ["Chats"],
                    summary: "Elimina un messaggio",
                    description: "Rimuove definitivamente un messaggio. Consentito solo al mittente.",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID della chat" },
                        { name: "messageId", in: "path", required: true, schema: { type: "string" }, description: "ID del messaggio" }
                    ],
                    responses: {
                        200: { description: "Messaggio eliminato con successo" },
                        403: { description: "Azione non autorizzata" },
                        404: { description: "Messaggio non trovato" },
                        500: { description: "Errore interno del server" }
                    }
                }
            }
        }
    },
    apis: [],
};

module.exports = swaggerJsdoc(options);