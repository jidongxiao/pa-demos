<?php
session_start();

/*
 * Anonymous, session-based identity
 * No accounts, no persistence
 */
if (!isset($_SESSION['demo_username'])) {
    $_SESSION['demo_username'] = 'user_' . mt_rand(1000, 9999);
    $_SESSION['demo_user_id']  = mt_rand(1, 1000000);
}

$currentUser = [
    'username' => $_SESSION['demo_username'],
    'user_id'  => $_SESSION['demo_user_id']
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instant Video Calls – No Account Required</title>

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-EY04EPSP2B"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-EY04EPSP2B');
    </script>

    <link rel="icon" type="image/x-icon" href="/favicons/PresentationAssistantsWhite.ico">

    <!-- Theme initialization -->
    <script>
      (function() {
          var theme = localStorage.getItem('theme') || 'light';
          if (theme === 'light') {
              document.documentElement.classList.add('light-mode');
          } else {
              document.documentElement.classList.remove('light-mode');
          }
      })();
    </script>

    <!-- Bootstrap -->
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

            <!-- Left: Create / Join -->
            <div class="form-container">
                <h2>Instant Video Calls</h2>
                <p style="color: var(--text-color); text-align: center; margin-bottom: 2rem; opacity: 0.8;">
                    Start a secure video call in seconds — no account required
                </p>

                <!-- Create Room -->
                <div class="room-section">
                    <label class="form-label">Start a New Video Call</label>
                    <button class="create-room-btn" id="createRoomBtn">
                        <i class="fas fa-video"></i>
                        <span class="btn-text">Create Call Room</span>
                        <div class="loading-spinner" id="createLoadingSpinner" style="display:none;"></div>
                    </button>
                    <div class="error-message" id="createErrorMessage"></div>
                </div>

                <div class="divider">
                    <span>OR</span>
                </div>

                <!-- Join Room -->
                <div class="room-section">
                    <label class="form-label">Join an Existing Call</label>
                    <form class="join-room-form" id="joinRoomForm">
                        <input
                            type="text"
                            class="room-code-input"
                            id="roomCodeInput"
                            placeholder="ENTER CALL CODE"
                            maxlength="6"
                            autocomplete="off"
                        >
                        <div class="room-code-hint">
                            Enter the 6-character call code shared with you
                        </div>
                        <button type="submit" class="join-room-btn" id="joinRoomBtn">
                            <i class="fas fa-sign-in-alt"></i>
                            <span class="btn-text">Join Call</span>
                            <div class="loading-spinner" id="joinLoadingSpinner" style="display:none;"></div>
                        </button>
                    </form>
                    <div class="error-message" id="joinErrorMessage"></div>
                </div>

                <!-- Features -->
                <div class="features">
                    <div class="feature">
                        <div class="feature-icon"><i class="fas fa-video"></i></div>
                        <div class="feature-text">HD Video<br>& Audio</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon"><i class="fas fa-lock"></i></div>
                        <div class="feature-text">Secure<br>WebRTC</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon"><i class="fas fa-bolt"></i></div>
                        <div class="feature-text">No Account<br>Required</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon"><i class="fas fa-share-alt"></i></div>
                        <div class="feature-text">Simple<br>Room Code</div>
                    </div>
                </div>
            </div>

            <!-- Right: Description -->
            <div class="comparison-section">
                <h2>Try Instant Video Calls</h2>
                <p style="color: var(--text-color); line-height: 1.6;">
                    This demo lets you start a real-time video call directly in your browser —
                    no account, no downloads, and no setup.
                    Create a call room, share a short code, and connect instantly.
                </p>

                <!-- Info notice -->
                <div class="room-limit-notice" style="text-align:center; margin-bottom:1.5rem; color: var(--text-color); opacity:0.8; font-size:0.9rem;">
                ⚠️ This demo only allows <strong>2 participants</strong> per room.
                </div>

                <div class="presentation-note">
                    <div class="icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="title">Designed for live presentation</div>
                    <div class="description">
                        Instant video calls are built to complement interactive presentations
                        and live teaching on
                        <a href="https://presentationassistants.com" target="_blank">PresentationAssistants.com</a>.
                        Start face-to-face conversations without disrupting your workflow.
                    </div>
                </div>
            </div>

        </div>
    </div>
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
<script src="./js/room-manager.js"></script>
</body>
</html>
