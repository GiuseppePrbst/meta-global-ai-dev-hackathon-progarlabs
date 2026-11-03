// SAM showcase viewer: renders saved results only. Every control is local; no
// request here can start an inference (the API it reads has no POST routes).
const C = window.ShowcaseCore;
const $ = id => document.getElementById(id);
const state = { runs: [], domain: 'todos', run: null, compare: null, mode: 'overlay', frame: 0,
  hidden: new Set(), selected: null, playing: false, masks: {}, images: {} };
const MODES = [['original', 'Original'], ['overlay', 'Superposición'], ['masks', 'Solo máscaras'],
  ['dim', 'Fondo oscurecido'], ['isolate', 'Objeto aislado'], ['contour', 'Contornos'],
  ['boxes', 'Cajas e IDs'], ['ab', 'Comparar A/B']];

const asset = (id, p) => `/showcase-assets/${encodeURIComponent(id)}/${p.split('/').map(encodeURIComponent).join('/')}`;
const img = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

async function load() {
  const data = await (await fetch('/api/showcase/runs')).json();
  state.runs = data.runs;
  const domains = ['todos', ...new Set(data.runs.map(r => r.domain))];
  $('domains').innerHTML = domains.map(d => `<button data-d="${d}">${d}</button>`).join('');
  $('domains').onclick = e => { if (e.target.dataset.d) { state.domain = e.target.dataset.d; list(); } };
  $('modes').innerHTML = MODES.map(([k, l]) => `<button data-m="${k}">${l}</button>`).join('');
  $('modes').onclick = e => { if (e.target.dataset.m) { state.mode = e.target.dataset.m; draw(); marks(); } };
  list(); marks();
}

function marks() {
  for (const b of $('domains').children) b.classList.toggle('on', b.dataset.d === state.domain);
  for (const b of $('modes').children) b.classList.toggle('on', b.dataset.m === state.mode);
}

function list() {
  const runs = state.runs.filter(r => state.domain === 'todos' || r.domain === state.domain);
  $('runs').innerHTML = runs.map(r => `<div class="run" data-id="${r.id}">${r.label}<small>${r.status} · ${r.masks} máscaras · ${r.media}</small></div>`).join('');
  $('runs').onclick = e => { const el = e.target.closest('.run'); if (el) open(el.dataset.id, e.shiftKey); };
  marks();
}

async function fetchRun(id) {
  const run = await (await fetch(`/api/showcase/run/${encodeURIComponent(id)}`)).json();
  run.colors = C.colorMap(run.frames);
  return run;
}

async function open(id, asCompare) {
  const run = await fetchRun(id);
  if (asCompare && state.run) { state.compare = run; state.mode = 'ab'; } else { state.run = run; state.compare = null; state.frame = 0; }
  for (const el of $('runs').children) el.classList.toggle('on', el.dataset.id === state.run.id || el.dataset.id === state.compare?.id);
  $('timeline').hidden = $('conf').hidden = state.run.frames.length <= 1;
  $('seek').max = Math.max(0, state.run.frames.length - 1);
  meta(); objects(); muse(); confidence(); await draw(); marks();
}

