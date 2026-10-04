require('dotenv').config(); // Assicurati di avere 'dotenv' installato per leggere il MONGO_URI
const mongoose = require('mongoose');

// ! ATTENZIONE: Controlla che questi percorsi corrispondano alla tua struttura delle cartelle
const User = require('./models/User'); 
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const bcrypt = require('bcryptjs');

// Dati fittizi per i musicisti (tutti con ruolo 'user')
const musiciansData = [
    { username: 'freddiemercury', email: 'freddie@queen.com', password: 'password123', role: 'user', bio: 'Cantante, pianista, leggenda.', instruments: ['Voce', 'Pianoforte'], genres: ['Rock', 'Pop'] },
    { username: 'jimihendrix', email: 'jimi@experience.com', password: 'password123', role: 'user', bio: 'Scusate se bacio il cielo.', instruments: ['Chitarra'], genres: ['Rock', 'Blues'] },
    { username: 'milesdavis', email: 'miles@cool.com', password: 'password123', role: 'user', bio: 'Il re della tromba.', instruments: ['Tromba'], genres: ['Jazz'] },
    { username: 'flea', email: 'flea@rhcp.com', password: 'password123', role: 'user', bio: 'Slap bass for life.', instruments: ['Basso'], genres: ['Funk', 'Rock'] },
    { username: 'ludovico', email: 'ludo@classica.com', password: 'password123', role: 'user', bio: 'Compositore contemporaneo.', instruments: ['Pianoforte'], genres: ['Classica'] }
];

async function seedDatabase() {
    try {
        // Connessione al DB (assicurati che process.env.MONGO_URI sia valorizzato)
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jampulse');
        console.log('🔌 Connesso al database. Inizio pulizia...');

        // 1. Pulisce tutto il database esistente
        await User.deleteMany({});
        await Post.deleteMany({});
        await Comment.deleteMany({});
        await Chat.deleteMany({});
        await Message.deleteMany({});
        console.log('🗑️  Database pulito!');

        // Generiamo il "salt" (il fattore di casualità per la crittografia)
        const salt = await bcrypt.genSalt(10);
        
        // Criptiamo la password di ogni musicista nell'array prima di inviarla al DB
        for (let musician of musiciansData) {
            musician.password = await bcrypt.hash(musician.password, salt);
        }

        const users = await User.insertMany(musiciansData);

        // 3. Ogni utente crea 5 post (versione mista: prima tutti i post 1, poi i post 2, ecc.)
        const allPosts = [];
        for (let i = 1; i <= 5; i++) { // Prima cicliamo sui numeri del post (da 1 a 5)
            for (const user of users) { // Poi per ogni numero, facciamo pubblicare il post all'utente
                const post = await Post.create({
                    userID: user._id, // ref dal postSchema
                    content: `Questo è il post numero ${i} di ${user.username}! Sto provando nuove melodie oggi.`,
                    // Usiamo Lorem Picsum per generare un'immagine casuale basata sull'ID dell'utente e il numero del post
                    media: `https://picsum.photos/seed/${user.username}${i}/600/400`
                });
                allPosts.push(post);
            }
        }
        console.log(`📝 Creati ${allPosts.length} post mescolati (alternati per utente).`);

        // 4. Ogni utente commenta TUTTI i post degli ALTRI utenti
        let commentCount = 0;
        for (const post of allPosts) {
            for (const user of users) {
                // Se l'autore del post NON è l'utente corrente, aggiungi un commento
                if (post.userID.toString() !== user._id.toString()) {
                    await Comment.create({
                        postId: post._id,
                        authorId: user._id, // ref dal commentSchema
                        text: `Bellissimo post! Saluti da ${user.username} 🎸`
                    });
                    commentCount++;
                }
            }
        }
        console.log(`💬 Creati ${commentCount} commenti incrociati.`);

        // 5. Crea chat 1-a-1 tra tutti gli utenti e inserisci 2 messaggi
        let chatCount = 0;
        let messageCount = 0;
        
        // Doppio ciclo per creare coppie uniche di utenti
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const userA = users[i];
                const userB = users[j];

                // Crea la chat con i due partecipanti
                const chat = await Chat.create({
                    participants: [userA._id, userB._id] // ref dal chatSchema
                });
                chatCount++;

                // Utente A manda il primo messaggio
                await Message.create({
                    chatID: chat._id, // ref dal messageSchema
                    senderID: userA._id, // ref dal messageSchema
                    content: `Ciao ${userB.username}, ti andrebbe di fare una jam session?`
                });

                // Utente B risponde
                await Message.create({
                    chatID: chat._id, // ref dal messageSchema
                    senderID: userB._id, // ref dal messageSchema
                    content: `Assolutamente sì, ${userA.username}! Quando sei libero?`
                });
                messageCount += 2;
            }
        }
        console.log(`✉️  Create ${chatCount} chat con un totale di ${messageCount} messaggi.`);

        // 6. Crea l'utente di test isolato (senza post, chat o commenti)
        await User.create({
            username: 'test',
            email: 'test@test.com',
            password: 'test',
            role: 'user'
        });
        console.log('🧪 Utente di test ("test") creato con successo.');

        // 7. Crea l'utente amministratore con ruolo 'admin' (ha permessi di moderazione)
        await User.create({
            username: 'admin',
            email: 'admin@jampulse.com',
            password: 'adminpassword123',
            role: 'admin',
            bio: 'Amministratore della piattaforma JamPulse',
            instruments: ['Regia'],
            genres: ['All']
        });
        console.log('🛡️  Utente amministratore ("admin" / password: "adminpassword123") creato con successo.');

        console.log('✅ Seeding completato con successo!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Errore durante il seeding:', error);
        process.exit(1);
    }
}

// Lancia la funzione
seedDatabase();