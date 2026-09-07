/**
 * Dune Admin Manager - WebSocket Client
 * 
 * Live console output streamed from server.
 */

let ws = null;
let wsReconnectTimer = null;

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/console`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('[WS] Connected');
            updateConnectionStatus(true);
            if (wsReconnectTimer) {
                clearTimeout(wsReconnectTimer);
                wsReconnectTimer = null;
            }
        };

        ws.onmessage = (event) => {
            const consoleOutput = document.getElementById('consoleOutput');
            if (consoleOutput) {
                consoleOutput.textContent += event.data + '\n';
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
        };

        ws.onclose = () => {
            console.log('[WS] Disconnected');
            updateConnectionStatus(false);
            wsReconnectTimer = setTimeout(connectWebSocket, 30000);
        };

        ws.onerror = () => {
            // silently retry - server doesn't have WebSocket endpoint yet
        };
    } catch (e) {
        console.error('[WS] Connection failed:', e);
        wsReconnectTimer = setTimeout(connectWebSocket, 5000);
    }
}

function updateConnectionStatus(connected) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    if (dot && text) {
        dot.className = 'status-dot ' + (connected ? 'online' : 'offline');
        text.textContent = connected ? 'Connected' : 'Disconnected';
    }
}

function sendWSCommand(command) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(command));
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
});
