// chat_app/server/server.js
// Final Version - Siap Deploy di Railway

require('dotenv').config(); // Muat variabel dari .env (untuk local testing)

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import models dan routes
const authRoutes = require('./routes/auth');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// =================================================================
// KONFIGURASI CORS (PENTING UNTUK VERCEL & RAILWAY)
// =================================================================
const ALLOWED_ORIGINS = [
    // Domain Frontend Vercel Anda:
    'https://smpn4pare.vercel.app', 
    // Domain Backend Railway Anda (untuk jaga-jaga):
    'https://smpn4pare-production.up.railway.app',
    // Domain Lokal (untuk testing di komputer Anda)
    'http://localhost:3000',
    'http://127.0.0.1:5500' 
];

// Konfigurasi CORS untuk Socket.io
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"]
    }
});

// Konfigurasi CORS untuk Express REST API
app.use(cors({
    origin: ALLOWED_ORIGINS
}));
app.use(express.json()); 

// =================================================================
// KONEKSI DATABASE
// =================================================================
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB berhasil terhubung.'))
    .catch(err => {
        console.error('Koneksi MongoDB GAGAL:', err.message);
        process.exit(1);
    });

// =================================================================
// ROUTES REST API (Autentikasi & Data Pengguna)
// =================================================================
app.use('/api/auth', authRoutes);


// =================================================================
// SOCKET.IO Logic (Real-Time Chat)
// =================================================================

io.on('connection', (socket) => {
    console.log(`User terhubung: ${socket.id}`);

    // Ketika user mengirim pesan
    socket.on('sendMessage', async (data) => {
        try {
            // 1. Simpan pesan ke database
            const newMessage = new Message({
                sender_id: data.senderId, 
                content: data.content,
                kelas: data.kelas,
                reply_to_id: data.replyToId || null,
                mentions: data.mentions || [], 
            });
            const savedMessage = await newMessage.save();

            // 2. Populate data pengirim dan pesan balasan untuk dikirim kembali
            // Populate adalah kunci untuk mendapatkan nama pengirim dan detail balasan
            const populatedMessage = await Message.findById(savedMessage._id)
                .populate('sender_id', 'nama_lengkap kelas') 
                .populate({
                    path: 'reply_to_id',
                    select: 'content sender_id',
                    populate: {
                        path: 'sender_id',
                        select: 'nama_lengkap kelas' // Untuk mendapatkan nama pengirim pesan yang dibalas
                    }
                });

            // 3. Format data dan kirim ke semua klien
            io.emit('receiveMessage', {
                id: populatedMessage._id,
                sender: {
                    name: populatedMessage.sender_id.nama_lengkap,
                    kelas: populatedMessage.sender_id.kelas,
                    id: populatedMessage.sender_id._id,
                },
                content: populatedMessage.content,
                timestamp: populatedMessage.timestamp,
                
                // Data Reply (Jika ada)
                reply_to_id: populatedMessage.reply_to_id ? populatedMessage.reply_to_id._id : null,
                reply_to_content: populatedMessage.reply_to_id ? populatedMessage.reply_to_id.content : null,
                reply_to_sender: populatedMessage.reply_to_id 
                    ? `${populatedMessage.reply_to_id.sender_id.nama_lengkap} (${populatedMessage.reply_to_id.sender_id.kelas})` 
                    : null,
                
                mentions: populatedMessage.mentions,
            });

        } catch (error) {
            console.error('Gagal memproses pesan:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User terputus', socket.id);
    });
});

// =================================================================
// SERVER LISTENER
// =================================================================
// Railway akan menggunakan PORT dari environment variable (biasanya 8080)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
