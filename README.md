# Catting Website

A modern, lightweight chatting website with real-time messaging functionality.

## Features

- Modern, minimalist UI with Apple-inspired design
- Real-time messaging using WebSockets
- Multiple chat rooms
- No login required, just enter your username
- Responsive design for all screen sizes

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
node server.js
```

3. Open `http://localhost:3000` in your browser

## Deployment to Render

1. Create a new account on [Render](https://render.com) if you don't have one
2. Click on "New +" button and select "Web Service"
3. Connect your GitHub repository or use the public GitHub repository URL
4. Fill in the following details:
   - Name: catting-website (or your preferred name)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Click "Create Web Service"

The application will be deployed and accessible at the URL provided by Render (e.g., https://catting-website.onrender.com).

## How to Use

1. Open the website
2. Enter your username
3. Select a chat room
4. Start chatting in real-time with other users in the same room