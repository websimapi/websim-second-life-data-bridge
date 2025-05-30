class SecondLifeBridge {
    constructor() {
        this.httpInURL = null;
        this.messagesSent = 0;
        this.messagesReceived = 0;
        this.startTime = Date.now();
        this.isConnected = false;
        
        this.initializeElements();
        this.bindEvents();
        this.startUptime();
        this.checkForSLURL();
        
        this.log('System initialized. Waiting for Second Life connection...', 'system');
    }
    
    initializeElements() {
        this.elements = {
            messageType: document.getElementById('messageType'),
            messageContent: document.getElementById('messageContent'),
            sendBtn: document.getElementById('sendBtn'),
            clearBtn: document.getElementById('clearBtn'),
            clearLogBtn: document.getElementById('clearLogBtn'),
            messageLog: document.getElementById('messageLog'),
            connectionStatus: document.getElementById('connectionStatus'),
            messagesSent: document.getElementById('messagesSent'),
            messagesReceived: document.getElementById('messagesReceived'),
            uptime: document.getElementById('uptime')
        };
    }
    
    bindEvents() {
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.clearBtn.addEventListener('click', () => this.clearInput());
        this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Copy LSL script button
        document.getElementById('copyLslBtn').addEventListener('click', () => this.copyLslScript());
        
        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                const content = e.target.dataset.content;
                this.elements.messageType.value = type;
                this.elements.messageContent.value = content;
                this.sendMessage();
            });
        });
        
        // Enter key to send
        this.elements.messageContent.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }
    
    checkForSLURL() {
        // In Second Life, the HTTP-in URL might be passed as a query parameter
        // or we might need to extract it from the current page URL
        const urlParams = new URLSearchParams(window.location.search);
        const slURL = urlParams.get('slurl') || urlParams.get('url');
        
        if (slURL) {
            this.httpInURL = decodeURIComponent(slURL);
            this.setConnected(true);
            this.log(`Connected to Second Life: ${this.httpInURL}`, 'system');
        } else {
            // Try to detect if we're running in Second Life media
            this.detectSecondLifeEnvironment();
        }
    }
    
    detectSecondLifeEnvironment() {
        // Check for Second Life specific properties
        if (window.location.protocol === 'http:' && window.location.hostname) {
            // We might be in SL media - try to get URL from parent or referrer
            try {
                if (document.referrer && document.referrer.includes('cap.secondlife.com')) {
                    this.httpInURL = document.referrer;
                    this.setConnected(true);
                    this.log('Detected Second Life environment', 'system');
                }
            } catch (e) {
                console.log('Could not detect SL environment:', e);
            }
        }
        
        // No demo mode - only real SL connections
        if (!this.isConnected) {
            this.log('Waiting for Second Life connection. Use the LSL script in your HUD.', 'system');
        }
    }
    
    setConnected(connected) {
        this.isConnected = connected;
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected';
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Disconnected';
        }
    }
    
    async sendMessage() {
        const type = this.elements.messageType.value;
        const content = this.elements.messageContent.value.trim();
        
        if (!content) {
            this.log('Error: Message content cannot be empty', 'error');
            return;
        }
        
        if (!this.isConnected || !this.httpInURL) {
            this.log('Error: Not connected to Second Life. Please use the LSL HUD script.', 'error');
            return;
        }
        
        try {
            const payload = {
                type: type,
                content: content,
                timestamp: new Date().toISOString(),
                sender: 'web-bridge'
            };
            
            // Send to the real SL HTTP-in URL
            const response = await fetch(this.httpInURL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                this.messagesSent++;
                this.updateStats();
                this.log(`Sent (${type}): ${content}`, 'sent');
                
                // Try to parse response
                try {
                    const responseText = await response.text();
                    if (responseText) {
                        this.receiveMessage({
                            type: 'response',
                            content: responseText,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    // Response parsing failed, but send was successful
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            this.log(`Error sending message: ${error.message}`, 'error');
        }
    }
    
    receiveMessage(data) {
        this.messagesReceived++;
        this.updateStats();
        
        const message = typeof data === 'string' ? data : data.content || JSON.stringify(data);
        this.log(`Received: ${message}`, 'received');
    }
    
    log(message, type = 'info') {
        const logItem = document.createElement('div');
        logItem.className = `log-item ${type}`;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'message';
        messageSpan.textContent = message;
        
        logItem.appendChild(timestamp);
        logItem.appendChild(messageSpan);
        
        this.elements.messageLog.appendChild(logItem);
        this.elements.messageLog.scrollTop = this.elements.messageLog.scrollHeight;
        
        // Keep only last 100 messages
        const items = this.elements.messageLog.children;
        if (items.length > 100) {
            items[0].remove();
        }
    }
    
    clearInput() {
        this.elements.messageContent.value = '';
        this.elements.messageContent.focus();
    }
    
    clearLog() {
        this.elements.messageLog.innerHTML = '';
        this.log('Log cleared', 'system');
    }
    
    updateStats() {
        this.elements.messagesSent.textContent = this.messagesSent;
        this.elements.messagesReceived.textContent = this.messagesReceived;
    }
    
    startUptime() {
        setInterval(() => {
            const uptime = Date.now() - this.startTime;
            const hours = Math.floor(uptime / 3600000);
            const minutes = Math.floor((uptime % 3600000) / 60000);
            const seconds = Math.floor((uptime % 60000) / 1000);
            
            this.elements.uptime.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    copyLslScript() {
        const lslCode = document.getElementById('lslScript').textContent;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(lslCode).then(() => {
                this.log('LSL script copied to clipboard!', 'system');
            }).catch(() => {
                this.fallbackCopyLslScript(lslCode);
            });
        } else {
            this.fallbackCopyLslScript(lslCode);
        }
    }
    
    fallbackCopyLslScript(text) {
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
            this.log('LSL script copied to clipboard!', 'system');
        } catch (err) {
            this.log('Could not copy script. Please select and copy manually.', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bridge = new SecondLifeBridge();
    
    // Expose functions for potential LSL script communication
    window.receiveSLMessage = (data) => window.bridge.receiveMessage(data);
    window.getSLBridgeStatus = () => ({
        connected: window.bridge.isConnected,
        messagesSent: window.bridge.messagesSent,
        messagesReceived: window.bridge.messagesReceived
    });
});