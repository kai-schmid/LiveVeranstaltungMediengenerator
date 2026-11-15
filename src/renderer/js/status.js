// Statuszeile unter den Aktions-Buttons

/** @param type 'success' | 'info' | 'error' */
function showStatus(type, text) {
    const status = document.getElementById('status');
    status.className = type;
    status.textContent = text;
}

module.exports = { showStatus };
