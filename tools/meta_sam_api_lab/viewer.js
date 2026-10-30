const $ = id => document.getElementById(id);
let current = null, identifier = '', frameIndex = 0, revision = 0;
const cache = new Map();
const asset = path => '/assets/' + path.split('/').map(encodeURIComponent).join('/');
async function request(url, options = {}) { const r = await fetch(url, options); if (!r.ok)
    throw new Error(`HTTP ${r.status}`); return r.json(); }
function options(select, items, label = x => x, value = x => x) { select.replaceChildren(); for (const item of items) {
    const o = document.createElement('option');
    o.textContent = label(item);
    o.value = value(item);
    select.append(o);
} }
async function refresh() { const old = $('result').value; const data = await request('/api/catalog'); options($('source'), data.sources); options($('concept'), data.concepts); options($('result'), data.results, x => `${x.id} · ${x.media} · ${x.concept} · ${x.status}`, x => x.id); if ([...$('result').options].some(x => x.value === old))
    $('result').value = old; }
async function loadImage(url) { if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; }));
} return cache.get(url); }
function rgb(id) { let n = 0; for (const c of id)
    n = (n * 31 + c.charCodeAt(0)) >>> 0; return [80 + n % 150, 80 + (n >>> 8) % 150, 80 + (n >>> 16) % 150]; }
async function draw() { if (!current?.frames?.length)
    return; const serial = ++revision; const f = current.frames[frameIndex]; const source = await loadImage(asset(`outputs/${identifier}/${f.source}`)); if (serial !== revision)
    return; const c = $('canvas'); c.width = source.width; c.height = source.height; const ctx = c.getContext('2d'); ctx.drawImage(source, 0, 0); for (const object of f.objects) {
    if ($('instance').value && object.id !== $('instance').value)
        continue;
    const mask = await loadImage(asset(`outputs/${identifier}/${object.mask}`));
    if (serial !== revision)
        return;
    const temp = document.createElement('canvas');
    temp.width = c.width;
    temp.height = c.height;
    const tc = temp.getContext('2d');
    tc.drawImage(mask, 0, 0);
    const pixels = tc.getImageData(0, 0, c.width, c.height);
    const original = new Uint8ClampedArray(pixels.data);
    const color = rgb(object.id);
    for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            const yes = original[i] > 0;
            let boundary = false;
            if (yes && $('edges').checked) {
                boundary = x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1 || original[i - 4] === 0 || original[i + 4] === 0 || original[i - c.width * 4] === 0 || original[i + c.width * 4] === 0;
            }
            pixels.data[i] = color[0];
            pixels.data[i + 1] = color[1];
            pixels.data[i + 2] = color[2];
            pixels.data[i + 3] = boundary ? 255 : yes && $('masks').checked ? Math.round(Number($('opacity').value) * 255) : 0;
        }
    tc.putImageData(pixels, 0, 0);
    ctx.drawImage(temp, 0, 0);
    if ($('boxes').checked) {
        ctx.strokeStyle = `rgb(${color})`;
        ctx.lineWidth = 2;
        const [x, y, r, b] = object.box;
        ctx.strokeRect(x, y, r - x, b - y);
        ctx.fillStyle = 'white';
        ctx.font = '14px system-ui';
        ctx.fillText(`ID ${object.id}`, x + 3, Math.max(15, y + 15));
    }
} $('frame').textContent = `Frame ${frameIndex} · ${(frameIndex / (current.fps || 1)).toFixed(2)} s`; }
async function selectResult() { identifier = $('result').value; if (!identifier)
    return; current = await request(`/api/result/${encodeURIComponent(identifier)}`); revision++; cache.clear(); $('video').pause(); $('video').removeAttribute('src'); $('photo').removeAttribute('src'); $('exports').replaceChildren(); $('canvas').getContext('2d').clearRect(0, 0, $('canvas').width, $('canvas').height); $('status').textContent = `${current.status} · limpieza remota: ${current.cleanup}`; $('metadata').textContent = JSON.stringify({ model: current.model, concept: current.concept, status: current.status, latency_ms: current.latency_ms, usage: current.usage, estimated_usd: current.estimated_usd, masks: current.masks, tracks: current.tracks, no_mask_frames: current.no_mask_frames }, null, 2); if (!current.frames?.length)
    return; const ids = [...new Set(current.frames.flatMap(f => f.objects.map(o => o.id)))]; options($('instance'), ['', ...ids], x => x ? `ID ${x}` : 'Todas'); frameIndex = 0; const video = current.media === 'video'; $('video').classList.toggle('hidden', !video); $('photo').classList.toggle('hidden', video); $('exports').replaceChildren(); if (video) {
    $('video').src = asset(`outputs/${identifier}/original.mp4`);
    for (const [name, label] of [['segmented_video.mp4', 'Video segmentado'], ['comparison.mp4', 'Comparación lado a lado']]) {
        const a = document.createElement('a');
        a.href = asset(`outputs/${identifier}/${name}`);
        a.textContent = label;
        a.target = '_blank';
        a.rel = 'noopener';
        $('exports').append(a, document.createElement('br'));
    }
}
else {
    $('video').pause();
    $('photo').src = asset(`outputs/${identifier}/${current.frames[0].source}`);
} await draw(); }
function showError(error) { $('status').textContent = `Error: ${error.message}. No se reintenta automáticamente.`; }
function sync() { if (current?.media !== 'video')
    return; frameIndex = Math.min(current.frames.length - 1, Math.max(0, Math.floor($('video').currentTime * (current.fps || 1)))); draw().catch(showError); }
