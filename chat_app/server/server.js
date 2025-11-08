// server.js - Backend Chat Forum SMPN 4 Pare

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Impor model dan routes
// Pastikan path ke file routes/auth dan models/Message benar
const authRoutes = require('./routes/auth');
const Message = require('./models/Message'); // Asumsi Anda memiliki model ini

const app = express();
const server = http.createServer(app);

// --- Konfigurasi Environment Variables ---
const PORT = process.env.PORT || 8000; 
const MONGO_URI = process.env.MONGO_URI; 

// =================================================================
// 1. KONFIGURASI CORS (KRITIS UNTUK MENGATASI "KESALAHAN KONEKSI SERVER")
// =================================================================
const ALLOWED_ORIGINS = [
    // Domain Production Vercel Anda
    'https://smpn4pare.vercel.app', 
    // Domain Git Main Branch (Pastikan ini sesuai dengan yang Anda akses)
    'https://smpn4pare-git-main-viunzes-projects.vercel.app', 
    // Domain Preview/Deploy ID (Pastikan ini sesuai dengan deploy ID Anda yang lain)
    'https://smpn4pare-ihc0ea7uu-viunzes-projects.vercel.app', 
    // Domain Railway itu sendiri
    'https://smpn4pare-production.up.railway.app',
    // Domain lokal untuk testing
    'http://localhost:3000',
    'http://127.0.0.1:5500' 
];

// Konfigurasi CORS untuk Express REST API (Login/Register)
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(express.json()); // Body parser untuk menerima JSON

// =================================================================
// 2. KONEKSI DATABASE
// =================================================================
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB berhasil terhubung.')) // Log ini sudah terkonfirmasi berhasil di Railway
    .catch(err => {
        console.error('Koneksi MongoDB GAGAL:', err.message);
        process.exit(1);
    });

// =================================================================
// 3. ROUTES REST API (Autentikasi: /api/auth/register, /api/auth/login)
// =================================================================
app.use('/api/auth', authRoutes);


// =================================================================
// 4. SOCKET.IO Logic (Real-Time Chat)
// =================================================================

// Konfigurasi CORS untuk Socket.io
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log(`User terhubung: ${socket.id}`);

    // Logika pengiriman pesan (disingkat, gunakan kode lengkap Anda sebelumnya jika diperlukan)
    socket.on('sendMessage', async (data) => {
        // Asumsi logika penyimpanan dan populasi pesan dari kode sebelumnya sudah ada di sini
        try {
            // ... (Simpan pesan ke MongoDB)
            // ... (Populasi data pengirim)
            
            // Kirim pesan ke semua klien
            io.emit('receiveMessage', data); // Mengirim data mentah untuk tujuan testing
            
        } catch (error) {
            console.error('Gagal memproses pesan:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User terputus', socket.id);
    });
});


// =================================================================
// 5. START SERVER
// =================================================================
server.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
