// Main editor functionality for simplified version

class Editor {
    constructor() {
        this.editor = null;
        this.roomCode = window.ROOM_CODE || null;
        this.fileContent = window.FILE_CONTENT || '';
        this.canEdit = window.CAN_EDIT || true;
        this.editorTheme = Utils.storage.get('editor_theme', 'default');
        this.wordWrap = Utils.storage.get('word_wrap', true);
        this.language = Utils.storage.get('editor_language', 'javascript');
        this.collaborators = [];
        this.contentChangeCallbacks = [];
        this.operationQueue = [];
        this.operationInProgress = false;
        this.localOperationId = 0;
        this.acknowledgedOperations = new Set();
        this.stateLoaded = false;
        this.loadingState = false;
        
        // Content sync properties
        this.contentSyncTimer = null;
        this.contentSyncDelay = 500; // 0.5 seconds after last change (reduced for testing)
        this.lastSyncedContent = '';
        this.ignoreNextChange = false;
        
        // Initialize editor
        this.init();
    }
    
    init() {
        // Show loading indicator
        this.showLoadingState();
        
        // Don't initialize with FILE_CONTENT yet - wait for WebSocket room state
        // Set temporary empty content
        this.fileContent = '';
        
        // Set up the editor with empty content initially
        this.initializeCodeEditor();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Connect to WebSocket server (will load room state when connected)
        this.setupWebSocket();
        
        // Set word wrap
        this.setWordWrap(this.wordWrap);
        
        // Render current user initially
        this.renderCollaborators();
        
        // Fallback timeout in case WebSocket connection fails
        setTimeout(() => {
            if (!this.stateLoaded) {

                if (this.editor) {
                    // Use the original FILE_CONTENT as fallback
                    const fallbackContent = window.FILE_CONTENT || this.getDefaultContent();
                    this.editor.setValue(fallbackContent);
                    this.lastSyncedContent = fallbackContent;
                }
                this.hideLoadingState();
                this.stateLoaded = true;
            }
        }, 5000); // 5 second timeout
        
        this.stateLoaded = false; // Will be set to true after room content is loaded
    }
    
    getDefaultContent() {
        if (this.roomCode) {
            return `// Welcome to Room ${this.roomCode}\n// Collaborate in real-time with your team\n\nconsole.log('Hello from room ${this.roomCode}!');`;
        }
        return "// Welcome to the Collaborative Code Editor\n// Type your code here and hit 'Run' to execute it\n\nconsole.log('Hello, World!');";;
    }
    
    detectLanguageFromContent() {
        // Simple language detection based on content patterns
        const content = this.fileContent.toLowerCase();
        
        if (content.includes('console.log') || content.includes('function') || content.includes('const ') || content.includes('let ')) {
            this.language = 'javascript';
        } else if (content.includes('print(') || content.includes('def ') || content.includes('import ')) {
            this.language = 'text/x-python';
        } else if (content.includes('#include') || content.includes('cout') || content.includes('int main')) {
            this.language = 'text/x-c++src';
        } else if (content.includes('public class') || content.includes('System.out')) {
            this.language = 'text/x-java';
        }
    }
    
    showLoadingState() {
        // Show loading indicator in the editor area
        const editorContainer = document.getElementById('codeEditor');
        if (editorContainer) {
            editorContainer.innerHTML = `
                <div class="loading-state" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    font-family: monospace;
                    color: #666;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                ">
                    <div style="text-align: center;">
                        <div style="margin-bottom: 10px;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                        </div>
                        <div>Loading room editor...</div>
                        <div style="font-size: 12px; margin-top: 5px;">Connecting to room ${this.roomCode || ''}</div>
                    </div>
                </div>
            `;
        }
    }
    
    hideLoadingState() {
        // Remove loading indicator - the editor will replace it
        const loadingState = document.querySelector('.loading-state');
        if (loadingState) {
            loadingState.remove();
        }
    }
    
