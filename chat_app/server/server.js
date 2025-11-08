// chat_app/server/server.js
require('dotenv').config(); // Muat variabel dari .env

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

// Menghubungkan Socket.io ke server HTTP
// Konfigurasi CORS ini PENTING untuk Railway dan frontend
const io = new Server(server, {
    cors: {
        origin: "*", // Ganti dengan domain frontend Anda saat deploy (misalnya: https://smpn4pare.railway.app)
        methods: ["GET", "POST"]
    }
});

// --- Middleware ---
app.use(cors()); // Izinkan CORS dari semua origin (sesuaikan untuk produksi)
app.use(express.json()); // Parser untuk body JSON dari request

// --- Koneksi Database ---
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB berhasil terhubung.'))
    .catch(err => {
        console.error('Koneksi MongoDB GAGAL:', err.message);
        process.exit(1);
    });

// --- Routes REST API (Auth) ---
app.use('/api/auth', authRoutes);

// --- SOCKET.IO Logic (Real-Time Chat) ---

io.on('connection', (socket) => {
    console.log(`User terhubung: ${socket.id}`);

    // Ketika user mengirim pesan
    socket.on('sendMessage', async (data) => {
        try {
            // Data harus berisi: sender_id, content, kelas, reply_to_id (opsional), mentions (opsional)

            // Simpan pesan ke database
            const newMessage = new Message({
                sender_id: data.senderId, 
                content: data.content,
                kelas: data.kelas,
                reply_to_id: data.replyToId || null,
                mentions: data.mentions || [], 
            });
            await newMessage.save();

            // Kirim pesan ke semua klien yang terhubung secara real-time
            // Lakukan 'populate' untuk mendapatkan nama pengirim dan detail kelas
            await newMessage.populate('sender_id'); 
            
            io.emit('receiveMessage', {
                id: newMessage._id,
                sender: {
                    name: newMessage.sender_id.nama_lengkap,
                    kelas: newMessage.sender_id.kelas,
                    id: newMessage.sender_id._id,
                },
                content: newMessage.content,
                timestamp: newMessage.timestamp,
                reply_to_id: newMessage.reply_to_id,
                mentions: newMessage.mentions,
            });

        } catch (error) {
            console.error('Gagal mengirim pesan:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User terputus', socket.id);
    });
});

// --- Server Listener ---
// Railway akan memberikan nilai port secara otomatis (PORT || 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
