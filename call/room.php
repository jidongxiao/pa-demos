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

$username = $_SESSION['demo_username'] ?? 'Guest';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Call Room <?= $roomCode ?></title>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-EY04EPSP2B"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-EY04EPSP2B');
    </script>

    <link rel="icon" type="image/x-icon" href="/favicons/PresentationAssistantsWhite.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">

    <style>
* {
    box-sizing: border-box;
}

        body {
            background: #0f172a;
            color: #e5e7eb;
            height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
        }

        /* Top bar */
        .room-header {
            padding: 0.75rem 1.25rem;
            background: #020617;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1e293b;
        }

        .room-code {
            font-weight: 600;
            letter-spacing: 1px;
        }

        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: black;
        }

        .video-label {
            position: absolute;
            bottom: 0.5rem;
            left: 0.5rem;
            background: rgba(0,0,0,0.6);
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            font-size: 0.85rem;
            z-index: 10; /* Ensure this is higher than the video's z-index (2) */
        }

.video-call-wrapper {
    position: relative;
    flex: 1; /* Allow it to take up all remaining vertical space */
    width: 100%;
    background: #1a1a1a;
    overflow: hidden;
}

/* 1. The Stage (Shared Screen) - Hide it by default so it doesn't block the grid */
.screen-stage {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    z-index: 1;
    display: none; /* CHANGED: Ensure it is hidden until sharing starts */
}

.screen-stage video {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* 2. The Camera Containers */
.video-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    width: 100%; /* Ensure it fills the wrapper */
    height: 100%;
    padding: 20px;
    z-index: 2;
    position: relative; /* Ensure it stays above the stage layer */
}

/* When SHARING: Move cameras to the bottom right area */
.sharing-screen .video-container {
    position: absolute;
    bottom: 80px; /* Above the control bar */
    right: 20px;
    width: auto; 
    height: auto;
    flex-direction: row; 
    justify-content: flex-end;
    padding: 0;
    pointer-events: none;
}

.sharing-screen .video-container {
    gap: 25px; /* Increased gap to accommodate the floating buttons */
}

/* Fixed dimensions for tiles when in PIP mode */
.sharing-screen .video-tile {
    width: 180px;
    height: 101px; /* 16:9 ratio */
    flex: none; 
}

.sharing-screen .video-tile:hover {
    transform: scale(1.5);
    transform-origin: bottom right;
    transition: transform 0.2s ease-in-out;
    z-index: 1002;
    border-color: #6366f1; /* Highlight on hover */
}

/* Ensure labels inside small tiles stay readable */
.sharing-screen .video-label {
    font-size: 0.7rem;
    padding: 1px 4px;
}

/* Hide the user avatar placeholder in PIP mode to keep it clean */
.sharing-screen .video-tile:has(video:not([srcObject]))::before {
    font-size: 24px;
}

/* Ensure video elements are visible and interactive within tiles */
.video-tile video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    background: black;
    object-fit: cover;
    display: block !important; /* Ensure they aren't hidden */
    pointer-events: auto;       /* RE-ENABLE pointer events for the video itself */
    opacity: 1;
    transition: opacity 0.3s ease;
}

/* Hide video only when camera is off to show the avatar icon behind it */
.video-tile.camera-off video {
    opacity: 0;
    pointer-events: none;
}

/* Show the avatar only when the .camera-off class is present on the tile */
.video-tile.camera-off::before {
    content: "\f2bd"; /* FontAwesome User Circle icon */
    font-family: "Font Awesome 5 Free"; /* Ensure this matches your FA version */
    font-weight: 900;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 80px; /* Big avatar icon */
    color: #334155;
    z-index: 1;
}

/* Base Tile Styling */
.video-tile {
    position: relative;
    /* CHANGE: Instead of just flex: 1, give it a base width */
    flex: 1;
    width: 100%; 
    min-width: 320px; /* Ensures they don't get too tiny */
    max-width: 600px;
    z-index: 1;
    aspect-ratio: 16/9;
    background: #111;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
}

.video-tile {
    pointer-events: auto !important;
}

.minimize-btn {
    pointer-events: auto !important;
}

#screenShareContainer video {
    display: block !important;
    width: 100%;
    height: 100%;
}

