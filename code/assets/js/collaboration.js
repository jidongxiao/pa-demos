// Collaboration-specific functionality for the editor

class CollaborationManager {
    constructor(editor) {
        this.editor = editor;
        this.remoteCursors = new Map();
        this.remoteSelections = new Map();
        this.typingIndicatorTimer = null;
        this.typingIndicatorInterval = 1000; // 1 second
        this.isTyping = false;
        
        this.init();
    }
    
    init() {
        // Register for content changes to detect typing
        this.editor.onContentChange(this.handleContentChange.bind(this));
        
        // Listen for WebSocket events
        this.setupWebSocketListeners();
    }
    
    setupWebSocketListeners() {
        // Handle remote operations
        window.wsClient.on('text_operation', (data) => {
            if (data.user.id !== window.USER_DATA.id) {
                this.applyRemoteOperation(data.operation, data.user);
            }
        });
        
        // Handle remote cursors
        window.wsClient.on('cursor_position', (data) => {
            if (data.user.id !== window.USER_DATA.id) {
                this.showRemoteCursor(data.user, data.position);
            }
        });
        
        // Handle remote selections
        window.wsClient.on('selection_change', (data) => {
            if (data.user.id !== window.USER_DATA.id) {
                this.showRemoteSelection(data.user, data.selection);
            }
        });
    }
    
    handleContentChange(change) {
        // Detect typing and send typing indicator
        if (!this.isTyping) {
            this.isTyping = true;
            this.sendTypingIndicator(true);
        }
        
        // Reset typing timer
        if (this.typingIndicatorTimer) {
            clearTimeout(this.typingIndicatorTimer);
        }
        
        this.typingIndicatorTimer = setTimeout(() => {
            this.isTyping = false;
            this.sendTypingIndicator(false);
        }, this.typingIndicatorInterval);
    }
    
    sendTypingIndicator(isTyping) {
        if (window.wsClient) {
            window.wsClient.sendTypingIndicator(isTyping);
        }
    }
    
    applyRemoteOperation(operation, user) {
        // Operations are handled by the editor component
        // This method exists for potential additional collaboration-specific logic
    }
    
    showRemoteCursor(user, position) {
        // Remove existing cursor for this user
        this.removeRemoteCursor(user.id);
        
        // Store the user's cursor position
        this.remoteCursors.set(user.id, position);
        
        // Create cursor element if we have editor access
        if (!this.editor.editor) return;
        
        // Convert position to editor coordinates
        const pos = {line: position.line, ch: position.ch};
        const coords = this.editor.editor.charCoords(pos, 'local');
        
        // Create cursor element
        const cursorEl = document.createElement('div');
        cursorEl.className = 'remote-cursor';
        cursorEl.setAttribute('data-user-id', user.id);
        cursorEl.style.backgroundColor = Utils.generateUserColor(user.username);
        cursorEl.style.top = `${coords.top}px`;
        cursorEl.style.left = `${coords.left}px`;
        cursorEl.style.height = `${coords.bottom - coords.top}px`;
        
        // Add user label
        const label = document.createElement('div');
        label.className = 'remote-cursor-label';
        label.textContent = user.display_name || user.username;
        label.style.backgroundColor = Utils.generateUserColor(user.username);
        cursorEl.appendChild(label);
        
        // Add to editor
        this.editor.editor.getWrapperElement().appendChild(cursorEl);
        
        // Add transition after initial position set
        setTimeout(() => {
            cursorEl.classList.add('cursor-animate');
        }, 10);
    }
    
    removeRemoteCursor(userId) {
        // Remove from DOM
        const cursorEl = document.querySelector(`.remote-cursor[data-user-id="${userId}"]`);
        if (cursorEl) {
            cursorEl.remove();
        }
        
        // Remove from storage
        this.remoteCursors.delete(userId);
    }
    
    showRemoteSelection(user, selections) {
        // Remove existing selections for this user
        this.removeRemoteSelection(user.id);
        
        if (!selections || !selections.length || !this.editor.editor) return;
        
        // Store the user's selection
        this.remoteSelections.set(user.id, selections);
        
        const color = Utils.generateUserColor(user.username);
        const opacityColor = `${color}33`; // Add opacity for background
        
        // Create selection markers
        selections.forEach(selection => {
            const fromPos = selection.anchor;
            const toPos = selection.head;
            
            // Add to editor
            const marker = this.editor.editor.markText(
                {line: fromPos.line, ch: fromPos.ch},
                {line: toPos.line, ch: toPos.ch},
                {
                    className: `remote-selection-text remote-user-${user.id}`,
                    css: `background-color: ${opacityColor}; border: 1px solid ${color};`,
                    attributes: {"data-user-id": user.id}
                }
            );
            
            // Store marker for later removal
            const markersForUser = this.remoteSelections.get(user.id) || [];
            markersForUser.push(marker);
            this.remoteSelections.set(user.id, markersForUser);
        });
    }
    
    removeRemoteSelection(userId) {
        // Clear markers from the editor
        const markers = this.remoteSelections.get(userId);
        if (markers && Array.isArray(markers)) {
            markers.forEach(marker => {
                if (typeof marker.clear === 'function') {
                    marker.clear();
                }
            });
        }
        
        // Remove from storage
        this.remoteSelections.delete(userId);
    }
    
    refresh() {
        // Redraw all remote cursors and selections
        this.remoteCursors.forEach((position, userId) => {
            const user = this.findUserById(userId);
            if (user) {
                this.showRemoteCursor(user, position);
            }
        });
        
        this.remoteSelections.forEach((selection, userId) => {
            const user = this.findUserById(userId);
            if (user) {
                this.showRemoteSelection(user, selection);
            }
        });
    }
    
    findUserById(userId) {
        // Look for user in collaborators list
        if (this.editor.collaborators) {
            return this.editor.collaborators.find(user => user.id === userId);
        }
        return null;
    }
}

// Initialize collaboration manager when editor is ready
Utils.ready(() => {
    // Wait for editor to be initialized
    const checkEditor = setInterval(() => {
        if (window.editor) {
            clearInterval(checkEditor);
            window.collaborationManager = new CollaborationManager(window.editor);
        }
    }, 100);
});
