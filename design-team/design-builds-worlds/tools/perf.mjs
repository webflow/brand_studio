// Measure the cost of one frame in a few views. Usage: node tools/perf.mjs [tier] [label]
// For each view it prints: the time in the page script for one frame, split into parts (one pixel is read back inside "render", so the GPU must finish the frame),
// the draw calls, the triangles, and the number of shapes that are sent to the GPU.
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const tier = process.argv[2] || 'high', sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = [['globe', ''], ['globe night', 't=0.9'], ['region open (sample 3)', 'open=3&nopanel=1'], ['Webflow island open', 'open=a6&nopanel=1'], ['UFO crash site open', 'open=a11&nopanel=1'], ['design mode', 'design=1']];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files'] });
console.log(`tier ${tier}${process.argv[3] ? ' · ' + process.argv[3] : ''}   (ms for one frame, mean of about 150 frames, 1440 x 900 at 2x)`);
for (const [name, q] of VIEWS) {
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const t0 = Date.now();
  await page.goto(`${file}?tier=${tier}&season=0.3${q ? '&' + q : ''}`);
  await page.waitForFunction(() => window.__dbw && window.__dbw.readyMs, { timeout: 30000 });
  const ready = await page.evaluate(() => window.__dbw.readyMs);
  await sleep(2600);
  if (name === 'design mode') { await page.evaluate(() => document.querySelector('#randBtn') && document.querySelector('#randBtn').click()); await sleep(1500); }
  const r = await page.evaluate(() => new Promise((res) => {
    const a = window.__dbw, w = a.world, gl = w.renderer.getContext(), acc = { time: 0, cam: 0, update: 0, render: 0, n: 0 };
    const wrap = (obj, key, slot, after) => { const f = obj[key].bind(obj); obj[key] = (...args) => { const s = performance.now(); const out = f(...args); if (after) after(); acc[slot] += performance.now() - s; return out; }; };
    wrap(w, 'updateTime', 'time'); wrap(a.cam, 'update', 'cam'); if (a.update) wrap(a, 'update', 'update');
    const px = new Uint8Array(4); wrap(w, 'render', 'render', () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); acc.n++; });   // reading one pixel makes the GPU finish the frame
    a.cam.lastInput = performance.now() + 1e9;   // not idle: full frame rate
    setTimeout(() => {
      let inst = 0, dyn = 0; w.scene.traverse((o) => { if (o.isInstancedMesh && o.visible) { let v = true, p = o.parent; while (p) { if (!p.visible) v = false; p = p.parent; } if (v) inst += o.count; } });
      dyn = (w.dyn.count ?? 0) + (w.fx.count ?? 0);
      res({ n: acc.n, time: acc.time / acc.n, cam: acc.cam / acc.n, update: acc.update / acc.n, render: acc.render / acc.n, calls: w.drawCalls, tris: w.renderer.info.render.triangles, inst, anim: w.animators.length, lights: w.lights.length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0, buf: gl.drawingBufferWidth + 'x' + gl.drawingBufferHeight, gpu: (() => { const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })() });
    }, 2500);
  }));
  const f = (v) => v.toFixed(2).padStart(6);
  console.log(`${name.padEnd(24)} total ${f(r.time + r.cam + r.update + r.render)} | render ${f(r.render)} | update ${f(r.update)} | camera ${f(r.cam)} | time ${f(r.time)} | calls ${String(r.calls).padStart(4)} | tris ${String(r.tris).padStart(8)} | shapes ${String(r.inst).padStart(6)} | animators ${r.anim} | lights ${r.lights} | heap ${r.heap} MB | ready ${ready} ms | buffer ${r.buf}`); if (name === 'globe') console.log('  GPU: ' + r.gpu);
  await page.close();
}
await browser.close();