/* Minimize Button Styling */
.minimize-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 100;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    color: white;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    cursor: pointer;
    opacity: 0; /* Hidden by default */
    transition: opacity 0.2s;
}

.video-tile:hover .minimize-btn {
    opacity: 1; /* Show on hover */
}

/* Minimized State */
.video-tile.minimized {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    aspect-ratio: 1/1 !important;
    border-radius: 50%;
}

.video-tile.minimized video, 
.video-tile.minimized .video-label {
    display: none; /* Hide video and name when small */
}

/* Change icon to a plus/expand when minimized */
.video-tile.minimized .minimize-btn {
    opacity: 1;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #6366f1;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    padding: 0;
}

.video-tile.minimized .minimize-btn i::before {
    content: "\f067"; /* FontAwesome Plus Icon */
}

.meeting-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #020617;
    border: 1px solid #1e293b;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    font-size: 0.85rem;
    max-width: 100%;
    flex-wrap: wrap;
}

.meeting-link span {
    color: #cbd5f5;
    white-space: normal;        /* allow wrapping */
    word-break: break-all;      /* break long URLs safely */
}

.meeting-link button {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
}

.meeting-link button:hover {
    color: #e5e7eb;
}

.control-btn {
    pointer-events: auto; /* Ensures buttons remain clickable */
}

/* Controls */
.controls {
    position: relative; /* Ensure it stays in document flow */
    padding: 1rem;
    background: #020617;
    display: flex;
    justify-content: center; /* Keeps buttons in the middle */
    gap: 1.25rem;
    border-top: 1px solid #1e293b;
    z-index: 1001; /* Above the video container if they overlap */
}
        .control-btn {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: none;
            font-size: 1.2rem;
            background: #1e293b;
            color: #e5e7eb;
            transition: background 0.2s;
        }

        .control-btn:hover {
            background: #334155;
        }

        .control-btn.danger {
            background: #dc2626;
        }

        .control-btn.danger:hover {
            background: #b91c1c;
        }

        .control-btn.off {
            background: #475569;
            opacity: 0.7;
        }

        /* Mobile */
        @media (max-width: 768px) {
            .video-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body>

<!-- Header -->
<div class="room-header">
    <div class="d-flex align-items-center gap-3 flex-wrap">
        <div>
            <strong>Room:</strong>
            <span class="room-code"><?= $roomCode ?></span>
        </div>

        <div class="meeting-link">
            <i class="fas fa-link"></i>
            <span id="meetingLinkText">
                https://presentationassistants.com/demos/call/room.php?code=<?= $roomCode ?>
            </span>
            <button id="copyLinkBtn" title="Copy meeting link">
                <i class="fas fa-copy"></i>
            </button>
        </div>
    </div>

    <div>
        <?= htmlspecialchars($username) ?>
    </div>
</div>

<!-- Videos -->
<div class="video-call-wrapper">
    <div id="screenShareContainer" class="screen-stage" style="display: none;">
        <video id="remoteScreenVideo" autoplay muted playsinline></video>
        <div class="video-label" id="screenLabel">Screen Share</div>
    </div>

    <div class="video-container" id="cameraTiles">
        <div class="video-tile camera-off" id="localTile">
            <button class="minimize-btn" onclick="toggleMinimize('localTile')" title="Minimize">
            <i class="fas fa-minus"></i>
            </button>
            <video id="localVideo" autoplay muted playsinline></video>
            <div class="video-label">You</div>
        </div>

        <div class="video-tile camera-off" id="remoteTile">
            <button class="minimize-btn" onclick="toggleMinimize('remoteTile')" title="Minimize">
            <i class="fas fa-minus"></i>
            </button>
            <video id="remoteVideo" autoplay muted playsinline></video>
            <div class="video-label">Peer</div>
        </div>
    </div>
</div>

<!-- Controls -->
<div class="controls">
    <button id="toggleMic" class="control-btn" title="Mute / Unmute">
        <i class="fas fa-microphone"></i>
    </button>

    <button id="toggleCamera" class="control-btn" title="Camera On / Off">
        <i class="fas fa-video"></i>
    </button>

    <button id="shareScreen" class="control-btn" title="Share Screen">
        <i class="fas fa-desktop"></i>
    </button>

    <button id="leaveCall" class="control-btn danger" title="Leave Call">
        <i class="fas fa-phone-slash"></i>
    </button>
</div>
<!-- Room Data for JavaScript -->
<script>
    window.USER_DATA = <?php echo json_encode($currentUser); ?>;
    window.ROOM_CODE = '<?php echo htmlspecialchars($roomCode); ?>';
    window.CSRF_TOKEN = '<?php echo $csrfToken; ?>';
    window.WS_URL = 'wss://presentationassistants.com/codeEditor';
    let isPeerConnected = false;
    let isRemoteSharing = false;
    let remoteScreenStreamId = null;
</script>
<script src="js/utils.js"></script>
<script src="js/websocket-client.js"></script>
<script>
let ws = null;

        // Toast notification system
        function showToast(message, type = 'info', duration = 5000) {
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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Register room-specific WebSocket handlers
    if (!window.wsClient) {
        window.wsClient = new WebSocketClient(WS_URL);
    }

    ws = window.wsClient;

    ws.on('room_joined', (data) => {
        // updateRoomStatus('connected', `Connected to room ${data.room_code}`);
        showToast(`Successfully joined room ${data.room_code}`, 'success');
	console.log("[WebRTC] Successfully joined room");
	// If the room data shows 2 people, peer is connected
        if (data.member_count >= 2) isPeerConnected = true;
        updateShareButtonState();
    });

    ws.on('room_not_found', () => {
        // updateRoomStatus('error', 'Room not found');
        showToast('Room not found. Redirecting...', 'error');
        setTimeout(() => {
            window.location.href = 'index.php';
        }, 3000);
    });

    ws.on('screen_share_started', () => {
        isRemoteSharing = true;
        updateShareButtonState();
        const screenLabel = document.getElementById('screenLabel');
        screenLabel.textContent = "Peer's Screen"; // Set for the receiver
        const wrapper = document.querySelector('.video-call-wrapper');
        const screenContainer = document.getElementById('screenShareContainer');
        wrapper.classList.add('sharing-screen');
        screenContainer.style.display = 'block';
        showToast("Peer is sharing their screen...");
        console.log("Peer is sharing their screen...");
    });

    ws.on('screen_share_stopped', () => {
        isRemoteSharing = false;
	remoteScreenStreamId = null;
        updateShareButtonState();
        const wrapper = document.querySelector('.video-call-wrapper');
	const screenContainer = document.getElementById('screenShareContainer');
	// Restore tiles if they were minimized
        document.getElementById('localTile').classList.remove('minimized');
        document.getElementById('remoteTile').classList.remove('minimized');
        wrapper.classList.remove('sharing-screen');
	screenContainer.style.display = 'none';
	// Clear the video source to free up memory
        document.getElementById('remoteScreenVideo').srcObject = null;
    });

    // 2. Connect WebSocket
    await ws.connect();

    // 3. Authenticate
    // Authenticate and wait for server response
    await new Promise((resolve, reject) => {
        ws.on('authenticated', resolve); // resolve when server confirms
        ws.authenticate(USER_DATA).catch(reject);
    });

    // 4. Join the room
    await ws.joinRoom(ROOM_CODE);
});
        
