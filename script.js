document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const usernameEntry = document.getElementById('username-entry');
    const chatRoomSelection = document.getElementById('chat-room-selection');
    const chatWindow = document.getElementById('chat-window');
    const usernameInput = document.getElementById('username');
    const enterChatButton = document.getElementById('enter-chat');
    const chatRoomButtons = document.getElementById('chat-rooms');
    const messagesDiv = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const welcomeHeader = document.getElementById('welcome-header');
    const roomTitle = document.getElementById('room-title');

    let currentRoom = '';
    //let currentRoom = '';
    let username = '';

    // Initialize WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
    const socket = new WebSocket(`${wsProtocol}//${wsHost}`);

    // WebSocket event handlers
    socket.addEventListener('open', () => {
        console.log('Connected to WebSocket server');
    });

    socket.addEventListener('close', () => {
        console.log('Disconnected from WebSocket server');
        messagesDiv.innerHTML += '<div class="message">Disconnected from server. Please refresh the page.</div>';
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });

    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.room === currentRoom) {
                appendMessage(data.username, data.message);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // Event Listeners
    enterChatButton.addEventListener('click', () => {
        username = usernameInput.value.trim();
        console.log("Username entered:", username);
        if (username) {
            welcomeHeader.classList.add('slide-out');
            usernameEntry.classList.add('slide-out');
            setTimeout(() => {
                welcomeHeader.style.display = 'none';
                usernameEntry.style.display = 'none';
                chatRoomSelection.style.display = 'block';
                chatRoomSelection.classList.add('slide-in');
            }, 300);
        } else {
            alert('Please enter a username.');
        }
    });

    // Room selection using buttons
    chatRoomButtons.addEventListener('click', (event) => {
        if (event.target.classList.contains('room-button')) {
            currentRoom = event.target.dataset.room;
            const roomName = event.target.textContent;
            console.log("Room selected:", currentRoom);

            chatRoomSelection.classList.add('slide-out');
            setTimeout(() => {
                chatRoomSelection.style.display = 'none';
                chatWindow.style.display = 'block';
                chatWindow.classList.add('slide-in');
                roomTitle.textContent = roomName;
            }, 300);
        }
    });

    // Handle sending messages
    const sendMessage = () => {
        const messageText = messageInput.value.trim();
        console.log("Message sending:", messageText, currentRoom);
        if (messageText && currentRoom) {
            const messageData = {
                type: 'message',
                room: currentRoom,
                username: username,
                message: messageText
            };
            socket.send(JSON.stringify(messageData));
            messageInput.value = '';
        }
    };

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Helper function to append messages
    function appendMessage(username, message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message slide-in';
        messageElement.innerHTML = `<span class="username">${username}:</span> ${message}`;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
});