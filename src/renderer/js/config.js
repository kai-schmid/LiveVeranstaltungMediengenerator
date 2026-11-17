// Liest die aktuellen Bedienelemente in ein reines Objekt ein.
// Die Zeichenfunktionen arbeiten nur mit diesem Objekt und greifen nicht selbst aufs DOM zu.

const byId = id => document.getElementById(id);
const value = id => byId(id).value;
const number = id => parseFloat(value(id));
const percent = id => number(id) / 100;
const checked = id => byId(id).checked;

// Einstellungen einer Bild-Ebene ('bg' = Hintergrund, 'tex' = Holz/Tafel)
function readImageLayer(prefix) {
    return {
        mode: value(`${prefix}Mode`),                // 'tile' | 'cover'
        scale: percent(`${prefix}Scale`),            // Faktor, 0.5 = 50 %
        brightness: number(`${prefix}Brightness`),   // in %
        tintColor: value(`${prefix}TintColor`),
        tintAlpha: percent(`${prefix}TintOpacity`),  // 0..1
        seamless: checked('seamlessTile')
    };
}

function readRenderConfig() {
    const [width, height] = value('resolution').split('x').map(Number);

    return {
        width,
        height,
        background: readImageLayer('bg'),
        texture: readImageLayer('tex'),
        // Wirkt zusätzlich auf Hintergrund, Tafel, Rahmen und Leisten (nicht auf Text)
        master: {
            brightness: number('masterBrightness'),
            tintColor: value('masterTintColor'),
            tintAlpha: percent('masterTintOpacity')
        },
        board: {
            style: value('boardStyle'),            // 'spruce' | 'wood' | 'dark'
            opacity: percent('boxOpacity'),
            scale: percent('boardScale'),
            posX: percent('boardPosX'),
            posY: percent('boardPosY'),
            borderMode: value('borderMode'),       // 'style' | 'custom' | 'wood' | 'texture'
            customBorder: { outer: value('customBorderColor'), inner: value('customInnerBorderColor') }
        },
        text: {
            strophenSize: number('strophenSize'),
            showPrefix: checked('showStrPrefix'),
            mode: value('textMode'),               // 'plain' | 'cards' | 'digitCards'
            cardColor: value('cardColor'),
            cardHeight: percent('cardHeight'),     // Anteil der Zeilenhöhe 0..1
            cardGap: number('cardGap'),            // Abstand der Ziffern-Karten (Basis-Pixel)
            customColors: checked('useCustomTextColor')
                ? { number: value('numberTextColor'), strophen: value('strophenTextColor') }
                : null
        }
    };
}

function readAtemConfig() {
    return {
        ip: value('atemIp').trim(),
        slot: parseInt(value('poolSlot'), 10) - 1,   // ATEM zählt ab 0
        mp: parseInt(value('mediaPlayer'), 10)
    };
}

module.exports = { readRenderConfig, readAtemConfig };
