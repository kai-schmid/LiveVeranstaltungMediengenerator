// Speichert und lädt alle Bedienelemente mit data-setting automatisch.
// Der localStorage-Schlüssel ist jeweils die id des Elements.
const storage = require('./storage');
const { formatNumber } = require('./format');

let onRenderNeeded = () => {};

function settingElements() {
    return document.querySelectorAll('[data-setting]');
}

function readElement(el) {
    return el.type === 'checkbox' ? String(el.checked) : el.value.trim();
}

function writeElement(el, raw) {
    if (el.type === 'checkbox') {
        el.checked = (raw === 'true');
    } else {
        el.value = raw;
    }
}

function updateDisplay(el) {
    if (!el.dataset.display) return;
    document.getElementById(el.dataset.display).textContent = formatNumber(el.value);
}

function save() {
    settingElements().forEach(el => storage.set(el.id, readElement(el)));
}

// data-enables="id" hakt eine Checkbox an, data-enables="id=wert" setzt eine Auswahl.
// Bei "id=a|b" bleibt die Auswahl unverändert, wenn sie schon a oder b ist – sonst wird a gesetzt.
function applyEnables(el) {
    if (!el.dataset.enables) return;
    const [id, value] = el.dataset.enables.split('=');
    const target = document.getElementById(id);
    if (value === undefined) {
        target.checked = true;
        return;
    }
    const allowed = value.split('|');
    if (!allowed.includes(target.value)) target.value = allowed[0];
}

function handleChange(el) {
    applyEnables(el);
    updateDisplay(el);
    save();
    if (el.dataset.setting === 'render') onRenderNeeded();
}

// Wert per Code setzen (z.B. aus dem Eingabedialog) – verhält sich wie eine Benutzereingabe
function setValue(el, value) {
    writeElement(el, String(value));
    handleChange(el);
}

function restoreSettings() {
    settingElements().forEach(el => {
        const raw = storage.get(el.id);
        if (raw !== null && raw !== '') writeElement(el, raw);
        updateDisplay(el);
    });
}

function restoreCollapsedSections() {
    document.querySelectorAll('details[data-persist-open]').forEach(details => {
        const key = details.dataset.persistOpen;
        const saved = storage.get(key);
        if (saved !== null) details.open = (saved === 'true');
        details.addEventListener('toggle', () => storage.set(key, details.open));
    });
}

// Alle Einstellungen als { id: wert } (für den Export)
function exportValues() {
    const values = {};
    settingElements().forEach(el => { values[el.id] = readElement(el); });
    return values;
}

// Übernimmt Werte aus einem Import; unbekannte Schlüssel werden ignoriert
function importValues(values) {
    settingElements().forEach(el => {
        if (Object.prototype.hasOwnProperty.call(values, el.id)) {
            storage.set(el.id, String(values[el.id]));
        }
    });
}

function init({ onRender }) {
    onRenderNeeded = onRender;
    restoreSettings();
    restoreCollapsedSections();

    document.addEventListener('input', (e) => {
        const el = e.target.closest('[data-setting]');
        if (el) handleChange(el);
    });
}

module.exports = { init, setValue, exportValues, importValues, reload: restoreSettings };
