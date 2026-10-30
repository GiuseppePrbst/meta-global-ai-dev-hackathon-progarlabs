const $ = id => document.getElementById(id);
const G = window.LabGeometry;
let current = null, identifier = '', frameIndex = 0, revision = 0, compared = null;
const cache = new Map();
const asset = path => '/assets/' + path.split('/').map(encodeURIComponent).join('/');
const TERMINAL = ['completed', 'no_matches', 'provider_error', 'budget_exhausted', 'validation_error'];
async function request(url, options = {}) {
  const r = await fetch(url, options);
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.json()).detail; } catch { /* body is optional */ }
    throw new Error(`HTTP ${r.status}${detail ? ' · ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  }
  return r.json();
}
const post = (url, body) => request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lab-Request': '1' }, body: JSON.stringify(body) });
function options(select, items, label = x => x, value = x => x) {
  select.replaceChildren();
  for (const item of items) {
    const o = document.createElement('option');
    o.textContent = label(item);
    o.value = value(item);
    select.append(o);
  }
}
async function loadImage(url) {
  if (!cache.has(url)) cache.set(url, new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; }));
  return cache.get(url);
}
function rgb(id) { let n = 0; for (const c of String(id)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return [80 + n % 150, 80 + (n >>> 8) % 150, 80 + (n >>> 16) % 150]; }
// CSS px insets (border + padding) between getBoundingClientRect and the painted canvas.
function insets(element) {
  const s = getComputedStyle(element), n = k => parseFloat(s[k]) || 0;
  return { left: n('borderLeftWidth') + n('paddingLeft'), top: n('borderTopWidth') + n('paddingTop'), right: n('borderRightWidth') + n('paddingRight'), bottom: n('borderBottomWidth') + n('paddingBottom') };
}
function pointer(event, canvas, target) {
  return G.clientToMedia({ x: event.clientX, y: event.clientY }, canvas.getBoundingClientRect(), { width: canvas.width, height: canvas.height }, target, insets(canvas));
}

// ---------- Saved results: rendering is local, never an inference ----------
async function paintMasks(ctx, result, id, frame, { fill, edges, boxes, outline }) {
  const f = result?.frames?.[frame];
  if (!f) return true;
  const serial = revision;
  for (const object of f.objects) {
    if ($('instance').value && result === current && object.id !== $('instance').value) continue;
    const mask = await loadImage(asset(`outputs/${id}/${object.mask}`));
    if (serial !== revision) return false;
    const { width, height } = ctx.canvas;
    const temp = document.createElement('canvas');
    temp.width = width; temp.height = height;
    const tc = temp.getContext('2d');
    tc.drawImage(mask, 0, 0, width, height);
    const pixels = tc.getImageData(0, 0, width, height);
    const original = new Uint8ClampedArray(pixels.data);
    const color = outline ? [255, 255, 255] : rgb(object.id);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, yes = original[i] > 0;
      const boundary = yes && edges && (x === 0 || y === 0 || x === width - 1 || y === height - 1 || original[i - 4] === 0 || original[i + 4] === 0 || original[i - width * 4] === 0 || original[i + width * 4] === 0);
      pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2];
      pixels.data[i + 3] = boundary ? 255 : yes && fill ? Math.round(fill * 255) : 0;
    }
    tc.putImageData(pixels, 0, 0);
    ctx.drawImage(temp, 0, 0);
    if (boxes) {
      ctx.strokeStyle = `rgb(${color})`; ctx.lineWidth = 2;
      const [x, y, r, b] = object.box;
      ctx.strokeRect(x, y, r - x, b - y);
      ctx.fillStyle = 'white'; ctx.font = '14px system-ui';
      ctx.fillText(`ID ${object.id}${object.confidence == null ? '' : ' · c ' + object.confidence.toFixed(2)}`, x + 3, Math.max(15, y + 15));
    }
  }
  return true;
}
async function draw() {
  if (!current?.frames?.length) return;
  const serial = ++revision;
  const f = current.frames[frameIndex];
  const source = await loadImage(asset(`outputs/${identifier}/${f.source}`));
  if (serial !== revision) return;
  const c = $('canvas');
  c.width = source.width; c.height = source.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0);
  if (!await paintMasks(ctx, current, identifier, frameIndex, { fill: $('masks').checked ? Number($('opacity').value) : 0, edges: $('edges').checked, boxes: $('boxes').checked })) return;
  if (compared && !await paintMasks(ctx, compared.data, compared.id, frameIndex, { edges: true, outline: true })) return;
  drawPolygons(ctx);
  $('frame').textContent = `Frame ${frameIndex} · ${(frameIndex / (current.fps || 1)).toFixed(2)} s`;
  $('frameObjects').textContent = f.objects.length ? f.objects.map(o => `ID ${o.id}: ${o.confidence == null ? (current.include_confidence ? 'sin confianza devuelta' : 'confianza no solicitada') : 'confianza del modelo ' + o.confidence.toFixed(3)}`).join(' · ') : 'Frame sin máscara del modelo (no se rellena).';
  drawTimeline();
}
// One row per provider ID: filled cells are frames with a returned mask, gaps stay empty.
function drawTimeline() {
  const t = $('timeline'), frames = current?.frames || [];
  const ids = [...new Set(frames.flatMap(f => f.objects.map(o => o.id)))];
  t.width = Math.max(frames.length, 1) * 8; t.height = Math.max(ids.length, 1) * 10 + 4;
  const ctx = t.getContext('2d');
  ctx.fillStyle = '#08100c'; ctx.fillRect(0, 0, t.width, t.height);
  ids.forEach((id, row) => { ctx.fillStyle = `rgb(${rgb(id)})`; frames.forEach((f, i) => { if (f.objects.some(o => o.id === id)) ctx.fillRect(i * 8, row * 10 + 2, 7, 8); }); });
  ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2; ctx.strokeRect(frameIndex * 8, 0, 8, t.height);
}
function describePrompt(data) {
  return JSON.stringify({ prompt_mode: data.prompt_mode || 'concept', concept: data.concept, objects: data.objects, prompt: data.prompt, prompt_frame: data.prompt_frame, direction: data.direction, include_confidence: data.include_confidence, parent_experiment_id: data.parent_experiment_id, correction_reason: data.correction_reason, created_at: data.created_at, source_ref: data.source_ref }, null, 2);
}
async function selectResult() {
  identifier = $('result').value;
  if (!identifier) return;
  current = await request(`/api/result/${encodeURIComponent(identifier)}`);
  revision++; cache.clear(); review.polygons = []; review.drawing = [];
  $('video').pause(); $('video').removeAttribute('src'); $('photo').removeAttribute('src'); $('exports').replaceChildren();
  $('canvas').getContext('2d').clearRect(0, 0, $('canvas').width, $('canvas').height);
  $('timeline').getContext('2d').clearRect(0, 0, $('timeline').width, $('timeline').height);
  $('frameObjects').textContent = '';
  $('status').textContent = `${current.status} · limpieza remota: ${current.cleanup}`;
  $('resultPrompt').textContent = describePrompt(current);
  $('metadata').textContent = JSON.stringify({ model: current.model, status: current.status, latency_ms: current.latency_ms, usage: current.usage, estimated_usd: current.estimated_usd, frames_processed_estimate: current.frames_processed_estimate, prepared_size: current.prepared_size, masks: current.masks, tracks: current.tracks, no_mask_frames: current.no_mask_frames }, null, 2);
  loadReview().catch(showError);
  if (!current.frames?.length) return;
  const ids = [...new Set(current.frames.flatMap(f => f.objects.map(o => o.id)))];
  options($('instance'), ['', ...ids], x => x ? `ID ${x}` : 'Todas');
  frameIndex = 0;
  const video = current.media === 'video';
  $('video').classList.toggle('hidden', !video); $('photo').classList.toggle('hidden', video);
  if (video) {
    $('video').src = asset(`outputs/${identifier}/original.mp4`);
    for (const [name, label] of [['segmented_video.mp4', 'Video segmentado'], ['comparison.mp4', 'Comparación lado a lado']]) {
      const a = document.createElement('a');
      a.href = asset(`outputs/${identifier}/${name}`); a.textContent = label; a.target = '_blank'; a.rel = 'noopener';
      $('exports').append(a, document.createElement('br'));
    }
  } else $('photo').src = asset(`outputs/${identifier}/${current.frames[0].source}`);
  await draw();
}
function showError(error) { $('status').textContent = `Error: ${error.message}. No se reintenta automáticamente.`; }
function sync() {
  if (current?.media !== 'video') return;
  frameIndex = Math.min(current.frames.length - 1, Math.max(0, Math.floor($('video').currentTime * (current.fps || 1))));
  draw().catch(showError);
}

// ---------- Editor for a NEW request: kept apart from the saved result above ----------
const editor = { info: null, objects: new Map(), active: 1, frame: 0, parent: null, parentData: null, previewKey: '', budgetOk: false, drag: null, hover: null };
function ensureObject(id) { if (!editor.objects.has(id)) editor.objects.set(id, new Map()); return editor.objects.get(id); }
function framePrompt(id, frame) { const frames = ensureObject(id); if (!frames.has(frame)) frames.set(frame, { box: null, points: [] }); return frames.get(frame); }
function mode() { return $('mode').value; }
function target() { return editor.info ? { width: editor.info.width, height: editor.info.height } : null; }
function payload() {
  const body = { source: $('source').value, include_confidence: $('confidence').checked };
  if (mode() === 'concept') return { ...body, concept: $('concept').value };
  body.objects = [...editor.objects].map(([id, frames]) => ({ id, prompts: [...frames].filter(([, p]) => p.box || p.points.length).sort((a, b) => a[0] - b[0]).map(([frame, p]) => ({ frame, box: p.box, points: p.points })) })).filter(o => o.prompts.length);
  if (editor.info?.media === 'video') body.direction = $('direction').value;
  if (mode() === 'correction') { body.parent_experiment_id = editor.parent; body.correction_reason = $('reason').value.trim(); }
  return body;
}
function invalidate() {
  const stale = editor.previewKey && editor.previewKey !== JSON.stringify(payload());
  if (stale) $('preview').textContent = 'Vista previa desactualizada: previsualiza de nuevo antes de enviar.';
  $('run').disabled = !editor.previewKey || stale || !editor.budgetOk;
  summarizePrompts();
}
function summarizePrompts() {
  const parts = [...editor.objects].map(([id, frames]) => { const used = [...frames].filter(([, p]) => p.box || p.points.length).map(([f]) => f); return used.length ? `Objeto ${id}: frames ${used.join(', ')}` : null; }).filter(Boolean);
  $('promptSummary').textContent = mode() === 'concept' ? 'Modo concepto: no se envían cajas ni puntos.' : (parts.join(' · ') || 'Sin prompts espaciales todavía.');
}
function refreshObjects() {
  if (!editor.objects.size) ensureObject(1);
  options($('objectId'), [...editor.objects.keys()], id => `ID ${id}`);
  $('objectId').value = String(editor.active);
}
function showControls() {
  const m = mode(), video = editor.info?.media === 'video';
  for (const el of document.querySelectorAll('[data-for]')) {
    const key = el.dataset.for;
    el.classList.toggle('hidden', key === 'concept' ? m !== 'concept' : key === 'spatial' ? m === 'concept' : key === 'correction' ? m !== 'correction' : !video);
  }
}
async function loadSource() {
  editor.info = null; editor.previewKey = ''; invalidate();
  const path = $('source').value;
  if (!path) return;
  try {
    editor.info = await request(`/api/source?path=${encodeURIComponent(path)}`);
  } catch (e) { $('editorStatus').textContent = `Medio no utilizable: ${e.message}`; return; }
  const { width, height, frames, fps, media } = editor.info;
  $('promptFrame').max = String(frames - 1);
  if (editor.frame >= frames) editor.frame = 0;
  $('promptFrame').value = String(editor.frame);
  $('editorStatus').textContent = `${media} preparado ${width}×${height}, ${frames} frame(s) a ${fps} FPS. Las coordenadas se envían en estos píxeles.`;
  showControls();
  await drawPrompt();
}
async function sourceFrame() {
  const path = $('source').value, info = editor.info;
  if (info.media !== 'video') return loadImage(asset(path));
  const video = $('sourceVideo');
  if (video.dataset.src !== path) {
    video.dataset.src = path; video.src = asset(path);
    await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = () => reject(new Error('Video no decodificable en el navegador')); });
  }
  const time = G.frameTime(editor.frame, info.fps);
  if (Math.abs(video.currentTime - time) > 1e-3) await new Promise(resolve => { video.onseeked = resolve; video.currentTime = time; });
  return video;
}
async function drawPrompt() {
  const info = editor.info;
  if (!info) return;
  const canvas = $('promptCanvas'), source = await sourceFrame();
  const natural = { width: source.videoWidth || source.naturalWidth || source.width, height: source.videoHeight || source.naturalHeight || source.height };
  if (canvas.width !== natural.width || canvas.height !== natural.height) { canvas.width = natural.width; canvas.height = natural.height; }
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (mode() === 'correction' && editor.parentData) await paintMasks(ctx, editor.parentData, editor.parent, editor.frame, { fill: 0.25, edges: true });
  const t = target(), scale = canvas.width / t.width, map = p => G.mediaToCanvas(p, natural, t);
  ctx.lineWidth = Math.max(2, 2 * scale);
  if (mode() !== 'concept') for (const [id, frames] of editor.objects) {
    const p = frames.get(editor.frame);
    const color = `rgb(${rgb(id)})`, active = id === editor.active;
    if (p?.box) {
      const a = map({ x: p.box[0], y: p.box[1] }), b = map({ x: p.box[2], y: p.box[3] });
      ctx.strokeStyle = color; ctx.setLineDash(active ? [] : [6, 4]); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.setLineDash([]);
      ctx.fillStyle = 'white'; ctx.font = `${Math.round(14 * scale)}px system-ui`; ctx.fillText(`ID ${id}`, a.x + 3, a.y + 15 * scale);
    }
    for (const point of p?.points || []) {
      const q = map(point), r = 6 * scale;
      ctx.strokeStyle = point.label === 'negative' ? '#ff4d4d' : '#4dff88';
      ctx.beginPath();
      if (point.label === 'negative') { ctx.moveTo(q.x - r, q.y - r); ctx.lineTo(q.x + r, q.y + r); ctx.moveTo(q.x + r, q.y - r); ctx.lineTo(q.x - r, q.y + r); }
      else ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.stroke(); ctx.fillStyle = 'white'; ctx.fillText(String(id), q.x + r, q.y - r);
    }
  }
  if (editor.drag && editor.hover) {
    const a = map(editor.drag), b = map(editor.hover);
    ctx.strokeStyle = 'white'; ctx.setLineDash([4, 4]); ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); ctx.setLineDash([]);
  }
  $('promptFrameLabel').textContent = `frame ${editor.frame} · ${(editor.frame / info.fps).toFixed(2)} s`;
}
const canvasPrompt = $('promptCanvas');
canvasPrompt.addEventListener('pointerdown', event => {
  if (mode() === 'concept' || !editor.info) return;
  const point = pointer(event, canvasPrompt, target());
  if (!point) return;
  if ($('tool').value === 'box') { editor.drag = point; editor.hover = point; canvasPrompt.setPointerCapture?.(event.pointerId); return; }
  framePrompt(editor.active, editor.frame).points.push({ x: point.x, y: point.y, label: $('tool').value });
  invalidate(); drawPrompt().catch(showEditorError);
});
canvasPrompt.addEventListener('pointermove', event => {
  if (!editor.drag) return;
  const rect = canvasPrompt.getBoundingClientRect(), i = insets(canvasPrompt);
  // Clamp a drag that leaves the canvas to its edge instead of dropping the box.
  const x = Math.min(rect.right - i.right, Math.max(rect.left + i.left, event.clientX)), y = Math.min(rect.bottom - i.bottom, Math.max(rect.top + i.top, event.clientY));
  editor.hover = pointer({ clientX: x, clientY: y }, canvasPrompt, target()) || editor.hover;
  drawPrompt().catch(showEditorError);
});
canvasPrompt.addEventListener('pointerup', event => {
  if (!editor.drag) return;
  const rect = canvasPrompt.getBoundingClientRect(), i = insets(canvasPrompt);
  const x = Math.min(rect.right - i.right, Math.max(rect.left + i.left, event.clientX)), y = Math.min(rect.bottom - i.bottom, Math.max(rect.top + i.top, event.clientY));
  const end = pointer({ clientX: x, clientY: y }, canvasPrompt, target()) || editor.hover;
  const box = G.normalizeBox(editor.drag, end, target());
  editor.drag = editor.hover = null;
  if (box) framePrompt(editor.active, editor.frame).box = box; // one box per object and frame
  else $('editorStatus').textContent = 'Caja descartada: ancho o alto menor que un píxel preparado.';
  invalidate(); drawPrompt().catch(showEditorError);
});
function showEditorError(error) { $('editorStatus').textContent = `Error: ${error.message}`; }
$('promptFrame').oninput = () => { editor.frame = Number($('promptFrame').value); drawPrompt().catch(showEditorError); };
$('zoom').oninput = () => { canvasPrompt.style.width = `${Number($('zoom').value) * 100}%`; };
$('objectId').onchange = () => { editor.active = Number($('objectId').value); drawPrompt().catch(showEditorError); };
$('newObject').onclick = () => {
  if (editor.objects.size >= 16) { $('editorStatus').textContent = 'Máximo documentado: 16 objetos por solicitud.'; return; }
  editor.active = Math.max(0, ...editor.objects.keys()) + 1; ensureObject(editor.active); refreshObjects(); invalidate();
};
$('clearFrame').onclick = () => { editor.objects.get(editor.active)?.delete(editor.frame); invalidate(); drawPrompt().catch(showEditorError); };
$('clearAll').onclick = () => { editor.objects.clear(); editor.active = 1; refreshObjects(); invalidate(); drawPrompt().catch(showEditorError); };
$('mode').onchange = () => { showControls(); invalidate(); drawPrompt().catch(showEditorError); };
for (const id of ['concept', 'direction', 'confidence', 'reason']) $(id).addEventListener('input', invalidate);
$('source').onchange = () => { editor.objects.clear(); editor.active = 1; refreshObjects(); loadSource(); };
$('loadParent').onclick = async () => {
  try {
    const id = $('parent').value;
    const data = await request(`/api/result/${encodeURIComponent(id)}`);
    if (data.prompt_mode !== 'spatial' || !data.objects) throw new Error('El padre debe ser un experimento espacial');
    if (data.source_ref) { $('source').value = data.source_ref; await loadSource(); }
    else throw new Error('El padre no registra su medio; elige el mismo medio manualmente');
    editor.objects.clear();
    for (const object of data.objects) for (const p of object.prompts) {
      const fp = framePrompt(object.id, p.frame);
      fp.box = p.box; fp.points = p.points.map(([x, y, label]) => ({ x, y, label }));
    }
    editor.active = data.objects[0].id; editor.parent = id; editor.parentData = data;
    if (data.direction) $('direction').value = data.direction;
    refreshObjects(); invalidate(); await drawPrompt();
    $('editorStatus').textContent = `Prompts del experimento ${id} cargados. La corrección creará un experimento nuevo vinculado; el original no se modifica.`;
  } catch (e) { showEditorError(e); }
};
$('previewButton').onclick = async () => {
  try {
    const body = payload();
    const data = await post('/api/preview', body);
    editor.previewKey = JSON.stringify(body);
    editor.budgetOk = Boolean(data.budget?.can_reserve);
    $('preview').textContent = JSON.stringify({ medio: body.source, tipo: data.prompt_mode, resolucion_preparada: data.prepared_size, frames: data.frames, prompt: data.prompt, objetos: data.objects, frame_inicial: data.prompt_frame, tiempo_inicial_s: data.prompt_time_seconds, direccion: data.direction, confianza: data.include_confidence, frames_estimados: data.frames_processed_estimate, costo_estimado_usd: data.preview_estimated_usd, presupuesto: data.budget, padre: body.parent_experiment_id, motivo: body.correction_reason }, null, 2);
    if (!editor.budgetOk) $('editorStatus').textContent = 'Vista previa válida, pero el ledger no admite otra reserva: no se puede enviar.';
    invalidate();
  } catch (e) { editor.previewKey = ''; invalidate(); $('preview').textContent = `Solicitud inválida: ${e.message}`; }
};
$('run').onclick = async () => {
  const body = payload();
  if (editor.previewKey !== JSON.stringify(body)) { invalidate(); return; }
  try {
    $('run').disabled = true;
    $('status').textContent = 'Pendiente: envío autorizado a Meta';
    const job = await post('/api/run', body);
    editor.previewKey = '';
    const poll = setInterval(async () => {
      try {
        await refresh(); $('result').value = job.id; await selectResult();
        if (TERMINAL.includes(current?.status)) { clearInterval(poll); invalidate(); }
      } catch (e) { showError(e); }
    }, 1200);
  } catch (e) { invalidate(); showError(e); }
};

// ---------- Human reference polygons on the result canvas ----------
const review = { polygons: [], drawing: [] };
function drawPolygons(ctx) {
  ctx.lineWidth = 2;
  for (const [index, poly] of [...review.polygons.map(p => p.points), review.drawing].entries()) {
    if (!poly.length) continue;
    ctx.strokeStyle = index < review.polygons.length ? '#ffe066' : '#ffffff';
    ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (index < review.polygons.length) ctx.closePath();
    ctx.stroke();
  }
}
$('canvas').addEventListener('pointerdown', event => {
  if (!$('polyMode').checked || !current?.frames?.length) return;
  const c = $('canvas'), point = pointer(event, c, { width: c.width, height: c.height });
  if (!point) return;
  review.drawing.push([point.x, point.y]); draw().catch(showError);
});
$('undoPoly').onclick = () => { review.drawing.pop(); draw().catch(showError); };
$('closePoly').onclick = () => {
  if (review.drawing.length < 3) { $('reviewOut').textContent = 'Un polígono necesita al menos tres vértices.'; return; }
  review.polygons.push({ reference_id: $('refId').value.trim() || 'r1', frame: frameIndex, points: review.drawing });
  review.drawing = []; draw().catch(showError);
};
$('saveReview').onclick = async () => {
  try {
    const grouped = new Map();
    for (const p of review.polygons) { const key = `${p.reference_id}@${p.frame}`; if (!grouped.has(key)) grouped.set(key, { reference_id: p.reference_id, frame: p.frame, polygons: [] }); grouped.get(key).polygons.push(p.points); }
    const data = await post(`/api/review/${encodeURIComponent(identifier)}`, { reviewer: $('reviewer').value.trim(), quality: $('quality').value || null, notes: $('notes').value, references: [...grouped.values()] });
    showReview(data);
  } catch (e) { $('reviewOut').textContent = `Revisión no guardada: ${e.message}`; }
};
function showReview(data) {
  if (!data?.reviewed_at) { $('reviewOut').textContent = 'Sin revisión guardada.'; return; }
  $('reviewOut').textContent = JSON.stringify({ revisor: data.reviewer, fecha: data.reviewed_at, calidad: data.quality, notas: data.notes, metricas: data.evaluations?.map(e => ({ referencia: e.reference_id, frame: e.frame, id_modelo: e.best_predicted_id, ...e.metrics })), tracking: data.tracking }, null, 2);
}
async function loadReview() { showReview(await request(`/api/review/${encodeURIComponent(identifier)}`)); }

// ---------- Wiring ----------
async function refresh() {
  const old = $('result').value, oldSource = $('source').value, oldParent = $('parent').value;
  const data = await request('/api/catalog');
  options($('source'), data.sources);
  if (data.sources.includes(oldSource)) $('source').value = oldSource;
  options($('concept'), data.concepts);
  const label = x => `${x.id} · ${x.media} · ${x.prompt_mode === 'spatial' ? 'espacial' : x.concept} · ${x.status}${x.parent_experiment_id ? ' · corrige ' + x.parent_experiment_id : ''}`;
  options($('result'), data.results, label, x => x.id);
  options($('compare'), [{ id: '' }, ...data.results], x => x.id ? label(x) : '—', x => x.id);
  options($('parent'), data.results.filter(x => x.prompt_mode === 'spatial'), label, x => x.id);
  if ([...$('result').options].some(x => x.value === old)) $('result').value = old;
  if ([...$('parent').options].some(x => x.value === oldParent)) $('parent').value = oldParent;
  if ($('source').value !== oldSource) await loadSource();
}
$('video').addEventListener('timeupdate', sync);
$('video').addEventListener('seeked', sync);
if ($('video').requestVideoFrameCallback) { const tick = () => { $('video').requestVideoFrameCallback(() => { sync(); tick(); }); }; tick(); }
for (const id of ['masks', 'edges', 'boxes', 'opacity', 'instance']) $(id).addEventListener('input', () => draw().catch(showError));
for (const [id, delta] of [['prev', -1], ['next', 1]]) $(id).onclick = () => {
  if (!current?.frames?.length) return;
  $('video').pause();
  frameIndex = Math.min(current.frames.length - 1, Math.max(0, frameIndex + delta));
  if (current.media === 'video') $('video').currentTime = frameIndex / current.fps;
  draw().catch(showError);
};
$('timeline').addEventListener('click', event => {
  if (!current?.frames?.length) return;
  const t = $('timeline'), point = pointer(event, t, { width: t.width, height: t.height });
  if (!point) return;
  frameIndex = Math.min(current.frames.length - 1, Math.floor(point.x / 8));
  if (current.media === 'video') { $('video').pause(); $('video').currentTime = frameIndex / current.fps; }
  draw().catch(showError);
});
$('compare').onchange = async () => {
  try {
    const id = $('compare').value;
    compared = id ? { id, data: await request(`/api/result/${encodeURIComponent(id)}`) } : null;
    if (compared && compared.data.frames?.length !== current?.frames?.length) $('status').textContent = 'Comparación: distinto número de frames; se compara por índice y puede no corresponder.';
    await draw();
  } catch (e) { showError(e); }
};
$('speed').onchange = () => { $('video').playbackRate = Number($('speed').value); };
$('result').onchange = () => selectResult().catch(showError);
$('refresh').onclick = () => refresh().then(selectResult).catch(showError);
$('upload').onchange = async () => {
  try {
    const file = $('upload').files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) throw new Error('Archivo supera 20 MiB');
    const form = new FormData();
    form.append('file', file);
    const data = await request('/api/upload', { method: 'POST', headers: { 'X-Lab-Request': '1' }, body: form });
    await refresh();
    $('source').value = data.source;
    await loadSource();
  } catch (e) { showError(e); }
};
refreshObjects(); showControls(); summarizePrompts();
refresh().then(selectResult).catch(showError); // refresh also loads the first source
