const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Store active rooms and their users
const rooms = new Map();
const secretRooms = new Map();
const p2pConnections = new Map();

const PORT = process.env.PORT || 3000;

// Generate unique room ID
function generateRoomId() {
    return crypto.randomBytes(8).toString('hex');
}

// Generate P2P invitation code (shorter and more user-friendly)
function generateInviteCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

wss.on('connection', (ws) => {
    console.log('Client connected');
    let userRoom = '';
    let username = '';
    let isSecretChat = false;
    let isP2P = false;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'join':
                    handleJoin(message);
                    break;
                case 'message':
                    handleMessage(message);
                    break;
                case 'create_secret':
                    handleCreateSecret();
                    break;
                case 'join_secret':
                    handleJoinSecret(message);
                    break;
                case 'create_p2p':
                    handleCreateP2P();
                    break;
                case 'join_p2p':
                    handleJoinP2P(message);
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    function handleJoin(message) {
        userRoom = message.room;
        username = message.username;

        // For public rooms
        if (!message.isSecret && !message.isP2P) {
            if (!rooms.has(userRoom)) {
                rooms.set(userRoom, new Set());
            }
            rooms.get(userRoom).add(ws);
        }

        broadcastToRoom(userRoom, {
            type: 'message',
            room: userRoom,
            username: 'System',
            message: `${username} has joined the chat`
        });
    }

    function handleMessage(message) {
        if (isP2P) {
            // For P2P chats, send directly to the other peer
            const peers = p2pConnections.get(userRoom);
            if (peers) {
                peers.forEach(peer => {
                    if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                        peer.send(JSON.stringify(message));
                    }
                });
            }
        } else {
            // For public and secret rooms
            broadcastToRoom(message.room, message);
        }
    }

    function handleCreateSecret() {
        const roomId = generateRoomId();
        secretRooms.set(roomId, new Set([ws]));
        isSecretChat = true;
        userRoom = roomId;

        ws.send(JSON.stringify({
            type: 'secret_created',
            roomId: roomId
        }));
    }

    function handleJoinSecret(message) {
        const roomId = message.roomId;
        if (secretRooms.has(roomId)) {
            secretRooms.get(roomId).add(ws);
            isSecretChat = true;
            userRoom = roomId;
            
            broadcastToRoom(roomId, {
                type: 'message',
                room: roomId,
                username: 'System',
                message: `${message.username} has joined the secret chat`
            }, secretRooms);
        } else {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid secret room'
            }));
        }
    }

    function handleCreateP2P() {
        const inviteCode = generateInviteCode();
        const roomId = generateRoomId();
        p2pConnections.set(roomId, new Set([ws]));
        isP2P = true;
        userRoom = roomId;

        ws.send(JSON.stringify({
            type: 'p2p_created',
            inviteCode: inviteCode,
            roomId: roomId
        }));
    }

    function handleJoinP2P(message) {
        if (p2pConnections.has(message.roomId)) {
            const peers = p2pConnections.get(message.roomId);
            if (peers.size < 2) {
                peers.add(ws);
                isP2P = true;
                userRoom = message.roomId;

                broadcastToRoom(message.roomId, {
                    type: 'message',
                    room: message.roomId,
                    username: 'System',
                    message: `${message.username} has joined the chat`
                }, p2pConnections);
            } else {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'P2P chat is full'
                }));
            }
        } else {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid invite code'
            }));
        }
    }

    ws.on('close', () => {
        console.log('Client disconnected');
        handleDisconnect();
    });

    function handleDisconnect() {
        if (userRoom) {
            if (isP2P && p2pConnections.has(userRoom)) {
                const peers = p2pConnections.get(userRoom);
                peers.delete(ws);
                if (peers.size === 0) {
                    p2pConnections.delete(userRoom);
                } else {
                    broadcastToRoom(userRoom, {
                        type: 'message',
                        room: userRoom,
                        username: 'System',
                        message: `${username} has left the chat`
                    }, p2pConnections);
                }
            } else if (isSecretChat && secretRooms.has(userRoom)) {
                const room = secretRooms.get(userRoom);
                room.delete(ws);
                if (room.size === 0) {
                    secretRooms.delete(userRoom);
                } else {
                    broadcastToRoom(userRoom, {
                        type: 'message',
                        room: userRoom,
                        username: 'System',
                        message: `${username} has left the chat`
                    }, secretRooms);
                }
            } else if (rooms.has(userRoom)) {
                rooms.get(userRoom).delete(ws);
                if (rooms.get(userRoom).size === 0) {
                    rooms.delete(userRoom);
                } else {
                    broadcastToRoom(userRoom, {
                        type: 'message',
                        room: userRoom,
                        username: 'System',
                        message: `${username} has left the chat`
                    });
                }
            }
        }
    }

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Function to broadcast messages to all clients in a room
function broadcastToRoom(room, message, roomMap = rooms) {
    if (roomMap.has(room)) {
        const messageStr = JSON.stringify(message);
        roomMap.get(room).forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});