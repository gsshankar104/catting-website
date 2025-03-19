const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Store active rooms and their users
const rooms = new Map();

const PORT = process.env.PORT || 3000;

wss.on('connection', (ws) => {
    console.log('Client connected');
    let userRoom = '';
    let username = '';

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'join') {
                // Handle room joining
                userRoom = message.room;
                username = message.username;

                // Initialize room if it doesn't exist
                if (!rooms.has(userRoom)) {
                    rooms.set(userRoom, new Set());
                }
                rooms.get(userRoom).add(ws);

                // Broadcast join message to room
                broadcastToRoom(userRoom, {
                    type: 'message',
                    room: userRoom,
                    username: 'System',
                    message: `${username} has joined the chat`
                });

            } else if (message.type === 'message') {
                // Broadcast message to all clients in the same room
                broadcastToRoom(message.room, message);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (userRoom && rooms.has(userRoom)) {
            // Remove user from room
            rooms.get(userRoom).delete(ws);
            
            // If room is empty, delete it
            if (rooms.get(userRoom).size === 0) {
                rooms.delete(userRoom);
            } else {
                // Notify others in the room
                broadcastToRoom(userRoom, {
                    type: 'message',
                    room: userRoom,
                    username: 'System',
                    message: `${username} has left the chat`
                });
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Function to broadcast messages to all clients in a room
function broadcastToRoom(room, message) {
    if (rooms.has(room)) {
        const messageStr = JSON.stringify(message);
        rooms.get(room).forEach((client) => {
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