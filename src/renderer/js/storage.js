// Dünne Hülle um localStorage, damit z.B. ein volles Kontingent (große Bilder) die App nicht stoppt

function get(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function set(key, value) {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch (e) {
        console.warn(`Konnte "${key}" nicht speichern:`, e);
        return false;
    }
}

function remove(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        // ignorieren
    }
}

function getJson(key, fallback) {
    const raw = get(key);
    if (raw === null) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

module.exports = { get, set, remove, getJson };
