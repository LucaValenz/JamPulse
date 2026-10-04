const express = require("express");
const router = express.Router();

const UserController = require("../controllers/userController");
// Importiamo il middleware di autorizzazione basato sui ruoli
const { requireRole } = require("../middlewares/authMiddleware");

router.get('/me', UserController.getLoggedUser)
router.put('/me', UserController.updateProfile)
router.get('/', UserController.getUsers)
// Rotta per ottenere la lista degli utenti seguiti dall'utente loggato.
// IMPORTANTE: deve stare PRIMA di '/:id' altrimenti Express
// interpreterebbe "following" come un ID dinamico.
router.get('/me/following', UserController.getFollowing)
router.get('/:id', UserController.getUserById)
router.get('/:id/posts', UserController.getPosts)
router.post('/:id/follow', UserController.follow)
router.delete('/:id/follow', UserController.unfollow)

// * ROTTE AMMINISTRATIVE (Richiedono ruolo 'admin') -------------------------------------------------------------------------------------
// Permette a un amministratore di eliminare un utente indesiderato
router.delete('/:id', requireRole('admin'), UserController.deleteUserByAdmin)

// Permette a un amministratore di modificare il ruolo di un utente (es. da 'user' a 'admin')
router.patch('/:id/role', requireRole('admin'), UserController.updateUserRole)

module.exports = router;
