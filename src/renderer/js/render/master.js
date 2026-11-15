// Master-Ebene: Helligkeit und Tönung über alles, was bisher auf dem Canvas ist
// (Hintergrund, Tafel, Rahmen, Leisten). Text wird erst danach gezeichnet.

function copyOf(canvas) {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    return copy;
}

function applyBrightness(canvas, brightness) {
    const scene = copyOf(canvas);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${brightness}%)`;
    ctx.drawImage(scene, 0, 0);
    ctx.restore();
}

// Tönung nur dort, wo bereits etwas gezeichnet ist (transparente Bereiche bleiben transparent)
function applyTint(canvas, color, alpha) {
    const tint = document.createElement('canvas');
    tint.width = canvas.width;
    tint.height = canvas.height;
    const tctx = tint.getContext('2d');
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, tint.width, tint.height);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(canvas, 0, 0);

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(tint, 0, 0);
    ctx.globalAlpha = alpha * 0.45;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tint, 0, 0);
    ctx.restore();
}

function applyMaster(canvas, master) {
    if (master.brightness !== 100) applyBrightness(canvas, master.brightness);
    if (master.tintAlpha > 0) applyTint(canvas, master.tintColor, master.tintAlpha);
}

module.exports = { applyMaster };
