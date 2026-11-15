// Zeichnet die Tafel selbst (Oberfläche + Rahmen) und die Einschubleisten zwischen den Zeilen.
const { drawImageFill, applyTint } = require('./image-fill');
const { shade, averageColor } = require('./color');

// ---------- Rahmen ----------

const FRAME_WIDTH = 20;

function drawFrame(ctx, rect, s, colors) {
    const { x, y, w, h } = rect;
    const frameWidth = FRAME_WIDTH * s;

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

// ---------- Prozedurale Holzmaserung (ohne eigenes Foto) ----------

function drawSpruceGrain(ctx, rect, s, texture) {
    const { x, y, w, h } = rect;

    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#e8cfa6');
    gradient.addColorStop(0.5, '#dfbe8f');
    gradient.addColorStop(1, '#d5b17d');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = 'transparent';

    // Maserungslinien
    const step = Math.max(1.5, 2.5 * s * (texture.scale * 2));
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
}

function drawDarkWoodGrain(ctx, rect, s, texture) {
    const { x, y, w, h } = rect;

    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#4e2f18');
    gradient.addColorStop(0.5, '#3b2210');
    gradient.addColorStop(1, '#2c180a');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.shadowColor = 'transparent';

    const step = Math.max(2, 3 * s * (texture.scale * 2));
    for (let i = 0; i < h; i += step) {
        const wave = Math.sin(i * 0.05) * 0.03;
        ctx.fillStyle = (Math.floor(i / step) % 6 === 0)
            ? `rgba(255, 210, 160, ${0.03 + wave})`
            : `rgba(15, 5, 0, ${0.08 + wave})`;
        ctx.fillRect(x, y + i, w, 2 * s);
    }
}

// ---------- Tafel-Oberflächen ----------

// Holz: eigenes Foto oder prozedurale Maserung, jeweils mit Helligkeit & Tönung der Holz-Ebene
function drawWoodSurface(ctx, rect, s, cfg, images, style) {
    const { x, y, w, h } = rect;
    const texture = cfg.texture;

    if (images.texture) {
        ctx.fillStyle = style.baseColor;
        ctx.fillRect(x, y, w, h);
        ctx.shadowColor = 'transparent';
        drawImageFill(ctx, images.texture, rect, texture);
        return;
    }

    ctx.save();
    ctx.filter = `brightness(${texture.brightness}%)`;
    style.drawGrain(ctx, rect, s, texture);
    ctx.restore();
    applyTint(ctx, rect, texture);
}

function drawModernSurface(ctx, rect) {
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

// ---------- Stil-Definitionen ----------

const BOARD_STYLES = {
    spruce: {
        drawSurface: drawWoodSurface,
        drawGrain: drawSpruceGrain,
        baseColor: '#e8cfa6',
        shadowAlpha: 0.65,
        frame: { outer: '#c49b66', inner: '#7a5229' },
        // Einschubleiste: dunkle Kante + helle Lichtkante (offset/height in Basis-Pixeln)
        dividers: [
            { color: '#9c7344', offset: -5, height: 6 },
            { color: '#f3dfc1', offset: 1, height: 3 }
        ]
    },
    wood: {
        drawSurface: drawWoodSurface,
        drawGrain: drawDarkWoodGrain,
        baseColor: '#3b2210',
        shadowAlpha: 0.7,
        frame: { outer: '#5c381c', inner: '#8d6e46' },
        dividers: [
            { color: '#241205', offset: -6, height: 8 },
            { color: '#6e4526', offset: 2, height: 4 }
        ]
    },
    dark: {
        drawSurface: drawModernSurface,
        shadowAlpha: 0,
        frame: null,      // nur dünne graue Kontur
        dividers: null    // dünne helle Linie statt Leiste
    }
};

function getBoardStyle(name) {
    return BOARD_STYLES[name] || BOARD_STYLES.dark;
}

// ---------- Farben für Rahmen & Leisten ----------

function trimFromColors(outer, inner) {
    return {
        frame: { outer, inner },
        dividers: [
            { color: inner, offset: -5, height: 6 },
            { color: outer, offset: 1, height: 3 }
        ]
    };
}

// Leitet Rahmen & Leisten aus der Durchschnittsfarbe der fertig getönten Tafel ab
function trimFromWoodColor(ctx, rect, s) {
    const inset = (FRAME_WIDTH + 5) * s;
    const wood = averageColor(ctx.canvas, {
        x: rect.x + inset, y: rect.y + inset, w: rect.w - 2 * inset, h: rect.h - 2 * inset
    });
    return {
        wood,
        frame: { outer: shade(wood, -0.3), inner: shade(wood, -0.6) },
        dividers: [
            { color: shade(wood, -0.45), offset: -5, height: 6 },
            { color: shade(wood, 0.35), offset: 1, height: 3 }
        ]
    };
}

function resolveTrim(ctx, rect, s, cfg, style) {
    switch (cfg.board.borderMode) {
        case 'custom':
            return trimFromColors(cfg.board.customBorder.outer, cfg.board.customBorder.inner);
        case 'wood':
            return trimFromWoodColor(ctx, rect, s);
        default:
            return { frame: style.frame, dividers: style.dividers };
    }
}

// ---------- Öffentliche Funktionen ----------

/**
 * Zeichnet Oberfläche und Rahmen der Tafel.
 * @returns die verwendeten Farben für Rahmen & Leisten ({ frame, dividers })
 */
function drawBoard(ctx, rect, s, cfg, images) {
    const style = getBoardStyle(cfg.board.style);

    ctx.save();
    ctx.globalAlpha = cfg.board.opacity;
    if (style.shadowAlpha) applyDropShadow(ctx, s, style.shadowAlpha);

    style.drawSurface(ctx, rect, s, cfg, images, style);
    const trim = resolveTrim(ctx, rect, s, cfg, style);

    if (trim.frame) {
        drawFrame(ctx, rect, s, trim.frame);
    } else {
        ctx.strokeStyle = 'rgb(85, 85, 85)';
        ctx.lineWidth = 4 * s;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
    return trim;
}

// Einschubleiste unterhalb einer Zeile (bei lineY)
function drawDivider(ctx, rect, s, cfg, lineY, trim) {
    const lineX = rect.x + 35 * s;
    const lineW = rect.w - 70 * s;

    ctx.save();
    ctx.globalAlpha = cfg.board.opacity;

    if (trim.dividers) {
        trim.dividers.forEach(d => {
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
