const path = require('path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const updateCheck = require('./src/main/update-check');
const displays = require('./src/main/displays');
const previewWindow = require('./src/main/preview-window');
const { uploadStillToAtem } = require('./src/main/atem-upload');

let mainWindow = null;

const APP_ICON = path.join(__dirname, 'src', 'icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

// Sorgt unter Windows dafür, dass Taskleiste und Startmenü das App-Icon (statt des Electron-Icons) verwenden
if (process.platform === 'win32') {
    app.setAppUserModelId('de.liedertafel.atem');
}

function sendToMainWindow(channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 820,
        title: 'ATEM Constellation HD - Liedertafel Generator',
        autoHideMenuBar: true,
        icon: APP_ICON,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

    mainWindow.on('closed', () => {
        previewWindow.close();
        mainWindow = null;
    });
}

function registerIpcHandlers() {
    ipcMain.handle('get-displays', () => displays.getDisplayList());

    ipcMain.on('set-fullscreen-preview', (event, { enable, displayId } = {}) => {
        if (enable) {
            previewWindow.open(displayId);
        } else {
            previewWindow.close();
        }
    });

    ipcMain.on('update-preview-image', (event, dataUrl) => {
        previewWindow.sendFrame(dataUrl);
    });

    ipcMain.handle('upload-to-atem', (event, params) => uploadStillToAtem(params));

    ipcMain.handle('get-app-version', () => app.getVersion());
    ipcMain.handle('check-for-updates', () => updateCheck.checkForUpdates());
    ipcMain.handle('open-external', (event, url) => {
        if (!updateCheck.isAllowedExternalUrl(url)) return false;
        return shell.openExternal(url).then(() => true);
    });
}

app.whenReady().then(() => {
    registerIpcHandlers();
    createMainWindow();

    previewWindow.onClosed(() => sendToMainWindow('fullscreen-preview-closed'));
    displays.watchDisplayChanges(() => sendToMainWindow('displays-updated', displays.getDisplayList()));
});
