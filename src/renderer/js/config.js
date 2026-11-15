// Liest die aktuellen Bedienelemente in ein reines Objekt ein.
// Die Zeichenfunktionen arbeiten nur mit diesem Objekt und greifen nicht selbst aufs DOM zu.

const byId = id => document.getElementById(id);
const value = id => byId(id).value;
const number = id => parseFloat(value(id));
const percent = id => number(id) / 100;
const checked = id => byId(id).checked;

function readRenderConfig() {
    const [width, height] = value('resolution').split('x').map(Number);

    return {
        width,
        height,
        image: {
            mode: value('bgMode'),                 // 'tile' | 'cover'
            brightness: number('bgBrightness'),    // in %
            seamless: checked('seamlessTile'),
            tintColor: value('bgTintColor'),
            tintAlpha: percent('bgTintOpacity')    // 0..1
        },
        backgroundScale: percent('bgScale'),
        textureScale: percent('texScale'),
        board: {
            style: value('boardStyle'),            // 'spruce' | 'wood' | 'dark'
            opacity: percent('boxOpacity'),
            scale: percent('boardScale'),
            posX: percent('boardPosX'),
            posY: percent('boardPosY'),
            customBorder: checked('useCustomBorder')
                ? { outer: value('customBorderColor'), inner: value('customInnerBorderColor') }
                : null
        },
        text: {
            strophenSize: number('strophenSize'),
            showPrefix: checked('showStrPrefix')
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