    initializeCodeEditor() {
        const editorElement = document.getElementById('codeEditor');
        if (!editorElement) return;
        
        // Create CodeMirror instance
        this.editor = CodeMirror(editorElement, {
            value: this.fileContent,
            mode: this.language,
            theme: 'default',
            lineNumbers: true,
            tabSize: 2,
            indentWithTabs: false,
            lineWrapping: this.wordWrap,
            autofocus: true,
            readOnly: !this.canEdit,
            styleActiveLine: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            autoCloseTags: true,
            extraKeys: {
                'Tab': 'indentMore',
                'Shift-Tab': 'indentLess',
                'Ctrl-Enter': () => this.runCode(),
                'Cmd-Enter': () => this.runCode()
            }
        });
        
        // Track editor changes for collaboration
        this.editor.on('change', (cm, change) => {
            this.handleEditorChange(change);
        });
        
        // Track cursor position for status bar and collaboration
        this.editor.on('cursorActivity', Utils.debounce(() => {
            this.handleCursorActivity();
        }, 50));
        
        // Update status bar
        this.updateStatusBar();
    }
    
    handleEditorChange(change) {
        // Skip processing if this is an ignored change (from remote sync)
        if (this.ignoreNextChange) {
            this.ignoreNextChange = false;
            return;
        }
        
        // Call any registered content change callbacks
        this.contentChangeCallbacks.forEach(callback => callback(change));
        
        // Create operation for collaboration
        const operation = this.changeToOperation(change);
        if (operation && window.wsClient && this.roomCode) {
            // Add to operation queue
            this.operationQueue.push(operation);
            this.processOperationQueue();
        }
        
        // Schedule content sync
        this.scheduleContentSync();
    }
    
    changeToOperation(change) {
        if (!change.origin || change.origin === 'setValue') {
            return null; // Ignore initial value setting
        }
        
        const operation = {
            id: ++this.localOperationId,
            type: 'unknown',
            position: 0,
            content: '',
            removed: '',
            timestamp: Date.now()
        };
        
        // Calculate the absolute position in the document
        const position = this.editor.indexFromPos(change.from);
        operation.position = position;
        
        const removedText = change.removed ? change.removed.join('\n') : '';
        const insertedText = change.text ? change.text.join('\n') : '';
        
        if (removedText.length > 0 && insertedText.length > 0) {
            // Replace operation (delete + insert)
            operation.type = 'replace';
            operation.removed = removedText;
            operation.content = insertedText;
        } else if (removedText.length > 0) {
            // Delete operation
            operation.type = 'delete';
            operation.content = removedText;
            operation.removed = removedText;
        } else if (insertedText.length > 0) {
            // Insert operation
            operation.type = 'insert';
            operation.content = insertedText;
        } else {
            return null; // No meaningful change
        }
        
        return operation;
    }
    
    // Process operations queue to avoid race conditions
    processOperationQueue() {
        if (this.operationInProgress || this.operationQueue.length === 0) {
            return;
        }
        
        this.operationInProgress = true;
        const operation = this.operationQueue.shift();
        
        window.wsClient.sendOperation(operation)
            .then(() => {
                this.operationInProgress = false;
                this.processOperationQueue();
            })
            .catch((error) => {
                console.error('Failed to send operation:', error);
                // Put the operation back in the queue
                this.operationQueue.unshift(operation);
                this.operationInProgress = false;
                
                // Try again after a delay
                setTimeout(() => this.processOperationQueue(), 1000);
            });
    }
    
    // Content synchronization methods
    scheduleContentSync() {
        // Clear existing timer
        if (this.contentSyncTimer) {
            clearTimeout(this.contentSyncTimer);
        }
        
        // Schedule content sync after delay
        this.contentSyncTimer = setTimeout(() => {
            this.syncContent();
        }, this.contentSyncDelay);
    }
    
    syncContent() {
        if (!this.editor) {
            return;
        }
        
        if (!window.wsClient) {
            return;
        }
        
        if (!this.roomCode) {
            return;
        }
        
        const currentContent = this.editor.getValue();
        
        // Only sync if content has changed since last sync
        if (currentContent !== this.lastSyncedContent) {
            window.wsClient.send('content_sync', {
                content: currentContent
            }).then(() => {
                this.lastSyncedContent = currentContent;
            }).catch((error) => {
                console.error('Failed to sync content:', error);
            });
        }
    }
    
