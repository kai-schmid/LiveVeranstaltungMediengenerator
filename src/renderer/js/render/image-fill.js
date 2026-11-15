// Füllt einen rechteckigen Bereich mit einem Bild – gekachelt oder als Vollbild –
// inklusive Helligkeit und optionaler Farbtönung.
const { getEdgeBalancedTile } = require('./seamless-tile');

const MIN_TILE_SIZE = 16;
const TILE_OVERLAP = 0.8;   // verhindert feine Lücken zwischen den Kacheln

function drawTiled(ctx, img, area, scale, seamless) {
    const source = seamless ? getEdgeBalancedTile(img) : img;
    const tileW = Math.max(MIN_TILE_SIZE, img.width * scale);
    const tileH = Math.max(MIN_TILE_SIZE, img.height * scale);

    let col = 0;
    for (let x = area.x; x < area.x + area.w; x += tileW, col++) {
        let row = 0;
        for (let y = area.y; y < area.y + area.h; y += tileH, row++) {
            // Bei nahtlosem Modus jede zweite Kachel spiegeln
            const flipX = seamless && (col % 2 === 1);
            const flipY = seamless && (row % 2 === 1);
            ctx.save();
            ctx.translate(x + (flipX ? tileW : 0), y + (flipY ? tileH : 0));
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
            ctx.drawImage(source, 0, 0, tileW + TILE_OVERLAP, tileH + TILE_OVERLAP);
            ctx.restore();
        }
    }
}

function drawCover(ctx, img, area, scale) {
    const imgRatio = img.width / img.height;
    let baseW = area.w;
    let baseH = area.h;

    if (imgRatio > area.w / area.h) {
        baseW = area.h * imgRatio;
    } else {
        baseH = area.w / imgRatio;
    }

    const zoom = Math.max(0.2, scale * 2);
    const drawW = baseW * zoom;
    const drawH = baseH * zoom;
    ctx.drawImage(img, area.x + (area.w - drawW) / 2, area.y + (area.h - drawH) / 2, drawW, drawH);
}

function drawTint(ctx, area, image) {
    ctx.save();
    ctx.filter = `brightness(${image.brightness}%)`;
    ctx.fillStyle = image.tintColor;

    ctx.globalAlpha = image.tintAlpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(area.x, area.y, area.w, area.h);

    ctx.globalAlpha = image.tintAlpha * 0.45;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillRect(area.x, area.y, area.w, area.h);
    ctx.restore();
}

/**
 * @param area  {x, y, w, h}
 * @param scale Skalierung als Faktor (0.5 = 50 %)
 * @param image Bild-Optionen aus readRenderConfig().image
 */
function drawImageFill(ctx, img, area, scale, image) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();

    ctx.filter = `brightness(${image.brightness}%)`;
    if (image.mode === 'tile') {
        drawTiled(ctx, img, area, scale, image.seamless);
    } else {
        drawCover(ctx, img, area, scale);
    }
    ctx.filter = 'none';

    if (image.tintAlpha > 0) drawTint(ctx, area, image);

    ctx.restore();
}

module.exports = { drawImageFill };
