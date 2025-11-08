// chat_app/server/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Route untuk REGISTRASI SISWA BARU
router.post('/register', async (req, res) => {
    const { nama_lengkap, username, password, kelas } = req.body;

    try {
        // Cek apakah username sudah terdaftar
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Username sudah digunakan.' });
        }

        // Buat instance User baru
        user = new User({
            nama_lengkap,
            username,
            password, // Password belum di-hash
            kelas
        });

        // Hash Password (Keamanan!)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Simpan ke MongoDB
        await user.save();

        // Buat Payload JWT
        const payload = {
            user: {
                id: user.id,
                kelas: user.kelas
            }
        };

        // Generate Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Menggunakan secret dari .env
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token }); // Kirim token ke frontend
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Route untuk LOGIN SISWA
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Cek apakah user ada
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }

        // Bandingkan password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }

        // Buat dan kirim token jika berhasil login (sama seperti register)
        const payload = {
            user: {
                id: user.id,
                kelas: user.kelas,
                nama: user.nama_lengkap
            }
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

module.exports = router;
