// Gleicht Helligkeit und Übergänge an den Rändern einer Kachel an, damit beim Kacheln
// keine harten Kanten sichtbar sind. Das Ergebnis wird pro Bild zwischengespeichert.

const MAX_TILE_SIZE = 600;
const cache = new WeakMap();

const luminance = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

function measureEdgeLuminance(d, w, h, sample) {
    let left = 0, right = 0, top = 0, bottom = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < sample; x++) {
            left += luminance(d, (y * w + x) * 4);
            right += luminance(d, (y * w + (w - 1 - x)) * 4);
        }
    }
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < sample; y++) {
            top += luminance(d, (y * w + x) * 4);
            bottom += luminance(d, ((h - 1 - y) * w + x) * 4);
        }
    }

    return {
        left: left / (h * sample),
        right: right / (h * sample),
        top: top / (w * sample),
        bottom: bottom / (w * sample)
    };
}

function balanceEdges(d, w, h) {
    const sample = Math.max(2, Math.floor(Math.min(w, h) * 0.04));
    const edges = measureEdgeLuminance(d, w, h, sample);
    const diffX = edges.right - edges.left;
    const diffY = edges.bottom - edges.top;
    const blendZone = Math.max(4, Math.floor(Math.min(w, h) * 0.12));

    for (let y = 0; y < h; y++) {
        const ny = y / h - 0.5;
        for (let x = 0; x < w; x++) {
            const nx = x / w - 0.5;
            const idx = (y * w + x) * 4;

            // Helligkeitsverlauf über die Kachel ausgleichen
            const corr = -(nx * diffX * 0.85) - (ny * diffY * 0.85);
            let r = d[idx] + corr;
            let g = d[idx + 1] + corr;
            let b = d[idx + 2] + corr;

            // Linken/oberen Rand mit der gegenüberliegenden Seite überblenden
            if (x < blendZone) {
                const factor = (1 - x / blendZone) * 0.45;
                const opp = (y * w + (w - 1 - x)) * 4;
                r = r * (1 - factor) + (d[opp] - corr) * factor;
                g = g * (1 - factor) + (d[opp + 1] - corr) * factor;
                b = b * (1 - factor) + (d[opp + 2] - corr) * factor;
            }
            if (y < blendZone) {
                const factor = (1 - y / blendZone) * 0.45;
                const opp = ((h - 1 - y) * w + x) * 4;
                r = r * (1 - factor) + (d[opp] - corr) * factor;
                g = g * (1 - factor) + (d[opp + 1] - corr) * factor;
                b = b * (1 - factor) + (d[opp + 2] - corr) * factor;
            }

            d[idx] = Math.max(0, Math.min(255, r));
            d[idx + 1] = Math.max(0, Math.min(255, g));
            d[idx + 2] = Math.max(0, Math.min(255, b));
        }
    }
}

function getEdgeBalancedTile(img) {
    if (cache.has(img)) return cache.get(img);

    const w = Math.min(img.width, MAX_TILE_SIZE);
    const h = Math.min(img.height, MAX_TILE_SIZE);
    const tile = document.createElement('canvas');
    tile.width = w;
    tile.height = h;

    const ctx = tile.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    balanceEdges(imageData.data, w, h);
    ctx.putImageData(imageData, 0, 0);

    cache.set(img, tile);
    return tile;
}

module.exports = { getEdgeBalancedTile };
