const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const app = express();
const server = http.createServer(app);

// Create separate WebSocket servers for different chat types
const publicWss = new WebSocket.Server({ noServer: true });
const secretWss = new WebSocket.Server({ noServer: true });
const p2pWss = new WebSocket.Server({ noServer: true });

// Serve static files
app.use(express.static(__dirname));

// Store active rooms and their users
const publicRooms = new Map();
const secretRooms = new Map();
const p2pRooms = new Map();

const PORT = process.env.PORT || 3000;

// Generate unique room ID
function generateRoomId() {
    return crypto.randomBytes(8).toString('hex');
}

// Generate P2P invitation code
function generateInviteCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Handle different WebSocket connections based on path
server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/public') {
        publicWss.handleUpgrade(request, socket, head, (ws) => {
            publicWss.emit('connection', ws, request);
        });
    } else if (pathname === '/secret') {
        secretWss.handleUpgrade(request, socket, head, (ws) => {
            secretWss.emit('connection', ws, request);
        });
    } else if (pathname === '/p2p') {
        p2pWss.handleUpgrade(request, socket, head, (ws) => {
            p2pWss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

// Handle public chat connections
publicWss.on('connection', (ws) => {
    console.log('Client connected to public chat');
    handleConnection(ws, publicRooms);
});

// Handle secret chat connections
secretWss.on('connection', (ws) => {
    console.log('Client connected to secret chat');
    handleConnection(ws, secretRooms);
});

// Handle P2P chat connections
p2pWss.on('connection', (ws) => {
    console.log('Client connected to P2P chat');
    handleConnection(ws, p2pRooms);
});

function handleConnection(ws, roomMap) {
    let userRoom = '';
    let username = '';

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'join':
                    handleJoin(ws, message, roomMap);
                    break;
                case 'message':
                    handleMessage(ws, message, roomMap);
                    break;
                case 'create_secret':
                    handleCreateSecret(ws);
                    break;
                case 'join_secret':
                    handleJoinSecret(ws, message);
                    break;
                case 'create_p2p':
                    handleCreateP2P(ws);
                    break;
                case 'join_p2p':
                    handleJoinP2P(ws, message);
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    function handleJoin(ws, message, roomMap) {
        userRoom = message.room;
        username = message.username;

        if (!roomMap.has(userRoom)) {
            roomMap.set(userRoom, new Set());
        }
        roomMap.get(userRoom).add(ws);
        
        broadcastToRoom(userRoom, {
            type: 'message',
            room: userRoom,
            username: 'System',
            message: `${username} has joined the chat`
        }, roomMap);
    }

    function handleMessage(ws, message, roomMap) {
        if (roomMap.has(message.room)) {
            broadcastToRoom(message.room, {
                type: 'message',
                room: message.room,
                username: message.username,
                message: message.message
            }, roomMap);
        }
    }

    function handleCreateSecret(ws) {
        const roomId = generateRoomId();
        secretRooms.set(roomId, new Set([ws]));
        userRoom = roomId;

        ws.send(JSON.stringify({
            type: 'secret_created',
            roomId: roomId
        }));
    }

    function handleJoinSecret(ws, message) {
        const roomId = message.roomId;
        if (secretRooms.has(roomId)) {
            secretRooms.get(roomId).add(ws);
            userRoom = roomId;
            username = message.username;

            broadcastToRoom(roomId, {
                type: 'message',
                room: roomId,
                username: 'System',
                message: `${username} has joined the secret chat`
            }, secretRooms);
        } else {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid secret room'
            }));
        }
    }

    function handleCreateP2P(ws) {
        const inviteCode = generateInviteCode();
        const roomId = generateRoomId();
        p2pRooms.set(roomId, new Set([ws]));
        userRoom = roomId;

        ws.send(JSON.stringify({
            type: 'p2p_created',
            inviteCode: inviteCode,
            roomId: roomId
        }));
    }

    function handleJoinP2P(ws, message) {
        if (p2pRooms.has(message.roomId)) {
            const peers = p2pRooms.get(message.roomId);
            if (peers.size < 2) {
                peers.add(ws);
                userRoom = message.roomId;
                username = message.username;

                broadcastToRoom(message.roomId, {
                    type: 'message',
                    room: message.roomId,
                    username: 'System',
                    message: `${username} has joined the chat`
                }, p2pRooms);
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
        handleDisconnect(ws, roomMap);
    });

    function handleDisconnect(ws, roomMap) {
        if (!userRoom) return;

        if (roomMap.has(userRoom)) {
            const room = roomMap.get(userRoom);
            room.delete(ws);

            if (room.size === 0) {
                roomMap.delete(userRoom);
            } else {
                broadcastToRoom(userRoom, {
                    type: 'message',
                    room: userRoom,
                    username: 'System',
                    message: `${username} has left the chat`
                }, roomMap);
            }
        }
    }

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

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
