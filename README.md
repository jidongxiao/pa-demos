# PA Demos

This project is a collection of interactive demos for [PresentationAssistants.com](https://presentationassistants.com). It includes a ghost autocomplete editor, a fake typing demo, a physics-based polling widget, a collaborative code editor, and a video calling feature.

---

## What You Need to Install

### 1. PHP (version 7.4 or higher)

PHP is required to serve the `.php` pages, which handle session-based user identity for the collaborative code editor and video call features.

**Check if you already have it:**
```bash
php -v
```

**Install if you don't:**
- **Windows:** Download from [https://windows.php.net/download](https://windows.php.net/download). Choose the "Thread Safe" ZIP, extract it, and add the folder to your system PATH.
- **Mac:** PHP comes pre-installed on older macOS versions. On newer ones, install it via [Homebrew](https://brew.sh): `brew install php`
- **Linux (Ubuntu/Debian):** `sudo apt install php`

---

### 2. Node.js (version 16 or higher)

Node.js is required to run the WebSocket server, which forwards messages between users in real time for both the video call and collaborative code editor features.

**Check if you already have it:**
```bash
node -v
```

**Install if you don't:**
- Download the LTS installer from [https://nodejs.org](https://nodejs.org) and run it. npm (the Node package manager) is included automatically.

---

### 3. Node.js Packages

The WebSocket server depends on three third-party packages. To install them, run the following command from the project root directory:

```bash
npm install ws dotenv uuid
```

---

## Running the Project

Two separate servers, the PHP web server and the Node.js WebSocket server, need to be running at the same time. Open two terminal windows.

**Terminal 1:  PHP web server** (run from the project root):
```bash
php -S localhost:8000
```

**Terminal 2: WebSocket server** (run from the project root):
```bash
node ws-server/websocket-server.js
```

Once both are running, open your browser and go to:
```
http://localhost:8000
```

---

## Demo Pages

The three standalone demos (ghost autocomplete, fake typing, and the physics poll) are plain HTML files that can be opened directly in a browser without running any server. The collaborative code editor (`code/index.php`) and video call (`call/index.php`) both require PHP and the WebSocket server to be running. The main index page (`index.html`) links to all of the above.

The three HTML-only demos (`autocomplete.html`, `typing.html`, `jars-demo.html`) can be opened directly in a browser without running any server at all.

---

## Testing the Video Call

1. Go to `http://localhost:8000/call/index.php`
2. Click **"Create Call Room"** to be redirected to a room URL like `http://localhost:8000/call/room.php?code=XXXXXX`
3. To simulate a second participant, open the same URL in a different browser (e.g. Chrome + Firefox) or a private/incognito window. This is necessary because both tabs in the same browser share the same session cookie and will appear as the same user.