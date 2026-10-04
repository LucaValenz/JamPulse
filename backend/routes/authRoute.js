// ====================================================================================================================
// ROTTE DI AUTENTICAZIONE (/api/v1/auth)
// ====================================================================================================================
// Queste rotte gestiscono l'accesso, la registrazione e il ciclo di vita dei token di sessione.
// 
// NOTA ARCHITETTURALE:
// In server.js, queste rotte vengono registrate PRIMA del middleware globale 'verifyToken':
//   app.use('/api/v1/auth', authRoute);
//   app.use(verifyToken);
// In questo modo, gli endpoint di registrazione, login, refresh e logout sono accessibili pubblicamente
// (oppure accessibili anche quando l'Access Token dell'utente è già scaduto).
// ====================================================================================================================

const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/authController");

// Registrazione di un nuovo account musicista
router.post("/register", AuthController.register);

// Login con username e password: emette Access Token (15m) + Refresh Token (7d)
router.post("/login", AuthController.login);

// Rinnovo trasparente dell'Access Token mediante invio del Refresh Token (con Token Rotation)
router.post("/refresh", AuthController.refreshToken);

// Logout: revoca e cancella il Refresh Token dal database MongoDB
router.post("/logout", AuthController.logout);

module.exports = router;
