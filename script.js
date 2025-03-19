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

    // Bot responses
    const botResponses = [
        "Hey! How are you?",
        "That's interesting!",
        "Tell me more about that.",
        "I understand what you mean.",
        "Great point!",
        "Thanks for sharing!",
        "What do you think about that?",
        "I agree with you!",
        "That's a good perspective.",
        "Let's continue this discussion!"
    ];

    function getRandomBotResponse() {
        return botResponses[Math.floor(Math.random() * botResponses.length)];
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
                
                // Display welcome message
                messagesDiv.innerHTML = `
                    <div class="message system-message">Welcome to the ${currentRoom} chat room!</div>
                    <div class="message system-message">This is a demo version. Messages are simulated.</div>
                `;
            }, 300);
        }
    });

    // Handle sending messages
    const sendMessage = () => {
        const messageText = messageInput.value.trim();
        if (messageText && currentRoom) {
            // Show user message
            appendMessage(username, messageText);
            messageInput.value = '';

            // Simulate bot response
            setTimeout(() => {
                const botName = "ChatBot";
                appendMessage(botName, getRandomBotResponse());
            }, 1000);
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