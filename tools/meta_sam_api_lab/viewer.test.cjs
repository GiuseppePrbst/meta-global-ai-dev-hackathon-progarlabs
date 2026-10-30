// Standalone browser check: synthetic responses only, no Meta or private storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const G = require('./geometry.js');

const near = (actual, expected, label, tolerance = 1) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);

function geometryChecks() {
  for (const [w, h] of [[640, 360], [960, 540], [1280, 720], [1920, 1080]]) {
    const target = { width: w, height: h };
    // CSS-scaled canvas: 800 CSS px wide, backing store = prepared size.
    const rect = { left: 30, top: 40, width: 800, height: 800 * h / w };
    const center = G.clientToMedia({ x: 430, y: 40 + rect.height / 2 }, rect, target, target);
    near(center.x, w / 2, `${w} center x`, 1e-9); near(center.y, h / 2, `${w} center y`, 1e-9);
    const corner = G.clientToMedia({ x: 830, y: 40 + rect.height }, rect, target, target);
    assert.deepEqual([corner.x, corner.y], [w, h], 'far edge maps to media size');
    assert.equal(G.clientToMedia({ x: 29, y: 50 }, rect, target, target), null, 'outside rejected');
    // Zoom doubles the CSS box; the mapping must not change.
    const zoomed = { left: -200, top: 0, width: 1600, height: 1600 * h / w };
    const z = G.clientToMedia({ x: -200 + 400, y: zoomed.height / 4 }, zoomed, target, target);
    near(z.x, w / 4, 'zoom x', 1e-9); near(z.y, h / 4, 'zoom y', 1e-9);
  }
  // Letterbox (object-fit: contain) + padding/border insets.
  const target = { width: 640, height: 360 };
  const square = { left: 0, top: 0, width: 820, height: 820 };
  const insets = { left: 10, top: 10, right: 10, bottom: 10 };
  const box = G.contentBox(square, target, insets);
  near(box.top, 10 + (800 - 450) / 2, 'letterbox top', 1e-9);
  assert.equal(G.clientToMedia({ x: 400, y: 100 }, square, target, target, insets), null, 'letterbox band');
  near(G.clientToMedia({ x: 10, y: box.top }, square, target, target, insets).y, 0, 'content origin', 1e-9);
  // Displayed natural size differs from prepared size (e.g. downscaled preview).
  const scaled = G.clientToMedia({ x: 160, y: 90 }, { left: 0, top: 0, width: 320, height: 180 }, { width: 320, height: 180 }, { width: 1280, height: 720 });
  assert.deepEqual([scaled.x, scaled.y], [640, 360]);
  assert.deepEqual(G.mediaToCanvas({ x: 640, y: 360 }, { width: 320, height: 180 }, { width: 1280, height: 720 }), { x: 160, y: 90 });
  assert.deepEqual(G.normalizeBox({ x: 300, y: 250 }, { x: 100.5, y: 50.2 }, target), [100.5, 50.2, 300, 250], 'reversed drag');
  assert.deepEqual(G.normalizeBox({ x: -5, y: -5 }, { x: 700, y: 400 }, target), [0, 0, 640, 360], 'clamped');
  assert.equal(G.normalizeBox({ x: 10, y: 10 }, { x: 10.5, y: 90 }, target), null, 'zero width');
  assert.equal(G.normalizeBox({ x: 10, y: 10 }, { x: 90, y: 10 }, target), null, 'zero height');
  near(G.frameTime(25, 10), 2.55, 'frame middle', 1e-12);
}

