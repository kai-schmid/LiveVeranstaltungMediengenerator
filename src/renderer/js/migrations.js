// Überführt gespeicherte Einstellungen älterer Versionen in die aktuelle Struktur.
// Läuft vor dem Laden der Einstellungen und ändert nur Schlüssel, die noch nicht existieren.
const storage = require('./storage');

// Früher galten Bild-Modus, Helligkeit und Tönung gemeinsam für Hintergrund und Textur
const TEXTURE_FROM_SHARED = [
    ['texMode', 'bgMode'],
    ['texBrightness', 'bgBrightness'],
    ['texTintColor', 'bgTintColor'],
    ['texTintOpacity', 'bgTintOpacity']
];

function copyIfMissing(newKey, oldKey) {
    const old = storage.get(oldKey);
    if (storage.get(newKey) === null && old !== null) storage.set(newKey, old);
}

function runMigrations() {
    TEXTURE_FROM_SHARED.forEach(([newKey, oldKey]) => copyIfMissing(newKey, oldKey));

    // Checkbox "Custom Randfarbe" -> Auswahl "Rand & Leisten"
    if (storage.get('borderMode') === null && storage.get('useCustomBorder') === 'true') {
        storage.set('borderMode', 'custom');
    }
}

module.exports = { runMigrations };
