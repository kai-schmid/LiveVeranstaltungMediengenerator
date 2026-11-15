// Ausgabe-Aktionen: Bild als PNG speichern und in den ATEM Media Player laden.
const { ipcRenderer } = require('electron');
const { readAtemConfig } = require('./config');
const { showStatus } = require('./status');

function saveAsPng(canvas) {
    const link = document.createElement('a');
    link.download = `Liedertafel_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showStatus('success', '✔ Bild erfolgreich als PNG gespeichert!');
}

async function uploadToAtem(canvas, button) {
    const { ip, slot, mp } = readAtemConfig();
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

    button.disabled = true;
    showStatus('info', `Verbinde mit ATEM (${ip}) -> Slot ${slot + 1}, MP ${mp + 1}...`);

    try {
        const message = await ipcRenderer.invoke('upload-to-atem', {
            ip,
            slot,
            mp,
            rgbaArray: imageData.data.buffer
        });
        showStatus('success', '✔ ' + message);
    } catch (err) {
        showStatus('error', '✖ ' + err.message);
    } finally {
        button.disabled = false;
    }
}

function init(canvas) {
    const uploadBtn = document.getElementById('uploadBtn');
    document.getElementById('saveImageBtn').addEventListener('click', () => saveAsPng(canvas));
    uploadBtn.addEventListener('click', () => uploadToAtem(canvas, uploadBtn));
}

module.exports = { init };