async function main() {
  geometryChecks();
  const server = http.createServer((request, response) => {
    const file = request.url === '/' ? 'viewer.html' :
      request.url === '/viewer.js' ? 'viewer.js' : request.url === '/geometry.js' ? 'geometry.js' : null;
    if (!file) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
    response.end(fs.readFileSync(path.join(__dirname, file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#2a4"/></svg>';
    const posted = { preview: [], run: [] };
    const spatialParent = {
      status: 'no_matches', model: 'sam-3.1', media: 'image', prompt_mode: 'spatial', concept: null,
      cleanup: 'not_uploaded', fps: 1, masks: 0, frames: [], source_ref: 'photos/synthetic.svg',
      objects: [{ id: 3, prompts: [{ frame: 0, box: [10, 20, 110, 220], points: [[50, 60, 'negative']] }] }],
    };
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/preview' || url.pathname === '/api/run') {
        const body = route.request().postDataJSON();
        posted[url.pathname.slice(5)].push(body);
        await route.fulfill({ json: url.pathname === '/api/run' ? { id: 'synthetic' } : {
          media: 'image', prompt_mode: body.objects ? 'spatial' : 'concept', prepared_size: [640, 360], frames: 1,
          prompt: '<0f>synthetic', objects: body.objects, prompt_frame: 0, direction: null,
          frames_processed_estimate: 1, preview_estimated_usd: 0.0025, include_confidence: body.include_confidence,
          budget: { can_reserve: true },
        } });
        return;
      }
      const data = url.pathname === '/api/catalog' ? {
        sources: ['photos/synthetic.svg'], concepts: ['vegetation'], results: [
          { id: 'synthetic', media: 'image', concept: 'vegetation', status: 'completed' },
          { id: 'failed', media: 'video', concept: 'tree', status: 'provider_error' },
          { id: 'spatialparent', media: 'image', concept: 'spatial', prompt_mode: 'spatial', status: 'no_matches' },
        ]
      } : url.pathname === '/api/source' ? { media: 'image', width: 640, height: 360, frames: 1, fps: 1 }
        : url.pathname.startsWith('/api/review/') ? null
        : url.pathname.endsWith('/spatialparent') ? spatialParent
        : url.pathname.endsWith('/failed') ? { status: 'provider_error', media: 'video', cleanup: 'pending' }
        : {
          status: 'completed', model: 'sam-3.1', media: 'image', concept: 'vegetation',
          cleanup: 'not_uploaded', fps: 1, masks: 1, tracks: [], frames: [
            { frame: 0, time_seconds: 0, source: 'frames/synthetic.png', objects: [
              { id: '1', box: [0, 0, 1, 1], mask: 'masks/synthetic.png', confidence: 0.5 }
            ] }
          ]
        };
      await route.fulfill({ json: data });
    });
    await page.route('**/assets/**', route => route.request().url().endsWith('.svg')
      ? route.fulfill({ contentType: 'image/svg+xml', body: svg })
      : route.fulfill({ contentType: 'image/png', body: Buffer.from(pixel, 'base64') }));
    await page.goto(`http://127.0.0.1:${server.address().port}`);

    // Saved results: local rendering only.
    await page.waitForFunction(() => document.getElementById('canvas').width === 1);
    await page.waitForFunction(() => document.getElementById('frameObjects').textContent.includes('0.500'));
    await page.locator('#opacity').fill('0.2');
    await page.locator('#boxes').uncheck();
    await page.locator('#instance').selectOption('1');
    await page.locator('#next').click();
    await page.locator('#result').selectOption('failed');
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('provider_error'));
    const alpha = await page.locator('#canvas').evaluate(canvas =>
      canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3]);
    assert.equal(alpha, 0, 'Previous masks must clear on a failed result');

    // Spatial editor on a CSS-scaled, padded, bordered and zoomed canvas.
    await page.waitForFunction(() => document.getElementById('promptCanvas').width === 640);
    await page.locator('#promptCanvas').evaluate(c => { c.style.padding = '12px'; c.style.border = '7px solid #333'; c.style.boxSizing = 'content-box'; });
    await page.locator('#mode').selectOption('spatial');
    await page.locator('#zoom').fill('1.5');
    assert.equal(await page.locator('#concept').isVisible(), false, 'concept hidden in spatial mode');
    const toClient = async (x, y) => {
      const r = await page.locator('#promptCanvas').evaluate(c => { const b = c.getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; });
      const inset = 19, w = r.width - 2 * inset, h = r.height - 2 * inset;
      return { x: r.left + inset + x * w / 640, y: r.top + inset + y * h / 360 };
    };
    const drag = async (a, b) => {
      await page.locator('#promptCanvas').scrollIntoViewIfNeeded();
      const p = await toClient(...a), q = await toClient(...b);
      await page.mouse.move(p.x, p.y); await page.mouse.down();
      await page.mouse.move(q.x, q.y, { steps: 4 }); await page.mouse.up();
    };
    await drag([300, 250], [100, 50]);
    await page.locator('#tool').selectOption('negative');
    const neg = await toClient(200, 150);
    await page.mouse.click(neg.x, neg.y);
    await page.locator('#newObject').click();
    await page.locator('#tool').selectOption('box');
    await drag([400, 100], [500, 200]);
    await drag([10, 10], [10.2, 80]); // thinner than a prepared pixel: discarded
    await page.waitForFunction(() => document.getElementById('editorStatus').textContent.includes('descartada'));
    assert.equal(await page.locator('#run').isDisabled(), true, 'no run without preview');
    await page.locator('#previewButton').click();
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    const body = posted.preview.at(-1);
    assert.equal(body.concept, undefined, 'spatial never carries a concept');
    assert.equal(body.objects.length, 2);
    const [first, second] = body.objects;
    assert.equal(first.id, 1); assert.equal(second.id, 2);
    [100, 50, 300, 250].forEach((v, i) => near(first.prompts[0].box[i], v, `box1[${i}]`));
    near(first.prompts[0].points[0].x, 200, 'neg x'); near(first.prompts[0].points[0].y, 150, 'neg y');
    assert.equal(first.prompts[0].points[0].label, 'negative');
    [400, 100, 500, 200].forEach((v, i) => near(second.prompts[0].box[i], v, `box2[${i}]`));
    assert.equal(posted.run.length, 0, 'drawing and preview never run');
    await page.locator('#confidence').check();
    assert.equal(await page.locator('#run').isDisabled(), true, 'edit invalidates preview');
    await page.locator('#previewButton').click();
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.locator('#run').click();
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('completed'));
    assert.deepEqual(posted.run[0], posted.preview.at(-1), 'run sends exactly the previewed request');
    assert.equal(posted.run[0].include_confidence, true);

    // Correction: parent prompts load into a new, linked request.
    await page.locator('#mode').selectOption('correction');
    await page.locator('#parent').selectOption('spatialparent');
    await page.locator('#loadParent').click();
    await page.waitForFunction(() => document.getElementById('editorStatus').textContent.includes('spatialparent'));
    await page.locator('#reason').fill('la caja incluía el camino');
    await page.locator('#previewButton').click();
    await page.waitForFunction(() => document.getElementById('preview').textContent.includes('spatialparent'));
    const correction = posted.preview.at(-1);
    assert.equal(correction.parent_experiment_id, 'spatialparent');
    assert.equal(correction.correction_reason, 'la caja incluía el camino');
    assert.deepEqual(correction.objects, [{ id: 3, prompts: [{ frame: 0, box: [10, 20, 110, 220], points: [{ x: 50, y: 60, label: 'negative' }] }] }]);
    assert.deepEqual(errors, []);
    console.log('Synthetic viewer browser check passed; geometry, spatial prompts and corrections; no inference or private data.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
