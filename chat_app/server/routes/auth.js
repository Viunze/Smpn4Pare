// chat_app/server/routes/auth.js
// Asumsi Anda menggunakan router Express dan jwt.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Pastikan model User sudah terimpor
const User = require('../models/User'); // Ganti path sesuai struktur Anda

const JWT_SECRET = process.env.JWT_SECRET || 'ganti_dengan_secret_kuat'; // Harus sama dengan secret yang Anda gunakan

// Endpoint Registrasi
router.post('/register', async (req, res) => {
    const { nama_lengkap, username, password, kelas } = req.body;

    try {
        // 1. Cek apakah pengguna sudah ada
        let user = await User.findOne({ username });
        if (user) {
            return res.status(409).json({ msg: 'Username (NISN/NIS) sudah terdaftar.' });
        }

        // 2. Buat pengguna baru
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            nama_lengkap,
            username,
            password: hashedPassword,
            kelas
        });

        await user.save();

        // 3. GENERATE TOKEN dan kirim kembali data pengguna
        const payload = {
            user: { id: user.id }
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // KRITIS: Mengirim token dan objek user
        // Hapus password hash dari objek user sebelum dikirim ke frontend
        const userResponse = {
            _id: user._id,
            nama_lengkap: user.nama_lengkap,
            username: user.username,
            kelas: user.kelas
        };

        // Respon sukses dengan TOKEN dan data USER
        res.status(201).json({ 
            msg: 'Registrasi Berhasil!', 
            token, // <-- Pastikan ini ada
            user: userResponse // <-- Pastikan ini ada
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Endpoint Login (Pastikan ini juga mengembalikan token dan user)
router.post('/login', async (req, res) => {
    // ... Logika login Anda di sini, yang juga harus merespons dengan token dan user
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }
        
        // Generate Token
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        const userResponse = {
            _id: user._id,
            nama_lengkap: user.nama_lengkap,
            username: user.username,
            kelas: user.kelas
        };

        res.json({ token, user: userResponse });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
