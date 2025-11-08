// server.js - Backend Chat Forum SMPN 4 Pare

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import model dan routes
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
    // Domain Git Main Branch
    'https://smpn4pare-git-main-viunzes-projects.vercel.app', 
    // Domain Preview/Deploy ID (Termasuk ID yang Anda akses sebelumnya)
    'https://smpn4pare-ihc0ea7uu-viunzes-projects.vercel.app', 
    'https://smpn4pare-3qqgo7lbi-viunzes-projects.vercel.app', // Domain lama
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
    .then(() => console.log('MongoDB berhasil terhubung.'))
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
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log(`User terhubung: ${socket.id}`);

    // ... (Logika Socket.IO Anda)
    socket.on('sendMessage', async (data) => {
        try {
            // Logika penyimpanan dan populasi pesan Anda...
            io.emit('receiveMessage', data); 
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
