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
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaborative Code Editor - Write, Share & Execute Code Together</title>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EY04EPSP2B"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-EY04EPSP2B');
</script>
  <link rel="icon" type="image/x-icon" href="/favicons/PresentationAssistantsWhite.ico">
    
    <!-- Theme initialization script (keep this before other stylesheets) -->
    <script>
      (function() {
          var theme = localStorage.getItem('theme') || 'light';
          if(theme === 'light'){
              document.documentElement.classList.add('light-mode');
          } else {
              document.documentElement.classList.remove('light-mode');
          }
      })();
    </script>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
  <link rel="stylesheet" href="../css/shared-styles-demos.css">
</head>
<body>
    <div class="nav-container">
        <a href="/index.html" class="back-link">
            <i class="fas fa-arrow-left"></i> Back to Index
        </a>
        <button class="theme-toggle-button" id="theme-toggle">
            <i class="fas fa-moon" id="theme-icon"></i>
            <span id="theme-text">Switch to Dark Mode</span>
        </button>
    </div>

    <div class="main-container">
        <div class="content-wrapper">
            <!-- Left Side: Room Creation and Joining -->
            <div class="form-container">
                <h2>Collaborative Code Editor</h2>
                <p style="color: var(--text-color); text-align: center; margin-bottom: 2rem; opacity: 0.8;">Write, share and execute code together in real-time</p>
                
                <!-- Create Room Section -->
                <div class="room-section">
                    <label class="form-label">Start a New Coding Session</label>
                    <button class="create-room-btn" id="createRoomBtn">
                        <i class="fas fa-plus-circle"></i>
                        <span class="btn-text">Create New Room</span>
                        <div class="loading-spinner" id="createLoadingSpinner" style="display: none;"></div>
                    </button>
                    <div class="success-message" id="createSuccessMessage"></div>
                    <div class="error-message" id="createErrorMessage"></div>
                </div>
                
                <!-- Divider -->
                <div class="divider">
                    <span>OR</span>
                </div>
                
                <!-- Join Room Section -->
                <div class="room-section">
                    <label class="form-label">Join an Existing Session</label>
                    <form class="join-room-form" id="joinRoomForm">
                        <input 
                            type="text" 
                            class="room-code-input" 
                            id="roomCodeInput" 
                            placeholder="ENTER ROOM CODE"
                            maxlength="6"
                            autocomplete="off"
                        >
                        <div class="room-code-hint">
                            Enter the 6-character room code shared with you
                        </div>
                        <button type="submit" class="join-room-btn" id="joinRoomBtn">
                            <i class="fas fa-sign-in-alt"></i>
                            <span class="btn-text">Join Room</span>
                            <div class="loading-spinner" id="joinLoadingSpinner" style="display: none;"></div>
                        </button>
                    </form>
                    <div class="success-message" id="joinSuccessMessage"></div>
                    <div class="error-message" id="joinErrorMessage"></div>
                </div>
                
                <!-- Features Section -->
                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="feature-text">Live Code<br>Execution</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="feature-text">Real-time<br>Collaboration</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">
                            <i class="fas fa-code"></i>
                        </div>
                        <div class="feature-text">Multiple<br>Languages</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">
                            <i class="fas fa-share-alt"></i>
                        </div>
                        <div class="feature-text">Easy<br>Sharing</div>
                    </div>
                </div>
            </div>
            
            <!-- Right Side: Comparison Table -->
            <div class="comparison-section">
                <h2>Try Our Collaborative Code Editor</h2>
                <p style="color: var(--text-color); line-height: 1.6;">
                This demo code editor allows you to write, share, and execute code directly in your browser without creating an account. 
                It supports real-time collaboration, live code execution using WebAssembly for near-native performance, and works with multiple programming languages.
                You can instantly create a coding session, invite others with a simple room code, and start coding together. 
                Experience the features of our collaborative platform with no setup required, entirely in your browser.
                </p>
                
                <!-- Info notice -->
                <div class="room-limit-notice" style="text-align:center; margin-bottom:1.5rem; color: var(--text-color); opacity:0.8; font-size:0.9rem;">
                ⚠️ This demo only allows <strong>2 participants</strong> per room.
                </div>

                <!-- PresentationAssistants.com Integration -->
                <div class="presentation-note">
                    <div class="icon">
                        <i class="fas fa-presentation-screen"></i>
                    </div>
                    <div class="title">Are you a teacher who teaches coding?</div>
                    <div class="description">
                    Our collaborative code editor is integrated into <a href="https://presentationassistants.com" target="_blank">PresentationAssistants.com</a>, a platform that transforms presentations into interactive experiences. Designed for live classrooms and workshops, one person types code, and hundreds of participants instantly see it — and can run it — directly in their browser. Powered by WebAssembly, the editor runs code efficiently and safely on each participant’s device, making it far more scalable than traditional browser-based code editors. No installs, no setup, just real-time teaching power. <strong>In the production editor, the presenter remains the only one who can edit the code; participants are view-only unless the presenter grants permission to a specific audience member.</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
    
    <!-- JavaScript -->
    <script>
        // Store user data globally
        window.USER_DATA = <?php echo json_encode($currentUser); ?>;
        window.CSRF_TOKEN = '<?php echo $csrfToken ?? ""; ?>';
        window.WS_URL = 'wss://presentationassistants.com/codeEditor';

        // Theme toggle functionality
        function toggleTheme() {
            console.log("---- toggleTheme() CALLED ----");
            const currentTheme = localStorage.getItem('theme') || 'light';
	    console.log("Current theme from localStorage =", currentTheme);
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
	    console.log("New theme will be =", newTheme);
            
            localStorage.setItem('theme', newTheme);
	    console.log("localStorage updated.");
            
            if (newTheme === 'light') {
                document.documentElement.classList.add('light-mode');
                document.getElementById('theme-icon').className = 'fas fa-moon';
                document.getElementById('theme-text').textContent = 'Switch to Dark Mode';
            } else {
                document.documentElement.classList.remove('light-mode');
                document.getElementById('theme-icon').className = 'fas fa-sun';
                document.getElementById('theme-text').textContent = 'Switch to Light Mode';
            }
        }

        // Initialize theme on page load
        function initializeTheme() {
            const theme = localStorage.getItem('theme') || 'light';
            if (theme === 'light') {
                document.documentElement.classList.add('light-mode');
                document.getElementById('theme-icon').className = 'fas fa-moon';
                document.getElementById('theme-text').textContent = 'Switch to Dark Mode';
            } else {
                document.documentElement.classList.remove('light-mode');
                document.getElementById('theme-icon').className = 'fas fa-sun';
                document.getElementById('theme-text').textContent = 'Switch to Light Mode';
            }
        }

	document.addEventListener("DOMContentLoaded", () => {
            initializeTheme();   // run after button/icons exist

            document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
        });
    </script>
    <script src="assets/js/utils.js"></script>
    <script src="assets/js/room-manager.js"></script>
</html>
