// chat-forum/chat.js
// Logika Chat Real-Time Forum SMPN 4 Pare

// *** GANTI DENGAN DOMAIN RAILWAY PRODUKSI ANDA ***
const SERVER_URL = 'https://smpn4pare-production.up.railway.app'; 
const socket = io(SERVER_URL); // Inisiasi koneksi Socket.IO

// --- DOM Elements ---
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const userListContainer = document.getElementById('user-list');

// --- Global State ---
const token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let allUsers = []; 
let replyToMessage = null; 

// ==========================================================
// 🛑 CEK AUTENTIKASI AWAL (PENTING UNTUK MENCEGAH LOOPING)
// ==========================================================
if (!token || !currentUser) {
    // Jika tidak ada token (belum login), arahkan ke halaman login
    console.warn('User belum terautentikasi. Mengarahkan ke halaman login.');
    window.location.href = 'index.html'; 
    
    // 🔥 PENTING: TAMBAHKAN 'return' UNTUK MENGHENTIKAN EKSEKUSI SCRIPT INI
    // Jika script tidak dihentikan, ia dapat memicu event lain yang menyebabkan loop.
    return; 
}

// ----------------------------------------------------------
// --- UTILITY FUNCTIONS ---
// ----------------------------------------------------------

// 1. Ambil Semua User (untuk Tagging & User List)
const fetchUsers = async () => {
    try {
        const response = await fetch(`${SERVER_URL}/api/auth/users`, {
            headers: { 'x-auth-token': token } 
        });
        
        if (!response.ok) {
            // Jika token kadaluarsa atau API error, log out dan redirect
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'index.html';
                return; // Hentikan eksekusi
            }
            throw new Error('Gagal mengambil daftar pengguna');
        }

        const data = await response.json();
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
    
    // Parsing untuk tag (@nama)
    const styledContent = contentHtml.replace(/@(\w+\s?\w*)/g, (match) => {
        const nameToFind = match.substring(1).trim();
        const mentionedUser = allUsers.find(u => u.nama_lengkap.toLowerCase() === nameToFind.toLowerCase());
        
        if(mentionedUser) {
            return `<span style="color: #1E90FF; font-weight: 600;">${match}</span>`;
        }
        return match; 
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


// ----------------------------------------------------------
// --- LOGIKA TAGGING (Saran Pengguna) ---
// ----------------------------------------------------------

const mentionSuggestions = document.createElement('div'); 
mentionSuggestions.id = 'mention-suggestions';
// Pastikan elemen ini ditambahkan ke BODY atau elemen root Anda
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
        // Posisi saran yang disederhanakan
        mentionSuggestions.style.cssText = `
            position: absolute;
            bottom: 60px; /* Di atas input field */
            left: ${inputRect.left}px;
            width: ${inputRect.width}px;
        `;
        
        filteredUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'mention-item';
            item.textContent = `@${user.nama_lengkap} (${user.kelas})`;
            
            item.onclick = () => {
                const currentVal = messageInput.value;
                const lastAtIndex = currentVal.lastIndexOf('@');
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


// ----------------------------------------------------------
// --- CHAT INITIATION & SOCKET.IO ---
// ----------------------------------------------------------

// Fetch user list saat berhasil masuk ke halaman chat
fetchUsers(); 

// Listener Socket.io
socket.on('receiveMessage', (msg) => {
    displayMessage(msg);
});

// Logika Kirim Pesan
const sendMessage = () => {
    const content = messageInput.value.trim();
    if (content === '') return;

    let mentions = [];
    // Regex untuk menemukan @nama, termasuk nama dengan spasi (seperti @Adi Wijaya)
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

// ----------------------------------------------------------
// --- EVENT LISTENERS ---
// ----------------------------------------------------------

if (sendButton) sendButton.addEventListener('click', sendMessage);
if (messageInput) {
    // Kirim pesan dengan Enter, batalkan reply dengan Escape
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            sendMessage();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            cancelReplyMode();
        }
    });

    // Logika menampilkan saran mention saat mengetik '@'
    messageInput.addEventListener('input', (e) => {
        const currentVal = e.target.value;
        const lastAtIndex = currentVal.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const query = currentVal.substring(lastAtIndex + 1);
            // Hanya tampilkan saran jika setelah '@' belum ada spasi
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
