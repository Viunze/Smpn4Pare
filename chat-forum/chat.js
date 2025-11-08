// chat-forum/chat.js
const SERVER_URL = 'https://smpn4pare-production.up.railway.app'; 

let socket;
let currentUser;
let currentKelas;
let token;
let replyToMessage = null; // State untuk fitur reply
let allUsers = []; // List semua user untuk fitur mention

// =================================================================
// 1. OTENTIKASI & SETUP APLIKASI
// =================================================================

function checkAuthAndInitialize() {
    token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    if (!token || !userJson) {
        console.warn('AUTH FAILED: Token or User data missing. Redirecting.');
        window.location.href = 'index.html';
        return; 
    }

    try {
        currentUser = JSON.parse(userJson);
        currentKelas = currentUser.kelas;
        
        initializeChatApp();

    } catch (e) {
        console.error('ERROR PARSING USER DATA. Clearing storage and redirecting:', e);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

async function initializeChatApp() {
    // 1. Tampilkan informasi user (Nama dan Kelas)
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
        userInfoElement.textContent = `${currentUser.nama_lengkap} (${currentKelas})`;
    }

    // 2. Fetch semua user untuk fitur mention
    await fetchAllUsers();

    // 3. Setup DOM Event Listeners (Form Kirim, Reply, Tagging)
    setupDOMElements();

    // 4. Inisialisasi Socket.IO
    if (typeof io === 'undefined') {
        console.error('FATAL ERROR: Socket.IO library (io) is not loaded!');
        displaySystemMessage('Kesalahan fatal: Pustaka chat (Socket.IO) tidak dimuat.');
        return; 
    }
    
    socket = io(SERVER_URL, { query: { token: token } });
    setupSocketListeners();
}

async function fetchAllUsers() {
    try {
        // Asumsi API endpoint untuk mendapatkan semua user
        const response = await fetch(`${SERVER_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            allUsers = await response.json();
            console.log(`Fetched ${allUsers.length} users for tagging.`);
        } else {
            console.error('Failed to fetch user list for tagging.');
        }
    } catch (error) {
        console.error('Error fetching user list:', error);
    }
}

// =================================================================
// 2. LOGIKA DOM & FITUR REPLY/TAGGING
// =================================================================

function setupDOMElements() {
    // A. Form Submit
    const sendForm = document.getElementById('send-form');
    if (sendForm) {
        sendForm.addEventListener('submit', handleSendMessage);
    }

    // B. Cancel Reply
    document.getElementById('cancel-reply').addEventListener('click', () => {
        replyToMessage = null;
        document.getElementById('reply-status').style.display = 'none';
    });

    // C. Tagging Input Listener
    const msgInput = document.getElementById('message-input');
    msgInput.addEventListener('input', handleTaggingInput);
    msgInput.addEventListener('keydown', (e) => {
        // Close dropdown if escape is pressed
        if (e.key === 'Escape') {
            document.getElementById('mention-dropdown').style.display = 'none';
        }
    });

    // D. Tambahkan event listener untuk fitur Reply (klik kanan pada pesan)
    document.getElementById('chat-messages').addEventListener('contextmenu', (e) => {
        const msgElement = e.target.closest('.chat-message');
        if (msgElement) {
            e.preventDefault(); // Mencegah menu konteks default browser
            
            // Dapatkan data pesan (asumsi id disimpan di data-id)
            const messageId = msgElement.getAttribute('data-id'); 
            const senderName = msgElement.querySelector('.sender-name').textContent;
            const content = msgElement.querySelector('.message-content').textContent;

            // Set state Reply
            replyToMessage = { 
                id: messageId, 
                senderName: senderName, 
                content: content 
            };
            
            // Tampilkan status reply
            document.getElementById('reply-text-preview').textContent = `${senderName}: ${content.substring(0, 30)}...`;
            document.getElementById('reply-status').style.display = 'flex';
            msgInput.focus();
        }
    });
}

function handleTaggingInput(e) {
    const input = e.target;
    const value = input.value;
    const dropdown = document.getElementById('mention-dropdown');
    
    // Cari posisi terakhir '@'
    const atIndex = value.lastIndexOf('@');
    
    if (atIndex !== -1 && (value.length > atIndex + 1)) {
        const query = value.substring(atIndex + 1).toLowerCase();
        
        // Filter user berdasarkan query (username atau nama)
        const filteredUsers = allUsers.filter(user => 
            user.username.toLowerCase().includes(query) || 
            user.nama_lengkap.toLowerCase().includes(query)
        );

        renderMentionDropdown(filteredUsers, atIndex);

    } else {
        // Sembunyikan jika tidak ada '@' atau hanya ada '@'
        dropdown.style.display = 'none';
    }
}

function renderMentionDropdown(users, atIndex) {
    const dropdown = document.getElementById('mention-dropdown');
    dropdown.innerHTML = '';

    if (users.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'mention-item';
        // Tampilkan Nama Lengkap (Kelas) atau Username
        item.textContent = `${user.nama_lengkap} (${user.kelas || user.username})`;
        item.setAttribute('data-username', user.username);
        
        item.addEventListener('click', () => selectMention(user.username, atIndex));
        dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
}

function selectMention(username, atIndex) {
    const input = document.getElementById('message-input');
    const currentValue = input.value;
    
    // Ganti query tagging dengan username lengkap
    const newPrefix = currentValue.substring(0, atIndex);
    input.value = `${newPrefix}@${username} `; // Tambahkan spasi di akhir
    
    document.getElementById('mention-dropdown').style.display = 'none';
    input.focus();
}

// =================================================================
// 3. LOGIKA SOCKET.IO LISTENERS
// =================================================================

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Terkoneksi ke server chat:', socket.id);
        socket.emit('joinRoom', currentKelas);
    });

    socket.on('disconnect', () => {
        displaySystemMessage('Koneksi terputus. Mencoba menghubungkan kembali...');
    });

    socket.on('connect_error', (err) => {
        console.error('Kesalahan koneksi Socket.IO:', err.message);
        displaySystemMessage(`Gagal terhubung ke chat. Server mungkin sedang offline atau masalah CORS.`);
    });

    socket.on('receiveMessage', handleReceiveMessage);
}

// =================================================================
// 4. LOGIKA PESAN
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
            // Sertakan context reply jika ada
            replyTo: replyToMessage ? { 
                id: replyToMessage.id,
                senderName: replyToMessage.senderName,
                contentPreview: replyToMessage.content 
            } : null,
            timestamp: new Date().toISOString()
        };

        socket.emit('sendMessage', msgData);
        input.value = '';
        
        // Reset reply state setelah kirim
        replyToMessage = null;
        document.getElementById('reply-status').style.display = 'none';
    }
}

function formatContent(content) {
    // Fungsi untuk menandai @mention di konten pesan
    let formattedContent = content.replace(/@(\w+)/g, (match, username) => {
        // Cek apakah username ini terdaftar di allUsers (opsional, bisa dihilangkan)
        const userFound = allUsers.find(u => u.username === username);
        if (userFound) {
             return `<span class="highlight-mention">${match}</span>`;
        }
        return match; // Jika tidak ditemukan, tampilkan biasa
    });
    return formattedContent;
}


function handleReceiveMessage(msg) {
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox) return; 
    
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-message';
    msgElement.setAttribute('data-id', msg.id || Date.now()); // Simpan ID pesan
    
    const isCurrentUser = msg.sender.id === currentUser._id;
    msgElement.classList.add(isCurrentUser ? 'self-message' : 'other-message');

    let replyHtml = '';
    if (msg.replyTo) {
        // Tampilkan konteks reply
        replyHtml = `
            <div class="reply-context">
                <strong>Membalas ${msg.replyTo.senderName}</strong>: ${msg.replyTo.contentPreview.substring(0, 50)}...
            </div>
        `;
    }

    // Tampilkan detail pesan: Nama (Kelas)
    msgElement.innerHTML = `
        ${replyHtml}
        <div class="message-header">
            <span class="sender-name">${msg.sender.name} (${msg.sender.kelas})</span>
        </div>
        <div class="message-content">${formatContent(msg.content)}</div>
        <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
    `;

    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function displaySystemMessage(message) {
    const chatBox = document.getElementById('chat-messages');
    if (!chatBox) return;
    
    const msgElement = document.createElement('div');
    msgElement.className = 'system-message';
    msgElement.textContent = message;
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}


// =================================================================
// 5. INVOCATION
// =================================================================

checkAuthAndInitialize();
