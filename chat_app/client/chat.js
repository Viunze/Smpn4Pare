// chat_app/client/chat.js
// Pastikan Anda telah memasukkan library Socket.io di chat_forum.html:
// <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>

// *** GANTI DENGAN DOMAIN RAILWAY PRODUKSI ANDA ***
const SERVER_URL = 'https://smpn4pare-production.up.railway.app'; 

// --- DOM Elements ---
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const userListContainer = document.getElementById('user-list');

// --- Global State ---
const token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let allUsers = []; // Daftar semua pengguna untuk fitur tagging
let replyToMessage = null; // State pesan yang sedang dibalas

// --- UTILITY FUNCTIONS ---

// 1. Ambil Semua User (untuk Tagging)
const fetchUsers = async () => {
    try {
        // Asumsi ada endpoint untuk mendapatkan semua user (Kita belum buat ini di backend)
        const response = await fetch(`${SERVER_URL}/api/auth/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        allUsers = data.users;
        renderUserList();
    } catch (error) {
        console.error('Gagal mengambil daftar pengguna:', error);
    }
}

// 2. Render Daftar Pengguna di Sidebar
const renderUserList = () => {
    userListContainer.innerHTML = ''; // Kosongkan
    allUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-list-item';
        // Format: Nama Lengkap (Kelas)
        item.innerHTML = `${user.nama_lengkap} <span class="user-class">(${user.kelas})</span>`;
        userListContainer.appendChild(item);
    });
}


// 3. Fungsi utama untuk menampilkan pesan ke UI
const displayMessage = (msg) => {
    const isSent = msg.sender.id === currentUser.id;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
    messageDiv.setAttribute('data-message-id', msg.id);

    // --- REPLY BOX ---
    if (msg.reply_to_content) {
        const replyBox = document.createElement('div');
        replyBox.className = 'reply-box';
        replyBox.innerHTML = `<p style="font-size: 0.8em; color: #555;">
            **Membalas ${msg.reply_to_sender}:** ${msg.reply_to_content}
        </p>`;
        messageDiv.appendChild(replyBox);
    }
    
    // --- SENDER INFO (Nama dan Kelas) ---
    const senderInfo = document.createElement('span');
    senderInfo.className = 'message-sender';
    senderInfo.innerHTML = `${msg.sender.name} (${msg.sender.kelas})`;
    if (!isSent) {
         senderInfo.style.color = '#075E54';
    }
    messageDiv.appendChild(senderInfo);

    // --- CONTENT (Parsing @mentions) ---
    const contentP = document.createElement('p');
    let contentHtml = msg.content;
    
    // Logika sederhana untuk styling @mentions (Asumsi mentions berupa teks @NamaLengkap)
    if (msg.mentions && msg.mentions.length > 0) {
        // Ganti @NamaLengkap menjadi <span>@NamaLengkap</span>
        msg.mentions.forEach(mentionedId => {
            const mentionedUser = allUsers.find(u => u._id === mentionedId);
            if (mentionedUser) {
                const mentionText = `@${mentionedUser.nama_lengkap}`;
                contentHtml = contentHtml.replace(
                    mentionText, 
                    `<span style="color: #1E90FF; font-weight: 600;">${mentionText}</span>`
                );
            }
        });
    }
    contentP.innerHTML = contentHtml;
    messageDiv.appendChild(contentP);

    // --- TIMESTAMP ---
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'message-timestamp';
    timestampSpan.textContent = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timestampSpan);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll ke bawah

    // --- Event Listener untuk Reply ---
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Mencegah menu konteks default
        setReplyMode(msg);
    });
};

// 4. Logika Mengatur Mode Reply
const setReplyMode = (msg) => {
    replyToMessage = msg;
    messageInput.placeholder = `Membalas ${msg.sender.name} (${msg.sender.kelas}). Klik untuk batalkan.`;
    messageInput.classList.add('reply-mode');

    // Listener untuk membatalkan reply mode
    messageInput.onclick = () => {
        cancelReplyMode();
    };
};

// 5. Logika Membatalkan Mode Reply
const cancelReplyMode = () => {
    replyToMessage = null;
    messageInput.placeholder = 'Ketik pesan Anda di sini...';
    messageInput.classList.remove('reply-mode');
    messageInput.onclick = null;
};


// --- CHAT INITIATION & SOCKET.IO ---

if (token && currentUser) {
    const socket = io(SERVER_URL); 
    fetchUsers(); // Ambil daftar user saat inisialisasi

    // Listener Socket.io
    socket.on('receiveMessage', (msg) => {
        displayMessage(msg);
    });

    // Logika Kirim Pesan
    const sendMessage = () => {
        const content = messageInput.value.trim();
        if (content === '') return;

        // Logika sederhana untuk menemukan Mentions
        let mentions = [];
        const mentionMatches = content.match(/@(\w+\s?\w*)/g); // Mencari @NamaLengkap
        
        if (mentionMatches) {
            mentionMatches.forEach(match => {
                const nameToFind = match.substring(1).trim(); // Hapus '@'
                const mentionedUser = allUsers.find(u => u.nama_lengkap.toLowerCase() === nameToFind.toLowerCase());
                if (mentionedUser) {
                    mentions.push(mentionedUser._id);
                }
            });
        }


        const messageData = {
            senderId: currentUser.id,
            content: content,
            kelas: currentUser.kelas,
            replyToId: replyToMessage ? replyToMessage.id : null, // Tambahkan ID pesan yang dibalas
            mentions: mentions, 
        };

        socket.emit('sendMessage', messageData);
        
        messageInput.value = ''; 
        cancelReplyMode(); // Matikan mode reply setelah pesan terkirim
    };

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

} else {
    // Jika tidak ada token (belum login), arahkan ke halaman login
    console.warn('User belum terautentikasi. Mengarahkan ke halaman login.');
    // window.location.href = 'login_chat.html'; // Aktifkan jika sudah ada file login_chat.html
}

// Catatan: Anda perlu menambahkan library socket.io klien di HTML:
// <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
