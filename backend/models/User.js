const mongoose = require('mongoose');
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: ''
    },
    instruments: {
        type: [String],
        default: []
    },
    genres: {
        type: [String],
        default: []
    },
    following: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User'
    },
    followers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User'
    },
    // Ruolo dell'utente all'interno della piattaforma:
    // 'user' = utente normale (può creare post, commenti, seguire altri utenti e chattare)
    // 'admin' = amministratore (può moderare ed eliminare post e commenti altrui, e gestire gli utenti)
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        required: true
    }
}, { timestamps: true });

// Middleware che si attiva prima di un "save" che, se la password è cambiata, esegue l'hashing tramite la libreria bcrypt
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Metodo che confronta la password inserita con la password hashata presente nel database
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

module.exports = mongoose.model('User', userSchema);