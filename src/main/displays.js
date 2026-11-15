const { screen } = require('electron');

// Liste aller Monitore für das Auswahlmenü in der Oberfläche
function getDisplayList() {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d, index) => ({
        id: String(d.id),
        label: `Monitor ${index + 1}: ${d.label || 'Anzeige'} (${d.bounds.width}x${d.bounds.height})`
            + (d.id === primaryId ? ' [Hauptbildschirm]' : '')
    }));
}

// Gewählter Monitor – Fallback: zweiter Monitor, sonst Hauptbildschirm
function findTargetDisplay(displayId) {
    const all = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    return all.find(d => String(d.id) === String(displayId))
        || all.find(d => d.id !== primary.id)
        || primary;
}

// Meldet, wenn im Betrieb ein Monitor/TV an- oder abgesteckt wird
function watchDisplayChanges(callback) {
    screen.on('display-added', callback);
    screen.on('display-removed', callback);
    screen.on('display-metrics-changed', callback);
}

module.exports = { getDisplayList, findTargetDisplay, watchDisplayChanges };
