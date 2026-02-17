// WebSocket Client for Real-time Collaboration

class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.connected = false;
        this.authenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.sessionId = null;
        this.clientId = Utils.generateUUID();
        this.callbacks = {};
        this.heartbeatInterval = null;
        this.roomCode = null;
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.reconnect = this.reconnect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.send = this.send.bind(this);
        this.authenticate = this.authenticate.bind(this);
        this.joinRoom = this.joinRoom.bind(this);
        this.leaveRoom = this.leaveRoom.bind(this);
        this.updateCursor = this.updateCursor.bind(this);
        this.updateSelection = this.updateSelection.bind(this);
        this.sendOperation = this.sendOperation.bind(this);
        this.sendTypingIndicator = this.sendTypingIndicator.bind(this);
        this.startHeartbeat = this.startHeartbeat.bind(this);
        this.stopHeartbeat = this.stopHeartbeat.bind(this);
    }
    
    // Event handler registration
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
        return this; // For chaining
    }
    
    // Event triggering
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    // Connect to WebSocket server
    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(this.url);
                
                this.socket.onopen = () => {
                    console.log('WebSocket connection established');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.trigger('connected');
                    this.startHeartbeat();
                    resolve();
                };
                
                this.socket.onclose = (event) => {
                    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
                    this.connected = false;
                    this.authenticated = false;
                    this.stopHeartbeat();
                    this.trigger('disconnected', event);
                    
                    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnect();
                    }
                };
                
                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.trigger('error', error);
                    reject(error);
                };
                
                this.socket.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                this.trigger('error', error);
                reject(error);
            }
        });
    }
    
    // Reconnect after connection loss
    reconnect() {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.trigger('reconnecting', this.reconnectAttempts);
        
        setTimeout(() => {
            this.connect().then(() => {
                // Re-authenticate and rejoin project if needed
                if (window.USER_DATA) {
                    this.authenticate(window.USER_DATA);
                }
            }).catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, this.reconnectDelay);
    }
    
    // Disconnect from the server
    disconnect() {
        if (this.socket) {
            if (this.roomCode) {
                this.leaveRoom();
            }
            this.stopHeartbeat();
            this.socket.close();
            this.socket = null;
            this.connected = false;
            this.authenticated = false;
        }
    }
    
    // Send message to server
    send(type, data = {}) {
        if (!this.connected) {
            console.error('Cannot send message: WebSocket not connected');
            return Promise.reject(new Error('WebSocket not connected'));
        }
        
        try {
            const message = {
                type,
                ...data,
                client_id: this.clientId
            };
            

            
            this.socket.send(JSON.stringify(message));
            return Promise.resolve();
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return Promise.reject(error);
        }
    }
    
    // Handle incoming messages
    handleMessage(message) {
        // Handle system messages
        switch (message.type) {
            case 'connected':
                this.sessionId = message.sessionId;
                this.trigger('session', { sessionId: this.sessionId });
                break;
                
            case 'authenticated':
                this.authenticated = true;
                this.trigger('authenticated', message.user);
                
                // Rejoin room if we were in one before reconnecting
                if (this.roomCode) {
                    this.joinRoom(this.roomCode);
                }
                break;
                
            case 'error':
                console.error('WebSocket server error:', message.message);
                this.trigger('server_error', message.message);
                break;
                
            case 'heartbeat_ack':
                // Heartbeat acknowledged
                break;
        }
        
        // Trigger event based on message type
        this.trigger(message.type, message);
    }
    
    // Authenticate with session data
    authenticate(userData) {
        if (!this.connected) {
            return this.connect().then(() => this.authenticate(userData));
        }
        
        return this.send('authenticate', {
            sessionData: {
                user_id: userData.id,
                username: userData.username
            }
        });
    }
    
    // Join a room
    joinRoom(roomCode) {
        if (!this.authenticated) {
            console.error('Cannot join room: Not authenticated');
            return Promise.reject(new Error('Not authenticated'));
        }
        
        this.roomCode = roomCode;
        
        return this.send('join_room', {
            room_code: roomCode
        });
    }
    
    // Create a room
    createRoom() {
        if (!this.authenticated) {
            console.error('Cannot create room: Not authenticated');
            return Promise.reject(new Error('Not authenticated'));
        }
        
        return this.send('create_room');
    }
    
    // Validate a room exists
    validateRoom(roomCode) {
        if (!this.authenticated) {
            console.error('Cannot validate room: Not authenticated');
            return Promise.reject(new Error('Not authenticated'));
        }
        
        return this.send('validate_room', {
            room_code: roomCode
        });
    }
    
    // Leave current room
    leaveRoom() {
        if (!this.roomCode) {
            return Promise.resolve();
        }
        
        const result = this.send('leave_room', {
            room_code: this.roomCode
        });
        
        this.roomCode = null;
        
        return result;
    }
    
    // Update cursor position
    updateCursor(position) {
        return this.send('cursor_position', {
            position: position
        });
    }
    
    // Update selection range
    updateSelection(selection) {
        return this.send('selection_change', {
            selection: selection
        });
    }
    
    // Send a text operation
    sendOperation(operation) {
        return this.send('text_operation', {
            operation: operation
        });
    }
    
    // Send typing indicator
    sendTypingIndicator(isTyping) {
        return this.send('typing_indicator', {
            is_typing: isTyping
        });
    }
    
    // Start heartbeat to keep connection alive
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.connected) {
                this.send('heartbeat');
            }
        }, 30000); // 30 seconds
    }
    
    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}

// Create global WebSocket client instance
window.wsClient = new WebSocketClient(window.WS_URL);