function meta() {
  const r = state.run;
  const rows = [['Escena', r.scene], ['Dominio', r.domain], ['Modelo', `${r.model} (parser ${r.parser})`],
    ['Modo de prompt', r.prompt_mode], ['Prompt exacto', r.prompt_mode === 'concept' ? r.prompt : 'espacial (cajas/puntos)'],
    ['Medio', `${r.media} ${r.prepared_size?.join('×')}`], ['Frames', `${r.frames.length} · sin máscara: ${r.no_mask_frames ?? 0}`],
    ['Estado', r.status], ['Latencia', r.latency_ms ? `${Math.round(r.latency_ms)} ms` : '—'],
    ['Costo estimado', r.estimated_usd != null ? `USD ${r.estimated_usd}` : '—'],
    ['Fuente / licencia', `${r.license || '—'} · ${r.author || ''}`]];
  $('meta').innerHTML = `<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v ?? '—'}</td></tr>`).join('')}</table>
    <p class="muted">La confianza de SAM es del modelo sobre la máscara; no es certeza taxonómica.</p>`;
}

function objects() {
  const t = C.tracks(state.run.frames);
  $('objects').innerHTML = t.length ? t.map((o, i) => {
    const [r, g, b] = state.run.colors[o.id];
    const l = C.labels(o, i, state.run.prompt_mode === 'concept' ? state.run.prompt : null, null);
    return `<label class="obj"><input type="checkbox" data-id="${o.id}" ${state.hidden.has(o.id) ? '' : 'checked'}>
      <span class="sw" style="background:rgb(${r},${g},${b})"></span><span class="tag sam">${l.sam}</span>
      <small class="muted">frames ${o.first}–${o.last} · ${o.visible} visibles · ${o.gaps} huecos</small>
      <button data-sel="${o.id}">aislar</button></label>`;
  }).join('') : '<p class="warn">Sin máscaras: resultado real sin coincidencias.</p>';
  $('objects').onchange = e => { const id = e.target.dataset.id; if (!id) return; e.target.checked ? state.hidden.delete(id) : state.hidden.add(id); draw(); };
  $('objects').onclick = e => { if (e.target.dataset.sel) { state.selected = e.target.dataset.sel; state.mode = 'isolate'; draw(); marks(); } };
}

function muse() {
  const m = state.run.muse;
  $('muse').innerHTML = m ? m.map(x => `<div class="obj"><span class="tag muse">Muse (candidato)</span> ${x.label}
    <small class="muted">${x.detail || ''}</small></div>`).join('') + '<p class="muted">Identificación experimental, no verificada.</p>'
    : 'Sin análisis Muse para este resultado.';
}

function confidence() {
  const cv = $('conf'), r = state.run, ctx = cv.getContext('2d');
  cv.width = cv.clientWidth || 600; cv.height = 46; ctx.clearRect(0, 0, cv.width, cv.height);
  if (r.frames.length <= 1) return;
  for (const [id, rgb] of Object.entries(r.colors)) {
    ctx.strokeStyle = `rgb(${rgb})`; ctx.beginPath();
    r.frames.forEach((f, i) => { const o = f.objects.find(x => String(x.id) === id); const y = o?.confidence != null ? 44 - o.confidence * 40 : null;
      if (y == null) return; const x = i / (r.frames.length - 1) * cv.width; ctx.lineTo(x, y); });
    ctx.stroke();
  }
}

async function maskImg(run, path) {
  const key = run.id + path;
  if (!state.masks[key]) {
    // Masks are opaque grayscale PNGs: luminance becomes alpha (white = object).
    const source = await img(asset(run.id, path));
    const c = document.createElement('canvas'); c.width = source.width; c.height = source.height;
    const x = c.getContext('2d'); x.drawImage(source, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < data.data.length; i += 4) { data.data[i + 3] = data.data[i]; data.data[i] = data.data[i + 1] = data.data[i + 2] = 255; }
    x.putImageData(data, 0, 0);
    state.masks[key] = c;
  }
  return state.masks[key];
}

async function render(canvas, run, index) {
  const f = run.frames[Math.min(index, run.frames.length - 1)];
  const base = await img(asset(run.id, f.source));
  canvas.width = base.width; canvas.height = base.height;
  const ctx = canvas.getContext('2d');
  const alpha = $('alpha').value / 100;
  ctx.drawImage(base, 0, 0);
  if (state.mode === 'original') return;
  const shown = f.objects.filter(o => !state.hidden.has(String(o.id)));
  const off = document.createElement('canvas'); off.width = base.width; off.height = base.height;
  const o2 = off.getContext('2d');
  if (state.mode === 'dim' || state.mode === 'isolate' || state.mode === 'masks') {
    ctx.fillStyle = state.mode === 'dim' ? 'rgba(0,0,0,0.7)' : '#0b0f0d'; ctx.fillRect(0, 0, base.width, base.height);
  }
  for (const o of shown) {
    if (state.mode === 'isolate' && state.selected && String(o.id) !== state.selected) continue;
    const m = await maskImg(run, o.mask); const [r, g, b] = run.colors[String(o.id)];
    o2.clearRect(0, 0, off.width, off.height); o2.globalCompositeOperation = 'source-over';
    o2.drawImage(m, 0, 0); o2.globalCompositeOperation = 'source-in';
    if (state.mode === 'dim' || state.mode === 'isolate') {
      o2.drawImage(base, 0, 0); ctx.drawImage(off, 0, 0);
      o2.globalCompositeOperation = 'source-over'; o2.clearRect(0, 0, off.width, off.height);
      o2.drawImage(m, 0, 0); o2.globalCompositeOperation = 'source-in';
    }
    o2.fillStyle = `rgb(${r},${g},${b})`; o2.fillRect(0, 0, off.width, off.height);
    if (state.mode === 'masks') ctx.globalAlpha = 0.95;
    else if (state.mode === 'contour') ctx.globalAlpha = 0;
    else ctx.globalAlpha = alpha;
    ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = Math.max(2, base.width / 320);
    if (state.mode === 'contour' || state.mode === 'overlay' || state.mode === 'dim') {
      ctx.save(); ctx.shadowColor = `rgb(${r},${g},${b})`; ctx.shadowBlur = 12;
      ctx.globalCompositeOperation = 'source-over';
      const e = document.createElement('canvas'); e.width = off.width; e.height = off.height; const ec = e.getContext('2d');
      ec.drawImage(off, -1, 0); ec.drawImage(off, 1, 0); ec.drawImage(off, 0, -1); ec.drawImage(off, 0, 1);
      ec.globalCompositeOperation = 'destination-out'; ec.drawImage(off, 0, 0);
      ctx.drawImage(e, 0, 0); ctx.restore();
    }
    if (state.mode === 'boxes') { const [x0, y0, x1, y1] = o.box; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.font = `${Math.max(14, base.width / 50)}px system-ui`; ctx.fillText(`ID ${o.id}`, x0 + 4, y0 + 18); }
  }
}

async function draw() {
  if (!state.run) return;
  $('b').hidden = !(state.mode === 'ab' && state.compare);
  await render($('a'), state.run, state.frame);
  if (state.mode === 'ab' && state.compare) await render($('b'), state.compare, state.frame);
  const fps = state.run.fps || 1;
  $('seek').value = state.frame;
  $('clock').textContent = `frame ${state.frame} · ${(state.frame / fps).toFixed(2)} s · ${state.run.frames[state.frame]?.objects.length ?? 0} máscaras`;
}

$('seek').oninput = e => { state.frame = Number(e.target.value); draw(); };
$('step').onclick = () => { state.frame = (state.frame + 1) % state.run.frames.length; draw(); };
$('alpha').oninput = () => draw();
$('play').onclick = () => {
  state.playing = !state.playing; $('play').textContent = state.playing ? '⏸' : '▶';
  const start = performance.now(), from = state.frame;
  const tick = async now => {
    if (!state.playing) return;
    const t = (now - start) / 1000 * Number($('speed').value) + from / (state.run.fps || 1);
    state.frame = C.frameAt(t % (state.run.frames.length / (state.run.fps || 1)), state.run.fps || 1, state.run.frames.length);
    await draw(); requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
load();
