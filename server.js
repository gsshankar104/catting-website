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

// Generate P2P invitation code
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
        isSecretChat = !!message.isSecret;
        isP2P = !!message.isP2P;

        if (!isSecretChat && !isP2P) {
            if (!rooms.has(userRoom)) {
                rooms.set(userRoom, new Set());
            }
            rooms.get(userRoom).add(ws);
            
            // Send join message only for public rooms
            broadcastToRoom(userRoom, {
                type: 'message',
                room: userRoom,
                username: 'System',
                message: `${username} has joined the chat`
            }, rooms);
        }
    }

    function handleMessage(message) {
        let targetRoomMap;
        // Determine the room type from the message itself
        if (message.isSecret) {
            targetRoomMap = secretRooms;
        } else if (message.isP2P) {
            targetRoomMap = p2pConnections;
        } else {
            targetRoomMap = rooms;
        }

        if (targetRoomMap && targetRoomMap.has(message.room)) {
            broadcastToRoom(message.room, {
                type: 'message',
                room: message.room,
                username: message.username,
                message: message.message,
                isSecret: message.isSecret,
                isP2P: message.isP2P
            }, targetRoomMap);
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
            username = message.username;

            broadcastToRoom(roomId, {
                type: 'message',
                room: roomId,
                username: 'System',
                message: `${username} has joined the secret chat`,
                isSecret: true
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
                username = message.username;

                broadcastToRoom(message.roomId, {
                    type: 'message',
                    room: message.roomId,
                    username: 'System',
                    message: `${username} has joined the chat`,
                    isP2P: true
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
        if (!userRoom) return;

        let targetRoomMap;
        if (isSecretChat) {
            targetRoomMap = secretRooms;
        } else if (isP2P) {
            targetRoomMap = p2pConnections;
        } else {
            targetRoomMap = rooms;
        }

        if (targetRoomMap.has(userRoom)) {
            const room = targetRoomMap.get(userRoom);
            room.delete(ws);

            if (room.size === 0) {
                targetRoomMap.delete(userRoom);
            } else {
                broadcastToRoom(userRoom, {
                    type: 'message',
                    room: userRoom,
                    username: 'System',
                    message: `${username} has left the chat`,
                    isSecret: isSecretChat,
                    isP2P: isP2P
                }, targetRoomMap);
            }
        }
    }

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcastToRoom(room, message, roomMap) {
    if (!roomMap || !roomMap.has(room)) return;

    const messageStr = JSON.stringify(message);
    const clients = roomMap.get(room);
    
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});