$('video').addEventListener('timeupdate', sync);
$('video').addEventListener('seeked', sync);
if ($('video').requestVideoFrameCallback) {
    const tick = () => { $('video').requestVideoFrameCallback(() => { sync(); tick(); }); };
    tick();
}
for (const id of ['masks', 'edges', 'boxes', 'opacity', 'instance'])
    $(id).addEventListener('input', () => draw().catch(showError));
for (const [id, delta] of [['prev', -1], ['next', 1]])
    $(id).onclick = () => { if (!current?.frames?.length)
        return; $('video').pause(); frameIndex = Math.min(current.frames.length - 1, Math.max(0, frameIndex + delta)); if (current.media === 'video')
        $('video').currentTime = frameIndex / current.fps; draw().catch(showError); };
$('speed').onchange = () => { $('video').playbackRate = Number($('speed').value); };
$('result').onchange = () => selectResult().catch(showError);
$('refresh').onclick = () => refresh().then(selectResult).catch(showError);
$('upload').onchange = async () => { try {
    const file = $('upload').files[0];
    if (!file)
        return;
    if (file.size > 20 * 1024 * 1024)
        throw new Error('Archivo supera 20 MiB');
    const form = new FormData();
    form.append('file', file);
    const data = await request('/api/upload', { method: 'POST', headers: { 'X-Lab-Request': '1' }, body: form });
    await refresh();
    $('source').value = data.source;
}
catch (e) {
    showError(e);
} };
$('run').onclick = async () => { try {
    $('run').disabled = true;
    $('status').textContent = 'Pendiente: envío autorizado a Meta';
    const job = await request('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lab-Request': '1' }, body: JSON.stringify({ source: $('source').value, concept: $('concept').value }) });
    const poll = setInterval(async () => { try {
        await refresh();
        $('result').value = job.id;
        await selectResult();
        if (['completed', 'no_matches', 'provider_error', 'budget_exhausted', 'validation_error'].includes(current?.status)) {
            clearInterval(poll);
            $('run').disabled = false;
        }
    }
    catch (e) {
        showError(e);
    } }, 1200);
}
catch (e) {
    $('run').disabled = false;
    showError(e);
} };
refresh().then(selectResult).catch(showError);
