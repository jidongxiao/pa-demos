// Room Manager - Handles room creation and joining functionality

class RoomManager {
    constructor() {
        this.wsClient = null;
        this.isConnecting = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupInputHandlers();
    }
    
    setupEventListeners() {
        // Create room button
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', this.handleCreateRoom.bind(this));
        }
        
        // Join room form
        const joinRoomForm = document.getElementById('joinRoomForm');
        if (joinRoomForm) {
            joinRoomForm.addEventListener('submit', this.handleJoinRoom.bind(this));
        }
        
        // Room code input formatting
        const roomCodeInput = document.getElementById('roomCodeInput');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', this.handleRoomCodeInput.bind(this));
            roomCodeInput.addEventListener('paste', this.handleRoomCodePaste.bind(this));
        }
    }
    
    setupInputHandlers() {
        // Auto-format room code as user types
        const roomCodeInput = document.getElementById('roomCodeInput');
        if (roomCodeInput) {
            // Focus on input when page loads
            setTimeout(() => roomCodeInput.focus(), 500);
        }
    }
    
    handleRoomCodeInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // Limit to 6 characters
        if (value.length > 6) {
            value = value.substring(0, 6);
        }
        
        input.value = value;
        
        // Update join button state
        this.updateJoinButtonState();
    }
    
    handleRoomCodePaste(event) {
        event.preventDefault();
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
        const cleanedText = pastedText.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
        event.target.value = cleanedText;
        this.updateJoinButtonState();
    }
    
    updateJoinButtonState() {
        const roomCodeInput = document.getElementById('roomCodeInput');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        
        if (roomCodeInput && joinRoomBtn) {
            const isValid = roomCodeInput.value.length === 6;
            joinRoomBtn.disabled = !isValid || this.isConnecting;
            
            if (isValid) {
                joinRoomBtn.classList.remove('disabled');
            } else {
                joinRoomBtn.classList.add('disabled');
            }
        }
    }
    
    async handleCreateRoom(event) {
        event.preventDefault();
        
        if (this.isConnecting) return;
        
        try {
            this.setCreateRoomLoading(true);
            this.clearMessages();
            
            // Initialize WebSocket connection
            await this.initializeWebSocket();
            
            // Request room creation
            const roomCode = await this.createRoom();
            
            // Show success message briefly
            this.showCreateSuccess(`Room ${roomCode} created! Entering...`);
            
            // Navigate to room
            setTimeout(() => {
                window.location.href = `room.php?code=${roomCode}`;
            }, 1000);
            
        } catch (error) {
            console.error('Create room error:', error);
            this.showCreateError(error.message || 'Failed to create room. Please try again.');
        } finally {
            this.setCreateRoomLoading(false);
        }
    }
    
    async handleJoinRoom(event) {
        event.preventDefault();
        
        if (this.isConnecting) return;
        
        const roomCodeInput = document.getElementById('roomCodeInput');
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        
        if (roomCode.length !== 6) {
            this.showJoinError('Please enter a valid 6-character room code.');
            return;
        }
        
        try {
            this.setJoinRoomLoading(true);
            this.clearMessages();
            
            // Initialize WebSocket connection
            await this.initializeWebSocket();
            
            // Validate room exists
            await this.validateRoom(roomCode);
            
            // Show success message briefly
            this.showJoinSuccess(`Joining room ${roomCode}...`);
            
            // Navigate to room
            setTimeout(() => {
                window.location.href = `room.php?code=${roomCode}`;
            }, 1000);
            
        } catch (error) {
            console.error('Join room error:', error);
            if (error.message.includes('not found')) {
                this.showJoinError('Room not found. Please check the code and try again.');
            } else {
                this.showJoinError(error.message || 'Failed to join room. Please try again.');
            }
        } finally {
            this.setJoinRoomLoading(false);
        }
    }
    
    async initializeWebSocket() {
        if (this.wsClient && this.wsClient.connected) {
            return Promise.resolve();
        }
        
        this.isConnecting = true;
        
        try {
            // Create WebSocket client
            this.wsClient = new WebSocketClient(window.WS_URL);
            
            // Set up event listeners
            this.wsClient.on('connected', () => {
                console.log('WebSocket connected');
            });
            
            this.wsClient.on('error', (error) => {
                console.error('WebSocket error:', error);
                throw new Error('Connection failed');
            });
            
            this.wsClient.on('disconnected', () => {
                console.log('WebSocket disconnected');
            });
            
            // Connect and authenticate
            await this.wsClient.connect();
            await this.wsClient.authenticate(window.USER_DATA);
            
            return Promise.resolve();
            
        } finally {
            this.isConnecting = false;
        }
    }
    
    async createRoom() {
        return new Promise((resolve, reject) => {
            // Set up one-time listeners for room creation response
            const onRoomCreated = (data) => {
                this.wsClient.off('room_created', onRoomCreated);
                this.wsClient.off('error', onError);
                resolve(data.room_code);
            };
            
            const onError = (error) => {
                this.wsClient.off('room_created', onRoomCreated);
                this.wsClient.off('error', onError);
                reject(new Error(error.message || 'Failed to create room'));
            };
            
            this.wsClient.on('room_created', onRoomCreated);
            this.wsClient.on('error', onError);
            
            // Send create room request
            this.wsClient.send('create_room');
            
            // Timeout after 10 seconds
            setTimeout(() => {
                this.wsClient.off('room_created', onRoomCreated);
                this.wsClient.off('error', onError);
                reject(new Error('Request timed out'));
            }, 10000);
        });
    }
    
    async validateRoom(roomCode) {
        return new Promise((resolve, reject) => {
            // Set up one-time listeners for room validation response
            const onRoomValid = (data) => {
                this.wsClient.off('room_found', onRoomValid);
                this.wsClient.off('room_not_found', onRoomNotFound);
                this.wsClient.off('error', onError);
                resolve(data);
            };
            
            const onRoomNotFound = (data) => {
                this.wsClient.off('room_found', onRoomValid);
                this.wsClient.off('room_not_found', onRoomNotFound);
                this.wsClient.off('error', onError);
                reject(new Error('Room not found'));
            };
            
            const onError = (error) => {
                this.wsClient.off('room_found', onRoomValid);
                this.wsClient.off('room_not_found', onRoomNotFound);
                this.wsClient.off('error', onError);
                reject(new Error(error.message || 'Failed to validate room'));
            };
            
            this.wsClient.on('room_found', onRoomValid);
            this.wsClient.on('room_not_found', onRoomNotFound);
            this.wsClient.on('error', onError);
            
            // Send validate room request
            this.wsClient.send('validate_room', { room_code: roomCode });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                this.wsClient.off('room_found', onRoomValid);
                this.wsClient.off('room_not_found', onRoomNotFound);
                this.wsClient.off('error', onError);
                reject(new Error('Request timed out'));
            }, 10000);
        });
    }
    
    setCreateRoomLoading(loading) {
        const btn = document.getElementById('createRoomBtn');
        const spinner = document.getElementById('createLoadingSpinner');
        const btnText = btn.querySelector('.btn-text');
        
        if (loading) {
            btn.disabled = true;
            spinner.style.display = 'block';
            btnText.textContent = 'Creating Room...';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.disabled = false;
            spinner.style.display = 'none';
            btnText.textContent = 'Create New Room';
            btn.style.cursor = 'pointer';
        }
    }
    
    setJoinRoomLoading(loading) {
        const btn = document.getElementById('joinRoomBtn');
        const spinner = document.getElementById('joinLoadingSpinner');
        const btnText = btn.querySelector('.btn-text');
        
        if (loading) {
            btn.disabled = true;
            spinner.style.display = 'block';
            btnText.textContent = 'Joining...';
        } else {
            this.updateJoinButtonState(); // This will set disabled state based on input
            spinner.style.display = 'none';
            btnText.textContent = 'Join Room';
        }
    }
    
    showCreateSuccess(message) {
        const element = document.getElementById('createSuccessMessage');
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    showCreateError(message) {
        const element = document.getElementById('createErrorMessage');
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    showJoinSuccess(message) {
        const element = document.getElementById('joinSuccessMessage');
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    showJoinError(message) {
        const element = document.getElementById('joinErrorMessage');
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    clearMessages() {
        const messages = [
            'createSuccessMessage',
            'createErrorMessage',
            'joinSuccessMessage',
            'joinErrorMessage'
        ];
        
        messages.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                element.textContent = '';
            }
        });
    }
}

