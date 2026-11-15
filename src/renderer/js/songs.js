// Liederliste: Zeilen anlegen/löschen, speichern und wiederherstellen.
const storage = require('./storage');

const STORAGE_KEY = 'savedSongsList';

const SONG_COLORS = [
    { name: 'Transparent', hex: 'transparent' },
    { name: 'Blau', hex: '#1565C0' },
    { name: 'Rot', hex: '#C62828' },
    { name: 'Grün', hex: '#2E7D32' },
    { name: 'Gelb', hex: '#F9A825' },
    { name: 'Lila', hex: '#6A1B9A' },
    { name: 'Weiß', hex: '#E0E0E0' },
    { name: 'Schwarz', hex: '#212121' }
];

const EMPTY_SONG = { nr: '', color: 'transparent', str: '' };
const EMPTY_LIST_ROWS = 4;
const EXAMPLE_SONGS = [
    { nr: '104', color: 'transparent', str: '1-3' },
    { nr: '241', color: 'transparent', str: '1, 2, 5' },
    { nr: '312', color: 'transparent', str: 'alle' },
    EMPTY_SONG
];

let listEl = null;
let onChange = () => {};

function createInput(className, placeholder, value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.placeholder = placeholder;
    input.value = value;
    return input;
}

function createColorSelect(selected) {
    const select = document.createElement('select');
    select.className = 'inp-color';
    SONG_COLORS.forEach(c => select.add(new Option(c.name, c.hex, false, c.hex === selected)));
    return select;
}

function createRow({ nr = '', color = 'transparent', str = '' } = {}) {
    const row = document.createElement('div');
    row.className = 'song-row';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-del';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Lied entfernen';

    row.append(
        createInput('inp-nr', 'Nr. (z.B. 324)', nr),
        createColorSelect(color),
        createInput('inp-str', 'Strophen (leer = ohne)', str),
        deleteBtn
    );
    return row;
}

function readRow(row) {
    return {
        nr: row.querySelector('.inp-nr').value,
        color: row.querySelector('.inp-color').value,
        str: row.querySelector('.inp-str').value
    };
}

function save() {
    const songs = [...listEl.querySelectorAll('.song-row')].map(readRow);
    storage.set(STORAGE_KEY, JSON.stringify(songs));
}

function changed() {
    save();
    onChange();
}

function setRows(songs) {
    listEl.replaceChildren(...songs.map(createRow));
}

function addSong(song = EMPTY_SONG) {
    listEl.appendChild(createRow(song));
    changed();
}

function clearAll() {
    setRows(Array(EMPTY_LIST_ROWS).fill(EMPTY_SONG));
    changed();
}

// Nur Lieder mit Nummer werden auf der Tafel gezeichnet
function getVisibleSongs() {
    return [...listEl.querySelectorAll('.song-row')]
        .map(readRow)
        .map(s => ({ nr: s.nr.trim(), color: s.color, str: s.str.trim() }))
        .filter(s => s.nr);
}

function restore() {
    const raw = storage.get(STORAGE_KEY);
    if (raw === null) {
        setRows(EXAMPLE_SONGS);
        return;
    }
    const saved = storage.getJson(STORAGE_KEY, null);
    if (!Array.isArray(saved)) {
        setRows([EXAMPLE_SONGS[0]]);
    } else {
        setRows(saved.length > 0 ? saved : [EMPTY_SONG]);
    }
}

function init({ onSongsChanged }) {
    listEl = document.getElementById('songList');
    onChange = onSongsChanged;

    restore();

    listEl.addEventListener('input', changed);
    listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-del');
        if (!btn) return;
        btn.closest('.song-row').remove();
        changed();
    });

    document.getElementById('addSongBtn').addEventListener('click', () => addSong());
    document.getElementById('clearSongsBtn').addEventListener('click', clearAll);
}

module.exports = { init, getVisibleSongs };
