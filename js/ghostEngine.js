// src/ghostEngine.js
// Core logic module: finds completion suggestions from predefined sentences.
// DOM-independent, can be reused in textarea, CodeMirror, or other frontend environments.

(function (global) {
    /**
     * Creates a ghost autocomplete engine.
     *
     * @param {Object} options
     * @param {string[]} options.sentences - Array of predefined sentences
     * @param {boolean} [options.caseInsensitive=true] - Case-insensitive matching
     * @param {"full-line"|"next-word"|"single-word"} [options.mode="full-line"] - Display mode
     *
     * @returns {{ getSuggestion(lineText: string): (null | { fullSentence: string, ghostText: string, matchedPrefix: string }) }}
     */
    function createGhostEngine(options) {
      const {
        sentences = [],
        caseInsensitive = true,
        mode = "full-line",
      } = options || {};
  
      /**
       * Provides completion suggestions for a line of text.
       * Supports matching at any position in the line, not just at the beginning.
       *
       * @param {string} lineText - Current line content
       * @returns {null | { fullSentence: string, ghostText: string, matchedPrefix: string }}
       */
      function getSuggestion(lineText) {
        if (!lineText) return null;
  
        const processedLine = caseInsensitive
          ? lineText.toLowerCase()
          : lineText;
        if (!processedLine.trim()) return null;
  
        // Matching strategy: find matching sentences, supports matching at any position
        // 1. First try full-line match (backward compatible, prioritized)
        // 2. If no full-line match, try matching from line end (supports other content in line)
        let matchedSentence = null;
        let matchedPrefix = "";
        let matchedPrefixLength = 0;

        for (const s of sentences) {
          const candidate = caseInsensitive ? s.toLowerCase() : s;
          
          // Case 1: Full line is a prefix of the sentence (original behavior, prioritized)
          if (candidate.startsWith(processedLine)) {
            matchedSentence = s;
            matchedPrefix = lineText;
            matchedPrefixLength = lineText.length;
            break;
          }
        }

        // Case 2: If no full-line match, try matching from line end (find longest match from end)
        // Requirement: Match must start at word boundary (space, punctuation, line start)
        if (!matchedSentence) {
          // Helper function: check if position is at word boundary
          function isWordBoundary(pos, text) {
            // Line start is a word boundary
            if (pos === 0) return true;
            // Check if previous character is a word boundary character (space, punctuation, etc.)
            const prevChar = text[pos - 1];
            return /\s|[.,;:!?\-\(\)\[\]{}"'`]/.test(prevChar);
          }

          for (const s of sentences) {
            const candidate = caseInsensitive ? s.toLowerCase() : s;
            
            // Start from line end, try to find longest matching suffix
            for (let i = processedLine.length; i >= 0; i--) {
              // Only allow matching at word boundaries (unless it's a full-line match)
              if (i > 0 && !isWordBoundary(i, processedLine)) {
                continue;
              }
              
              const suffix = processedLine.slice(i);
              // Skip empty strings (but allow matching from line end)
              if (i < processedLine.length && !suffix.trim()) continue;
              
              if (candidate.startsWith(suffix) && suffix.length > matchedPrefixLength) {
                matchedSentence = s;
                matchedPrefix = lineText.slice(i);
                matchedPrefixLength = suffix.length;
                // Continue checking other sentences to ensure longest match
              }
            }
          }
        }

        if (!matchedSentence) {
          return null;
        }

        // Calculate actual matched text (preserve original case)
        const actualMatchedText = matchedPrefix;
        const remainingInSentence = matchedSentence.slice(actualMatchedText.length);

        if (mode === "next-word") {
          return buildNextWordSuggestion(actualMatchedText, matchedSentence, caseInsensitive, remainingInSentence);
        }

        if (mode === "single-word") {
          return buildSingleWordSuggestion(actualMatchedText, matchedSentence, caseInsensitive, remainingInSentence);
        }

        // Default: full-line mode, complete remaining sentence content
        if (!remainingInSentence) return null;

        return {
          fullSentence: matchedSentence,
          ghostText: remainingInSentence,
          matchedPrefix: actualMatchedText,
        };
      }
  
      /**
       * "next-word" mode:
       * When the current line matches the first n words of a sentence exactly, returns the (n+1)th word.
       * Requirement: Must complete each word (word-boundary matching).
       */
      function buildNextWordSuggestion(matchedText, sentence, caseInsensitive, remainingText) {
        const matchedWords = matchedText.trim().split(/\s+/);
        const sentenceWords = sentence.trim().split(/\s+/);

        const n = matchedWords.length;
        if (n === 0) return null;

        // Compare words: supports case-insensitive matching
        for (let i = 0; i < n; i++) {
          const matchedWord = caseInsensitive 
            ? (matchedWords[i] || "").toLowerCase() 
            : (matchedWords[i] || "");
          const sentenceWord = caseInsensitive 
            ? (sentenceWords[i] || "").toLowerCase() 
            : (sentenceWords[i] || "");
          
          if (matchedWord !== sentenceWord) {
            return null;
          }
        }

        const nextWord = sentenceWords[n];
        if (!nextWord) return null;

        // Extract first word from remainingText
        const match = remainingText.match(/^(\s*\S+)/);
        if (!match) return null;

        const ghostText = match[1];
        return {
          fullSentence: sentence,
          ghostText,
          matchedPrefix: matchedText,
        };
      }

      /**
       * "single-word" mode:
       * Based on prefix matching, returns only the next word as ghost text.
       * Supports case-insensitive matching.
       */
      function buildSingleWordSuggestion(matchedText, sentence, caseInsensitive, remainingText) {
        if (!remainingText || !remainingText.trim()) return null;

        // Extract next word (including leading spaces)
        const match = remainingText.match(/^(\s*\S+)/);
        if (!match) return null;

        const nextWord = match[1];
        return {
          fullSentence: sentence,
          ghostText: nextWord,
          matchedPrefix: matchedText,
        };
      }
  
      return {
        getSuggestion,
      };
    }
  
    // Expose to global namespace
    global.GhostAutocomplete = global.GhostAutocomplete || {};
    global.GhostAutocomplete.createGhostEngine = createGhostEngine;
  })(window);
  