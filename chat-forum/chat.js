// chat-forum/chat.js
// Logika otentikasi, koneksi Socket.IO, dan penanganan pesan untuk Chat Forum.

// KRITIS: Pastikan URL ini menunjuk ke Railway Backend Anda
const SERVER_URL = 'https://smpn4pare-production.up.railway.app'; 

let socket;
let currentUser;
let currentKelas;
let token;

// =================================================================
// 1. FUNGSI OTENTIKASI & PENGALIHAN
// =================================================================

function checkAuthAndInitialize() {
    // Ambil token dan data pengguna dari Local Storage
    token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (!token || !userJson) {
        // Jika tidak ada token, alihkan ke halaman login/register
        window.location.href = 'index.html';
        return; // Mengakhiri eksekusi di sini
    }

    try {
        currentUser = JSON.parse(userJson);
        currentKelas = currentUser.kelas;
        
        // Inisialisasi tampilan chat dan koneksi
        initializeChatApp();
    } catch (e) {
        // Jika data user rusak, hapus dan alihkan
        console.error("Data pengguna rusak, mengalihkan ke login.", e);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

function initializeChatApp() {
    // Tampilkan nama pengguna dan kelas di header chat
    document.getElementById('user-info').textContent = 
        `${currentUser.nama_lengkap} (${currentKelas})`;

    // Hubungkan ke Socket.IO
    socket = io(SERVER_URL, {
        query: { token: token } // Mengirim token untuk otentikasi Socket.IO
    });

    // Event handler Socket.IO
    setupSocketListeners();

    // Event handler formulir kirim pesan
    document.getElementById('send-form').addEventListener('submit', handleSendMessage);
}


// =================================================================
// 2. LOGIKA SOCKET.IO LISTENERS
// =================================================================

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Terkoneksi ke server chat:', socket.id);
        // Bergabung ke ruangan sesuai kelas
        socket.emit('joinRoom', currentKelas);
    });

    socket.on('disconnect', () => {
        console.log('Terputus dari server.');
    });

    socket.on('connect_error', (err) => {
        console.error('Kesalahan koneksi Socket.IO:', err.message);
        displaySystemMessage('Gagal terhubung ke chat. Server mungkin sedang offline.');
    });

    socket.on('receiveMessage', handleReceiveMessage);
}

// =================================================================
// 3. LOGIKA PENANGANAN PESAN
// =================================================================

function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (content) {
        const msgData = {
            senderId: currentUser._id,
            content: content,
            kelas: currentKelas,
            // replyToId, mentions, dll. (Tambahkan jika diperlukan)
        };

        // Kirim pesan ke server
        socket.emit('sendMessage', msgData);
        input.value = '';
    }
}

function handleReceiveMessage(msg) {
    const chatBox = document.getElementById('chat-messages');
    
    // Asumsi msg memiliki struktur yang diharapkan dari backend (nama, konten, timestamp)
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-message';
    
    // Tentukan apakah pesan ini milik pengguna saat ini
    const isCurrentUser = msg.sender.id === currentUser._id;
    if (isCurrentUser) {
        msgElement.classList.add('self-message');
    } else {
        msgElement.classList.add('other-message');
    }

    // Tampilkan detail pesan
    msgElement.innerHTML = `
        <div class="message-header">
            <span class="sender-name">${msg.sender.name} (${msg.sender.kelas})</span>
            <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${msg.content}</div>
    `;

    chatBox.appendChild(msgElement);
    // Gulir ke bawah agar pesan terbaru terlihat
    chatBox.scrollTop = chatBox.scrollHeight;
}

function displaySystemMessage(message) {
    const chatBox = document.getElementById('chat-messages');
    const msgElement = document.createElement('div');
    msgElement.className = 'system-message';
    msgElement.textContent = message;
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}


// =================================================================
// 4. INVOCATION (PANGGILAN UTAMA)
// =================================================================

// Panggil fungsi otentikasi saat script dimuat
checkAuthAndInitialize();
