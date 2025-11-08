// chat_app/server/models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referensi ke koleksi User
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    reply_to_id: { // Untuk fitur Reply
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    mentions: [{ // Untuk fitur Tag (@)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    kelas: { // Tambahkan kelas untuk filtering/tracing
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Message', MessageSchema);
