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

function handleChange(el) {
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

function init({ onRender }) {
    onRenderNeeded = onRender;
    restoreSettings();
    restoreCollapsedSections();

    document.addEventListener('input', (e) => {
        const el = e.target.closest('[data-setting]');
        if (el) handleChange(el);
    });
}

module.exports = { init, setValue };
