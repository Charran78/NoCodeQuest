/**
 * vscode-bridge.js
 * Módulo de comunicación entre el WebView y la extensión
 */

const vscode = acquireVsCodeApi();

// Cola de mensajes para garantizar orden
const messageQueue = [];
let isProcessing = false;

function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    const msg = messageQueue.shift();
    try {
        vscode.postMessage(msg);
    } catch (err) {
        console.error('[VSCode Bridge] Error posting message:', err);
    }

    isProcessing = false;
    if (messageQueue.length > 0) {
        setTimeout(processQueue, 0);
    }
}

/**
 * Envía un mensaje a la extensión
 * @param {Object} message - Mensaje a enviar
 */
function postMessage(message) {
    messageQueue.push(message);
    processQueue();
}

/**
 * Envía un mensaje y espera respuesta (RPC simple)
 * @param {Object} message - Mensaje con command
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<Object>}
 */
function postMessageWithResponse(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now() + '-' + Math.random();
        const handler = (event) => {
            const data = event.data;
            if (data.requestId === requestId) {
                window.removeEventListener('message', handler);
                clearTimeout(timer);
                resolve(data);
            }
        };

        const timer = setTimeout(() => {
            window.removeEventListener('message', handler);
            reject(new Error('Timeout waiting for response'));
        }, timeout);

        window.addEventListener('message', handler);
        postMessage({ ...message, requestId });
    });
}

// Exportar módulo
window.VSCodeBridge = {
    postMessage,
    postMessageWithResponse,
    vscode
};

// Compatibilidad hacia atrás
window.postToExtension = postMessage;
