// Zeichnet die Tafel selbst (Oberfläche + Rahmen) und die Einschubleisten zwischen den Zeilen.
const { drawImageFill, applyTint } = require('./image-fill');
const { shade, averageColor } = require('./color');
const { withHorizontalGrain } = require('./grain-direction');

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

// ---------- Rahmen aus Holz-Textur ----------

// Aus welcher Höhe (Anteil der Tafelhöhe) die Holzstreifen für die vier Leisten entnommen werden –
// bewusst zwischen den Brettfugen der prozeduralen Maserung und je Seite verschieden
const FRAME_STRIP_SOURCE_Y = { top: 0.06, bottom: 0.56, left: 0.31, right: 0.81 };
const FRAME_TEXTURE_SHADE = 0.22;   // Rahmen ohne Tönung etwas dunkler als die Tafelfläche

/**
 * Zeichnet die Holzoberfläche einmal in ein unsichtbares Canvas, aus dem die Leisten geschnitten werden.
 * Die Fasern liegen darin immer waagerecht – ein Foto mit senkrechter Maserung wird dafür gedreht.
 */
function renderWoodCanvas(rect, s, cfg, images, style) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(Math.max(rect.w, rect.h));
    canvas.height = Math.ceil(rect.h);
    const woodStyle = style.drawGrain ? style : BOARD_STYLES.wood;   // Modern-Stil: dunkles Holz
    const woodImages = images.texture
        ? { ...images, texture: withHorizontalGrain(images.texture) }
        : images;
    drawWoodSurface(canvas.getContext('2d'),
        { x: 0, y: 0, w: canvas.width, h: canvas.height }, s, cfg, woodImages, woodStyle);
    return canvas;
}

/** Färbt die Rahmenfläche ein, die Maserung bleibt sichtbar (multiplizieren + Farbton übernehmen) */
function tintFrameRing(ctx, rect, fw, color, strength) {
    if (strength <= 0) return;
    const baseAlpha = ctx.globalAlpha;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.rect(rect.x + fw, rect.y + fw, rect.w - 2 * fw, rect.h - 2 * fw);
    ctx.clip('evenodd');
    ctx.fillStyle = color;

    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = baseAlpha * strength;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = baseAlpha * strength * 0.6;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
}

function clipPolygon(ctx, points) {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
    ctx.clip();
}

/**
 * Rahmen wie aus vier Holzleisten mit Gehrung: oben/unten waagerechte, links/rechts senkrechte Maserung.
 * @param colors   { outer: Tönungsfarbe des Holzes, inner: Farbe der Zierlinie }
 * @param strength Stärke der Tönung 0..1
 */
function drawTexturedFrame(ctx, rect, s, wood, colors, strength) {
    const { x, y, w, h } = rect;
    const fw = FRAME_WIDTH * s;
    const srcY = key => Math.min(wood.height - fw, FRAME_STRIP_SOURCE_Y[key] * wood.height);

    const sides = [
        {   // oben
            poly: [[x, y], [x + w, y], [x + w - fw, y + fw], [x + fw, y + fw]],
            draw: () => ctx.drawImage(wood, 0, srcY('top'), w, fw, x, y, w, fw)
        },
        {   // unten
            poly: [[x, y + h], [x + w, y + h], [x + w - fw, y + h - fw], [x + fw, y + h - fw]],
            draw: () => ctx.drawImage(wood, 0, srcY('bottom'), w, fw, x, y + h - fw, w, fw)
        },
        {   // links: Streifen um -90° gedreht
            poly: [[x, y], [x + fw, y + fw], [x + fw, y + h - fw], [x, y + h]],
            draw: () => {
                ctx.translate(x, y + h);
                ctx.rotate(-Math.PI / 2);
                ctx.drawImage(wood, 0, srcY('left'), h, fw, 0, 0, h, fw);
            }
        },
        {   // rechts: Streifen um +90° gedreht
            poly: [[x + w, y], [x + w, y + h], [x + w - fw, y + h - fw], [x + w - fw, y + fw]],
            draw: () => {
                ctx.translate(x + w, y);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(wood, 0, srcY('right'), h, fw, 0, 0, h, fw);
            }
        }
    ];

    ctx.save();
    ctx.shadowColor = 'transparent';
    sides.forEach(side => {
        ctx.save();
        clipPolygon(ctx, side.poly);
        side.draw();
        ctx.restore();
    });

    tintFrameRing(ctx, rect, fw, colors.outer, strength);

    // Ungetönt etwas abdunkeln, damit sich der Rahmen von der Tafel abhebt
    const shadeAlpha = FRAME_TEXTURE_SHADE * (1 - strength);
    if (shadeAlpha > 0) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.rect(x + fw, y + fw, w - 2 * fw, h - 2 * fw);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadeAlpha})`;
        ctx.fill('evenodd');
    }

    // Gehrungsfugen an den Ecken
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    [[x, y, x + fw, y + fw], [x + w, y, x + w - fw, y + fw],
     [x, y + h, x + fw, y + h - fw], [x + w, y + h, x + w - fw, y + h - fw]]
        .forEach(([x1, y1, x2, y2]) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); });
    ctx.stroke();

    // Lichtkante außen oben/links, Schattenkante außen unten/rechts
    const edge = Math.max(1, 2 * s);
    ctx.fillStyle = 'rgba(255, 240, 215, 0.22)';
    ctx.fillRect(x, y, w, edge);
    ctx.fillRect(x, y, edge, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y + h - edge, w, edge);
    ctx.fillRect(x + w - edge, y, edge, h);

    // Zierlinie innen
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = colors.inner;
    ctx.strokeRect(x + fw, y + fw, w - fw * 2, h - fw * 2);
    ctx.restore();
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
        case 'texture': {
            // Rahmen aus der Textur, getönt mit der Außenrand-Farbe; Zierlinie & Leisten in eigener Farbe
            const trim = trimFromColors(cfg.board.customBorder.outer, cfg.board.customBorder.inner);
            trim.textured = true;
            return trim;
        }
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

    if (trim.textured) {
        const wood = renderWoodCanvas(rect, s, cfg, images, style);
        drawTexturedFrame(ctx, rect, s, wood, trim.frame, cfg.board.frameTint);
    } else if (trim.frame) {
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