/*
 * UI-only logic
 * (Hook these buttons into your existing WebRTC code)
 */

const micBtn = document.getElementById('toggleMic');
const camBtn = document.getElementById('toggleCamera');
const leaveBtn = document.getElementById('leaveCall');

let micOn = false;
let camOn = false;

// Make buttons reflect initial state
micBtn.classList.add('off');
micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';

camBtn.classList.add('off');
camBtn.innerHTML = '<i class="fas fa-video-slash"></i>';

micBtn.addEventListener('click', async () => {
    if (!micOn) {
        await enableAudio();
    } else {
        disableAudio();
    }
    micOn = !micOn;
    micBtn.classList.toggle('off', !micOn);
    micBtn.innerHTML = micOn
        ? '<i class="fas fa-microphone"></i>'
        : '<i class="fas fa-microphone-slash"></i>';
});

camBtn.addEventListener('click', async () => {
    if (!camOn) {
        await enableVideo();
    } else {
        disableVideo();
    }
    camOn = !camOn;
    camBtn.classList.toggle('off', !camOn);
    camBtn.innerHTML = camOn
        ? '<i class="fas fa-video"></i>'
        : '<i class="fas fa-video-slash"></i>';
});

leaveBtn.addEventListener('click', () => {
    console.log('[WebRTC] Leaving room');

    // 1. Stop local media tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = new MediaStream();
    }

    // 2. Close the single peer connection
    if (window.peerConnection) {
        window.peerConnection.close();
        window.peerConnection = null;
    }

    // 3. (Optional but recommended) notify the other peer
    if (window.wsClient?.connected) {
        window.wsClient.send('webrtc_peer_disconnected');
    }

    // 4. Redirect
    window.location.href = 'leave.php';
});

