const multer = require('multer');

// Limiti applicati dal server anche se il client aggira i controlli del form.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Il buffer rimane in memoria finché il controller non valida i dati del post.
// In questo modo un form non valido non lascia immagini inutilizzate nel DB.
const upload = multer({
    storage: multer.memoryStorage(),
    // Una sola immagine e al massimo i campi testuali content e media.
    // parts conta tutte le parti multipart, sia file sia campi di testo.
    limits: { fileSize: MAX_IMAGE_SIZE, files: 1, fields: 2, parts: 3 },
    fileFilter(req, file, callback) {
        // Primo filtro sul MIME dichiarato: postImages verificherà anche la firma.
        if (!imageTypes.has(file.mimetype)) {
            return callback(Object.assign(new Error('Sono consentite solo immagini JPG, PNG, GIF e WebP.'), { status: 400 }));
        }
        callback(null, true);
    }
}).single('image'); // Il nome deve coincidere con data.append('image', ...) nel form.

// Applicato solo alla creazione dei post, dopo l'autenticazione in server.js.
// Multer ignora i body non multipart: i client JSON esistenti continuano a funzionare.
module.exports = function postUpload(req, res, next) {
    upload(req, res, error => {
        if (!error) return next();
        // Gli errori di dimensione usano 413; gli altri limiti del form usano 400.
        if (error instanceof multer.MulterError) {
            return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
                message: error.code === 'LIMIT_FILE_SIZE'
                    ? "L'immagine non può superare 5 MB."
                    : 'Caricamento non valido: seleziona una sola immagine.'
            });
        }
        // Errori del filtro o imprevisti passano al gestore globale di Express.
        next(error);
    });
};
