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

    let currentRoom = '';
    let username = '';

    // Demo mode - simulated chat without WebSocket
    let messages = [];
    const simulatedSocket = {
        send: (data) => {
            const parsed = JSON.parse(data);
            if (parsed.type === 'message') {
                setTimeout(() => {
                    messages.push({
                        username: parsed.username,
                        message: parsed.message,
                        timestamp: new Date().toLocaleTimeString()
                    });
                    appendMessage(parsed.username, parsed.message);
                }, 100);
            }
        }
    };
    const socket = simulatedSocket;

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

    chatRoomsList.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            event.preventDefault();
            currentRoom = event.target.dataset.room;
            
            chatRoomSelection.classList.remove('slide-in');
            chatRoomSelection.classList.add('slide-out');
            
            setTimeout(() => {
                chatRoomSelection.style.display = 'none';
                chatWindow.style.display = 'block';
                chatWindow.classList.add('slide-in');
                
                // Send join room message
                const joinMessage = {
                    type: 'join',
                    room: currentRoom,
                    username: username
                };
                socket.send(JSON.stringify(joinMessage));
                
                // Display welcome message
                messagesDiv.innerHTML = `<div class="message">Welcome to the ${currentRoom} chat room!</div>`;
            }, 300);
        }
    });

    // Handle sending messages
    const sendMessage = () => {
        const messageText = messageInput.value.trim();
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