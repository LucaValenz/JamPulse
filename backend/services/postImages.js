const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { readFile, stat } = require('node:fs/promises');
const PostImage = require('../models/PostImage');
const Post = require('../models/Post');

// Percorso assoluto indipendente dalla cartella da cui viene avviato Node.
// Usata solo per importare gli upload precedenti dal volume post_uploads.
const uploadDirectory = path.join(__dirname, '..', 'uploads');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const filenamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp)$/;
const contentTypes = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
// Salviamo nel database un URL relativo: resta valido cambiando dominio o porta.
// Il prefisso /api permette di usare i proxy Vite e Nginx già configurati.
const mediaPrefix = '/api/v1/uploads/';

/**
 * Riconosce il formato dalla firma iniziale del file (magic bytes).
 * Nome ed estensione inviati dal client non sono attendibili; anche il MIME
 * viene dichiarato dal client, quindi da solo non basta a riconoscere il formato.
 * Questo controllo della firma non equivale alla decodifica completa dell'immagine.
 */
function imageExtension(buffer) {
    // JPEG inizia con FF D8 FF; PNG ha una firma fissa di otto byte.
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    // GIF ha due versioni della firma; WebP usa un contenitore RIFF con tipo WEBP.
    if (['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null; // Nessuna firma supportata: il chiamante deve rifiutare il file.
}

/** Salva il buffer ricevuto da Multer e restituisce l'URL da associare al post. */
async function savePostImage(file) {
    if (file.buffer.length > MAX_IMAGE_SIZE) {
        throw Object.assign(new Error("L'immagine non può superare 5 MB."), { status: 413 });
    }
    // L'estensione deriva dal contenuto, mai dal nome fornito dall'utente.
    const extension = imageExtension(file.buffer);
    if (!extension) {
        // Il controller traduce status in una risposta HTTP 400 leggibile dal form.
        throw Object.assign(new Error('Il file selezionato non è un’immagine supportata.'), { status: 400 });
    }
    // Un nome generato dal server evita collisioni e percorsi scelti dal client.
    const filename = `${randomUUID()}.${extension}`;
    await PostImage.create({ _id: filename, data: file.buffer, contentType: contentTypes[extension] });
    return mediaPrefix + filename;
}

/**
 * Rimuove solo file appartenenti al nostro archivio, mai immagini di siti esterni.
 * Usata per annullare un upload fallito o ripulire un post eliminato.
 * Chi la chiama dopo una cancellazione deve prima controllare eventuali altri post
 * che usano lo stesso URL, per non privarli dell'immagine.
 */
async function removePostImage(media) {
    if (typeof media !== 'string' || !media.startsWith(mediaPrefix)) return;
    const filename = media.slice(mediaPrefix.length);
    // Accettiamo solo la forma dei nomi generati qui: niente slash o segmenti ../.
    if (!filenamePattern.test(filename)) return;
    try {
        await PostImage.deleteOne({ _id: filename });
    } catch (error) {
        // La pulizia non deve nascondere l'errore originario del controller.
        console.error('Errore nella rimozione dell’immagine:', error);
    }
}

// Pubblica come il feed: gli elementi img non inviano il JWT di Axios.
async function servePostImage(req, res, next) {
    if (!filenamePattern.test(req.params.filename)) {
        return res.status(404).json({ message: 'Immagine non trovata' });
    }
    try {
        const image = await PostImage.findById(req.params.filename);
        if (!image) return res.status(404).json({ message: 'Immagine non trovata' });
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cache-Control', 'public, max-age=3600');
        res.type(image.contentType).send(Buffer.from(image.data));
    } catch (error) {
        next(error);
    }
}

// Importazione ripetibile: conserva URL e file originali, senza sovrascrivere il DB.
// I file mancanti su un nuovo PC non impediscono l'avvio del sito.
async function migrateLocalPostImages(directory = uploadDirectory) {
    const mediaUrls = await Post.distinct('media', { media: { $regex: '^/api/v1/uploads/' } });
    const result = { imported: 0, missing: 0, invalid: 0 };
    for (const media of mediaUrls) {
        const filename = media.slice(mediaPrefix.length);
        if (!filenamePattern.test(filename)) continue;
        if (await PostImage.exists({ _id: filename })) continue;
        let buffer;
        try {
            const source = path.join(directory, filename);
            const info = await stat(source);
            if (!info.isFile() || info.size > MAX_IMAGE_SIZE) {
                result.invalid++;
                continue;
            }
            buffer = await readFile(source);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            result.missing++;
            continue;
        }
        const extension = imageExtension(buffer);
        if (!extension || buffer.length > MAX_IMAGE_SIZE) {
            result.invalid++;
            continue;
        }
        const update = await PostImage.updateOne({ _id: filename }, {
            $setOnInsert: { data: buffer, contentType: contentTypes[extension] }
        }, { upsert: true });
        result.imported += update.upsertedCount;
    }
    return result;
}

module.exports = { mediaPrefix, savePostImage, removePostImage, servePostImage, migrateLocalPostImages };