    handleCursorActivity() {
        const cursor = this.editor.getCursor();
        const selection = this.editor.getSelection();
        
        // Update cursor position in status bar
        this.updateCursorInfo(cursor);
        
        // Send cursor position to server
        if (window.wsClient && this.roomCode) {
            // Send cursor position
            window.wsClient.updateCursor({
                line: cursor.line,
                ch: cursor.ch
            });
            
            // Send selection if text is selected
            if (selection && selection.length > 0) {
                const selections = this.editor.listSelections();
                if (selections.length > 0) {
                    window.wsClient.updateSelection(selections);
                }
            }
        }
    }
    
    updateCursorInfo(cursor) {
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) {
            const languageName = this.getLanguageName();
            fileInfo.textContent = `${languageName} • Line ${cursor.line + 1}, Column ${cursor.ch + 1}`;
        }
    }
    
    getLanguageName() {
        const mode = this.editor ? this.editor.getOption('mode') : this.language;
        const languages = {
            'javascript': 'JavaScript',
            'text/x-python': 'Python',
            'text/x-csrc': 'C',
            'text/x-c++src': 'C++',
            'text/x-java': 'Java'
        };
        return languages[mode] || mode;
    }
    
    setupEventListeners() {
        // Run button
        const runBtn = document.getElementById('runBtn');
        if (runBtn) {
            runBtn.addEventListener('click', this.runCode.bind(this));
        }
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl+Enter or Cmd+Enter to run code
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.runCode();
            }
        });
    }
    
    setupWebSocket() {
        const connectionStatus = document.getElementById('connectionStatus');
        
        // WebSocket connection events
        window.wsClient.on('connected', () => {
            if (connectionStatus) {
                connectionStatus.innerHTML = `<i class="fas fa-circle text-green"></i> Connected`;
            }
            
            // Authenticate
            window.wsClient.authenticate(window.USER_DATA);
        });
        
        window.wsClient.on('disconnected', () => {
            if (connectionStatus) {
                connectionStatus.innerHTML = `<i class="fas fa-circle text-red"></i> Disconnected`;
            }
        });
        
        window.wsClient.on('reconnecting', (attempts) => {
            if (connectionStatus) {
                connectionStatus.innerHTML = `<i class="fas fa-circle text-yellow"></i> Reconnecting (${attempts})...`;
            }
        });
        
        window.wsClient.on('authenticated', (user) => {
            if (connectionStatus) {
                connectionStatus.innerHTML = `<i class="fas fa-circle text-green"></i> Connected`;
            }
            
            // Join the room if we have a room code
            if (this.roomCode) {
                window.wsClient.joinRoom(this.roomCode);
            } else {
                // No room code, initialize sync with current content
                if (this.editor) {
                    const currentContent = this.editor.getValue();
                    this.lastSyncedContent = currentContent;
                    this.hideLoadingState();
                    this.stateLoaded = true;
                }
            }
        });
        
        // Room events
        window.wsClient.on('room_joined', (data) => {
            this.collaborators = data.collaborators || [];
            this.renderCollaborators();
            
            // Hide loading indicator and mark state as loaded immediately
            // since we're not expecting content from server in new architecture
            this.hideLoadingState();
            this.stateLoaded = true;
        });
        
        window.wsClient.on('room_not_found', (data) => {
            console.error('Room not found:', data.room_code);
            if (typeof showToast === 'function') {
                showToast(`Room ${data.room_code} not found`, 'error');
            }
        });
        
        // Room creation event
        window.wsClient.on('room_created', (data) => {
            // Room creator will join the room immediately, so room_joined will handle initialization
        });
        
        // User events
        window.wsClient.on('user_joined', (data) => {
            // Add user to collaborators list
            const exists = this.collaborators.find(c => c.id === data.user.id);
            if (!exists) {
                this.collaborators.push(data.user);
                this.renderCollaborators();
            }
            
            // Show notification
            Utils.showToast(`${data.user.display_name || data.user.username} joined the editor`, 'info');
        });
        
        // Host content request event
        window.wsClient.on('request_content_for_guest', (data) => {
            // Only respond if we are the host and have content to share
            if (this.editor) {
                const currentContent = this.editor.getValue();
                
                // Send current content to the specific guest
                window.wsClient.send('send_content_to_guest', {
                    guest_user_id: data.guest_user.id,
                    content: currentContent
                }).then(() => {
                    }).catch((error) => {
                    console.error('Failed to send content to guest:', error);
                });
            }
        });
        
        // Guest content reception event
        window.wsClient.on('receive_content_from_host', (data) => {
            if (this.editor) {
                // Use flag to ignore the next change event
                this.ignoreNextChange = true;
                
                // Set the content from host
                this.editor.setValue(data.content);
                this.lastSyncedContent = data.content;
                
                // Hide loading indicator and mark state as loaded
                this.hideLoadingState();
                this.stateLoaded = true;
                
                // Show notification
                Utils.showToast(`Received content from ${data.host_user.display_name || data.host_user.username}`, 'success');
            }
        });
        
        window.wsClient.on('user_left', (data) => {
            // Remove user from collaborators list
            this.collaborators = this.collaborators.filter(c => c.id !== data.user.id);
            this.renderCollaborators();
            
            // Show notification
            Utils.showToast(`${data.user.username} left the editor`, 'info');
        });
        
        // File events
        window.wsClient.on('text_operation', (data) => {
            if (data.user.id !== window.USER_DATA.id) {
                this.applyRemoteOperation(data.operation);
            }
        });
        
        // Content sync events
        window.wsClient.on('content_sync', (data) => {
            if (data.user.id !== window.USER_DATA.id && this.editor) {
                // Temporarily disable change events to avoid sending operations
                this.ignoreNextChange = true;
                
                // Set the synced content
                this.editor.setValue(data.content);
                this.lastSyncedContent = data.content;
                
                Utils.showToast(`Content synced by ${data.user.display_name || data.user.username}`, 'info');
            }
        });
        
        // Connect to WebSocket server
        window.wsClient.connect();
    }
    
    applyRemoteOperation(operation) {
        if (!this.editor) {
            return;
        }
        
        // Don't apply operations we've already acknowledged
        if (this.acknowledgedOperations.has(operation.id)) {
            return;
        }
        
        // Validate the operation
        if (!window.OT.isValidOperation(operation)) {
            console.error('Invalid remote operation:', operation);
            return;
        }
        
        // Store the current cursor position
        const cursorPos = this.editor.getCursor();
        
        try {
            // Transform the operation against any pending local operations
            const transformedOp = this.transformRemoteOperation(operation);
            
            // Skip if it's a no-op
            if (transformedOp.type === 'noop') {
                return;
            }
            
            // Set flag to ignore the next change event (from applying this remote operation)
            this.ignoreNextChange = true;
            
            // Apply the transformed operation
            switch (transformedOp.type) {
                case 'insert':
                    this.applyInsertOperation(transformedOp);
                    break;
                case 'delete':
                    this.applyDeleteOperation(transformedOp);
                    break;
                case 'replace':
                    this.applyReplaceOperation(transformedOp);
                    break;
            }
            
            // Restore cursor position if it was affected
            setTimeout(() => {
                this.restoreCursorPosition(cursorPos, transformedOp);
            }, 0);
            
            // Mark this operation as acknowledged
            this.acknowledgedOperations.add(operation.id);
            
        } catch (error) {
            console.error('Error applying remote operation:', error);
            // Reset the flag in case of error
            this.ignoreNextChange = false;
        }
    }
    
    transformRemoteOperation(remoteOp) {
        // Use the proper OT library for transformation
        let transformedOp = { ...remoteOp };
        
        // Transform against pending local operations
        for (const localOp of this.operationQueue) {
            if (localOp.timestamp < remoteOp.timestamp) {
                transformedOp = window.OT.transform(transformedOp, localOp);
            }
        }
        
        return transformedOp;
    }
    
    applyInsertOperation(operation) {
        const pos = this.editor.posFromIndex(operation.position);
        if (pos) {
            this.editor.replaceRange(operation.content, pos, pos);
        }
    }
    
    applyDeleteOperation(operation) {
        const from = this.editor.posFromIndex(operation.position);
        const to = this.editor.posFromIndex(operation.position + operation.content.length);
        if (from && to) {
            this.editor.replaceRange('', from, to);
        }
    }
    
    applyReplaceOperation(operation) {
        const from = this.editor.posFromIndex(operation.position);
        const to = this.editor.posFromIndex(operation.position + (operation.removed?.length || 0));
        if (from && to) {
            this.editor.replaceRange(operation.content, from, to);
        }
    }
    
    restoreCursorPosition(originalPos, operation) {
        if (!originalPos || !this.editor) return;
        
        // Calculate new cursor position based on the operation
        const originalIndex = this.editor.indexFromPos(originalPos);
        let newIndex = originalIndex;
        
        if (operation.position <= originalIndex) {
            // Operation happened before cursor
            if (operation.type === 'insert') {
                newIndex += operation.content.length;
            } else if (operation.type === 'delete') {
                newIndex = Math.max(operation.position, newIndex - operation.content.length);
            } else if (operation.type === 'replace') {
                newIndex = newIndex - (operation.removed?.length || 0) + operation.content.length;
            }
        }
        
        // Set cursor to new position
        const newPos = this.editor.posFromIndex(Math.max(0, newIndex));
        if (newPos) {
            this.editor.setCursor(newPos);
        }
    }
    
    renderCollaborators() {
        const collaboratorsList = document.getElementById('collaboratorsList');
        if (!collaboratorsList) return;
        
        // Always include the current user in the collaborators list
        const allUsers = [...this.collaborators];
        
        // Add current user if not already in the list
        const currentUserExists = allUsers.find(u => u.id === window.USER_DATA.id);
        if (!currentUserExists) {
            allUsers.unshift(window.USER_DATA); // Add current user at the beginning
        }
        
        if (!allUsers.length) return;
        
        let html = '';
        
        // Limit to maximum 5 users in the header
        const displayUsers = allUsers.slice(0, 5);
        const remainingCount = Math.max(0, allUsers.length - 5);
        
        displayUsers.forEach(user => {
            const initials = user.username.substring(0, 1).toUpperCase();
            const color = Utils.generateUserColor(user.username);
            const isCurrentUser = user.id === window.USER_DATA.id;
            const title = isCurrentUser ? 
                `${Utils.escapeHtml(user.display_name || user.username)} (You)` : 
                `${Utils.escapeHtml(user.display_name || user.username)}`;
            
            html += `
                <div class="user-avatar${isCurrentUser ? ' current-user' : ''}" style="background-color: ${color};" 
                     title="${title}">
                    ${initials}
                </div>
            `;
        });
        
        if (remainingCount > 0) {
            html += `
                <div class="user-avatar" style="background-color: #6c757d;" 
                     title="${remainingCount} more collaborators">
                    +${remainingCount}
                </div>
            `;
        }
        
        collaboratorsList.innerHTML = html;
    }
    
    setWordWrap(enabled) {
        if (this.editor) {
            this.editor.setOption('lineWrapping', enabled);
        }
        this.wordWrap = enabled;
        Utils.storage.set('word_wrap', enabled);
    }
    
    updateStatusBar() {
        const cursor = this.editor ? this.editor.getCursor() : { line: 0, ch: 0 };
        this.updateCursorInfo(cursor);
    }
    
    async runCode() {
        // This is implemented in the index.php file
        // The global function runCode() will be called
        if (typeof window.runCode === 'function') {
            await window.runCode();
        }
    }
    
    // Register callback for content changes
    onContentChange(callback) {
        if (typeof callback === 'function') {
            this.contentChangeCallbacks.push(callback);
        }
    }
    
    // Get editor content
    getContent() {
        return this.editor ? this.editor.getValue() : '';
    }
    
    // Set the language mode of the editor
    setLanguage(language) {
        if (this.editor) {
            this.editor.setOption('mode', language);
            this.language = language;
            Utils.storage.set('editor_language', language);
            this.updateStatusBar();
        }
    }
}

// Create global editor instance when DOM is ready
Utils.ready(() => {
    // Create global editor instance
    window.editor = new Editor();
    
    // Initialize language selector
    const savedLanguage = Utils.storage.get('editor_language', 'javascript');
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.value = savedLanguage;
        if (typeof changeLanguage === 'function') {
            changeLanguage(savedLanguage);
        }
    }
});
