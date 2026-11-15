const { app, BrowserWindow, ipcMain } = require('electron');
const { Atem } = require('atem-connection');

function createWindow() {
    const win = new BrowserWindow({
        width: 1150,
        height: 780,
        title: 'ATEM Constellation HD - Liedertafel Generator',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

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
                
                // 1. Bild in den Media Pool hochladen
                await myAtem.uploadStill(
                    slot,
                    buffer,
                    'Liedertafel',
                    'Generiert via Electron GUI'
                );

                // 2. Bild dem Media Player (z.B. MP 2) zuweisen
                await myAtem.setMediaPlayerSource({
                    sourceType: 1, // 1 = Still
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