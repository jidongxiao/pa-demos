const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Configuration
const WS_PORT = process.env.WS_PORT || 8080;
const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
const ROOM_CLEANUP_INTERVAL = 60000; // 1 minute
const ROOM_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Room-based in-memory storage
const rooms = new Map(); // roomCode -> Room instance
const connections = new Map(); // connectionId -> Connection instance
const userSessions = new Map(); // userId -> Set of connectionIds

// Room management classes and functions
class Room {
    constructor(code) {
        this.code = code;
        this.connections = new Set(); // connectionIds
        this.users = new Map(); // userId -> user info
        this.createdAt = new Date();
        this.lastActivity = new Date();
        this.language = 'javascript';
        this.hostId = null; // Track the room creator
    }
    
    addConnection(connectionId, user, isHost = false) {
        this.connections.add(connectionId);
        this.users.set(user.id, user);
        this.lastActivity = new Date();
        
        // Set the first user as host
        if (isHost || this.hostId === null) {
            this.hostId = user.id;
        }
    }
    
    removeConnection(connectionId, userId) {
        this.connections.delete(connectionId);
        if (userId) {
            this.users.delete(userId);
            
            // If host left, assign new host
            if (userId === this.hostId && this.users.size > 0) {
                this.hostId = Array.from(this.users.keys())[0];
            }
        }
        this.lastActivity = new Date();
    }
    
    getHostConnectionId() {
        if (!this.hostId) return null;
        
        // Find connection ID for the host
        for (const connectionId of this.connections) {
            const connection = connections.get(connectionId);
            if (connection && connection.userId === this.hostId) {
                return connectionId;
            }
        }
        return null;
    }
    
    isEmpty() {
        return this.connections.size === 0;
    }
    
    isInactive(timeoutMs) {
        return Date.now() - this.lastActivity.getTime() > timeoutMs;
    }
    
    getCollaborators() {
        return Array.from(this.users.values());
    }
}

class Connection {
    constructor(id, sessionId, ws) {
        this.id = id;
        this.sessionId = sessionId;
        this.ws = ws;
        this.userId = null;
        this.user = null;
        this.roomCode = null;
        this.authenticated = false;
        this.lastActivity = Date.now();
        this.rateLimitCount = 0;
        this.rateLimitWindow = Date.now();
    }
    
    updateActivity() {
        this.lastActivity = Date.now();
    }
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const bytes = crypto.randomBytes(6);
    
    for (let i = 0; i < 6; i++) {
        result += chars[bytes[i] % chars.length];
    }
    
    return result;
}

function createRoom() {
    let roomCode;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        roomCode = generateRoomCode();
        attempts++;
        
        if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique room code');
        }
    } while (rooms.has(roomCode));
    
    const room = new Room(roomCode);
    rooms.set(roomCode, room);
    
    console.log(`Created room: ${roomCode}`);
    return room;
}

function getRoomByCode(roomCode) {
    return rooms.get(roomCode.toUpperCase());
}

function cleanupEmptyRooms() {
    const now = Date.now();
    const roomsToDelete = [];
    
    for (const [code, room] of rooms.entries()) {
        if (room.isEmpty() || room.isInactive(ROOM_INACTIVITY_TIMEOUT)) {
            roomsToDelete.push(code);
        }
    }
    
    roomsToDelete.forEach(code => {
        rooms.delete(code);
        console.log(`Cleaned up room: ${code}`);
    });
    
    if (roomsToDelete.length > 0) {
        console.log(`Cleaned up ${roomsToDelete.length} rooms. Active rooms: ${rooms.size}`);
    }
}

// Start periodic room cleanup
function startRoomCleanup() {
    setInterval(() => {
        cleanupEmptyRooms();
    }, ROOM_CLEANUP_INTERVAL);
    
    console.log('Room cleanup service started');
}

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('Shutting down WebSocket server...');
    
    // Close all connections
    for (const connection of connections.values()) {
        if (connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.close();
        }
    }
    
    // Clear all rooms (they're in-memory only)
    rooms.clear();
    connections.clear();
    userSessions.clear();
    
    console.log('Server shutdown complete');
    process.exit(0);
});

class RoomBasedWebSocketServer {
    constructor() {
        this.initialize();
    }

