// Verwaltung der beiden Bilder: äußerer Hintergrund und eigene Holz-Textur für die Tafel.
// Die Bilder werden als Data-URL im localStorage gehalten, damit sie nach Neustart wieder da sind.
const storage = require('./storage');

const IMAGE_SLOTS = [
    { key: 'background', storageKey: 'savedBgImage', inputId: 'bgInput', selectBtnId: 'bgSelectBtn', clearBtnId: 'bgClearBtn' },
    { key: 'texture', storageKey: 'savedBoardTexture', inputId: 'texInput', selectBtnId: 'texSelectBtn', clearBtnId: 'texClearBtn' }
];

// Aktuell geladene Bilder (werden beim Zeichnen direkt gelesen)
const images = { background: null, texture: null };

let onChange = () => {};

function loadFromDataUrl(slot, dataUrl) {
    const img = new Image();
    img.onload = () => {
        images[slot.key] = img;
        onChange();
    };
    img.src = dataUrl;
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
        const dataUrl = await readFileAsDataUrl(file);
        storage.set(slot.storageKey, dataUrl);
        loadFromDataUrl(slot, dataUrl);
    });

    document.getElementById(slot.clearBtnId).addEventListener('click', () => {
        images[slot.key] = null;
        input.value = '';
        storage.remove(slot.storageKey);
        onChange();
    });

    const saved = storage.get(slot.storageKey);
    if (saved) loadFromDataUrl(slot, saved);
}

function init({ onImagesChanged }) {
    onChange = onImagesChanged;
    IMAGE_SLOTS.forEach(setupSlot);
}

module.exports = { init, images };
