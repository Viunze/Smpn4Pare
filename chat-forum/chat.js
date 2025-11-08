// chat-forum/chat.js
// Logika Chat Real-Time

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

// Cek autentikasi saat file ini dimuat
if (!token || !currentUser) {
    // Jika tidak ada token (belum login), arahkan ke halaman login
    console.warn('User belum terautentikasi. Mengarahkan ke halaman login.');
    window.location.href = 'index.html'; 
}

let allUsers = []; // Daftar semua pengguna dari backend
let replyToMessage = null; // State pesan yang sedang dibalas

// --- UTILITY FUNCTIONS ---

// 1. Ambil Semua User (untuk Tagging & User List)
const fetchUsers = async () => {
    try {
        const response = await fetch(`${SERVER_URL}/api/auth/users`, {
            headers: { 'x-auth-token': token } // Menggunakan token untuk otorisasi
        });
        
        if (!response.ok) {
            // Jika token kadaluarsa, log out
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
            throw new Error('Gagal mengambil daftar pengguna');
        }

        const data = await response.json();
        // Simpan data user lengkap (termasuk ID untuk mencocokkan mentions)
        allUsers = data.users; 
        renderUserList();
    } catch (error) {
        console.error('Gagal mengambil daftar pengguna:', error);
    }
}

// 2. Render Daftar Pengguna di Sidebar
const renderUserList = () => {
    userListContainer.innerHTML = '';
    allUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-list-item';
        const isMe = user.id === currentUser.id;
        item.innerHTML = `${user.nama_lengkap} <span class="user-class">(${user.kelas})</span> ${isMe ? '(Anda)' : ''}`;
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
            **Membalas ${msg.reply_to_sender}:** ${msg.reply_to_content.substring(0, 50)}...
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
    
    // Ganti @NamaLengkap menjadi teks yang di-style
    const styledContent = contentHtml.replace(/@(\w+\s?\w*)/g, (match) => {
        // Logika sederhana: cari user yang namanya match dengan tag
        const nameToFind = match.substring(1).trim();
        const mentionedUser = allUsers.find(u => u.nama_lengkap.toLowerCase() === nameToFind.toLowerCase());
        
        if(mentionedUser) {
            return `<span style="color: #1E90FF; font-weight: 600;">${match}</span>`;
        }
        return match; // Jika tidak ada, biarkan seperti biasa
    });

    contentP.innerHTML = styledContent;
    messageDiv.appendChild(contentP);

    // --- TIMESTAMP ---
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'message-timestamp';
    timestampSpan.textContent = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timestampSpan);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; 

    // --- Event Listener untuk Reply (klik kanan) ---
    messageDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        setReplyMode(msg);
    });
};

// 4. Logika Mengatur Mode Reply
const setReplyMode = (msg) => {
    replyToMessage = msg;
    messageInput.placeholder = `Membalas ${msg.sender.name} (${msg.sender.kelas}). Tekan ESC untuk batalkan.`;
    messageInput.focus();
    messageInput.classList.add('reply-mode');
};

// 5. Logika Membatalkan Mode Reply
const cancelReplyMode = () => {
    replyToMessage = null;
    messageInput.placeholder = 'Ketik pesan Anda di sini...';
    messageInput.classList.remove('reply-mode');
    hideMentionSuggestions();
};

// --- LOGIKA TAGGING (Saran Pengguna) ---
const mentionSuggestions = document.createElement('div'); 
mentionSuggestions.id = 'mention-suggestions';
document.body.appendChild(mentionSuggestions);

const showMentionSuggestions = (query) => {
    mentionSuggestions.innerHTML = '';
    if (!query) {
        mentionSuggestions.style.display = 'none';
        return;
    }

    const filteredUsers = allUsers.filter(user => 
        user.nama_lengkap.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); 

    if (filteredUsers.length > 0) {
        const inputRect = messageInput.getBoundingClientRect();
        // Posisikan div saran
        mentionSuggestions.style.cssText = `
            position: absolute;
            top: ${inputRect.top - 200}px; 
            left: ${inputRect.left}px;
            /* Tambahkan styling lain dari CSS Anda */
        `;
        
        filteredUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'mention-item';
            item.textContent = `@${user.nama_lengkap} (${user.kelas})`;
            
            item.onclick = () => {
                const currentVal = messageInput.value;
                const lastAtIndex = currentVal.lastIndexOf('@');
                // Ganti @query dengan @NamaLengkap yang dipilih
                const newVal = currentVal.substring(0, lastAtIndex) + `@${user.nama_lengkap} `;
                messageInput.value = newVal;
                hideMentionSuggestions();
                messageInput.focus();
            };
            mentionSuggestions.appendChild(item);
        });
        mentionSuggestions.style.display = 'block';
    } else {
        hideMentionSuggestions();
    }
};

const hideMentionSuggestions = () => {
    mentionSuggestions.style.display = 'none';
};


// --- CHAT INITIATION & SOCKET.IO ---

const socket = io(SERVER_URL); 
fetchUsers(); 

// Listener Socket.io
socket.on('receiveMessage', (msg) => {
    displayMessage(msg);
});

// Logika Kirim Pesan
const sendMessage = () => {
    const content = messageInput.value.trim();
    if (content === '') return;

    // Logika untuk mengumpulkan ID Mentions
    let mentions = [];
    // Mencari tag yang dimulai dengan @ diikuti Nama Lengkap (spasi opsional)
    const mentionMatches = content.match(/@(\w+\s?\w*)/g); 
    
    if (mentionMatches) {
        mentionMatches.forEach(match => {
            const nameToFind = match.substring(1).trim(); 
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
        replyToId: replyToMessage ? replyToMessage.id : null,
        mentions: mentions, 
    };

    socket.emit('sendMessage', messageData);
    
    messageInput.value = ''; 
    cancelReplyMode(); 
};

// Event Listeners
if (sendButton) sendButton.addEventListener('click', sendMessage);
if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            sendMessage();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            cancelReplyMode();
        }
    });

    messageInput.addEventListener('input', (e) => {
        const currentVal = e.target.value;
        const lastAtIndex = currentVal.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const query = currentVal.substring(lastAtIndex + 1);
            // Hanya tampilkan saran jika query tidak mengandung spasi setelah @
            if (!query.includes(' ')) {
                 showMentionSuggestions(query);
            } else {
                hideMentionSuggestions();
            }
        } else {
            hideMentionSuggestions();
        }
    });
}
