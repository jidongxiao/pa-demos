<?php
session_start();

// Simple session-based authentication for the in-memory system
if (!isset($_SESSION['demo_username'])) {
    // Generate a simple username if not set
    $_SESSION['demo_username'] = 'user_' . mt_rand(1000, 9999);
    $_SESSION['demo_user_id'] = mt_rand(1, 1000);
}

$currentUser = [
    'username' => $_SESSION['demo_username'],
    'user_id' => $_SESSION['demo_user_id']
];

// Get room code from URL parameter
$roomCode = isset($_GET['code']) ? strtoupper(trim($_GET['code'])) : '';

// Validate room code format
if (empty($roomCode) || !preg_match('/^[A-Z0-9]{6}$/', $roomCode)) {
    // Redirect to landing page if invalid room code
    header('Location: ./');
    exit;
}

// Set default code
$defaultCode = "// Welcome to Room $roomCode\n// Collaborate in real-time with your team\n\nconsole.log('Hello from room $roomCode!');";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Room <?php echo htmlspecialchars($roomCode); ?> - Collaborative Code Editor</title>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EY04EPSP2B"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-EY04EPSP2B');
</script>
  <link rel="icon" type="image/x-icon" href="/favicons/PresentationAssistantsWhite.ico">
    
    <!-- Styles -->
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/editor.css">
    
    <!-- CodeMirror 5 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/darcula.min.css">
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="assets/favicon.ico">
    
    <style>
        .room-header-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .room-code-display {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 15px;
            border-radius: 20px;
            font-family: monospace;
            font-weight: bold;
            letter-spacing: 1px;
        }
        
        .room-code-label {
            font-size: 0.85rem;
            opacity: 0.8;
        }
        
        .room-code-value {
            font-size: 1.1rem;
            color: #007bff;
        }
        
        .copy-room-code {
            background: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.2s;
        }
        
        .copy-room-code:hover {
            background: #0056b3;
            transform: scale(1.05);
        }
        
        .copy-room-code.copied {
            background: #28a745;
        }
        
        /* Header layout */
        .editor-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            background-color: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            flex-wrap: wrap;
            gap: 1rem;
        }
        
        /* Editor actions styling */
        .editor-actions {
            display: flex;
            align-items: center;
            /* Remove margin-left: auto since parent handles the layout */
        }
        
        .button-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        /* Modern button styling */
        .run-button, .download-button, .share-button, .leave-room-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            line-height: 1.5;
            text-align: center;
            text-decoration: none;
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
            border: 1px solid transparent;
            border-radius: 0.375rem;
            transition: all 0.15s ease-in-out;
            min-width: auto;
        }
        
        .run-button {
            color: white;
            background-color: #28a745;
            border-color: #28a745;
        }
        
        .run-button:hover {
            background-color: #218838;
            border-color: #1e7e34;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
        }
        
        .download-button {
            color: white;
            background-color: #007bff;
            border-color: #007bff;
        }
        
        .download-button:hover {
            background-color: #0056b3;
            border-color: #004085;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
        }
        
        .share-button {
            color: white;
            background-color: #6f42c1;
            border-color: #6f42c1;
        }
        
        .share-button:hover {
            background-color: #5a32a3;
            border-color: #512da8;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(111, 66, 193, 0.3);
        }
        
        .share-button.copied {
            background-color: #28a745;
            border-color: #28a745;
        }
        
        .leave-room-btn {
            color: white;
            background-color: #dc3545;
            border-color: #dc3545;
        }
        
        .leave-room-btn:hover {
            background-color: #c82333;
            border-color: #bd2130;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .button-group {
                gap: 0.5rem;
            }
            
            .run-button, .download-button, .share-button, .leave-room-btn {
                padding: 0.375rem 0.75rem;
                font-size: 0.8rem;
            }
            
            .run-button span, .download-button span, .share-button span, .leave-room-btn span {
                display: none;
            }
        }
        
        .room-status {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .room-status.loading {
            color: #ffc107;
        }
        
        .room-status.connected {
            color: #28a745;
        }
        
        .room-status.error {
            color: #dc3545;
        }
        
        /* Toast notifications */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast.success {
            background: #28a745;
        }
        
        .toast.error {
            background: #dc3545;
        }
        
        .toast.info {
            background: #17a2b8;
        }
        
        .toast.warning {
            background: #ffc107;
            color: #333;
        }
    </style>
</head>
<body class="editor-body">
    <div id="app" class="editor-app">
        <!-- Header -->
        <header class="editor-header">
            <div class="room-header-info">
                <div class="header-title">
                    <i class="fas fa-code"></i> Collaborative Code Editor
                </div>
                
                <div class="room-code-display">
                    <span class="room-code-label">Room:</span>
                    <span class="room-code-value" id="roomCodeDisplay"><?php echo htmlspecialchars($roomCode); ?></span>
                    <button class="copy-room-code" id="copyRoomCodeBtn" title="Copy room code">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                
                <div class="room-status loading" id="roomStatus">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Connecting to room...</span>
                </div>
            </div>
            
            <div class="collaborators-list" id="collaboratorsList">
                <!-- Active collaborators will appear here -->
            </div>
            
            <div class="editor-actions">
                <div class="button-group">
                    <button class="run-button" onclick="runCode()" id="runBtn">
                        <i class="fas fa-play"></i>
                        <span>Run</span>
                    </button>
                    <button class="download-button" onclick="downloadCode()" id="downloadBtn">
                        <i class="fas fa-download"></i>
                        <span>Download</span>
                    </button>
                    <button class="share-button" onclick="shareRoom()" id="shareBtn">
                        <i class="fas fa-share-alt"></i>
                        <span>Share</span>
                    </button>
                    <button class="leave-room-btn" onclick="leaveRoom()" id="leaveRoomBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Leave Room</span>
                    </button>
                </div>
            </div>
        </header>
        
        <!-- Main Editor Layout -->
        <div class="editor-layout">
            <!-- Editor Panel -->
            <main class="editor-panel">
                <div class="editor-container">
                    <div class="editor-toolbar">
                        <div class="toolbar-left">
                            <select id="languageSelector" class="language-selector" onchange="changeLanguage(this.value)">
                                <option value="python">Python</option>
                                <option value="c">C</option>
                                <option value="cpp">C++</option>
                                <option value="java">Java</option>
                                <option value="javascript">JavaScript</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="editor-main" id="editorMain">
                        <div id="codeEditor" class="code-editor"></div>
                    </div>
                    
                    <div id="outputPanel" class="output-panel">
                        <div id="outputContent"></div>
                    </div>
                </div>
            </main>
        </div>
        
        <!-- Status Bar -->
        <footer class="status-bar">
            <div class="status-left">
                <span class="connection-status" id="connectionStatus">
                    <i class="fas fa-circle text-red"></i>
                    Disconnected
                </span>
                <span class="file-info" id="fileInfo">
                    JavaScript • Line 1, Column 1
                </span>
            </div>
            
            <div class="status-right">
                <span class="typing-indicator" id="typingIndicator"></span>
            </div>
        </footer>
    </div>
    
    <!-- Project/Room Data for JavaScript -->
    <script>
        window.USER_DATA = <?php echo json_encode($currentUser); ?>;
        window.FILE_CONTENT = <?php echo json_encode($defaultCode); ?>;
        window.ROOM_CODE = '<?php echo htmlspecialchars($roomCode); ?>';
        window.CAN_EDIT = true;
        window.CSRF_TOKEN = '<?php echo $csrfToken; ?>';
        window.WS_URL = 'wss://presentationassistants.com/codeEditor';
        window.API_BASE = '/api';
        
        // Room-specific settings
        window.FILE_ID = window.ROOM_CODE; // Use room code as file ID
        window.PROJECT_ID = window.ROOM_CODE; // Use room code as project ID
    </script>
    
    <!-- CodeMirror 5 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/javascript/javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/xml/xml.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/css/css.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/python/python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/clike/clike.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/php/php.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/edit/closebrackets.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/edit/matchbrackets.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/addon/selection/active-line.min.js"></script>
    
    <!-- Scripts -->
    <script src="assets/js/utils.js"></script>
    <script src="assets/js/api.js"></script>
    <script src="assets/js/ot.js"></script>
    <script src="assets/js/websocket-client.js"></script>
    <script src="assets/js/editor.js"></script>
    <script src="assets/js/collaboration.js"></script>
    <!-- we need this type="module" here, so that we can use import in the js. -->
    <script type="module" src="assets/js/wasm-runtime.js"></script>
    
    <script>
        // Room-specific functionality
        
        // Copy room code to clipboard
        function copyRoomCode() {
            const roomCode = window.ROOM_CODE;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(roomCode).then(() => {
                    showRoomCodeCopied();
                }).catch(err => {
                    console.error('Failed to copy room code:', err);
                    fallbackCopyRoomCode(roomCode);
                });
            } else {
                fallbackCopyRoomCode(roomCode);
            }
        }
        
        function fallbackCopyRoomCode(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showRoomCodeCopied();
            } catch (err) {
                console.error('Failed to copy room code:', err);
                showToast('Failed to copy room code', 'error');
            }
            
            document.body.removeChild(textArea);
        }
        
        function showRoomCodeCopied() {
            const btn = document.getElementById('copyRoomCodeBtn');
            const originalHTML = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            
            showToast(`Room code ${window.ROOM_CODE} copied to clipboard!`, 'success');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        }
        
        // Share room functionality
        function shareRoom() {
            const roomUrl = window.location.href;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(roomUrl).then(() => {
                    showRoomShared();
                }).catch(err => {
                    console.error('Failed to copy room URL:', err);
                    fallbackShareRoom(roomUrl);
                });
            } else {
                fallbackShareRoom(roomUrl);
            }
        }
        
        function fallbackShareRoom(url) {
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showRoomShared();
            } catch (err) {
                console.error('Failed to copy room URL:', err);
                showToast('Failed to copy room URL', 'error');
            }
            
            document.body.removeChild(textArea);
        }
        
        function showRoomShared() {
            const btn = document.getElementById('shareBtn');
            const originalHTML = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            
            showToast('Room URL copied to clipboard! Share it with others to collaborate.', 'success');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        }
        
        // Leave room functionality
        function leaveRoom() {
            if (confirm('Are you sure you want to leave this room?')) {
                // Disconnect from WebSocket
                if (window.wsClient) {
                    window.wsClient.leaveRoom();
                    window.wsClient.disconnect();
                }
                
                // Navigate back to landing page
                window.location.href = 'index.php';
            }
        }
        
        // Update room status
        function updateRoomStatus(status, message) {
            const statusElement = document.getElementById('roomStatus');
            if (!statusElement) return;
            
            statusElement.className = `room-status ${status}`;
            
            let icon = '';
            switch (status) {
                case 'loading':
                    icon = '<i class="fas fa-spinner fa-spin"></i>';
                    break;
                case 'connected':
                    icon = '<i class="fas fa-check-circle"></i>';
                    break;
                case 'error':
                    icon = '<i class="fas fa-exclamation-triangle"></i>';
                    break;
            }
            
            statusElement.innerHTML = `${icon} <span>${message}</span>`;
        }
        
        // Toast notification system
        function showToast(message, type = 'info', duration = 4000) {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            // Show toast
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            // Hide toast
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
        
        // Set up room-specific event handlers
        document.addEventListener('DOMContentLoaded', () => {
            // Copy room code button
            const copyBtn = document.getElementById('copyRoomCodeBtn');
            if (copyBtn) {
                copyBtn.addEventListener('click', copyRoomCode);
            }
            
            // Update room status when WebSocket events occur
            window.addEventListener('load', () => {
                if (window.wsClient) {
                    window.wsClient.on('connected', () => {
                        updateRoomStatus('loading', 'Joining room...');
                    });
                    
                    window.wsClient.on('room_joined', (data) => {
                        updateRoomStatus('connected', `Connected to room ${data.room_code}`);
                        showToast(`Successfully joined room ${data.room_code}`, 'success');
                    });
                    
                    window.wsClient.on('room_not_found', () => {
                        updateRoomStatus('error', 'Room not found');
                        showToast('Room not found. Redirecting...', 'error');
                        setTimeout(() => {
                            window.location.href = 'index.php';
                        }, 3000);
                    });
                    
                    window.wsClient.on('disconnected', () => {
                        updateRoomStatus('error', 'Disconnected from room');
                    });
                    
                    window.wsClient.on('user_joined', (data) => {
                        showToast(`${data.user.display_name || data.user.username} joined the room`, 'info');
                    });
                    
                    window.wsClient.on('user_left', (data) => {
                        showToast(`${data.user.username} left the room`, 'info');
                    });
                }
            });
        });
        
        // Same code execution functions as index.php
        let isExecuting = false;
        async function runCode() {
            console.log('DEBUG: runCode() called');
            
            // Prevent multiple simultaneous executions
            if (isExecuting) {
                console.log('DEBUG: Already executing, ignoring duplicate call');
                return;
            }
            isExecuting = true;
            
            try {
                const outputPanel = document.getElementById('outputPanel');
                const outputContent = document.getElementById('outputContent');
                const code = window.editor.editor.getValue();
                const language = document.getElementById('languageSelector').value;
                
                outputPanel.style.display = 'block';
                outputContent.innerHTML = '<div class="log-line">Running code...</div>';
            
                if (language === 'javascript') {
                    const originalLog = console.log;
                    const logs = [];
                    
                    console.log = function(...args) {
                        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
                        originalLog.apply(console, args);
                    };
                    
                    try {
                        const executeCode = new Function(code);
                        executeCode();
                        
                        outputContent.innerHTML = logs.map(log => `<div class="log-line">${escapeHtml(log)}</div>`).join('');
                        
                        if (logs.length === 0) {
                            outputContent.innerHTML += '<div class="log-line">Code executed successfully (no output)</div>';
                        }
                    } catch (error) {
                        outputContent.innerHTML = `<div class="log-line error">${escapeHtml(error.toString())}</div>`;
                    } finally {
                        console.log = originalLog;
                    }
                } else {
                    try {
                        const result = await WasmRuntime.executeCode(code, language);
                        
                        if (result) {
                            outputContent.innerHTML = '';
                            
                            if (result.stdout && result.stdout.trim()) {
                                const stdoutLines = result.stdout.trim().split('\n');
                                for (const line of stdoutLines) {
                                    outputContent.innerHTML += `<div class="log-line">${escapeHtml(line)}</div>`;
                                }
                            }
                            
                            if (result.stderr && result.stderr.trim()) {
                                const stderrLines = result.stderr.trim().split('\n');
                                for (const line of stderrLines) {
                                    outputContent.innerHTML += `<div class="log-line error">${escapeHtml(line)}</div>`;
                                }
                            }
                            
                            if ((!result.stdout || !result.stdout.trim()) && (!result.stderr || !result.stderr.trim())) {
                                // Only show "no output" if there's truly no existing content
                                if (!outputContent.innerHTML || outputContent.innerHTML.trim() === '<div class="log-line">Running code...</div>') {
                                    outputContent.innerHTML += '<div class="log-line">Code executed successfully (no output)</div>';
                                }
                            }
                        } else {
                            outputContent.innerHTML = `<div class="log-line error">Failed to execute ${getLanguageName(language)} code</div>`;
                        }
                    } catch (error) {
                        outputContent.innerHTML = `<div class="log-line error">${escapeHtml(error.toString())}</div>`;
                    }
                }
            } catch (error) {
                outputContent.innerHTML = `<div class="log-line error">${escapeHtml(error.toString())}</div>`;
            } finally {
                isExecuting = false;
            }
        }
        
        // Helper functions (same as index.php)
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function toggleWordWrap() {
            if (window.editor && window.editor.editor) {
                const current = window.editor.editor.getOption('lineWrapping');
                window.editor.editor.setOption('lineWrapping', !current);
                
                const button = document.getElementById('wordWrapToggle');
                if (button) {
                    button.innerHTML = !current ? 
                        '<i class="fas fa-exchange-alt" style="color: #0d6efd;"></i>' : 
                        '<i class="fas fa-exchange-alt"></i>';
                }
                
                Utils.storage.set('word_wrap', !current);
            }
        }
        
        function getLanguageName(mode) {
            const languages = {
                'python': 'Python',
                'c': 'C',
                'cpp': 'C++',
                'java': 'Java',
                'javascript': 'JavaScript',
            };
            return languages[mode] || mode;
        }
        
        function changeLanguage(language) {
            if (window.editor && window.editor.editor) {
                window.editor.editor.setOption('mode', language);
                
                const fileInfo = document.getElementById('fileInfo');
                if (fileInfo) {
                    const cursor = window.editor.editor.getCursor();
                    fileInfo.textContent = `${getLanguageName(language)} • Line ${cursor.line + 1}, Column ${cursor.ch + 1}`;
                }
                
                Utils.storage.set('editor_language', language);
                
                if (language === 'python') {
                    WasmRuntime.loadRuntime('python');
                } else if (language === 'c' || language === 'cpp') {
                    WasmRuntime.loadRuntime('cpp');
                } else if (language === 'java') {
                    WasmRuntime.loadRuntime('java');
                }
            }
        }
        
        function downloadCode() {
            if (window.editor && window.editor.editor) {
                const code = window.editor.editor.getValue();
                const language = document.getElementById('languageSelector').value;
                let filename = `room_${window.ROOM_CODE}_code`;
                
                const extensions = {
                    'javascript': '.js',
                    'python': '.py',
                    'c': '.c',
                    'cpp': '.cpp',
                    'java': '.java',
                    'php': '.php',
                    'htmlmixed': '.html',
                    'css': '.css'
                };
                
                filename += extensions[language] || '.txt';
                
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
    </script>
</body>
</html>
