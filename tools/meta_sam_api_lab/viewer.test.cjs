// Standalone browser check: synthetic responses only, no Meta or private storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');

async function main() {
  const server = http.createServer((request, response) => {
    const file = request.url === '/' ? 'viewer.html' :
      request.url === '/viewer.js' ? 'viewer.js' : null;
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
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const data = url.pathname === '/api/catalog' ? {
        sources: ['photos/synthetic.png'], concepts: ['vegetation'], results: [
          { id: 'synthetic', media: 'image', concept: 'vegetation', status: 'completed' },
          { id: 'failed', media: 'video', concept: 'tree', status: 'provider_error' }
        ]
      } : url.pathname.endsWith('/failed') ? {
        status: 'provider_error', media: 'video', cleanup: 'pending'
      } : {
        status: 'completed', model: 'sam-3.1', media: 'image', concept: 'vegetation',
        cleanup: 'not_uploaded', fps: 1, masks: 1, tracks: [], frames: [
          { frame: 0, time_seconds: 0, source: 'frames/synthetic.png', objects: [
            { id: '1', box: [0, 0, 1, 1], mask: 'masks/synthetic.png' }
          ] }
        ]
      };
      await route.fulfill({ json: data });
    });
    await page.route('**/assets/**', route => route.fulfill({
      contentType: 'image/png', body: Buffer.from(pixel, 'base64')
    }));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => document.getElementById('canvas').width === 1);
    await page.locator('#opacity').fill('0.2');
    await page.locator('#boxes').uncheck();
    await page.locator('#instance').selectOption('1');
    await page.locator('#next').click();
    await page.locator('#result').selectOption('failed');
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('provider_error'));
    const alpha = await page.locator('#canvas').evaluate(canvas =>
      canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3]);
    assert.equal(alpha, 0, 'Previous masks must clear on a failed result');
    assert.deepEqual(errors, []);
    console.log('Synthetic viewer browser check passed; no inference or private data.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
