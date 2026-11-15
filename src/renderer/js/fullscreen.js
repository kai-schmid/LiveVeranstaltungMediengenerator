// Optionale Vollbild-Vorschau auf einem zweiten Monitor (Fenster wird im Main-Prozess verwaltet).
const { ipcRenderer } = require('electron');
const storage = require('./storage');

const AUTO_OPTION_LABEL = 'Automatisch (2. Monitor bevorzugt)';
const RENDER_DELAY_AFTER_OPEN_MS = 250;   // Fenster braucht kurz, bis es Bilder empfangen kann

let checkbox = null;
let monitorSelect = null;
let requestRender = () => {};

function isEnabled() {
    return checkbox !== null && checkbox.checked;
}

function persist() {
    storage.set('enableFullscreenPreview', checkbox.checked);
    storage.set('previewMonitor', monitorSelect.value);
}

function fillMonitorSelect(displays) {
    const selected = storage.get('previewMonitor') || 'auto';
    monitorSelect.replaceChildren(new Option(AUTO_OPTION_LABEL, 'auto'));
    displays.forEach(d => {
        monitorSelect.add(new Option(d.label, d.id, false, String(d.id) === String(selected)));
    });
}

function apply() {
    persist();
    ipcRenderer.send('set-fullscreen-preview', { enable: isEnabled(), displayId: monitorSelect.value });
    if (isEnabled()) setTimeout(requestRender, RENDER_DELAY_AFTER_OPEN_MS);
}

function toggle() {
    checkbox.checked = !checkbox.checked;
    apply();
}

// Wird nach jedem Zeichnen aufgerufen
function pushFrame(canvas) {
    if (isEnabled()) {
        ipcRenderer.send('update-preview-image', canvas.toDataURL('image/png'));
    }
}

async function init({ onRender }) {
    checkbox = document.getElementById('enableFullscreenPreview');
    monitorSelect = document.getElementById('previewMonitor');
    requestRender = onRender;

    checkbox.addEventListener('change', apply);
    monitorSelect.addEventListener('change', apply);
    document.getElementById('toggleFullscreenBtn').addEventListener('click', toggle);

    // Monitore an-/abgesteckt -> Liste neu füllen
    ipcRenderer.on('displays-updated', (e, displays) => fillMonitorSelect(displays));

    // Fenster per ESC/Doppelklick geschlossen -> Haken synchronisieren
    ipcRenderer.on('fullscreen-preview-closed', () => {
        checkbox.checked = false;
        persist();
    });

    try {
        fillMonitorSelect(await ipcRenderer.invoke('get-displays'));
    } catch (e) {
        // ohne Monitorliste bleibt "Automatisch" verfügbar
    }

    // Zuletzt aktive Vollbild-Vorschau wiederherstellen
    checkbox.checked = storage.get('enableFullscreenPreview') === 'true';
    if (isEnabled()) apply();
}

module.exports = { init, pushFrame };
