// src/textareaAdapter.js
// Responsibilities:
// - Listen to textarea input events
// - Call ghostEngine.getSuggestion
// - Render ghost text on overlay
// - Handle Tab key to accept ghost completions

(function (global) {
    /**
     * Attaches ghost engine to textarea + overlay.
     *
     * @param {Object} config
     * @param {string} config.textareaId - ID of the <textarea> element
     * @param {string} config.overlayId - ID of the overlay <div> element
     * @param {{ getSuggestion(lineText: string): (null | { fullSentence: string, ghostText: string, matchedPrefix: string }) }} config.engine
     */
    function attachTextareaGhost(config) {
      const { textareaId, overlayId, engine } = config || {};
      if (!textareaId || !overlayId || !engine) {
        console.error(
          "[GhostAutocomplete] attachTextareaGhost: textareaId, overlayId, engine are required."
        );
        return;
      }
  
      const textarea = document.getElementById(textareaId);
      const overlay = document.getElementById(overlayId);
  
      if (!textarea || !overlay) {
        console.error(
          "[GhostAutocomplete] attachTextareaGhost: Cannot find textarea or overlay element."
        );
        return;
      }
  
      // Current available ghost text (for Tab key insertion)
      let currentGhostText = "";
      // Current matched full sentence (for Shift+Tab to fill entire sentence)
      let currentFullSentence = "";
      // Current matched prefix (for calculating remaining text)
      let currentMatchedPrefix = "";
      // Ghost text split into words (for word-by-word insertion)
      let ghostWords = [];

      // --- Event bindings ---

      textarea.addEventListener("input", () => {
        updateOverlay(textarea, overlay, engine);
      });

      textarea.addEventListener("scroll", () => {
        // Keep scroll position synchronized
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
      });

      // Synchronize overlay height with textarea height
      function syncOverlayHeight() {
        overlay.style.height = textarea.offsetHeight + "px";
      }

      // Sync height on initialization
      syncOverlayHeight();

      // Listen to textarea size changes (including manual resizing)
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
          syncOverlayHeight();
        });
        resizeObserver.observe(textarea);
      } else {
        // Fallback: listen to resize event (but textarea resize event may not always fire)
        textarea.addEventListener("resize", syncOverlayHeight);
      }

      textarea.addEventListener("keydown", (event) => {
        // Tab: accept next word
        // Shift+Tab: accept entire remaining suggestion
        if (event.key === "Tab" && currentGhostText && caretAtEnd(textarea)) {
          event.preventDefault();
          
          if (event.shiftKey) {
            // Shift+Tab: accept entire remaining suggestion
            // If we have full sentence and matched prefix, calculate remaining part; otherwise use current ghostText
            if (currentFullSentence && currentMatchedPrefix) {
              // Calculate remaining text from after matched prefix
              const remainingText = currentFullSentence.slice(currentMatchedPrefix.length);
              insertGhostAtEnd(textarea, remainingText);
            } else if (currentFullSentence) {
              // Fallback: if no matched prefix, use full line calculation
              const text = textarea.value;
              const lines = text.split("\n");
              const currentLine = lines[lines.length - 1] || "";
              const remainingText = currentFullSentence.slice(currentLine.length);
              insertGhostAtEnd(textarea, remainingText);
            } else {
              insertGhostAtEnd(textarea, currentGhostText);
            }
          } else {
            // Tab: accept next word
            insertNextWord(textarea);
          }
          
          updateOverlay(textarea, overlay, engine);
        }
      });
  
      // Initialize
      overlay.textContent = "";
      updateOverlay(textarea, overlay, engine);
  
      // --- Internal functions ---
  
      function updateOverlay(textarea, overlay, engine) {
        const text = textarea.value;
        const lines = text.split("\n");
        const lastLineIndex = lines.length - 1;
        const currentLine = lines[lastLineIndex] || "";
  
        const suggestion = engine.getSuggestion(currentLine);

        if (!suggestion) {
          currentGhostText = "";
          currentFullSentence = "";
          currentMatchedPrefix = "";
          overlay.textContent = text; // Already entered text, transparent display
          return;
        }

        currentGhostText = suggestion.ghostText || "";
        currentFullSentence = suggestion.fullSentence || "";
        currentMatchedPrefix = suggestion.matchedPrefix || "";
        
        if (!currentGhostText) {
          ghostWords = [];
          overlay.textContent = text;
          return;
        }

        // Split ghost text into words (preserve space information)
        ghostWords = splitGhostIntoWords(currentGhostText);
  
        // Get matched prefix position (for correct ghost text display)
        const matchedPrefix = suggestion.matchedPrefix || "";
        const matchedPrefixLength = matchedPrefix.length;
        
        // Build overlay content: display ghost text after matched prefix
        const escapedLines = lines.map((line, index) => {
          if (index === lastLineIndex) {
            // Current line: insert ghost text after matched prefix
            const beforeMatch = line.slice(0, matchedPrefixLength);
            const afterMatch = line.slice(matchedPrefixLength);
            
            // If matched prefix is at line end, directly add ghost text
            if (matchedPrefixLength >= line.length) {
              return escapeHtml(line) +
                '<span class="ghost">' +
                escapeHtml(currentGhostText) +
                "</span>";
            } else {
              // Matched prefix is in the middle, show ghost after matched part
              return escapeHtml(beforeMatch) +
                escapeHtml(afterMatch) +
                '<span class="ghost">' +
                escapeHtml(currentGhostText) +
                "</span>";
            }
          }
          return escapeHtml(line);
        });
  
        overlay.innerHTML = escapedLines.join("\n");
      }
  
      function caretAtEnd(textarea) {
        // Simple check: allow Tab to accept ghost when cursor is at text end
        return (
          textarea.selectionStart === textarea.value.length &&
          textarea.selectionEnd === textarea.value.length
        );
      }

      function insertGhostAtEnd(textarea, ghostText) {
        const oldVal = textarea.value;
        const newVal = oldVal + ghostText;
        textarea.value = newVal;
        // Move cursor to end
        textarea.selectionStart = textarea.selectionEnd = newVal.length;
        // Reset word list since all words have been inserted
        ghostWords = [];
      }

      /**
       * Insert next word (called by Tab key)
       */
      function insertNextWord(textarea) {
        if (ghostWords.length === 0) return;

        // Take first word (including leading spaces)
        const nextWord = ghostWords.shift();
        const oldVal = textarea.value;
        const newVal = oldVal + nextWord;
        textarea.value = newVal;
        // Move cursor to end
        textarea.selectionStart = textarea.selectionEnd = newVal.length;
      }

      /**
       * Split ghost text into word array, each element includes leading spaces (if any)
       * Example: " run -it" -> [" run", " -it"]
       */
      function splitGhostIntoWords(ghostText) {
        if (!ghostText) return [];
        
        // Use regex to match: optional spaces + non-space character sequence
        // This way each match includes leading spaces (if any)
        const words = [];
        const regex = /(\s*\S+)/g;
        let match;
        
        while ((match = regex.exec(ghostText)) !== null) {
          words.push(match[1]);
        }
        
        return words;
      }

      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }
    }
  
    // Expose to global namespace
    global.GhostAutocomplete = global.GhostAutocomplete || {};
    global.GhostAutocomplete.attachTextareaGhost = attachTextareaGhost;
  })(window);
  