const copyBtn = document.getElementById('copyLinkBtn');
const meetingLink = document.getElementById('meetingLinkText').textContent;

copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(meetingLink);
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 1500);
    } catch (e) {
        showToast('Failed to copy link');
    }
});

// *************************************
// *   Audio and Video Code - Stream   *
// *************************************

let localStream = new MediaStream(); // Local camera/mic stream
let videoTrack = null;
let audioTrack = null;
let screenTrack = null;

// Update the local video element
function updateLocalVideo() {
    const video = document.getElementById("localVideo");
    const tile = document.getElementById("localTile");

    if (localStream.getVideoTracks().length > 0) {
        video.srcObject = localStream;
        tile.classList.remove("camera-off");
        video.className = "local-video";
    } else {
        video.srcObject = null;
        tile.classList.add("camera-off");
    }
}

// Create peer connection (without adding tracks yet)
async function createPeerConnection(isOfferer) {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
            { urls: 'stun:openrelay.metered.ca:80' },
            {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ]
    });
    window.peerConnection = pc;

    pc.onicecandidate = event => {
        if (event.candidate) {
            ws.send('webrtc_candidate', { candidate: event.candidate });
        }
    };

    pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("ICE connection state:", state);

        switch (state) {
            case 'checking':
                showToast("Connecting to peer...", "info", 3000);
                break;
            case 'connected':
            case 'completed':
                showToast("Connected!", "success", 2000);
                break;
            case 'failed':
                showToast("Connection failed. Check your network or try rejoining.", "error", 5000);
                console.error("[WebRTC] ICE connection failed - may need TURN server or network is blocking");
                break;
            case 'disconnected':
                showToast("Connection interrupted. Attempting to reconnect...", "warning", 3000);
                break;
            case 'closed':
                console.log("[WebRTC] Connection closed");
                break;
        }
    };

    pc.ontrack = event => {
    const remoteVideo = document.getElementById("remoteVideo");
    const screenVideo = document.getElementById("remoteScreenVideo");
    const wrapper = document.querySelector('.video-call-wrapper');
    const screenContainer = document.getElementById('screenShareContainer');

    if (event.track.kind === 'video') {
        const settings = event.track.getSettings();
        const label = event.track.label.toLowerCase();
        const streamId = event.streams[0].id;

        // Detection Logic:
        // 1. If it's already identified as our screen stream ID
        // 2. OR it has screen-sharing hardware labels
        // 3. OR we are expecting a share (isRemoteSharing) and DON'T have a screen ID yet
        const isScreen = streamId === remoteScreenStreamId ||
                         settings.displaySurface ||
                         label.includes('screen') ||
                         label.includes('window') ||
                         (isRemoteSharing && !remoteScreenStreamId);

        if (isScreen) {
            console.log("[WebRTC] Placing in Screen Stage. Stream ID:", streamId);

            // Lock this ID as the screen stream
            remoteScreenStreamId = streamId;

            screenContainer.style.display = 'block';
            wrapper.classList.add('sharing-screen');
            screenVideo.srcObject = event.streams[0];
            screenVideo.play().catch(e => console.warn(e));

            event.track.onended = () => {
                console.log("[WebRTC] Screen track ended");
                wrapper.classList.remove('sharing-screen');
                screenContainer.style.display = 'none';
                screenVideo.srcObject = null;
                remoteScreenStreamId = null; // Clear the lock
                isRemoteSharing = false;
                updateShareButtonState();
            };
        } else {
            console.log("[WebRTC] Placing in Peer Camera Box. Stream ID:", streamId);
            const remoteTile = document.getElementById("remoteTile");
            remoteTile.classList.remove("camera-off");
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.muted = false;
	    remoteVideo.play().catch(e => {
                console.warn("[WebRTC] Unmuted play blocked. User interaction required.", e);
                // If blocked, we might have to start muted and show a "click to unmute" toast
                remoteVideo.muted = true;
                showToast("Click anywhere to unmute peer audio", "warning");

                // Add click handler to unmute when autoplay is blocked
                document.body.addEventListener('click', function unmuteHandler() {
                    const remoteAudio = document.getElementById("remoteAudio");
                    const remoteVideo = document.getElementById("remoteVideo");
                    if (remoteAudio) {
                        remoteAudio.muted = false;
                        remoteAudio.play().catch(err => console.warn("[WebRTC] Audio play failed:", err));
                    }
                    if (remoteVideo) {
                        remoteVideo.muted = false;
                        remoteVideo.play().catch(err => console.warn("[WebRTC] Video play failed:", err));
                    }
                    document.body.removeEventListener('click', unmuteHandler);
                }, { once: true });
            });
        }
    } else if (event.track.kind === 'audio') {
        console.log("[WebRTC] Receiving Audio Track");
        const remoteAudio = document.getElementById("remoteAudio");
    
        // Use the hidden audio element instead of the video element
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.muted = false;	
	// Ensure NO OTHER elements are playing this audio
        document.getElementById("remoteVideo").muted = true;
        document.getElementById("remoteScreenVideo").muted = true;
    }
    };

    // Add any existing tracks from localStream to the peer connection
    // This handles the case where user enabled camera/mic before peer joined
    localStream.getTracks().forEach(track => {
        console.log("[WebRTC] Adding existing track to new peer connection:", track.kind);
        pc.addTrack(track, localStream);
    });

    if (isOfferer) {
        // Offer will include tracks once they are added
        await renegotiate(pc);
    }

    return pc;
}

