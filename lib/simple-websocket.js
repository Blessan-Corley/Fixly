// Simple WebSocket server without Socket.io dependencies
const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Map();

// Initialize WebSocket server
function initializeWebSocket(server) {
  if (wss) return wss;
  
  wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });
  
  wss.on('connection', (ws, request) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    clients.set(clientId, { ws, userId: null, rooms: new Set() });
    
    console.log(`🔗 WebSocket client connected: ${clientId}`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      clientId,
      timestamp: Date.now()
    }));
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(clientId, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`❌ WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(clientId);
    });
  });
  
  return wss;
}

// Handle incoming messages
function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch (message.type) {
    case 'join':
      client.userId = message.userId;
      client.rooms.add(message.room);
      broadcast({
        type: 'user_joined',
        userId: message.userId,
        room: message.room,
        timestamp: Date.now()
      }, message.room);
      break;
      
    case 'message':
      broadcast({
        type: 'new_message',
        userId: client.userId,
        message: message.content,
        room: message.room,
        timestamp: Date.now()
      }, message.room);
      break;
      
    case 'notification':
      sendToUser(message.targetUserId, {
        type: 'notification',
        title: message.title,
        body: message.body,
        timestamp: Date.now()
      });
      break;
  }
}

// Broadcast to room
function broadcast(message, room = null) {
  for (const [clientId, client] of clients) {
    if (room && !client.rooms.has(room)) continue;
    
    if (client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(JSON.stringify(message));
    }
  }
}

// Send to specific user
function sendToUser(userId, message) {
  for (const [clientId, client] of clients) {
    if (client.userId === userId && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

// Get online users
function getOnlineUsers() {
  const users = new Set();
  for (const [clientId, client] of clients) {
    if (client.userId) users.add(client.userId);
  }
  return Array.from(users);
}

module.exports = {
  initializeWebSocket,
  broadcast,
  sendToUser,
  getOnlineUsers
};