const { Atem } = require('atem-connection');

const CONNECT_TIMEOUT_MS = 8000;
const MEDIA_SOURCE_STILL = 1;

function connectToAtem(ip) {
    const atem = new Atem();

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            atem.disconnect().catch(() => {});
            reject(new Error('Zeitüberschreitung: ATEM unter dieser IP nicht erreichbar.'));
        }, CONNECT_TIMEOUT_MS);

        atem.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error('ATEM Verbindungsfehler: ' + err));
        });

        atem.once('connected', () => {
            clearTimeout(timeout);
            resolve(atem);
        });

        atem.connect(ip);
    });
}

// Lädt ein RGBA-Bild in den Media Pool und weist es einem Media Player zu
async function uploadStillToAtem({ ip, slot, mp, rgbaArray }) {
    const atem = await connectToAtem(ip);
    try {
        await atem.uploadStill(slot, Buffer.from(rgbaArray), 'Liedertafel', 'Generiert via Electron GUI');
        await atem.setMediaPlayerSource({ sourceType: MEDIA_SOURCE_STILL, stillIndex: slot }, mp);
        return `Erfolgreich hochgeladen und Media Player ${mp + 1} zugewiesen!`;
    } finally {
        await atem.disconnect();
    }
}

module.exports = { uploadStillToAtem };
