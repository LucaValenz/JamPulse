const mongoose = require('mongoose');

// I file sono limitati a 5 MiB, sotto il limite BSON di 16 MiB.
// Una collezione separata evita di caricare i binari nelle query del feed.
const postImageSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Nome UUID: mantiene compatibili gli URL esistenti.
    data: { type: Buffer, required: true },
    contentType: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    }
}, { timestamps: true });

module.exports = mongoose.model('PostImage', postImageSchema);