// Simple WebSocket client for room operations
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.connected = false;
        this.callbacks = {};
    }
    
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }
    
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(this.url);
                
                this.socket.onopen = () => {
                    this.connected = true;
                    this.trigger('connected');
                    resolve();
                };
                
                this.socket.onclose = () => {
                    this.connected = false;
                    this.trigger('disconnected');
                };
                
                this.socket.onerror = (error) => {
                    this.trigger('error', error);
                    reject(error);
                };
                
                this.socket.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.trigger(message.type, message);
                    } catch (error) {
                        console.error('Error parsing message:', error);
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }
    
    send(type, data = {}) {
        if (!this.connected || !this.socket) {
            throw new Error('WebSocket not connected');
        }
        
        const message = {
            type,
            ...data,
            timestamp: Date.now()
        };
        
        this.socket.send(JSON.stringify(message));
    }
    
    authenticate(userData) {
        return new Promise((resolve, reject) => {
            const onAuthenticated = () => {
                this.off('authenticated', onAuthenticated);
                this.off('error', onError);
                resolve();
            };
            
            const onError = (error) => {
                this.off('authenticated', onAuthenticated);
                this.off('error', onError);
                reject(new Error('Authentication failed'));
            };
            
            this.on('authenticated', onAuthenticated);
            this.on('error', onError);
            
            this.send('authenticate', {
                sessionData: {
                    user_id: userData.id,
                    username: userData.username
                }
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                this.off('authenticated', onAuthenticated);
                this.off('error', onError);
                reject(new Error('Authentication timed out'));
            }, 5000);
        });
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Initialize room manager when DOM is ready
if (typeof Utils !== 'undefined' && Utils.ready) {
    Utils.ready(() => {
        window.roomManager = new RoomManager();
    });
} else {
    // Fallback if Utils is not available
    document.addEventListener('DOMContentLoaded', () => {
        window.roomManager = new RoomManager();
    });
}