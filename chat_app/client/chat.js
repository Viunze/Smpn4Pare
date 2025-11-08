// chat_app/client/chat.js (FULL CODE UPDATED)
// *** GANTI DENGAN DOMAIN RAILWAY PRODUKSI ANDA ***
const SERVER_URL = 'https://smpn4pare-production.up.railway.app'; 

// --- DOM Elements ---
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const userListContainer = document.getElementById('user-list');
const mentionSuggestions = document.createElement('div'); // Div untuk saran mention

// --- Global State ---
const token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
let allUsers = []; 
let replyToMessage = null; 

// Tambahkan div saran mention ke body
mentionSuggestions.id = 'mention-suggestions';
document.body.appendChild(mentionSuggestions);

// --- UTILITY FUNCTIONS ---

// 1. Ambil Semua User (untuk Tagging)
const fetchUsers = async () => {
    try {
        const response = await fetch(`${SERVER_URL}/api/auth/users`, {
            headers: { 'x-auth-token': token } // Gunakan header yang benar
        });
        
        if (!response.ok) {
            throw new Error('Gagal mengambil daftar pengguna');
        }

        const data = await response.json();
        allUsers = data.users.filter(u => u.id !== currentUser.id); // Kecualikan diri sendiri
        renderUserList();
    } catch (error) {
        console.error('Gagal mengambil daftar pengguna:', error);
        // Jika gagal, mungkin redirect ke login atau tampilkan pesan error
    }
}

// 2. Render Daftar Pengguna di Sidebar
const renderUserList = () => {
    userListContainer.innerHTML = `<p style="font-weight: bold; margin-bottom: 10px;">Pengguna Aktif:</p>`;
    allUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-list-item';
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
        replyBox.style.cssText = 'padding: 5px; background: #eee; border-left: 3px solid var(--color-primary); margin-bottom: 5px;';
        replyBox.innerHTML = `<p style="font-size: 0.8em; color: #555;">
            **Membalas ${msg.reply_to_sender}:** ${msg.reply_to_content.substring(0, 30)}...
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
    
    // Sederhanakan parsing mention: cari @username dan beri gaya
    const styledContent = contentHtml.replace(/@(\w+)/g, (match) => {
        return `<span style="color: #1E90FF; font-weight: 600;">${match}</span>`;
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
};

// 5. Logika Membatalkan Mode Reply
const cancelReplyMode = () => {
    replyToMessage = null;
    messageInput.placeholder = 'Ketik pesan Anda di sini...';
};

// 6. Logika Menampilkan Saran Mention (Sederhana)
const showMentionSuggestions = (query) => {
    mentionSuggestions.innerHTML = '';

    const filteredUsers = allUsers.filter(user => 
        user.nama_lengkap.toLowerCase().startsWith(query.toLowerCase())
    ).slice(0, 5); // Tampilkan 5 saran teratas

    if (filteredUsers.length > 0) {
        const inputRect = messageInput.getBoundingClientRect();
        mentionSuggestions.style.cssText = `
            position: absolute;
            top: ${inputRect.top - 100}px; /* Posisikan di atas input */
            left: ${inputRect.left}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 1000;
        `;
        
        filteredUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'mention-item';
            item.style.cssText = 'padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;';
            item.textContent = `@${user.nama_lengkap} (${user.kelas})`;
            
            item.onclick = () => {
                // Ganti @query dengan @NamaLengkap yang dipilih
                const currentVal = messageInput.value;
                const newVal = currentVal.substring(0, currentVal.lastIndexOf('@')) + `@${user.nama_lengkap} `;
                messageInput.value = newVal;
                mentionSuggestions.style.display = 'none';
                messageInput.focus();
            };
            mentionSuggestions.appendChild(item);
        });
        mentionSuggestions.style.display = 'block';
    } else {
        mentionSuggestions.style.display = 'none';
    }
};


// --- CHAT INITIATION & SOCKET.IO ---

if (token && currentUser) {
    // 1. Inisialisasi
    const socket = io(SERVER_URL); 
    fetchUsers(); 

    // 2. Listener Socket.io
    socket.on('receiveMessage', (msg) => {
        displayMessage(msg);
    });

    // 3. Logika Kirim Pesan
    const sendMessage = () => {
        const content = messageInput.value.trim();
        if (content === '') return;

        // Logika untuk mengumpulkan ID Mentions
        let mentions = [];
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

    // 4. Event Listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            cancelReplyMode();
        }
    });

    messageInput.addEventListener('input', (e) => {
        // Logika Tagging: Cari '@' terakhir
        const currentVal = e.target.value;
        const lastAtIndex = currentVal.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const query = currentVal.substring(lastAtIndex + 1).trim();
            // Batasi saran jika ada spasi setelah query, menandakan tag selesai
            if (!query.includes(' ')) {
                 showMentionSuggestions(query);
            } else {
                mentionSuggestions.style.display = 'none';
            }
        } else {
            mentionSuggestions.style.display = 'none';
        }
    });


} else {
    // Arahkan ke login jika tidak ada token
    // window.location.href = 'login_chat.html'; 
}
