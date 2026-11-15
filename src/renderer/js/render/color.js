// Kleine Farb-Hilfsfunktionen für #rrggbb-Farben

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
    const part = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
}

// amount < 0 dunkelt Richtung Schwarz ab, amount > 0 hellt Richtung Weiß auf (-1..1)
function shade(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const target = amount < 0 ? 0 : 255;
    const t = Math.abs(amount);
    return rgbToHex({ r: r + (target - r) * t, g: g + (target - g) * t, b: b + (target - b) * t });
}

// Wahrgenommene Helligkeit 0..255
function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Durchschnittsfarbe eines Canvas-Ausschnitts (transparente Pixel zählen nicht)
const SAMPLE_W = 32;
const SAMPLE_H = 18;

function averageColor(sourceCanvas, area) {
    const sample = document.createElement('canvas');
    sample.width = SAMPLE_W;
    sample.height = SAMPLE_H;
    const ctx = sample.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, area.x, area.y, area.w, area.h, 0, 0, SAMPLE_W, SAMPLE_H);

    const d = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    let r = 0, g = 0, b = 0, weight = 0;
    for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3] / 255;
        r += d[i] * a;
        g += d[i + 1] * a;
        b += d[i + 2] * a;
        weight += a;
    }
    if (weight === 0) return '#808080';
    return rgbToHex({ r: r / weight, g: g / weight, b: b / weight });
}

module.exports = { shade, luminance, averageColor };
