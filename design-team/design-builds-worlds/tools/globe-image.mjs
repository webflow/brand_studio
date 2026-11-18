// Export a clean square picture of the globe (no UI). Usage: node tools/globe-image.mjs [size px, default 3000]
// It writes dist/globe-1x1.png (with the sun, the moon, and the orbit lines) and dist/globe-1x1-planet-only.png.
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const px = +(process.argv[2] || 3000), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: px / 2, height: px / 2, deviceScaleFactor: 2 });
await page.goto(file + '?tier=high&season=0.3&t=' + (process.argv[3] || '0.4'));
await page.addStyleTag({ content: 'body > *:not(#c) { display: none !important; }' });
await sleep(3000);
await page.evaluate(() => { const a = window.__dbw; a.cam.auto = false; a.cam.changed(); });
await sleep(800);
await page.screenshot({ path: join(root, 'dist', 'globe-1x1.png') });
await page.evaluate(() => {
  const w = window.__dbw.world, off = (o) => o && o.traverse((c) => { if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { m.visible = false; }); });
  off(w.orbits); off(w.sunMark); (w.orbiters || []).forEach((o) => off(o.spin));
});
await sleep(600);
await page.screenshot({ path: join(root, 'dist', 'globe-1x1-planet-only.png') });
console.log('cam', await page.evaluate(() => { const c = window.__dbw.cam; return [c.lon, c.lat, c.dist]; }));
await browser.close();
