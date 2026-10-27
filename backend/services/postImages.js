const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { mkdir, writeFile, unlink } = require('node:fs/promises');

// Percorso assoluto indipendente dalla cartella da cui viene avviato Node.
// In Docker questa directory è montata sul volume persistente post_uploads.
const uploadDirectory = path.join(__dirname, '..', 'uploads');
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
    // L'estensione deriva dal contenuto, mai dal nome fornito dall'utente.
    const extension = imageExtension(file.buffer);
    if (!extension) {
        // Il controller traduce status in una risposta HTTP 400 leggibile dal form.
        throw Object.assign(new Error('Il file selezionato non è un’immagine supportata.'), { status: 400 });
    }
    // Un nome generato dal server evita collisioni e percorsi scelti dal client.
    const filename = `${randomUUID()}.${extension}`;
    // recursive consente anche il primo upload, quando uploads non esiste ancora.
    await mkdir(uploadDirectory, { recursive: true });
    // wx crea un file nuovo e fallisce se esiste già, senza sovrascriverlo.
    await writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: 'wx' });
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
    if (!/^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(filename)) return;
    try {
        await unlink(path.join(uploadDirectory, filename));
    } catch (error) {
        // Un file già assente non è un errore. Gli altri problemi vengono registrati
        // senza interrompere la risposta di errore o la cancellazione del post.
        if (error.code !== 'ENOENT') console.error('Errore nella rimozione dell’immagine:', error);
    }
}

module.exports = { uploadDirectory, mediaPrefix, savePostImage, removePostImage };
