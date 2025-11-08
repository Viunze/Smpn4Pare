// chat_app/client/chat.js (Logika Frontend Chat)
const SERVER_URL = 'http://localhost:3000'; // Ganti dengan URL Railway Anda saat deploy!

// Ambil token dan detail user dari localStorage setelah login
const token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// Hanya jalankan jika user sudah login
if (token && currentUser) {
    // 1. Inisialisasi Socket.io
    const socket = io(SERVER_URL); 

    // 2. Fungsi untuk menampilkan pesan ke UI
    const displayMessage = (msg) => {
        const isSent = msg.sender.id === currentUser.id;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;

        // Tambahkan nama (kelas)
        const senderInfo = document.createElement('span');
        senderInfo.className = 'message-sender';
        senderInfo.innerHTML = `${msg.sender.name} (${msg.sender.kelas})`;
        if (!isSent) {
             senderInfo.style.color = '#075E54'; // Warna hijau untuk pengirim lain
        }
        messageDiv.appendChild(senderInfo);

        // Tambahkan konten pesan
        const contentP = document.createElement('p');
        contentP.textContent = msg.content;
        messageDiv.appendChild(contentP);

        // Tambahkan timestamp
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'message-timestamp';
        timestampSpan.textContent = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        messageDiv.appendChild(timestampSpan);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll ke bawah
    };

    // 3. Listener Socket.io
    socket.on('receiveMessage', (msg) => {
        displayMessage(msg);
    });

    // 4. Logika Kirim Pesan
    const sendMessage = () => {
        const content = messageInput.value.trim();
        if (content === '') return;

        const messageData = {
            senderId: currentUser.id,
            content: content,
            kelas: currentUser.kelas,
            // replyToId: null, // Logika reply akan ditambahkan nanti
            // mentions: [],    // Logika mention akan ditambahkan nanti
        };

        // Kirim pesan ke server melalui Socket.io
        socket.emit('sendMessage', messageData);
        
        messageInput.value = ''; // Kosongkan input
    };

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // 5. Autentikasi dan Redirect (Kode di file login_chat.html)
    // Di file login_chat.html, setelah login berhasil:
    /*
    fetch(`${SERVER_URL}/api/auth/login`, { ... })
        .then(res => res.json())
        .then(data => {
            if(data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user)); // Simpan detail user
                window.location.href = 'chat_forum.html'; 
            }
        });
    */

} else {
    // Jika tidak ada token (belum login), arahkan ke halaman login
    // window.location.href = 'login_chat.html';
}