// Function to renegotiate whenever a new track is added
async function renegotiate(pc) {
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send('webrtc_offer', { offer });
    } catch (err) {
        console.error("Error renegotiating:", err);
    }
}

// Add track and renegotiate
async function addTrack(track) {
    if (window.peerConnection) {
        window.peerConnection.addTrack(track, localStream);
        await renegotiate(window.peerConnection);
    }
}

// Enable video
async function enableVideo() {
    if (!videoTrack) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoTrack = stream.getVideoTracks()[0];
            localStream.addTrack(videoTrack);
            updateLocalVideo();
            await addTrack(videoTrack);
            console.log("[WebRTC] Video enabled");
        } catch (err) {
            console.error("[WebRTC] Camera access failed:", err);
            if (err.name === 'NotAllowedError') {
                showToast("Camera permission denied. Please allow camera access in your browser settings.", "error");
            } else if (err.name === 'NotFoundError') {
                showToast("No camera found on this device.", "error");
            } else if (err.name === 'NotReadableError') {
                showToast("Camera is in use by another application.", "error");
            } else {
                showToast("Could not access camera: " + err.message, "error");
            }
            // Reset button state since we failed
            camOn = false;
            camBtn.classList.add('off');
            camBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
        }
    }
}

// Enable audio
async function enableAudio() {
    if (!audioTrack) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: { ideal: true },
                    noiseSuppression: { ideal: true },
                    autoGainControl: { ideal: false }, // Turning this OFF can sometimes stop echoes on mobile
                    latency: 0
                }
            });
            audioTrack = stream.getAudioTracks()[0];
            localStream.addTrack(audioTrack);
            await addTrack(audioTrack);
            console.log("[WebRTC] Audio enabled");
        } catch (err) {
            console.error("[WebRTC] Microphone access failed:", err);
            if (err.name === 'NotAllowedError') {
                showToast("Microphone permission denied. Please allow microphone access in your browser settings.", "error");
            } else if (err.name === 'NotFoundError') {
                showToast("No microphone found on this device.", "error");
            } else if (err.name === 'NotReadableError') {
                showToast("Microphone is in use by another application.", "error");
            } else {
                showToast("Could not access microphone: " + err.message, "error");
            }
            // Reset button state since we failed
            micOn = false;
            micBtn.classList.add('off');
            micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        }
    }
}

// Remove track and renegotiate
async function removeTrack(track) {
    if (window.peerConnection) {
        const sender = window.peerConnection.getSenders().find(s => s.track === track);
        if (sender) {
            window.peerConnection.removeTrack(sender);
            await renegotiate(window.peerConnection);
        }
    }
}

