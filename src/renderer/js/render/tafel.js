// Setzt das komplette Bild zusammen: Hintergrund, Tafel, Liednummern & Strophen.
const { drawImageFill } = require('./image-fill');
const { drawBoard, drawDivider } = require('./boards');

// Alle Maße beziehen sich auf eine 1920 px breite Ausgabe und werden mit "s" skaliert
const BASE_WIDTH = 1920;
const BOARD_W = 1600;
const BOARD_H = 900;
const MIN_ROWS = 4;
const LAYOUT = {
    paddingY: 40,
    colorBoxX: 55,
    colorBoxW: 85,
    colorBoxInsetY: 18,
    numberX: 180,
    numberFontSize: 95,
    strophenX: 590
};

function boardRect(cfg, s) {
    const w = BOARD_W * s;
    const h = BOARD_H * s;
    return {
        x: (cfg.width - w) * cfg.board.posX,
        y: (cfg.height - h) * cfg.board.posY,
        w,
        h
    };
}

// Helle Fichte braucht dunkle Schrift, alles andere weiße Schrift mit Schatten
function useDarkText(cfg, images) {
    return cfg.board.style === 'spruce'
        && cfg.board.opacity > 0.3
        && !images.texture
        && cfg.image.brightness > 65;
}

function applyTextStyle(ctx, s, darkText) {
    if (darkText) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 4 * s;
        ctx.shadowOffsetX = 2 * s;
        ctx.shadowOffsetY = 2 * s;
        ctx.fillStyle = '#1f1209';
    } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8 * s;
        ctx.shadowOffsetX = 3 * s;
        ctx.shadowOffsetY = 3 * s;
        ctx.fillStyle = '#FFFFFF';
    }
}

function drawColorMarker(ctx, rect, s, color, rowY, rowH) {
    if (color === 'transparent') return;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6 * s;
    ctx.fillStyle = color;
    ctx.fillRect(
        rect.x + LAYOUT.colorBoxX * s,
        rowY + LAYOUT.colorBoxInsetY * s,
        LAYOUT.colorBoxW * s,
        rowH - 2 * LAYOUT.colorBoxInsetY * s
    );
    ctx.restore();
}

function drawSongText(ctx, rect, s, cfg, song, centerY, darkText) {
    ctx.save();
    applyTextStyle(ctx, s, darkText);
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.round(LAYOUT.numberFontSize * s)}px Arial`;
    ctx.fillText(song.nr, rect.x + LAYOUT.numberX * s, centerY);

    if (song.str) {
        ctx.fillStyle = darkText ? '#4e260c' : '#FFE082';
        ctx.font = `bold ${Math.round(cfg.text.strophenSize * s)}px Arial`;
        const text = cfg.text.showPrefix ? `Str. ${song.str}` : song.str;
        ctx.fillText(text, rect.x + LAYOUT.strophenX * s, centerY);
    }
    ctx.restore();
}

function drawSongs(ctx, rect, s, cfg, songs, images) {
    if (songs.length === 0) return;

    const paddingY = LAYOUT.paddingY * s;
    const rowH = (rect.h - paddingY * 2) / Math.max(songs.length, MIN_ROWS);
    const darkText = useDarkText(cfg, images);
    let rowY = rect.y + paddingY;

    songs.forEach(song => {
        drawColorMarker(ctx, rect, s, song.color, rowY, rowH);
        drawSongText(ctx, rect, s, cfg, song, rowY + rowH / 2, darkText);
        if (cfg.board.opacity > 0) drawDivider(ctx, rect, s, cfg, rowY + rowH);
        rowY += rowH;
    });
}

/**
 * @param canvas Ziel-Canvas (wird auf die gewählte Auflösung gesetzt)
 * @param cfg    Ergebnis von readRenderConfig()
 * @param songs  [{ nr, color, str }] – nur Lieder mit Nummer
 * @param images { background: Image|null, texture: Image|null }
 */
function renderTafel(canvas, cfg, songs, images) {
    canvas.width = cfg.width;
    canvas.height = cfg.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cfg.width, cfg.height);

    if (images.background) {
        const fullArea = { x: 0, y: 0, w: cfg.width, h: cfg.height };
        drawImageFill(ctx, images.background, fullArea, cfg.backgroundScale, cfg.image);
    }

    const s = (cfg.width / BASE_WIDTH) * cfg.board.scale;
    const rect = boardRect(cfg, s);

    if (cfg.board.opacity > 0) drawBoard(ctx, rect, s, cfg, images);
    drawSongs(ctx, rect, s, cfg, songs, images);
}

module.exports = { renderTafel };
