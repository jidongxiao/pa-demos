// src/config.js
// Configuration file: predefined sentences and engine default parameters

// Note that we current have a constraint, the first word of each sentence should be different;
// If multiple sentences share the first word, we will just pick the first sentence.
(function (global) {
    const SENTENCES = [
      "This is a long sentence for testing autocomplete.",
      // "This is another example that uses some common words.",
      "When cookies are not designed properly, security issues appear.",
      "Always sanitize user input to prevent common security problems.",
      "The quick brown fox jumps over the lazy dog every morning.",
      // "The lazy dog sleeps while the fox runs across the yard.",
      "Performance optimization requires careful measurement before making changes.",
      "Reading documentation carefully helps prevent common mistakes.",
      "Machine learning models require large amounts of clean data to perform well.",
      "Collaboration and communication are key to completing common projects successfully.",
      // "This is the third sentence that starts with the same prefix.",
      // "The quick brown fox demonstrates how overlapping prefixes work in practice.",
      // "When cookies are stored insecurely, attackers can exploit session vulnerabilities.",
      // "Always sanitize user input because injection attacks are common security problems.",
      // "Performance optimization requires understanding the system architecture first.",
      // "Reading documentation carefully is essential for understanding complex APIs.",
      // "Machine learning models need validation datasets to ensure generalization.",
      // "Collaboration and communication skills improve when teams use proper tools.",
      "Testing edge cases helps identify potential bugs before deployment.",
      "Code reviews and pair programming enhance code quality significantly.",
      // "Performance testing requires careful planning and execution.",
    ];
  
      const ENGINE_OPTIONS = {
        caseInsensitive: true, // Case-insensitive matching
        mode: "next-word", // "full-line" | "next-word" | "single-word"
        // full-line: Display entire remaining sentence, Tab=one word, Shift+Tab=entire sentence
        // next-word: Display only next word (requires complete word input, word-boundary matching)
        //            Example: "Performance " shows "optimization", "Perfor" shows nothing
        // single-word: Display only next word (supports partial word matching, character-based prefix)
        //              Example: "Perfor" shows "mance" or next word
      };
  
    global.GhostAutocomplete = global.GhostAutocomplete || {};
    global.GhostAutocomplete.SENTENCES = SENTENCES;
    global.GhostAutocomplete.ENGINE_OPTIONS = ENGINE_OPTIONS;
  })(window);
  
