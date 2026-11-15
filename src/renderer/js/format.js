// Zahl mit max. 2 Nachkommastellen und deutschem Komma, z.B. 47,5
function formatNumber(value) {
    const rounded = Math.round(parseFloat(value) * 100) / 100;
    return rounded.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

// Akzeptiert "47,5" und "47.5"; liefert NaN bei ungültiger Eingabe
function parseDecimal(text) {
    return parseFloat(String(text).trim().replace(',', '.'));
}

module.exports = { formatNumber, parseDecimal };
