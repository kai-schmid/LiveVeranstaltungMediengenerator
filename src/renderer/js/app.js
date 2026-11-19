// Einstiegspunkt der Oberfläche: verbindet die einzelnen Module miteinander.
const settings = require('./settings');
const songs = require('./songs');
const imageStore = require('./images');
const fullscreen = require('./fullscreen');
const valueDialog = require('./value-dialog');
const actions = require('./actions');
const backup = require('./backup');
const update = require('./update');
const boardRatio = require('./board-ratio');
const { readRenderConfig } = require('./config');
const { runMigrations } = require('./migrations');
const { renderTafel } = require('./render/tafel');

const canvas = document.getElementById('tafelCanvas');

function render() {
    boardRatio.update();
    renderTafel(canvas, readRenderConfig(), songs.getVisibleSongs(), imageStore.images);
    fullscreen.pushFrame(canvas);
}

async function start() {
    runMigrations();
    settings.init({ onRender: render });
    valueDialog.init({ onApply: settings.setValue });
    boardRatio.init({ setValue: settings.setValue });
    songs.init({ onSongsChanged: render });
    imageStore.init({ onImagesChanged: render });
    actions.init(canvas);
    backup.init({ onImported: render });
    update.init().catch((e) => console.warn('Update-Hinweis nicht verfügbar:', e));

    render();
    await fullscreen.init({ onRender: render });
}

start();
