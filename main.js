const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { Atem } = require('atem-connection');

let mainWindow = null;
let previewWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 820,
        title: 'ATEM Constellation HD - Liedertafel Generator',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        if (previewWindow && !previewWindow.isDestroyed()) {
            previewWindow.close();
        }
        mainWindow = null;
    });
}

// Liest alle angeschlossenen Monitore für das Auswahlmenü aus
function getDisplayList() {
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    return displays.map((d, index) => ({
        id: String(d.id),
        label: `Monitor ${index + 1}: ${d.label || 'Anzeige'} (${d.bounds.width}x${d.bounds.height})${d.id === primaryId ? ' [Hauptbildschirm]' : ''}`
    }));
}

// Öffnet, verschiebt oder schließt das optionale Fullscreen-Vorschaufenster
function toggleFullscreenPreview(enable, displayId) {
    if (enable) {
        const displays = screen.getAllDisplays();
        const primaryDisplay = screen.getPrimaryDisplay();

        // Gewählten Monitor suchen (Fallback: zweiter Monitor, sonst Hauptbildschirm)
        let targetDisplay = displays.find(d => String(d.id) === String(displayId));
        if (!targetDisplay) {
            targetDisplay = displays.find(d => d.id !== primaryDisplay.id) || primaryDisplay;
        }

        // Falls das Fenster schon offen ist, direkt auf den neuen Monitor verschieben
        if (previewWindow && !previewWindow.isDestroyed()) {
            previewWindow.setFullScreen(false);
            previewWindow.setBounds({
                x: targetDisplay.bounds.x,
                y: targetDisplay.bounds.y,
                width: targetDisplay.bounds.width,
                height: targetDisplay.bounds.height
            });
            previewWindow.setFullScreen(true);
            previewWindow.focus();
            return;
        }

        previewWindow = new BrowserWindow({
            x: targetDisplay.bounds.x,
            y: targetDisplay.bounds.y,
            width: targetDisplay.bounds.width,
            height: targetDisplay.bounds.height,
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

        const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    background: #000;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    width: 100vw;
                    user-select: none;
                }
                img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .hint {
                    position: fixed;
                    bottom: 15px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.7);
                    color: #ccc;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-family: sans-serif;
                    font-size: 12px;
                    pointer-events: none;
                    transition: opacity 1s;
                }
            </style>
        </head>
        <body ondblclick="window.close()">
            <img id="liveImg" src="" alt="Vorschau" />
            <div class="hint" id="hint">Vollbild-Vorschau (ESC oder Doppelklick zum Schließen)</div>
            <script>
                const { ipcRenderer } = require('electron');
                ipcRenderer.on('frame-update', (e, dataUrl) => {
                    document.getElementById('liveImg').src = dataUrl;
                });
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') window.close();
                });
                setTimeout(() => {
                    document.getElementById('hint').style.opacity = '0';
                }, 4000);
            </script>
        </body>
        </html>`;

        previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHtml));

        previewWindow.on('closed', () => {
            previewWindow = null;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('fullscreen-preview-closed');
            }
        });
    } else {
        if (previewWindow && !previewWindow.isDestroyed()) {
            previewWindow.close();
            previewWindow = null;
        }
    }
}

app.whenReady().then(() => {
    createWindow();

    // Wenn während des Betriebs ein Monitor/TV an- oder abgesteckt wird, Liste in der GUI aktualisieren
    const notifyDisplaysChanged = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('displays-updated', getDisplayList());
        }
    };
    screen.on('display-added', notifyDisplaysChanged);
    screen.on('display-removed', notifyDisplaysChanged);
    screen.on('display-metrics-changed', notifyDisplaysChanged);
});

// Gibt die Liste aller Monitore an die Oberfläche zurück
ipcMain.handle('get-displays', () => {
    return getDisplayList();
});

// Steuert das Ein-/Ausschalten und den Monitorwechsel der Vollbild-Vorschau
ipcMain.on('set-fullscreen-preview', (event, data) => {
    if (typeof data === 'object' && data !== null) {
        toggleFullscreenPreview(data.enable, data.displayId);
    } else {
        toggleFullscreenPreview(Boolean(data), null);
    }
});

// Sendet das aktuelle Canvas-Bild live an das Vollbild-Vorschaufenster
ipcMain.on('update-preview-image', (event, dataUrl) => {
    if (previewWindow && !previewWindow.isDestroyed()) {
        previewWindow.webContents.send('frame-update', dataUrl);
    }
});

// Empfängt die Bilddaten aus der GUI und sendet sie an den ATEM
ipcMain.handle('upload-to-atem', async (event, { ip, slot, mp, rgbaArray }) => {
    const myAtem = new Atem();
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            myAtem.disconnect().catch(() => {});
            reject(new Error('Zeitüberschreitung: ATEM unter dieser IP nicht erreichbar.'));
        }, 8000);

        myAtem.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error('ATEM Verbindungsfehler: ' + err));
        });

        myAtem.connect(ip);

        myAtem.once('connected', async () => {
            clearTimeout(timeout);
            try {
                const buffer = Buffer.from(rgbaArray);
                
                await myAtem.uploadStill(
                    slot,
                    buffer,
                    'Liedertafel',
                    'Generiert via Electron GUI'
                );

                await myAtem.setMediaPlayerSource({
                    sourceType: 1,
                    stillIndex: slot
                }, mp);

                await myAtem.disconnect();
                resolve('Erfolgreich hochgeladen und Media Player ' + (mp + 1) + ' zugewiesen!');
            } catch (err) {
                await myAtem.disconnect();
                reject(err);
            }
        });
    });
});