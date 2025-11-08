// chat_app/server/routes/auth.js (FULL CODE UPDATED)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware sederhana untuk melindungi route yang membutuhkan login
const auth = (req, res, next) => {
    // Ambil token dari header
    const token = req.header('x-auth-token');

    // Cek jika tidak ada token
    if (!token) {
        return res.status(401).json({ msg: 'Tidak ada token, otorisasi ditolak' });
    }

    // Verifikasi token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token tidak valid' });
    }
};

// =================================================================
// 1. ROUTE REGISTRASI SISWA BARU
// =================================================================
router.post('/register', async (req, res) => {
    const { nama_lengkap, username, password, kelas } = req.body;
    // Validasi input disarankan di sini

    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Username sudah digunakan.' });
        }

        user = new User({ nama_lengkap, username, password, kelas });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = {
            user: { id: user.id, kelas: user.kelas, nama: user.nama_lengkap }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, 
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =================================================================
// 2. ROUTE LOGIN SISWA
// =================================================================
router.post('/login', async (req, res) => {
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

        const payload = {
            user: { id: user.id, kelas: user.kelas, nama: user.nama_lengkap }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// =================================================================
// 3. ROUTE AMBIL SEMUA USER (Dibutuhkan untuk Fitur Tagging)
// =================================================================
router.get('/users', auth, async (req, res) => {
    try {
        // Ambil semua user, tapi HANYA field yang dibutuhkan (nama, kelas, ID)
        const users = await User.find().select('nama_lengkap kelas username'); 
        res.json({ users });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
