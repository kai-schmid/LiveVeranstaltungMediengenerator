// Zeigt das Seitenverhältnis der Tafel aus Breite & Höhe an und setzt es auf Wunsch auf 16:9 zurück.

const BASE_RATIO = 16 / 9;
// Gängige Verhältnisse, die bei Übereinstimmung als "a:b" angezeigt werden
const KNOWN_RATIOS = [[16, 9], [16, 10], [3, 2], [4, 3], [5, 4], [1, 1], [21, 9], [2, 1], [3, 1], [9, 16]];
const MATCH_TOLERANCE = 0.01;

const byId = id => document.getElementById(id);

function formatRatio(ratio) {
    const known = KNOWN_RATIOS.find(([a, b]) => Math.abs(a / b - ratio) / ratio < MATCH_TOLERANCE);
    if (known) return `${known[0]}:${known[1]}`;
    return `${ratio.toFixed(2).replace('.', ',')}:1`;
}

/** Aktualisiert die Anzeige – wird bei jedem Neuzeichnen aufgerufen */
function update() {
    const ratio = BASE_RATIO * (parseFloat(byId('boardWidth').value) / parseFloat(byId('boardHeight').value));
    byId('boardRatio').textContent = formatRatio(ratio);
}

function init({ setValue }) {
    byId('resetRatioBtn').addEventListener('click', () => {
        setValue(byId('boardWidth'), 100);
        setValue(byId('boardHeight'), 100);
    });
}

module.exports = { init, update };
