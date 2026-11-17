// Hinweis auf neue Versionen (GitHub-Releases). Die Abfrage selbst läuft im Main-Prozess.
const { ipcRenderer } = require('electron');
const storage = require('./storage');

const AUTO_CHECK_DELAY_MS = 3000;          // Start der App nicht ausbremsen
const SKIPPED_VERSION_KEY = 'updateSkippedVersion';

let banner = null;
let lastResult = null;

function el(id) {
    return document.getElementById(id);
}

function setCheckInfo(text, type = '') {
    const info = el('updateCheckInfo');
    info.textContent = text;
    info.className = `update-check-info ${type}`;
}

function openExternal(url) {
    if (url) ipcRenderer.invoke('open-external', url);
}

function showBanner(result) {
    lastResult = result;
    el('updateBannerText').textContent =
        `Version ${result.latest} ist verfügbar (installiert: ${result.current}).`;
    el('updateDownloadBtn').textContent = result.downloadUrl ? '⬇️ Herunterladen' : '🔗 Zur Download-Seite';
    el('updateDownloadBtn').title = result.downloadName || result.releaseUrl;
    banner.classList.add('visible');
}

function hideBanner() {
    banner.classList.remove('visible');
}

/** @param manual true, wenn der Nutzer selbst geklickt hat (zeigt dann auch "aktuell"/Fehler an) */
async function check(manual) {
    const button = el('checkUpdateBtn');
    button.disabled = true;
    if (manual) setCheckInfo('Suche nach Updates...', 'info');

    try {
        const result = await ipcRenderer.invoke('check-for-updates');

        if (result.updateAvailable) {
            setCheckInfo(`Neue Version ${result.latest} verfügbar.`, 'info');
            const skipped = storage.get(SKIPPED_VERSION_KEY) === result.latest;
            if (manual || !skipped) showBanner(result);
        } else if (manual) {
            setCheckInfo(result.latest
                ? `Du hast die aktuelle Version (${result.current}).`
                : 'Auf GitHub ist noch kein Release veröffentlicht.', 'success');
        }
    } catch (e) {
        console.warn('Update-Prüfung fehlgeschlagen:', e);
        if (manual) setCheckInfo('Update-Prüfung fehlgeschlagen (keine Internetverbindung?).', 'error');
    } finally {
        button.disabled = false;
    }
}

async function init() {
    banner = el('updateBanner');

    el('updateDownloadBtn').addEventListener('click', () => {
        if (!lastResult) return;
        openExternal(lastResult.downloadUrl || lastResult.releaseUrl);
        hideBanner();
    });
    el('updateNotesBtn').addEventListener('click', () => lastResult && openExternal(lastResult.releaseUrl));
    el('updateLaterBtn').addEventListener('click', hideBanner);
    el('updateSkipBtn').addEventListener('click', () => {
        if (lastResult) storage.set(SKIPPED_VERSION_KEY, lastResult.latest);
        hideBanner();
    });
    el('checkUpdateBtn').addEventListener('click', () => check(true));

    const version = await ipcRenderer.invoke('get-app-version');
    el('appVersion').textContent = `Version ${version}`;

    setTimeout(() => check(false), AUTO_CHECK_DELAY_MS);
}

module.exports = { init };
