// Verwaltung der beiden Bilder: äußerer Hintergrund und eigene Holz-Textur für die Tafel.
// Die Bilder werden als Data-URL (Base64) im localStorage gehalten, damit sie nach Neustart wieder da sind.
const storage = require('./storage');

const IMAGE_SLOTS = [
    { key: 'background', storageKey: 'savedBgImage', inputId: 'bgInput', selectBtnId: 'bgSelectBtn', clearBtnId: 'bgClearBtn' },
    { key: 'texture', storageKey: 'savedBoardTexture', inputId: 'texInput', selectBtnId: 'texSelectBtn', clearBtnId: 'texClearBtn' }
];

// Aktuell geladene Bilder (werden beim Zeichnen direkt gelesen)
const images = { background: null, texture: null };
// Zugehörige Data-URLs (für den Export, auch falls localStorage voll ist)
const dataUrls = { background: null, texture: null };

let onChange = () => {};

const slotByKey = key => IMAGE_SLOTS.find(s => s.key === key);

function isImageDataUrl(value) {
    return typeof value === 'string' && value.startsWith('data:image/');
}

function loadFromDataUrl(slot, dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            images[slot.key] = img;
            dataUrls[slot.key] = dataUrl;
            onChange();
            resolve();
        };
        img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
        img.src = dataUrl;
    });
}

function clearSlot(slot) {
    images[slot.key] = null;
    dataUrls[slot.key] = null;
    document.getElementById(slot.inputId).value = '';
    storage.remove(slot.storageKey);
    onChange();
}

/**
 * Setzt ein Bild aus einer Data-URL (oder entfernt es bei null) und speichert es.
 * @returns false, wenn das Bild nicht dauerhaft gespeichert werden konnte (Speicher voll)
 */
async function setImage(key, dataUrl) {
    const slot = slotByKey(key);
    if (dataUrl === null) {
        clearSlot(slot);
        return true;
    }
    if (!isImageDataUrl(dataUrl)) throw new Error('Ungültige Bilddaten.');
    const stored = storage.set(slot.storageKey, dataUrl);
    await loadFromDataUrl(slot, dataUrl);
    return stored;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function setupSlot(slot) {
    const input = document.getElementById(slot.inputId);

    document.getElementById(slot.selectBtnId).addEventListener('click', () => input.click());

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        await setImage(slot.key, await readFileAsDataUrl(file));
    });

    document.getElementById(slot.clearBtnId).addEventListener('click', () => clearSlot(slot));

    const saved = storage.get(slot.storageKey);
    if (saved) loadFromDataUrl(slot, saved).catch(() => {});
}

function init({ onImagesChanged }) {
    onChange = onImagesChanged;
    IMAGE_SLOTS.forEach(setupSlot);
}

module.exports = { init, images, dataUrls, setImage, isImageDataUrl };
