// Safari check: run the built file in WebKit (desktop and iPhone size).
import { webkit, devices } from 'playwright-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await webkit.launch();
let bad = 0;
async function run(name, ctxOpts, q, steps) {
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage(); const errs = [], net = [];
  page.on('console', (m) => { if (!['log', 'info', 'debug'].includes(m.type())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
  await page.goto(file + '?' + q); await sleep(2500);
  let info = {};
  try { info = await steps(page); } catch (e) { errs.push('steps: ' + e.message); }
  await page.screenshot({ path: join(root, 'checkpoints', `webkit-${name}.png`) });
  const st = await page.evaluate(() => { const a = window.__dbw; return a ? { tier: a.world.tier, calls: a.world.drawCalls, fps: Math.round(a.fps()), gl2: a.world.renderer.capabilities.isWebGL2 !== false } : null; });
  console.log(name, JSON.stringify(st), JSON.stringify(info), errs.length ? 'ERRORS: ' + [...new Set(errs)].join(' | ') : 'no errors', net.length ? 'NETWORK ' + net.join(',') : '');
  if (errs.length || net.length || !st) bad++;
  await ctx.close();
}
await run('desktop', { viewport: { width: 1440, height: 900 } }, 't=0.3&cam=-75,16,4.2', async (page) => {
  await page.evaluate(() => window.__dbw.openRegion(window.__dbw.samples[2])); await sleep(1500);
  const panel = await page.evaluate(() => !document.querySelector('#panel').hidden);
  const png = await page.evaluate(() => { const a = window.__dbw; const cv = a.photoCanvas(a.current, 0); return new Promise((res) => cv.toBlob((b) => res({ w: cv.width, h: cv.height, bytes: b.size }), 'image/png')); });
  return { panel, png };
});
await run('design', { viewport: { width: 1440, height: 900 } }, 'design=1&light=studio', async (page) => {
  await page.click('.steps button[data-step="3"]'); await page.evaluate(() => document.querySelector('.hue[data-role="0"][aria-pressed="false"]').click()); await sleep(400);
  return { mode: await page.evaluate(() => window.__dbw.mode) };
});
await run('iphone', { ...devices['iPhone 14'] }, 'open=5&light=studio', async (page) => {
  const h = await page.evaluate(() => document.querySelector('#panel').getBoundingClientRect().height);
  await page.tap('#panel .expand'); await sleep(500);
  const full = await page.evaluate(() => document.querySelector('#panel').getBoundingClientRect().height);
  await page.tap('#panel .expand'); await sleep(400);
  return { sheet: Math.round(h), full: Math.round(full), pr: await page.evaluate(() => window.__dbw.world.renderer.getPixelRatio()) };
});
await run('night', { viewport: { width: 1200, height: 800 } }, 'open=5&light=studio&nopanel=1&cfg=' + encodeURIComponent('{"light":{"height":-75}}'), async () => ({}));
await browser.close();
process.exit(bad ? 1 : 0);