// Disable video
async function disableVideo() {
    if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);
        await removeTrack(videoTrack);
        videoTrack = null;
        updateLocalVideo();
        if (window.peerConnection) ws.send('webrtc_video_off');
        console.log("[WebRTC] Video disabled");
    }
}

// Disable audio
async function disableAudio() {
    if (audioTrack) {
        audioTrack.stop();
        localStream.removeTrack(audioTrack);
        await removeTrack(audioTrack);
        audioTrack = null;
        console.log("[WebRTC] Audio disabled");
    }
}

// Handle an incoming offer and reply with an answer
async function handleOffer(offer) {
    if (!window.peerConnection) {
        await createPeerConnection(false); // false = not the offerer
    }

    try {
        await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await window.peerConnection.createAnswer();
        await window.peerConnection.setLocalDescription(answer);

	ws.send('webrtc_answer', {
            answer: window.peerConnection.localDescription
        });

        console.log("[WebRTC] Answer sent");
    } catch (err) {
        console.error("[WebRTC] Error handling offer:", err);
    }
}

// ***********************
// *   Screen Share      *
// ***********************
function updateShareButtonState() {
    const shareBtn = document.getElementById('shareScreen');
    
    // Disable if no one is there OR if the OTHER person is already sharing
    if (!isPeerConnected || isRemoteSharing) {
        shareBtn.disabled = true;
        shareBtn.style.opacity = "0.5";
        shareBtn.style.cursor = "not-allowed";
        shareBtn.title = isRemoteSharing ? "Someone else is sharing" : "Wait for peer to join";
    } else {
        shareBtn.disabled = false;
        shareBtn.style.opacity = "1";
        shareBtn.style.cursor = "pointer";
        shareBtn.title = "Share Screen";
    }
}

// Run once on load to start disabled
updateShareButtonState();

const shareScreenBtn = document.getElementById('shareScreen');
shareScreenBtn.addEventListener('click', async () => {
    if (shareScreenBtn.disabled) {
        showToast("Cannot share at this time.");
        return;
    }
    if (!screenTrack) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenTrack = stream.getVideoTracks()[0];

	    const screenLabel = document.getElementById('screenLabel');
            screenLabel.textContent = "Your Screen"; // Set for yourself

            // 1. Notify the server/peer immediately via WebSocket
            ws.send('screen_share_started');
            console.log("Start sharing screen...");

            // 2. Add track to WebRTC
	    const screenStream = new MediaStream();
            screenStream.addTrack(screenTrack);
            // We ensure we pass this specific stream to the peer connection
            window.peerConnection.addTrack(screenTrack, screenStream);

            // 3. Update local UI
            document.querySelector('.video-call-wrapper').classList.add('sharing-screen');
            document.getElementById('screenShareContainer').style.display = 'block';
            document.getElementById('remoteScreenVideo').srcObject = screenStream;

            await renegotiate(window.peerConnection);

            screenTrack.onended = () => stopScreenSharing();
        } catch (err) {
            console.error("Error starting screen share:", err);
        }
    } else {
        stopScreenSharing();
    }
});

async function stopScreenSharing() {
    if (screenTrack) {
        // 1. Notify the peer via WebSocket
        ws.send('screen_share_stopped');

        screenTrack.stop();
        const sender = window.peerConnection.getSenders().find(s => s.track === screenTrack);
        if (sender) window.peerConnection.removeTrack(sender);

        screenTrack = null;

	// Restore tiles if they were minimized
        document.getElementById('localTile').classList.remove('minimized');
        document.getElementById('remoteTile').classList.remove('minimized');
        // 2. Reset local UI
        document.querySelector('.video-call-wrapper').classList.remove('sharing-screen');
        document.getElementById('screenShareContainer').style.display = 'none';
        document.getElementById('remoteScreenVideo').srcObject = null;

        await renegotiate(window.peerConnection);
    }
}

// ***********************
// *   Screen Share      *
// ***********************
function toggleMinimize(tileId) {
    const tile = document.getElementById(tileId);
    tile.classList.toggle('minimized');

    // Optional: Show a toast if they minimized it
    if (tile.classList.contains('minimized')) {
        console.log(`[UI] ${tileId} minimized`);
    }
}
</script>
<audio id="remoteAudio" autoplay playsinline></audio>
</body>
</html>
