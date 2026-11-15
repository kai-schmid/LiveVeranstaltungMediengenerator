const path = require('path');
const { BrowserWindow } = require('electron');
const { findTargetDisplay } = require('./displays');

// Optionales randloses Vollbild-Fenster, das das Canvas-Bild live anzeigt
let win = null;
let closedCallback = () => {};

function isOpen() {
    return win !== null && !win.isDestroyed();
}

function open(displayId) {
    const { bounds } = findTargetDisplay(displayId);

    // Bereits offen: nur auf den neuen Monitor verschieben
    if (isOpen()) {
        win.setFullScreen(false);
        win.setBounds(bounds);
        win.setFullScreen(true);
        win.focus();
        return;
    }

    win = new BrowserWindow({
        ...bounds,
        fullscreen: true,
        frame: false,
        autoHideMenuBar: true,
        backgroundColor: '#000000',
        title: 'Liedertafel - Vollbild-Vorschau',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile(path.join(__dirname, '..', 'preview', 'preview.html'));

    win.on('closed', () => {
        win = null;
        closedCallback();
    });
}

function close() {
    if (isOpen()) {
        win.close();
    }
}

function sendFrame(dataUrl) {
    if (isOpen()) {
        win.webContents.send('frame-update', dataUrl);
    }
}

function onClosed(callback) {
    closedCallback = callback;
}

module.exports = { open, close, sendFrame, onClosed };
