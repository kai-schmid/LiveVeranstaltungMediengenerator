// Einstiegspunkt der Oberfläche: verbindet die einzelnen Module miteinander.
const settings = require('./settings');
const songs = require('./songs');
const imageStore = require('./images');
const fullscreen = require('./fullscreen');
const valueDialog = require('./value-dialog');
const actions = require('./actions');
const { readRenderConfig } = require('./config');
const { runMigrations } = require('./migrations');
const { renderTafel } = require('./render/tafel');

const canvas = document.getElementById('tafelCanvas');

function render() {
    renderTafel(canvas, readRenderConfig(), songs.getVisibleSongs(), imageStore.images);
    fullscreen.pushFrame(canvas);
}

async function start() {
    runMigrations();
    settings.init({ onRender: render });
    valueDialog.init({ onApply: settings.setValue });
    songs.init({ onSongsChanged: render });
    imageStore.init({ onImagesChanged: render });
    actions.init(canvas);

    render();
    await fullscreen.init({ onRender: render });
}

start();
