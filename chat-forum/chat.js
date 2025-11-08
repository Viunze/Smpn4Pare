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
        console.warn('AUTH CHECK FAILED: Token or User data missing. Redirecting to index.html.');
        window.location.href = 'index.html';
        return; 
    }

    try {
        console.log('AUTH CHECK SUCCESS: Token and User data found. Parsing...');
        currentUser = JSON.parse(userJson);
        currentKelas = currentUser.kelas;
        
        console.log('User parsed successfully:', currentUser.username, 'Initializing chat...');
        
        // Panggil inisialisasi chat hanya setelah data user valid
        initializeChatApp();

    } catch (e) {
        console.error('ERROR PARSING USER DATA. Clearing storage and redirecting:', e);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

function initializeChatApp() {
    // 1. Tampilkan informasi user
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
        userInfoElement.textContent = `${currentUser.nama_lengkap} (${currentKelas})`;
    }

    // 2. KRITIS: Cek apakah io tersedia
    if (typeof io === 'undefined') {
        console.error('FATAL ERROR: Socket.IO library (io) is not loaded in chat_forum.html!');
        displaySystemMessage('Kesalahan fatal: Pustaka chat (Socket.IO) tidak dimuat. Cek Console.');
        return; 
    }
    
    // 3. Tambahkan Event Listener Form (Perbaikan Layar Putih)
    const sendForm = document.getElementById('send-form');
    if (sendForm) {
        sendForm.addEventListener('submit', handleSendMessage);
        console.log('Event listener added to send-form.');
    } else {
        // Jika form tidak ditemukan, ini adalah error DOM yang serius.
        console.error('FATAL ERROR: Form ID "send-form" not found in chat_forum.html! Stopping chat initialization.');
        displaySystemMessage('Kesalahan DOM: Form pengiriman pesan tidak ditemukan.');
        return; 
    }

    // 4. Koneksi Socket.IO
    console.log('Connecting to Socket.IO at:', SERVER_URL);
    socket = io(SERVER_URL, {
        query: { token: token } 
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
        displaySystemMessage(`Gagal terhubung ke chat: ${err.message}. Server mungkin offline atau masalah CORS.`);
    });

    socket.on('receiveMessage', handleReceiveMessage);
}

// =================================================================
// 3. LOGIKA PENANGANAN PESAN & UTILITY
// =================================================================

function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (content && socket.connected) {
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
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox) return; // Pencegahan jika chatbox hilang
    
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-message';
    
    const isCurrentUser = msg.sender.id === currentUser._id;
    msgElement.classList.add(isCurrentUser ? 'self-message' : 'other-message');

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
    if (!chatBox) return; // Pencegahan jika chatbox hilang
    
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
