// Zeichnet Liednummer und Strophen einer Zeile – direkt auf der Tafel
// oder auf Einschub-Karten (ganze Nummer bzw. eine Karte je Ziffer).

const CARD = {
    heightFactor: 1.3,     // Schrift wird verkleinert, wenn sie höher als Karte / heightFactor wäre
    slotMargin: 6,         // Abstand zu den Einschubleisten bei 100 % Kartenhöhe (Basis-Pixel)
    paddingFactor: 0.28,   // Innenabstand links/rechts bei ganzer Karte
    digitPadding: 0.14,    // Innenabstand je Ziffern-Karte
    offsetX: 20,           // Karte beginnt etwas links der Textposition
    cornerRadius: 4,
    defaultTextColor: '#1a1a1a'
};

const MIN_TEXT_GAP = 40;   // Mindestabstand Nummer -> Strophen (Basis-Pixel)

const PLAIN_COLORS = {
    light: { number: '#FFFFFF', strophen: '#FFE082' },
    dark: { number: '#1f1209', strophen: '#4e260c' }   // für helle Fichte
};

// Wahrgenommene Helligkeit 0..255 einer #rrggbb-Farbe
function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

function resolveColors(cfg, darkBoardText) {
    if (cfg.text.customColors) return cfg.text.customColors;
    if (cfg.text.mode !== 'plain') {
        return { number: CARD.defaultTextColor, strophen: CARD.defaultTextColor };
    }
    return darkBoardText ? PLAIN_COLORS.dark : PLAIN_COLORS.light;
}

// Dunkle Schrift bekommt einen hellen Schein, helle Schrift einen dunklen Schatten
function applyTextShadow(ctx, s, textColor) {
    if (luminance(textColor) < 128) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 4 * s;
        ctx.shadowOffsetX = 2 * s;
        ctx.shadowOffsetY = 2 * s;
    } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8 * s;
        ctx.shadowOffsetX = 3 * s;
        ctx.shadowOffsetY = 3 * s;
    }
}

function drawCard(ctx, x, centerY, w, h, color, s) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8 * s;
    ctx.shadowOffsetY = 3 * s;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, centerY - h / 2, w, h, CARD.cornerRadius * s);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.restore();
}

const setFont = (ctx, fontPx) => { ctx.font = `bold ${Math.round(fontPx)}px Arial`; };

// Ein Text auf einer gemeinsamen Karte; liefert die rechte Kante
function drawOnCard(ctx, text, x, centerY, fontPx, cardH, s, cfg) {
    const pad = fontPx * CARD.paddingFactor;
    const w = ctx.measureText(text).width + 2 * pad;
    const left = x - CARD.offsetX * s;
    drawCard(ctx, left, centerY, w, cardH, cfg.text.cardColor, s);
    ctx.fillText(text, left + w / 2, centerY);
    return left + w;
}

// Zerlegt z.B. "Str. 1, 2-5" in ["Str.", " ", "1", ",", " ", "2", "-", "5"]:
// Wörter bleiben zusammen, Ziffern und Satzzeichen werden einzeln
const CARD_TOKENS = /[\p{L}.]+|\s+|./gu;

// Jedes Teilstück auf einer eigenen Karte (Leerzeichen = Lücke); liefert die rechte Kante
function drawOnDigitCards(ctx, text, x, centerY, fontPx, cardH, s, cfg) {
    const pad = fontPx * CARD.digitPadding;
    const gap = cfg.text.cardGap * s;   // 0 = Karten berühren sich
    const digitW = ctx.measureText('0').width;
    let left = x - CARD.offsetX * s;
    let right = left;

    (text.match(CARD_TOKENS) || []).forEach(token => {
        if (!token.trim()) {
            left += (digitW + 2 * pad) / 2;
            return;
        }
        const w = Math.max(digitW, ctx.measureText(token).width) + 2 * pad;
        drawCard(ctx, left, centerY, w, cardH, cfg.text.cardColor, s);
        ctx.fillText(token, left + w / 2, centerY);
        right = left + w;
        left += w + gap;
    });
    return right;
}

// Zeichnet einen Text im gewählten Modus und liefert seine rechte Kante
function drawText(ctx, text, x, centerY, fontPx, rowH, s, cfg) {
    const mode = cfg.text.mode;

    if (mode === 'plain') {
        setFont(ctx, fontPx);
        ctx.fillText(text, x, centerY);
        return x + ctx.measureText(text).width;
    }

    // Kartenhöhe als Anteil des Fachs zwischen den Einschubleisten (100 % = ganzes Fach)
    const cardH = (rowH - 2 * CARD.slotMargin * s) * cfg.text.cardHeight;
    // Schrift verkleinern, falls sie nicht auf die Karte passt
    const cardFontPx = Math.min(fontPx, cardH / CARD.heightFactor);
    setFont(ctx, cardFontPx);

    ctx.save();
    ctx.textAlign = 'center';
    const right = mode === 'digitCards'
        ? drawOnDigitCards(ctx, text, x, centerY, cardFontPx, cardH, s, cfg)
        : drawOnCard(ctx, text, x, centerY, cardFontPx, cardH, s, cfg);
    ctx.restore();
    return right;
}

/**
 * @param pos { numberX, strophenX, centerY, rowH, numberFontPx } – bereits skaliert
 * @param darkBoardText true, wenn die Tafel hell ist und dunkle Schrift braucht
 */
function drawSongText(ctx, s, cfg, song, pos, darkBoardText) {
    const colors = resolveColors(cfg, darkBoardText);

    ctx.save();
    ctx.textBaseline = 'middle';
    if (cfg.text.mode === 'plain') applyTextShadow(ctx, s, colors.number);

    ctx.fillStyle = colors.number;
    const numberRight = drawText(ctx, song.nr, pos.numberX, pos.centerY, pos.numberFontPx, pos.rowH, s, cfg);

    if (song.str) {
        ctx.fillStyle = colors.strophen;
        // Lange Nummern (z.B. "EG 123") schieben die Strophen nach rechts statt sie zu überdecken
        const cardOffset = cfg.text.mode === 'plain' ? 0 : CARD.offsetX * s;
        const strophenX = Math.max(pos.strophenX, numberRight + MIN_TEXT_GAP * s + cardOffset);
        const text = cfg.text.showPrefix ? `Str. ${song.str}` : song.str;
        drawText(ctx, text, strophenX, pos.centerY, cfg.text.strophenSize * s, pos.rowH, s, cfg);
    }
    ctx.restore();
}

module.exports = { drawSongText };
