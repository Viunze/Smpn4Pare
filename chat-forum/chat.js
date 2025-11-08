// chat-forum/chat.js
const SERVER_URL = 'https://smpn4pare-production.up.railway.app'; 

let socket;
let currentUser;
let currentKelas;
let token;

// =================================================================
// 1. FUNGSI OTENTIKASI & PENGALIHAN
// =================================================================

function checkAuthAndInitialize() {
    token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (!token || !userJson) {
        // Jika token hilang, alihkan ke login/register
        console.warn('AUTH CHECK FAILED: Token or User data missing. Redirecting to index.html.');
        window.location.href = 'index.html';
        return; 
    }

    try {
        console.log('AUTH CHECK SUCCESS: Token and User data found. Parsing...');
        
        // Coba parsing data user
        currentUser = JSON.parse(userJson);
        currentKelas = currentUser.kelas;
        
        console.log('User parsed successfully:', currentUser.username, 'Initializing chat...');
        initializeChatApp();

    } catch (e) {
        // Jika parsing gagal (data rusak), clear storage dan alihkan
        console.error('ERROR PARSING USER DATA. Clearing storage and redirecting:', e);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

function initializeChatApp() {
    // Tampilkan nama pengguna dan kelas di header chat
    document.getElementById('user-info').textContent = 
        `${currentUser.nama_lengkap} (${currentKelas})`;

    // KRITIS: Cek apakah io tersedia
    if (typeof io === 'undefined') {
        // Jika kode mencapai sini, berarti <script src="socket.io.min.js"> HILANG/GAGAL di chat_forum.html
        console.error('FATAL ERROR: Socket.IO library (io) is not loaded in chat_forum.html!');
        displaySystemMessage('Kesalahan fatal: Pustaka chat (Socket.IO) tidak dimuat. Cek Console.');
        return; 
    }
    
    console.log('Connecting to Socket.IO at:', SERVER_URL);
    // Hubungkan ke Socket.IO
    socket = io(SERVER_URL, {
        query: { token: token } // Mengirim token untuk otentikasi Socket.IO
    });

    setupSocketListeners();
}

// =================================================================
// 2. LOGIKA SOCKET.IO LISTENERS
// =================================================================

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Terkoneksi ke server chat:', socket.id);
        socket.emit('joinRoom', currentKelas);
    });

    socket.on('disconnect', () => {
        console.log('Terputus dari server.');
        displaySystemMessage('Koneksi terputus. Mencoba menghubungkan kembali...');
    });

    socket.on('connect_error', (err) => {
        console.error('Kesalahan koneksi Socket.IO:', err.message);
        displaySystemMessage('Gagal terhubung ke chat. Server mungkin sedang offline atau masalah CORS.');
    });

    socket.on('receiveMessage', handleReceiveMessage);
}

// =================================================================
// 3. LOGIKA PENANGANAN PESAN & UTILITY
// =================================================================

function handleSendMessage(e) {
    e.preventDefault();
    // ... (Logika kirim pesan)
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (content) {
        const msgData = {
            sender: {
                id: currentUser._id,
                name: currentUser.nama_lengkap,
                kelas: currentKelas
            },
            content: content,
            timestamp: new Date().toISOString()
        };

        socket.emit('sendMessage', msgData);
        input.value = '';
    }
}

function handleReceiveMessage(msg) {
    // ... (Logika terima pesan)
    const chatBox = document.getElementById('chat-messages');
    
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-message';
    
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
// 4. INVOCATION
// =================================================================

// Panggil fungsi otentikasi saat script dimuat
checkAuthAndInitialize();