    initialize() {
        console.log('Initializing Room-Based WebSocket Server...');
        
        // Start room cleanup service
        startRoomCleanup();
        
        // Set up WebSocket server
        this.setupWebSocketServer();
        
        console.log('WebSocket server initialization complete');
        console.log(`Server ready to handle rooms on port ${WS_PORT}`);
    }

    setupWebSocketServer() {
        try {
            let server;
            
            // Try to use HTTPS if certificates are available
            try {
                server = https.createServer({
                    cert: fs.readFileSync('/etc/letsencrypt/live/presentationassistants.com/cert.pem'),
                    key: fs.readFileSync('/etc/letsencrypt/live/presentationassistants.com/privkey.pem'),
                    ca: fs.readFileSync('/etc/letsencrypt/live/presentationassistants.com/chain.pem')
                });
                console.log('Using HTTPS server with SSL certificates');
            } catch (sslError) {
                // Fall back to HTTP if SSL certificates are not available
                console.log('SSL certificates not found, falling back to HTTP server');
                server = http.createServer();
            }

            const wss = new WebSocket.Server({ 
                server: server,
                clientTracking: true
            });

            server.listen(WS_PORT, () => {
                console.log(`WebSocket server started on port ${WS_PORT}`);
            });

            wss.on('connection', (ws, req) => {
                const connectionId = uuidv4();
                const sessionId = uuidv4();
                
                console.log(`New WebSocket connection: ${connectionId}`);

                // Initialize connection state
                const connection = new Connection(connectionId, sessionId, ws);
                connections.set(connectionId, connection);

                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'connected',
                    sessionId: sessionId,
                    connectionId: connectionId,
                    timestamp: Date.now()
                }));

                // Handle messages
                ws.on('message', async (data) => {
                    try {
                        await this.handleMessage(connectionId, data);
                    } catch (error) {
                        console.error(`Message handling error for ${connectionId}:`, error);
                        this.sendError(connectionId, 'Internal server error');
                    }
                });

                // Handle connection close
                ws.on('close', () => {
                    console.log(`Connection closed: ${connectionId}`);
                    this.handleDisconnection(connectionId);
                });

                // Handle errors
                ws.on('error', (error) => {
                    console.error(`WebSocket error for ${connectionId}:`, error);
                    this.handleDisconnection(connectionId);
                });
            });
        } catch (error) {
            console.error('Failed to start secure WebSocket server:', error);
            process.exit(1);
        }
    }

    async handleWebRTCMessage(connectionId, data) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) return;

        const room = rooms.get(connection.roomCode);
        if (!room) return;

        // Forward to all other participants (in a 2-person room, that’s just the other peer)
        for (const otherConnectionId of room.connections) {
            if (otherConnectionId !== connectionId) {
                const otherConn = connections.get(otherConnectionId);
                if (otherConn && otherConn.ws.readyState === WebSocket.OPEN) {
                    otherConn.ws.send(JSON.stringify(data));
                }
            }
        }
    }

    async handleMessage(connectionId, data) {
        const connection = connections.get(connectionId);
        if (!connection) return;

        let message;
        try {
            message = JSON.parse(data);
        } catch (error) {
            this.sendError(connectionId, 'Invalid JSON format');
            return;
        }

        if (!message.type) {
            this.sendError(connectionId, 'Missing message type');
            return;
        }

        // Update last activity
        connection.updateActivity();

        switch (message.type) {
            case 'authenticate':
                await this.handleAuthenticate(connectionId, message);
                break;
            case 'create_room':
                await this.handleCreateRoom(connectionId, message);
                break;
            case 'validate_room':
                await this.handleValidateRoom(connectionId, message);
                break;
            case 'join_room':
                await this.handleJoinRoom(connectionId, message);
                break;
            case 'leave_room':
                await this.handleLeaveRoom(connectionId, message);
                break;
            case 'cursor_position':
                await this.handleCursorPosition(connectionId, message);
                break;
            case 'text_operation':
                await this.handleTextOperation(connectionId, message);
                break;
            case 'content_sync':
                await this.handleContentSync(connectionId, message);
                break;
            case 'send_content_to_guest':
                await this.handleSendContentToGuest(connectionId, message);
                break;
            case 'selection_change':
                await this.handleSelectionChange(connectionId, message);
                break;
            case 'typing_indicator':
                await this.handleTypingIndicator(connectionId, message);
                break;
            case 'heartbeat':
                await this.handleHeartbeat(connectionId, message);
                break;
	    case 'webrtc_offer':
            case 'webrtc_answer':
            case 'webrtc_candidate':
            case 'webrtc_video_off':
            case 'webrtc_ready':
            case 'webrtc_peer_disconnected':
	    // Add these two new types here:
            case 'screen_share_started':
            case 'screen_share_stopped':
                await this.handleWebRTCMessage(connectionId, message);
                break;
            default:
                this.sendError(connectionId, 'Unknown message type');
        }
    }

    async handleAuthenticate(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection) return;

        const { sessionData } = message;
        
        try {
            // For simplified version, we'll authenticate everyone
            // In production, you could add proper user validation here
            const userId = sessionData.user_id || Math.floor(Math.random() * 1000) + 1;
            const username = sessionData.username || `user_${userId}`;
            
            const user = {
                id: userId,
                username: username,
                display_name: username
            };

            connection.userId = userId;
            connection.user = user;
            connection.authenticated = true;

            // Add to user sessions
            if (!userSessions.has(userId)) {
                userSessions.set(userId, new Set());
            }
            userSessions.get(userId).add(connectionId);

            connection.ws.send(JSON.stringify({
                type: 'authenticated',
                user: {
                    id: user.id,
                    username: user.username,
                    display_name: user.display_name
                },
                timestamp: Date.now()
            }));

            console.log(`User authenticated: ${user.username} (${connectionId})`);

        } catch (error) {
            console.error('Authentication error:', error);
            this.sendError(connectionId, 'Authentication error');
        }
    }

    async handleCreateRoom(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.authenticated) {
            this.sendError(connectionId, 'Not authenticated');
            return;
        }

        try {
            // Create a new room
            const room = createRoom();
            
            // Add user to room as host
            room.addConnection(connectionId, connection.user, true);
            connection.roomCode = room.code;
            
            // Send room created response
            connection.ws.send(JSON.stringify({
                type: 'room_created',
                room_code: room.code,
                timestamp: Date.now()
            }));
            
            console.log(`User ${connection.user.username} created room ${room.code}`);
            
        } catch (error) {
            console.error('Create room error:', error);
            this.sendError(connectionId, 'Failed to create room');
        }
    }
    
    async handleValidateRoom(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.authenticated) {
            this.sendError(connectionId, 'Not authenticated');
            return;
        }
        
        const { room_code } = message;
        if (!room_code) {
            this.sendError(connectionId, 'Missing room code');
            return;
        }
        
        try {
            const room = getRoomByCode(room_code);
            
            if (room) {
                connection.ws.send(JSON.stringify({
                    type: 'room_found',
                    room_code: room.code,
                    member_count: room.connections.size,
                    timestamp: Date.now()
                }));
            } else {
                connection.ws.send(JSON.stringify({
                    type: 'room_not_found',
                    room_code: room_code,
                    timestamp: Date.now()
                }));
            }
            
        } catch (error) {
            console.error('Validate room error:', error);
            this.sendError(connectionId, 'Failed to validate room');
        }
    }
    
    async handleJoinRoom(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.authenticated) {
            this.sendError(connectionId, 'Not authenticated');
            return;
        }

        const { room_code } = message;
        if (!room_code) {
            this.sendError(connectionId, 'Missing room code');
            return;
        }

        try {
            // Leave current room if any
            if (connection.roomCode) {
                await this.handleLeaveRoom(connectionId, { room_code: connection.roomCode });
            }

            // Find the room
            const room = getRoomByCode(room_code);
            if (!room) {
                connection.ws.send(JSON.stringify({
                    type: 'room_not_found',
                    room_code: room_code,
                    timestamp: Date.now()
                }));
                return;
            }
            
	    // --- NEW: check room capacity ---
            if (room.connections.size >= 2) {
                connection.ws.send(JSON.stringify({
                type: 'room_full',
                message: 'Room is full. Only 2 participants allowed.',
                timestamp: Date.now()
                }));
                return; // Do not add user
            }

            // Add user to room
            const isFirstUser = room.connections.size === 0;
            room.addConnection(connectionId, connection.user, isFirstUser);
            connection.roomCode = room.code;

            // Get current collaborators (excluding the user who just joined)
            const collaborators = room.getCollaborators().filter(user => user.id !== connection.user.id);

            // Notify other users in room that someone joined
            this.broadcastToRoom(room.code, {
                type: 'user_joined',
                user: {
                    id: connection.user.id,
                    username: connection.user.username,
                    display_name: connection.user.display_name
                },
                guestId: connection.user.id, // For host to know who to send content to
                timestamp: Date.now()
            }, connectionId);

            // Send basic room info to the new user (no content)
            connection.ws.send(JSON.stringify({
                type: 'room_joined',
                room_code: room.code,
                collaborators: collaborators,
                member_count: room.connections.size,
                created_at: room.createdAt,
                is_host: connection.userId === room.hostId,
                timestamp: Date.now()
            }));

            console.log(`User ${connection.user.username} joined room ${room.code} (${room.connections.size} members)`);

            // If this is not the first user, ask the host to send content
            if (!isFirstUser) {
                const hostConnectionId = room.getHostConnectionId();
                if (hostConnectionId) {
                    const hostConnection = connections.get(hostConnectionId);
                    if (hostConnection && hostConnection.ws.readyState === WebSocket.OPEN) {
                        hostConnection.ws.send(JSON.stringify({
                            type: 'request_content_for_guest',
                            guest_user: {
                                id: connection.user.id,
                                username: connection.user.username,
                                display_name: connection.user.display_name
                            },
                            timestamp: Date.now()
                        }));
                        console.log(`Requested content from host for new guest ${connection.user.username}`);
                    }
                }
            }

        } catch (error) {
            console.error('Join room error:', error);
            this.sendError(connectionId, 'Failed to join room');
        }
    }
    
    async handleLeaveRoom(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const roomCode = connection.roomCode;

        try {
            const room = getRoomByCode(roomCode);
            if (room) {
                // Remove from room
                room.removeConnection(connectionId, connection.user.id);
                
                // Notify other users
                this.broadcastToRoom(roomCode, {
                    type: 'user_left',
                    user: {
                        id: connection.user.id,
                        username: connection.user.username
                    },
                    timestamp: Date.now()
                }, connectionId);
                
                console.log(`User ${connection.user.username} left room ${roomCode} (${room.connections.size} members left)`);
            }

            connection.roomCode = null;

        } catch (error) {
            console.error('Leave room error:', error);
        }
    }

    async handleTextOperation(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const { operation } = message;
        if (!operation) {
            return;
        }

        try {
            const room = getRoomByCode(connection.roomCode);
            if (!room) {
                return;
            }
            
            // Update room activity
            room.lastActivity = new Date();

            // Broadcast to other users in the same room
            const broadcastMessage = {
                type: 'text_operation',
                user: {
                    id: connection.user.id,
                    username: connection.user.username,
                    display_name: connection.user.display_name
                },
                operation: operation,
                timestamp: Date.now()
            };
            
            this.broadcastToRoom(connection.roomCode, broadcastMessage, connectionId);

        } catch (error) {
            console.error('Text operation error:', error);
        }
    }

    async handleSendContentToGuest(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const { guest_user_id, content } = message;
        if (!guest_user_id || typeof content !== 'string') {
            this.sendError(connectionId, 'Invalid guest content message');
            return;
        }

        try {
            const room = getRoomByCode(connection.roomCode);
            if (!room) {
                return;
            }

            // Verify sender is the host
            if (connection.userId !== room.hostId) {
                this.sendError(connectionId, 'Only host can send content to guests');
                return;
            }

            // Find the guest connection
            let guestConnectionId = null;
            for (const connId of room.connections) {
                const conn = connections.get(connId);
                if (conn && conn.userId === guest_user_id) {
                    guestConnectionId = connId;
                    break;
                }
            }

            if (!guestConnectionId) {
                this.sendError(connectionId, 'Guest user not found in room');
                return;
            }

            const guestConnection = connections.get(guestConnectionId);
            if (!guestConnection || guestConnection.ws.readyState !== WebSocket.OPEN) {
                this.sendError(connectionId, 'Guest connection not available');
                return;
            }

            // Send content to the specific guest
            guestConnection.ws.send(JSON.stringify({
                type: 'receive_content_from_host',
                content: content,
                host_user: {
                    id: connection.user.id,
                    username: connection.user.username,
                    display_name: connection.user.display_name
                },
                timestamp: Date.now()
            }));

            console.log(`Host ${connection.user.username} sent content to guest ${guestConnection.user.username} in room ${room.code}`);

        } catch (error) {
            console.error('Send content to guest error:', error);
            this.sendError(connectionId, 'Failed to send content to guest');
        }
    }

    async handleContentSync(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const { content } = message;
        if (typeof content !== 'string') {
            return;
        }

        if (content.length > MAX_CONTENT_SIZE) {
            this.sendError(connectionId, 'Content too large');
            return;
        }

        try {
            const room = getRoomByCode(connection.roomCode);
            if (!room) {
                return;
            }
            
            // Update room activity
            room.lastActivity = new Date();

            // Broadcast content sync to other users in the same room
            this.broadcastToRoom(connection.roomCode, {
                type: 'content_sync',
                user: {
                    id: connection.user.id,
                    username: connection.user.username,
                    display_name: connection.user.display_name
                },
                content: content,
                timestamp: Date.now()
            }, connectionId);

        } catch (error) {
            console.error('Content sync error:', error);
            this.sendError(connectionId, 'Content sync failed: ' + error.message);
        }
    }

    async handleCursorPosition(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const { position } = message;
        if (!position) {
            return;
        }

        try {
            // Broadcast to other users in the same room
            this.broadcastToRoom(connection.roomCode, {
                type: 'cursor_position',
                user: {
                    id: connection.user.id,
                    username: connection.user.username,
                    display_name: connection.user.display_name
                },
                position: position,
                timestamp: Date.now()
            }, connectionId);

        } catch (error) {
            console.error('Cursor position error:', error);
        }
    }

    async handleSelectionChange(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const { selection } = message;
        if (!selection) {
            return;
        }

        try {
            // Broadcast to other users in the same room
            this.broadcastToRoom(connection.roomCode, {
                type: 'selection_change',
                user: {
                    id: connection.user.id,
                    username: connection.user.username,
                    display_name: connection.user.display_name
                },
                selection: selection,
                timestamp: Date.now()
            }, connectionId);

        } catch (error) {
            console.error('Selection change error:', error);
        }
    }

    async handleTypingIndicator(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection || !connection.roomCode) {
            return;
        }

        const { is_typing } = message;
        if (typeof is_typing !== 'boolean') {
            return;
        }

        // Broadcast typing indicator
        this.broadcastToRoom(connection.roomCode, {
            type: 'typing_indicator',
            user: {
                id: connection.user.id,
                username: connection.user.username,
                display_name: connection.user.display_name
            },
            is_typing: is_typing,
            timestamp: Date.now()
        }, connectionId);
    }

    async handleHeartbeat(connectionId, message) {
        const connection = connections.get(connectionId);
        if (!connection) return;

        connection.updateActivity();

        connection.ws.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: Date.now()
        }));
    }

    handleDisconnection(connectionId) {
        const connection = connections.get(connectionId);
        if (!connection) return;

        // Remove from room if connected to one
        if (connection.roomCode) {
            this.handleLeaveRoom(connectionId, { room_code: connection.roomCode });
        }

        // Remove from user sessions
        if (connection.userId && userSessions.has(connection.userId)) {
            userSessions.get(connection.userId).delete(connectionId);
            if (userSessions.get(connection.userId).size === 0) {
                userSessions.delete(connection.userId);
            }
        }

        // Remove connection
        connections.delete(connectionId);
    }

    broadcastToRoom(roomCode, message, excludeConnectionId = null) {
        const room = getRoomByCode(roomCode);
        if (!room) {
            return;
        }
        
        let sentCount = 0;
        for (const connectionId of room.connections) {
            if (connectionId !== excludeConnectionId) {
                const connection = connections.get(connectionId);
                if (connection && connection.ws.readyState === WebSocket.OPEN) {
                    connection.ws.send(JSON.stringify(message));
                    sentCount++;
                }
            }
        }
    }

    sendError(connectionId, message) {
        const connection = connections.get(connectionId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify({
                type: 'error',
                message: message,
                timestamp: Date.now()
            }));
        }
    }

    // Helper methods for room-based system
    getRoomStats() {
        return {
            totalRooms: rooms.size,
            totalConnections: connections.size,
            roomDetails: Array.from(rooms.values()).map(room => ({
                code: room.code,
                members: room.connections.size,
                createdAt: room.createdAt,
                lastActivity: room.lastActivity
            }))
        };
    }
}

// Start the server
const server = new RoomBasedWebSocketServer();
