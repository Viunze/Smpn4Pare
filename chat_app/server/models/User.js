// chat_app/server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nama_lengkap: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: { // Akan disimpan dalam bentuk HASH
        type: String,
        required: true,
    },
    kelas: { // Wajib diisi saat registrasi
        type: String,
        required: true,
        enum: [
            '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '7J',
            '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '8J',
            '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H', '9I', '9J',
        ],
    },
    registered_at: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('User', UserSchema);
