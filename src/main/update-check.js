const { app, net } = require('electron');
const pkg = require('../../package.json');

// Prüft über die GitHub-API, ob ein neueres Release als die laufende Version existiert.
// Es wird nichts automatisch installiert – die Oberfläche bietet nur den Download an.

const REPO = parseRepo(pkg.repository && pkg.repository.url);
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;

function parseRepo(url) {
    const match = /github\.com[/:]([^/]+\/[^/.]+)/.exec(url || '');
    if (!match) throw new Error('package.json: repository.url zeigt nicht auf GitHub');
    return match[1];
}

/** Zerlegt "v1.2.3-beta.1" in { nums: [1,2,3], pre: 'beta.1' } */
function parseVersion(v) {
    const [main, pre = ''] = String(v).trim().replace(/^v/i, '').split('-', 2);
    const nums = main.split('.').map((n) => parseInt(n, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return { nums, pre };
}

/** > 0, wenn a neuer als b ist */
function compareVersions(a, b) {
    const va = parseVersion(a);
    const vb = parseVersion(b);
    for (let i = 0; i < 3; i++) {
        if (va.nums[i] !== vb.nums[i]) return va.nums[i] - vb.nums[i];
    }
    if (va.pre === vb.pre) return 0;
    if (!va.pre) return 1;   // 1.0.0 ist neuer als 1.0.0-beta
    if (!vb.pre) return -1;
    return va.pre.localeCompare(vb.pre, undefined, { numeric: true });
}

/** Sucht die zur laufenden Installation passende Datei im Release */
function pickAsset(assets) {
    const names = assets.map((a) => ({ a, n: a.name.toLowerCase() }));
    const find = (fn) => (names.find(fn) || {}).a;

    if (process.platform === 'win32') {
        // electron-builder setzt diese Variable, wenn die portable EXE läuft
        const portable = !!process.env.PORTABLE_EXECUTABLE_FILE;
        return find(({ n }) => n.endsWith('.exe') && n.includes(portable ? 'portable' : 'setup'));
    }
    if (process.platform === 'darwin') {
        return find(({ n }) => n.endsWith('.dmg') && n.includes(process.arch))
            || find(({ n }) => n.endsWith('.dmg'));
    }
    // Linux: deb oder rpm lässt sich nicht sicher erkennen -> Release-Seite
    return undefined;
}

async function checkForUpdates() {
    const current = app.getVersion();
    const response = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': `${pkg.productName || pkg.name}-update-check`
        }
    });

    if (response.status === 404) {
        // Noch kein (nicht-Pre-)Release veröffentlicht
        return { current, latest: null, updateAvailable: false, releasesUrl: RELEASES_PAGE };
    }
    if (!response.ok) {
        throw new Error(`GitHub antwortet mit Status ${response.status}`);
    }

    const release = await response.json();
    const latest = String(release.tag_name || '').replace(/^v/i, '');
    const asset = pickAsset(release.assets || []);

    return {
        current,
        latest,
        updateAvailable: !!latest && compareVersions(latest, current) > 0,
        releaseName: release.name || `Version ${latest}`,
        releaseUrl: release.html_url || RELEASES_PAGE,
        releasesUrl: RELEASES_PAGE,
        downloadUrl: asset ? asset.browser_download_url : null,
        downloadName: asset ? asset.name : null
    };
}

/** Nur Links ins eigene Repository dürfen extern geöffnet werden */
function isAllowedExternalUrl(url) {
    return typeof url === 'string' && url.startsWith(`https://github.com/${REPO}/`);
}

module.exports = { checkForUpdates, compareVersions, isAllowedExternalUrl };
