const express = require("express");
const router = express.Router();

const PostController = require("../controllers/postController");
const postUpload = require('../middlewares/postUpload');

router.get('/', PostController.getPosts)
router.get('/:id', PostController.getPostById)
router.put('/:id', PostController.updatePost)
// Prima estraiamo il multipart in req.body/req.file, poi creiamo il post.
// L'autenticazione è già stata applicata da server.js prima di questo router.
router.post('/', postUpload, PostController.createPost)
router.delete('/:id', PostController.deletePost)
router.post('/:id/like', PostController.toggleLike)

module.exports = router;
