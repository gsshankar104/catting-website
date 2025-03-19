document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const usernameEntry = document.getElementById('username-entry');
    const chatRoomSelection = document.getElementById('chat-room-selection');
    const chatWindow = document.getElementById('chat-window');
    const usernameInput = document.getElementById('username');
    const enterChatButton = document.getElementById('enter-chat');
    const chatRoomsList = document.getElementById('chat-rooms');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const welcomeHeader = document.getElementById('welcome-header');
    const roomTitle = document.getElementById('room-title');
    const roomInfo = document.getElementById('room-info');

    // Secret Chat Elements
    const createSecretChat = document.getElementById('create-secret-chat');
    const createP2PChat = document.getElementById('create-p2p-chat');
    const joinSecretChat = document.getElementById('join-secret-chat');
    const secretChatModal = document.getElementById('secret-chat-modal');
    const p2pChatModal = document.getElementById('p2p-chat-modal');
    const shareLinkInput = document.getElementById('share-link');
    const copyLinkBtn = document.getElementById('copy-link');
    const inviteCodeInput = document.getElementById('invite-code');
    const copyCodeBtn = document.getElementById('copy-code');
    const joinCodeInput = document.getElementById('join-code');
    const joinP2PBtn = document.getElementById('join-p2p');
    const closeButtons = document.querySelectorAll('.close-button');

    let currentRoom = '';
    let username = '';
    let isSecretChat = false;
    let isP2P = false;
    let currentSocket = null;

    // Function to create a new WebSocket connection
    function createWebSocket(type) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
        const socket = new WebSocket(`${wsProtocol}//${wsHost}/${type}`);

        socket.onopen = () => {
            console.log(`Connected to ${type} WebSocket server`);
        };

        socket.onclose = () => {
            console.log(`Disconnected from ${type} WebSocket server`);
            messagesDiv.innerHTML += '<div class="message system-message">Disconnected from server. Please refresh the page.</div>';
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };

        return socket;
    }

    // Initialize WebSocket connection
    let publicSocket = createWebSocket('public');
    currentSocket = publicSocket;

    function handleServerMessage(data) {
        switch (data.type) {
            case 'message':
                // Only process messages that match our current room
                if (data.room === currentRoom) {
                    // Don't show incoming messages if we sent them
                    if (data.username !== username) {
                        appendMessage(data.username, data.message);
                    }
                }
                break;
            case 'secret_created':
                handleSecretCreated(data);
                break;
            case 'p2p_created':
                handleP2PCreated(data);
                break;
            case 'error':
                alert(data.message);
                break;
        }
    }

    function handleSecretCreated(data) {
        const shareLink = `${window.location.origin}?room=${data.roomId}&type=secret`;
        shareLinkInput.value = shareLink;
        secretChatModal.style.display = 'flex';
        isSecretChat = true;
        currentRoom = data.roomId;
        
        // Switch to secret socket
        currentSocket = createWebSocket('secret');
    }

    function handleP2PCreated(data) {
        inviteCodeInput.value = data.inviteCode;
        document.getElementById('p2p-initiator').style.display = 'block';
        document.getElementById('p2p-joiner').style.display = 'none';
        p2pChatModal.style.display = 'flex';
        isP2P = true;
        currentRoom = data.roomId;
        
        // Switch to P2P socket
        currentSocket = createWebSocket('p2p');
    }

    // Event Listeners
    enterChatButton.addEventListener('click', () => {
        username = usernameInput.value.trim();
        if (username) {
            welcomeHeader.classList.add('slide-out');
            usernameEntry.classList.add('slide-out');
            setTimeout(() => {
                welcomeHeader.style.display = 'none';
                usernameEntry.style.display = 'none';
                
                // Check URL parameters for direct room join
                const urlParams = new URLSearchParams(window.location.search);
                const roomId = urlParams.get('room');
                const type = urlParams.get('type');
                
                if (roomId && type) {
                    if (type === 'secret') {
                        joinSecretRoom(roomId);
                    } else if (type === 'p2p') {
                        joinP2PRoom(roomId);
                    }
                } else {
                    chatRoomSelection.style.display = 'block';
                    chatRoomSelection.classList.add('slide-in');
                }
            }, 300);
        } else {
            alert('Please enter a username.');
        }
    });

    // Room selection handlers
    chatRoomsList.addEventListener('click', (event) => {
        if (event.target.classList.contains('room-button')) {
            const roomName = event.target.textContent;
            joinPublicRoom(event.target.dataset.room, roomName);
        }
    });

    createSecretChat.addEventListener('click', () => {
        currentSocket = createWebSocket('secret');
        currentSocket.onopen = () => {
            currentSocket.send(JSON.stringify({ type: 'create_secret' }));
        };
    });

    createP2PChat.addEventListener('click', () => {
        currentSocket = createWebSocket('p2p');
        currentSocket.onopen = () => {
            currentSocket.send(JSON.stringify({ type: 'create_p2p' }));
        };
    });

    joinSecretChat.addEventListener('click', () => {
        document.getElementById('p2p-joiner').style.display = 'block';
        document.getElementById('p2p-initiator').style.display = 'none';
        p2pChatModal.style.display = 'flex';
    });

    joinP2PBtn.addEventListener('click', () => {
        const code = joinCodeInput.value.trim().toUpperCase();
        if (code) {
            currentSocket = createWebSocket('p2p');
            currentSocket.onopen = () => {
                currentSocket.send(JSON.stringify({
                    type: 'join_p2p',
                    inviteCode: code,
                    username: username
                }));
            };
        }
    });

    // Copy buttons
    copyLinkBtn.addEventListener('click', () => {
        shareLinkInput.select();
        document.execCommand('copy');
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => copyLinkBtn.textContent = 'Copy', 2000);
    });

    copyCodeBtn.addEventListener('click', () => {
        inviteCodeInput.select();
        document.execCommand('copy');
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => copyCodeBtn.textContent = 'Copy', 2000);
    });

    // Close modal buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    // Handle sending messages
    const sendMessage = () => {
        const messageText = messageInput.value.trim();
        if (messageText && currentRoom && currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            const messageData = {
                type: 'message',
                room: currentRoom,
                username: username,
                message: messageText
            };
            currentSocket.send(JSON.stringify(messageData));
            messageInput.value = '';
            
            // Show our own messages immediately
            appendMessage(username, messageText);
        }
    };

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Room joining functions
    function joinPublicRoom(roomId, roomName) {
        currentRoom = roomId;
        isSecretChat = false;
        isP2P = false;
        currentSocket = publicSocket;
        switchToChat(roomName);
        currentSocket.send(JSON.stringify({
            type: 'join',
            room: roomId,
            username: username
        }));
    }

    function joinSecretRoom(roomId) {
        currentSocket = createWebSocket('secret');
        isSecretChat = true;
        isP2P = false;
        currentRoom = roomId;
        switchToChat('Secret Chat');
        
        currentSocket.onopen = () => {
            currentSocket.send(JSON.stringify({
                type: 'join_secret',
                roomId: roomId,
                username: username
            }));
        };
        
        roomInfo.textContent = '🔒 This is a private chat room. Messages will be deleted when everyone leaves.';
        messagesDiv.innerHTML = '';
    }

    function joinP2PRoom(roomId) {
        currentSocket = createWebSocket('p2p');
        isP2P = true;
        isSecretChat = false;
        currentRoom = roomId;
        switchToChat('Private P2P Chat');
        
        currentSocket.onopen = () => {
            currentSocket.send(JSON.stringify({
                type: 'join_p2p',
                roomId: roomId,
                username: username
            }));
        };
        
        roomInfo.textContent = '👥 This is a peer-to-peer chat. Only you and your friend can see these messages.';
        messagesDiv.innerHTML = '';
    }

    function switchToChat(roomName) {
        chatRoomSelection.classList.add('slide-out');
        setTimeout(() => {
            chatRoomSelection.style.display = 'none';
            chatWindow.style.display = 'block';
            chatWindow.classList.add('slide-in');
            roomTitle.textContent = roomName;
            messageInput.focus();
        }, 300);
    }

    // Helper function to append messages
    function appendMessage(username, message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message slide-in';
        messageElement.innerHTML = `<span class="username">${username}:</span> ${message}`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
});