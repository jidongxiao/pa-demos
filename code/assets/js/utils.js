// Utility functions for the application

/**
 * Utility object with common helper functions
 */
window.Utils = {
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Format date for display
     */
    formatDate(date) {
        const now = new Date();
        const inputDate = new Date(date);
        const diffTime = Math.abs(now - inputDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return inputDate.toLocaleDateString();
        }
    },

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
     * Get file icon based on extension
     */
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            js: 'fab fa-js-square',
            html: 'fab fa-html5',
            css: 'fab fa-css3-alt',
            php: 'fab fa-php',
            py: 'fab fa-python',
            java: 'fab fa-java',
            cpp: 'fas fa-code',
            c: 'fas fa-code',
            json: 'fas fa-file-code',
            xml: 'fas fa-file-code',
            md: 'fab fa-markdown',
            txt: 'fas fa-file-alt',
            default: 'fas fa-file'
        };
        return icons[ext] || icons.default;
    },

    /**
     * Get language color for display
     */
    getLanguageColor(language) {
        const colors = {
            javascript: '#f7df1e',
            html: '#e34f26',
            css: '#1572b6',
            php: '#777bb4',
            python: '#3776ab',
            java: '#007396',
            cpp: '#00599c',
            c: '#a8b9cc',
            json: '#000000',
            markdown: '#083fa1',
            default: '#6b7280'
        };
        return colors[language] || colors.default;
    },

    /**
     * Generate a random color for user avatars
     */
    generateUserColor(username) {
        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308',
            '#84cc16', '#22c55e', '#10b981', '#14b8a6',
            '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
            '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
        ];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    /**
     * Debounce function to limit rate of function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function to limit rate of function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Generate UUID v4
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add styles if not already added
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    padding: var(--space-md);
                    box-shadow: var(--shadow-lg);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    max-width: 400px;
                    animation: slideInRight 0.3s ease-out;
                }
                .toast-info { border-left: 4px solid var(--accent-primary); }
                .toast-success { border-left: 4px solid var(--success); }
                .toast-warning { border-left: 4px solid var(--warning); }
                .toast-error { border-left: 4px solid var(--error); }
                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    flex: 1;
                }
                .toast-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: var(--space-xs);
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        // Add toast to DOM
        document.body.appendChild(toast);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
    },

    /**
     * Get icon for toast type
     */
    getToastIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        return icons[type] || icons.info;
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard', 'success');
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    },

    /**
     * Local storage helpers
     */
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (err) {
                console.error('Failed to save to localStorage:', err);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (err) {
                console.error('Failed to read from localStorage:', err);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (err) {
                console.error('Failed to remove from localStorage:', err);
                return false;
            }
        }
    },

    /**
     * Event helpers
     */
    on(element, event, callback) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.addEventListener(event, callback);
        }
    },

    off(element, event, callback) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.removeEventListener(event, callback);
        }
    },

    /**
     * DOM ready helper
     */
    ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    },

    /**
     * Validate file name
     */
    validateFileName(filename) {
        if (!filename || filename.trim().length === 0) {
            return { valid: false, error: 'Filename cannot be empty' };
        }
        
        if (filename.length > 255) {
            return { valid: false, error: 'Filename is too long' };
        }
        
        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(filename)) {
            return { valid: false, error: 'Filename contains invalid characters' };
        }
        
        // Check for reserved names
        const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (reserved.includes(filename.toUpperCase())) {
            return { valid: false, error: 'Filename is reserved' };
        }
        
        return { valid: true };
    },

    /**
     * Get CodeMirror language mode from file extension
     */
    getLanguageFromExtension(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const extensionMap = {
            'js': 'javascript',
            'py': 'text/x-python',
            'c': 'text/x-csrc',
            'cpp': 'text/x-c++src',
            'cxx': 'text/x-c++src',
            'cc': 'text/x-c++src',
            'java': 'text/x-java',
            'php': 'text/x-php',
            'html': 'htmlmixed',
            'htm': 'htmlmixed',
            'css': 'css',
            'json': 'javascript',
            'xml': 'xml',
            'md': 'markdown',
            'txt': 'text'
        };
        return extensionMap[ext] || 'text';
    }
};

// Global functions for inline event handlers
window.showToast = (message, type, duration) => Utils.showToast(message, type, duration);
