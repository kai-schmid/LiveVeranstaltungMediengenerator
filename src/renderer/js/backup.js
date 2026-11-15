// Export/Import aller Einstellungen, der Liederliste und beider Bilder (Base64) als JSON-Datei.
//
// Dateiformat:
// {
//   "format": "atem-liedertafel-settings",
//   "formatVersion": 1,            <- bei inkompatiblen Änderungen erhöhen
//   "appVersion": "1.0.0",
//   "exportedAt": "2026-11-15T10:00:00.000Z",
//   "settings": { "<element-id>": "<wert>", ... },
//   "songs": [ { "nr": "104", "color": "transparent", "str": "1-3" }, ... ],
//   "images": { "background": "data:image/png;base64,..." | null, "texture": ... | null }
// }
const settings = require('./settings');
const songs = require('./songs');
const imageStore = require('./images');
const { runMigrations } = require('./migrations');
const { showStatus } = require('./status');
const { version: APP_VERSION } = require('../../../package.json');

const FORMAT = 'atem-liedertafel-settings';
const FORMAT_VERSION = 1;
const IMAGE_KEYS = ['background', 'texture'];

let onImported = () => {};

function buildBackup() {
    return {
        format: FORMAT,
        formatVersion: FORMAT_VERSION,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        settings: settings.exportValues(),
        songs: songs.exportSongs(),
        images: {
            background: imageStore.dataUrls.background,
            texture: imageStore.dataUrls.texture
        }
    };
}

function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBackup() {
    downloadJson(buildBackup(), `Liedertafel-Einstellungen_${new Date().toISOString().slice(0, 10)}.json`);
    showStatus('success', '✔ Einstellungen inkl. Bilder exportiert.');
}

function validate(data) {
    if (!data || typeof data !== 'object' || data.format !== FORMAT) {
        throw new Error('Keine Liedertafel-Einstellungsdatei.');
    }
    if (!Number.isInteger(data.formatVersion) || data.formatVersion < 1) {
        throw new Error('Datei hat keine gültige Versionsnummer.');
    }
    if (data.formatVersion > FORMAT_VERSION) {
        throw new Error(`Datei hat Format-Version ${data.formatVersion}, diese App kann nur bis Version ${FORMAT_VERSION} lesen. Bitte App aktualisieren.`);
    }
    // Bilder vorab prüfen, damit ein fehlerhafter Import nichts halb übernimmt
    const imgs = data.images || {};
    for (const key of IMAGE_KEYS) {
        if (key in imgs && imgs[key] !== null && !imageStore.isImageDataUrl(imgs[key])) {
            throw new Error(`Ungültige Bilddaten für "${key}".`);
        }
    }
    // Hier künftig ältere Format-Versionen auf den aktuellen Stand bringen (z.B. if (data.formatVersion === 1) {...})
    return data;
}

// Fehlende Teile in der Datei lassen den aktuellen Stand unverändert
async function applyBackup(data) {
    if (data.settings && typeof data.settings === 'object') settings.importValues(data.settings);
    runMigrations();
    settings.reload();

    if (Array.isArray(data.songs)) songs.importSongs(data.songs);

    const notStored = [];
    if (data.images && typeof data.images === 'object') {
        for (const key of IMAGE_KEYS) {
            if (!(key in data.images)) continue;
            const stored = await imageStore.setImage(key, data.images[key]);
            if (!stored) notStored.push(key === 'background' ? 'Hintergrund' : 'Holz-Textur');
        }
    }

    onImported();
    return notStored;
}

async function importBackup(file) {
    try {
        let data;
        try {
            data = JSON.parse(await file.text());
        } catch (e) {
            throw new Error('Datei ist kein gültiges JSON.');
        }
        const notStored = await applyBackup(validate(data));
        if (notStored.length) {
            showStatus('info', `✔ Importiert – Bild (${notStored.join(', ')}) zu groß zum dauerhaften Speichern, bleibt nur bis zum Neustart.`);
        } else {
            showStatus('success', `✔ Einstellungen importiert (Format-Version ${data.formatVersion}, exportiert mit App ${data.appVersion || '?'}).`);
        }
    } catch (err) {
        showStatus('error', '✖ Import fehlgeschlagen: ' + err.message);
    }
}

function init({ onImported: callback }) {
    onImported = callback;
    const input = document.getElementById('backupInput');

    document.getElementById('exportBackupBtn').addEventListener('click', exportBackup);
    document.getElementById('importBackupBtn').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
        const file = input.files[0];
        input.value = '';   // gleiche Datei erneut wählbar
        if (file) await importBackup(file);
    });
}

module.exports = { init, FORMAT, FORMAT_VERSION };
