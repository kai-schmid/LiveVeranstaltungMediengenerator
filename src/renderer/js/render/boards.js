// Zeichnet die Tafel selbst (Hintergrund + Rahmen) und die Einschubleisten zwischen den Zeilen.
const { drawImageFill } = require('./image-fill');

// ---------- Rahmen ----------

function drawFrame(ctx, rect, s, colors) {
    const { x, y, w, h } = rect;
    const frameWidth = 20 * s;

    ctx.lineWidth = frameWidth;
    ctx.strokeStyle = colors.outer;
    ctx.strokeRect(x + frameWidth / 2, y + frameWidth / 2, w - frameWidth, h - frameWidth);

    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = colors.inner;
    ctx.strokeRect(x + frameWidth, y + frameWidth, w - frameWidth * 2, h - frameWidth * 2);
}

function applyDropShadow(ctx, s, alpha) {
    ctx.shadowColor = `rgba(0, 0, 0, ${alpha})`;
    ctx.shadowBlur = 25 * s;
    ctx.shadowOffsetY = 10 * s;
}

// ---------- Prozedurale Holzmaserung (ohne eigene Textur) ----------

function drawSpruceGrain(ctx, rect, s, cfg, hasBackground) {
    const { x, y, w, h } = rect;
    const { image } = cfg;

    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#e8cfa6');
    gradient.addColorStop(0.5, '#dfbe8f');
    gradient.addColorStop(1, '#d5b17d');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = 'transparent';

    // Maserungslinien
    const step = Math.max(1.5, 2.5 * s * (cfg.textureScale * 2));
    for (let i = 0; i < h; i += step) {
        const wave = Math.sin(i * 0.04) * 0.025;
        ctx.fillStyle = (Math.floor(i / step) % 5 === 0)
            ? `rgba(165, 115, 55, ${0.10 + wave})`
            : `rgba(255, 245, 225, ${0.12 + wave})`;
        ctx.fillRect(x, y + i, w, 1.8 * s);
    }

    // Brettfugen
    const plankCount = 4;
    const plankH = h / plankCount;
    ctx.strokeStyle = 'rgba(140, 95, 45, 0.35)';
    ctx.lineWidth = 2 * s;
    for (let p = 1; p < plankCount; p++) {
        ctx.beginPath();
        ctx.moveTo(x, y + p * plankH);
        ctx.lineTo(x + w, y + p * plankH);
        ctx.stroke();
    }

    // Astlöcher
    const knots = [
        { kx: x + w * 0.82, ky: y + h * 0.22, rx: 18 * s, ry: 8 * s },
        { kx: x + w * 0.48, ky: y + h * 0.68, rx: 14 * s, ry: 6 * s },
        { kx: x + w * 0.88, ky: y + h * 0.85, rx: 22 * s, ry: 9 * s }
    ];
    knots.forEach(k => {
        ctx.fillStyle = 'rgba(130, 82, 35, 0.35)';
        ctx.beginPath();
        ctx.ellipse(k.kx, k.ky, k.rx, k.ry, 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(95, 55, 20, 0.45)';
        ctx.beginPath();
        ctx.ellipse(k.kx, k.ky, k.rx * 0.45, k.ry * 0.45, 0.08, 0, Math.PI * 2);
        ctx.fill();
    });

    // Tönung wirkt hier nur, wenn kein äußeres Hintergrundbild gesetzt ist
    if (image.tintAlpha > 0 && !hasBackground) {
        ctx.fillStyle = image.tintColor;
        ctx.globalAlpha = cfg.board.opacity * image.tintAlpha * 0.5;
        ctx.fillRect(x, y, w, h);
    }
}

function drawDarkWoodGrain(ctx, rect, s, cfg) {
    const { x, y, w, h } = rect;

    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#4e2f18');
    gradient.addColorStop(0.5, '#3b2210');
    gradient.addColorStop(1, '#2c180a');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = 'transparent';

    const step = Math.max(2, 3 * s * (cfg.textureScale * 2));
    for (let i = 0; i < h; i += step) {
        const wave = Math.sin(i * 0.05) * 0.03;
        ctx.fillStyle = (Math.floor(i / step) % 6 === 0)
            ? `rgba(255, 210, 160, ${0.03 + wave})`
            : `rgba(15, 5, 0, ${0.08 + wave})`;
        ctx.fillRect(x, y + i, w, 2 * s);
    }
}

// ---------- Holztafeln (Foto-Textur oder prozedurale Maserung) ----------

function drawWoodBoard(ctx, rect, s, cfg, images, style) {
    const { x, y, w, h } = rect;

    ctx.save();
    ctx.globalAlpha = cfg.board.opacity;
    applyDropShadow(ctx, s, style.shadowAlpha);

    if (images.texture) {
        ctx.fillStyle = style.baseColor;
        ctx.fillRect(x, y, w, h);
        ctx.shadowColor = 'transparent';
        drawImageFill(ctx, images.texture, rect, cfg.textureScale, cfg.image);
    } else {
        ctx.save();
        // Ohne Hintergrundbild steuert der Helligkeitsregler die Tafel
        if (!images.background) ctx.filter = `brightness(${cfg.image.brightness}%)`;
        style.drawGrain(ctx, rect, s, cfg, Boolean(images.background));
        ctx.restore();
    }

    drawFrame(ctx, rect, s, cfg.board.customBorder || style.frame);
    ctx.restore();
}

function drawModernBoard(ctx, rect, s, cfg) {
    const { x, y, w, h } = rect;

    ctx.save();
    ctx.globalAlpha = cfg.board.opacity;
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(x, y, w, h);

    if (cfg.board.customBorder) {
        drawFrame(ctx, rect, s, cfg.board.customBorder);
    } else {
        ctx.strokeStyle = 'rgb(85, 85, 85)';
        ctx.lineWidth = 4 * s;
        ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
}

// ---------- Stil-Definitionen ----------

const BOARD_STYLES = {
    spruce: {
        draw: drawWoodBoard,
        baseColor: '#e8cfa6',
        shadowAlpha: 0.65,
        drawGrain: drawSpruceGrain,
        frame: { outer: '#c49b66', inner: '#7a5229' },
        // Einschubleiste: dunkle Kante + helle Lichtkante (offset/height in Basis-Pixeln)
        dividers: [
            { color: '#9c7344', offset: -5, height: 6 },
            { color: '#f3dfc1', offset: 1, height: 3 }
        ]
    },
    wood: {
        draw: drawWoodBoard,
        baseColor: '#3b2210',
        shadowAlpha: 0.7,
        drawGrain: drawDarkWoodGrain,
        frame: { outer: '#5c381c', inner: '#8d6e46' },
        dividers: [
            { color: '#241205', offset: -6, height: 8 },
            { color: '#6e4526', offset: 2, height: 4 }
        ]
    },
    dark: {
        draw: drawModernBoard,
        dividers: null   // dünne helle Linie statt Leiste
    }
};

function getBoardStyle(name) {
    return BOARD_STYLES[name] || BOARD_STYLES.dark;
}

function drawBoard(ctx, rect, s, cfg, images) {
    const style = getBoardStyle(cfg.board.style);
    style.draw(ctx, rect, s, cfg, images, style);
}

// Einschubleiste unterhalb einer Zeile (bei lineY)
function drawDivider(ctx, rect, s, cfg, lineY) {
    const lineX = rect.x + 35 * s;
    const lineW = rect.w - 70 * s;
    const custom = cfg.board.customBorder;

    const dividers = custom
        ? [
            { color: custom.inner, offset: -5, height: 6 },
            { color: custom.outer, offset: 1, height: 3 }
        ]
        : getBoardStyle(cfg.board.style).dividers;

    ctx.save();
    ctx.globalAlpha = cfg.board.opacity;

    if (dividers) {
        dividers.forEach(d => {
            ctx.fillStyle = d.color;
            ctx.fillRect(lineX, lineY + d.offset * s, lineW, d.height * s);
        });
    } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX + lineW, lineY);
        ctx.stroke();
    }
    ctx.restore();
}

module.exports = { drawBoard, drawDivider };
