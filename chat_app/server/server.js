// chat_app/server/server.js (PERLU DIPERBARUI jika belum)
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth'); // Import Routes
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// Konfigurasi CORS Socket.io dan Express
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Koneksi Database (Sudah berhasil di Railway!)
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB berhasil terhubung.'))
    .catch(err => {
        console.error('Koneksi MongoDB GAGAL:', err.message);
        process.exit(1);
    });

// --- Routes REST API ---
app.use('/api/auth', authRoutes); // Gunakan route auth

// --- SOCKET.IO Logic ---

io.on('connection', (socket) => {
    // ... (Logika Socket.io seperti di respons sebelumnya) ...
    // Pastikan logika sendMessage Anda sudah melakukan populate:
    socket.on('sendMessage', async (data) => {
        // ... (Simpan pesan ke DB) ...
        
        // Dapatkan data pengirim dan pesan balasan (jika ada)
        const newMessage = await Message.findById(savedMessage._id)
            .populate('sender_id', 'nama_lengkap kelas') // Populate sender
            .populate({
                path: 'reply_to_id',
                select: 'content',
                populate: {
                    path: 'sender_id',
                    select: 'nama_lengkap kelas'
                }
            });

        // Format data untuk frontend (termasuk reply info)
        io.emit('receiveMessage', {
            id: newMessage._id,
            sender: {
                name: newMessage.sender_id.nama_lengkap,
                kelas: newMessage.sender_id.kelas,
                id: newMessage.sender_id._id,
            },
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            reply_to_id: newMessage.reply_to_id ? newMessage.reply_to_id._id : null,
            reply_to_content: newMessage.reply_to_id ? newMessage.reply_to_id.content : null, // Tambahkan konten balasan
            reply_to_sender: newMessage.reply_to_id ? `${newMessage.reply_to_id.sender_id.nama_lengkap} (${newMessage.reply_to_id.sender_id.kelas})` : null, // Tambahkan nama pengirim balasan
            mentions: newMessage.mentions,
        });

    });
    // ... (lanjutan code server.js) ...
});
