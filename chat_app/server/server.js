// server.js - Backend Chat Forum SMPN 4 Pare

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// --- Konfigurasi Environment Variables ---
// Gunakan port dari environment variable (untuk Railway) atau 8000
const PORT = process.env.PORT || 8000; 
const MONGO_URI = process.env.MONGO_URI; 

// --- CORS Configuration (SOLUSI UNTUK 'KESALAHAN KONEKSI SERVER') ---
// Ganti origin di bawah dengan URL Vercel AKTIF Anda (untuk production)
// Jika URL Vercel Anda berubah, harus diupdate di sini.
const allowedOrigins = [
    // URL Vercel Frontend Anda saat ini (harus diupdate jika menggunakan custom domain)
    'https://smpn4pare-git-main-viunzes-projects.vercel.app', 
    'https://smpn4pare.vercel.app', 
    // URL development/testing Vercel Anda yang lain
    'https://smpn4pare-3qqgo7lbi-viunzes-projects.vercel.app',
    // Tambahkan URL Railway itu sendiri (jika ada request internal)
    'https://smpn4pare-production.up.railway.app' 
];

app.use(cors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));

// --- Middleware Bawaan ---
app.use(express.json()); // Body parser untuk menerima JSON

// --- Koneksi Database MongoDB ---
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB berhasil terhubung.');
    })
    .catch(err => {
        console.error('Koneksi MongoDB GAGAL:', err.message);
        // Penting: Anda bisa memilih untuk keluar dari proses jika koneksi database gagal
        // process.exit(1); 
    });


// ===============================================
// 1. ROUTE API AUTH (Login/Register)
// ===============================================
const authRoutes = require('./routes/auth'); // Pastikan path ke file routes Anda benar
app.use('/api/auth', authRoutes);


// ===============================================
// 2. SOCKET.IO (Chat Real-Time)
// ===============================================
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Logika Socket.IO 
io.on('connection', (socket) => {
    console.log(`User terkoneksi: ${socket.id}`);

    socket.on('sendMessage', (msgData) => {
        // Logika menyimpan pesan ke database (jika ada)
        // ...

        // Kirim pesan ke semua klien
        io.emit('receiveMessage', {
            id: Date.now(), // ID sementara (ganti dengan ID MongoDB asli)
            sender: { 
                id: msgData.senderId, 
                name: 'Nama Pengirim', // Ambil dari database berdasarkan senderId
                kelas: msgData.kelas 
            },
            content: msgData.content,
            timestamp: new Date().toISOString(),
            reply_to_content: null, // Ganti jika ada logika reply
            reply_to_sender: null
        });
    });

    socket.on('disconnect', () => {
        console.log('User terputus', socket.id);
    });
});


// ===============================================
// 3. START SERVER
// ===============================================
server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
