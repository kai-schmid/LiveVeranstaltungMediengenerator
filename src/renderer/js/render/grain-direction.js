// Erkennt, in welche Richtung die Fasern eines Holzfotos laufen, und liefert bei Bedarf
// eine um 90° gedrehte Fassung, damit die Maserung immer waagerecht liegt.
// Wird für die Rahmenleisten gebraucht: Dort sollen die Fasern der Länge nach verlaufen.

const SAMPLE_SIZE = 128;
const VERTICAL_THRESHOLD = 1.15;   // Fasern gelten erst bei deutlichem Übergewicht als senkrecht
const cache = new WeakMap();

const luminance = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/**
 * Laufen die Fasern senkrecht, ändert sich die Helligkeit vor allem quer dazu (in x-Richtung).
 * @returns true, wenn die Maserung überwiegend senkrecht verläuft
 */
function hasVerticalGrain(img) {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const d = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;

    let changeX = 0;
    let changeY = 0;
    for (let y = 0; y < SAMPLE_SIZE - 1; y++) {
        for (let x = 0; x < SAMPLE_SIZE - 1; x++) {
            const i = (y * SAMPLE_SIZE + x) * 4;
            const l = luminance(d, i);
            changeX += Math.abs(luminance(d, i + 4) - l);
            changeY += Math.abs(luminance(d, i + SAMPLE_SIZE * 4) - l);
        }
    }
    return changeX > changeY * VERTICAL_THRESHOLD;
}

function rotate90(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, 0);
    return canvas;
}

/** Bild bzw. gedrehte Kopie, bei der die Fasern waagerecht verlaufen (zwischengespeichert) */
function withHorizontalGrain(img) {
    if (!cache.has(img)) {
        cache.set(img, hasVerticalGrain(img) ? rotate90(img) : img);
    }
    return cache.get(img);
}

module.exports = { withHorizontalGrain };
