// Kleines Fenster, um Reglerwerte exakt (auch mit Kommazahlen) einzugeben.
// Aktiv für alle Regler mit data-precise="<Titel>": Klick auf den angezeigten Wert
// oder Doppelklick auf den Regler öffnet den Dialog.
const { formatNumber, parseDecimal } = require('./format');

let modal, titleEl, hintEl, input;
let target = null;
let applyValue = () => {};

function open(slider) {
    target = slider;
    titleEl.textContent = `${slider.dataset.precise} (%)`;
    hintEl.textContent = `Bereich ${formatNumber(slider.min)} – ${formatNumber(slider.max)} %, `
        + 'Kommazahlen erlaubt (z.B. 47,5)';
    input.value = formatNumber(slider.value);
    input.classList.remove('invalid');
    modal.classList.add('show');
    input.focus();
    input.select();
}

function close() {
    modal.classList.remove('show');
    target = null;
}

function confirm() {
    if (!target) return;
    const value = parseDecimal(input.value);
    if (isNaN(value)) {
        input.classList.add('invalid');
        return;
    }
    const clamped = Math.min(parseFloat(target.max), Math.max(parseFloat(target.min), value));
    applyValue(target, clamped);
    close();
}

function init({ onApply }) {
    modal = document.getElementById('valueModal');
    titleEl = document.getElementById('valueModalTitle');
    hintEl = document.getElementById('valueModalHint');
    input = document.getElementById('valueModalInput');
    applyValue = onApply;

    document.querySelectorAll('input[type="range"][data-precise]').forEach(slider => {
        slider.addEventListener('dblclick', () => open(slider));
        if (slider.dataset.display) {
            document.getElementById(slider.dataset.display).addEventListener('click', () => open(slider));
        }
    });

    document.getElementById('valueModalOk').addEventListener('click', confirm);
    document.getElementById('valueModalCancel').addEventListener('click', close);
    modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) close();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirm(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
}

module.exports = { init };
