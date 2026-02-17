// API client for backend communication

window.API = {
    baseURL: window.API_BASE || '/api',
    
    /**
     * Make HTTP request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        };
        
        // Merge options
        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, requestOptions);
            const contentType = response.headers.get('content-type');
            
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            if (!response.ok) {
                throw new APIError(data.error || `HTTP ${response.status}: ${response.statusText}`, response.status, data);
            }
            
            return data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            console.error('API Request failed:', error);
            throw new APIError('Network error or server is unavailable', 0, null);
        }
    },
    
    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    /**
     * POST request
     */
    async post(endpoint, data = null) {
        const options = {
            method: 'POST'
        };
        
        if (data) {
            if (data instanceof FormData) {
                options.body = data;
                // Don't set Content-Type header for FormData
                delete options.headers;
                options.headers = {
                    'X-Requested-With': 'XMLHttpRequest'
                };
            } else {
                options.body = JSON.stringify(data);
            }
        }
        
        return this.request(endpoint, options);
    },
    
    /**
     * PUT request
     */
    async put(endpoint, data = null) {
        const options = {
            method: 'PUT'
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        return this.request(endpoint, options);
    },
    
    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    // Project API methods
    projects: {
        /**
         * Get all projects for current user
         */
        async list() {
            return API.get('/projects/list');
        },
        
        /**
         * Get specific project details
         */
        async get(projectId) {
            return API.get(`/projects/get/${projectId}`);
        },
        
        /**
         * Create new project
         */
        async create(projectData) {
            return API.post('/projects/create', {
                ...projectData,
                csrf_token: window.CSRF_TOKEN
            });
        },
        
        /**
         * Update project
         */
        async update(projectId, projectData) {
            return API.put(`/projects/update/${projectId}`, {
                ...projectData,
                csrf_token: window.CSRF_TOKEN
            });
        },
        
        /**
         * Delete project
         */
        async delete(projectId) {
            return API.delete(`/projects/delete/${projectId}`);
        },
        
        /**
         * Share project with user
         */
        async share(projectId, username, role) {
            return API.post(`/projects/share/${projectId}`, {
                username,
                role,
                csrf_token: window.CSRF_TOKEN
            });
        }
    },
    
    // File API methods
    files: {
        /**
         * Get file content
         */
        async get(fileId) {
            return API.get(`/files/get/${fileId}`);
        },
        
        /**
         * Create new file
         */
        async create(fileData) {
            return API.post('/files/create', {
                ...fileData,
                csrf_token: window.CSRF_TOKEN
            });
        },
        
        /**
         * Save file content
         */
        async save(fileId, content, createVersion = false, commitMessage = '') {
            return API.put(`/files/save/${fileId}`, {
                content,
                create_version: createVersion,
                commit_message: commitMessage,
                csrf_token: window.CSRF_TOKEN
            });
        },
        
        /**
         * Rename file
         */
        async rename(fileId, filename, filePath = null) {
            return API.put(`/files/rename/${fileId}`, {
                filename,
                file_path: filePath || filename,
                csrf_token: window.CSRF_TOKEN
            });
        },
        
        /**
         * Delete file
         */
        async delete(fileId) {
            return API.delete(`/files/delete/${fileId}`);
        },
        
        /**
         * Get file version history
         */
        async getVersions(fileId) {
            return API.get(`/files/versions/${fileId}`);
        }
    }
};

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.response = response;
    }
    
    /**
     * Check if error is due to authentication issues
     */
    isAuthError() {
        return this.status === 401 || this.status === 403;
    }
    
    /**
     * Check if error is due to network issues
     */
    isNetworkError() {
        return this.status === 0;
    }
    
    /**
     * Check if error is client-side (4xx)
     */
    isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    
    /**
     * Check if error is server-side (5xx)
     */
    isServerError() {
        return this.status >= 500;
    }
}

// Global error handler for API errors
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof APIError) {
        console.error('Unhandled API Error:', event.reason);
        
        if (event.reason.isAuthError()) {
            Utils.showToast('Authentication required. Please login again.', 'error');
            // Redirect to login page after delay
            setTimeout(() => {
                window.location.href = 'index.php';
            }, 2000);
        } else if (event.reason.isNetworkError()) {
            Utils.showToast('Network error. Please check your connection.', 'error');
        } else {
            Utils.showToast(event.reason.message || 'An error occurred', 'error');
        }
        
        event.preventDefault(); // Prevent default unhandled rejection behavior
    }
});

// Make APIError globally available
window.APIError = APIError;