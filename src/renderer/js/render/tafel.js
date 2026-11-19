// Setzt das komplette Bild zusammen: Hintergrund, Tafel, Liednummern & Strophen.
const { drawImageFill } = require('./image-fill');
const { drawBoard, drawDivider } = require('./boards');
const { drawSongText } = require('./song-text');
const { applyMaster } = require('./master');

// Alle Maße beziehen sich auf eine 1920 px breite Ausgabe und werden mit "s" skaliert
const BASE_WIDTH = 1920;
const BOARD_W = 1600;
const BOARD_H = 900;
const MIN_ROWS = 4;
const MAX_FONT_ROW_RATIO = 0.7;   // Schrift höchstens 70 % der Zeilenhöhe (greift erst bei niedriger Tafel)
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
    const w = BOARD_W * s * cfg.board.widthFactor;
    const h = BOARD_H * s * cfg.board.heightFactor;
    return {
        x: (cfg.width - w) * cfg.board.posX,
        y: (cfg.height - h) * cfg.board.posY,
        w,
        h
    };
}

// Helle Fichte braucht dunkle Schrift, alles andere weiße Schrift mit Schatten
function useDarkBoardText(cfg, images) {
    return cfg.board.style === 'spruce'
        && cfg.board.opacity > 0.3
        && !images.texture
        && cfg.texture.brightness * cfg.master.brightness / 100 > 65;
}

// Bei schmaler Tafel rücken Farbmarker, Nummer und Strophen proportional zusammen
function horizontalScale(cfg, s) {
    return s * Math.min(1, cfg.board.widthFactor);
}

function drawColorMarker(ctx, rect, s, sx, color, rowY, rowH) {
    if (color === 'transparent') return;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6 * s;
    ctx.fillStyle = color;
    ctx.fillRect(
        rect.x + LAYOUT.colorBoxX * sx,
        rowY + LAYOUT.colorBoxInsetY * s,
        LAYOUT.colorBoxW * sx,
        rowH - 2 * LAYOUT.colorBoxInsetY * s
    );
    ctx.restore();
}

// Zeilen-Raster: eine Zeile je Lied, mindestens MIN_ROWS
function songRows(rect, s, count) {
    const paddingY = LAYOUT.paddingY * s;
    const rowH = (rect.h - paddingY * 2) / Math.max(count, MIN_ROWS);
    return Array.from({ length: count }, (_, i) => ({ y: rect.y + paddingY + i * rowH, h: rowH }));
}

function drawSongs(ctx, rect, s, cfg, songs, rows, images) {
    const darkText = useDarkBoardText(cfg, images);
    const sx = horizontalScale(cfg, s);

    songs.forEach((song, i) => {
        const row = rows[i];
        const maxFontPx = row.h * MAX_FONT_ROW_RATIO;
        drawColorMarker(ctx, rect, s, sx, song.color, row.y, row.h);
        drawSongText(ctx, s, cfg, song, {
            numberX: rect.x + LAYOUT.numberX * sx,
            strophenX: rect.x + LAYOUT.strophenX * sx,
            centerY: row.y + row.h / 2,
            rowH: row.h,
            numberFontPx: Math.min(LAYOUT.numberFontSize * s, maxFontPx),
            strophenFontPx: Math.min(cfg.text.strophenSize * s, maxFontPx)
        }, darkText);
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

    // 1. Hintergrund
    if (images.background) {
        const fullArea = { x: 0, y: 0, w: cfg.width, h: cfg.height };
        drawImageFill(ctx, images.background, fullArea, cfg.background);
    }

    const s = (cfg.width / BASE_WIDTH) * cfg.board.scale;
    const rect = boardRect(cfg, s);
    const rows = songRows(rect, s, songs.length);

    // 2. Tafel, Rahmen und Einschubleisten
    if (cfg.board.opacity > 0) {
        const trim = drawBoard(ctx, rect, s, cfg, images);
        rows.forEach(row => drawDivider(ctx, rect, s, cfg, row.y + row.h, trim));
    }

    // 3. Master-Helligkeit/-Tönung über alles bisher Gezeichnete
    applyMaster(canvas, cfg.master);

    // 4. Farbmarker, Nummern & Strophen (vom Master unberührt)
    drawSongs(ctx, rect, s, cfg, songs, rows, images);
}

module.exports = { renderTafel };
