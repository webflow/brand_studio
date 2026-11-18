// Take screenshots of the built file with the installed Chrome (no download).
// Usage: node tools/shots.mjs <set-name>   Sets are defined in tools/shot-sets.mjs
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { SETS } from './shot-sets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const setName = process.argv[2] || 'cp1';
const only = process.argv[3];
const shots = SETS[setName];
if (!shots) { console.error('unknown set', setName, Object.keys(SETS)); process.exit(1); }
const outDir = join(root, 'checkpoints'); mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files'],
});
let failed = false;
for (const s of shots) {
  if (only && s.name !== only) continue;
  const page = await browser.newPage();
  const errors = [], requests = [];
  page.on('console', (m) => { if (m.type() !== 'log' && m.type() !== 'info' && m.type() !== 'debug') { const t = `${m.type()}: ${m.text()}`; if (!errors.includes(t)) errors.push(t); } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url()); });
  await page.setViewport({ width: s.w || 1440, height: s.h || 900, deviceScaleFactor: s.dpr || 1, isMobile: !!s.mobile, hasTouch: !!s.mobile });
  if (s.reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(file + (s.q ? '?' + s.q : ''));
  await new Promise((r) => setTimeout(r, s.wait || 1500));
  let at = null;
  if (s.run) { try { at = await s.run(page); } catch (e) { errors.push('run: ' + e.message); } }
  if (at && at.x != null) { const cw = s.cw || 500, ch = s.ch || 400; s.clip = { x: Math.max(0, Math.min((s.w || 1440) - cw, at.x - cw / 2)), y: Math.max(0, Math.min((s.h || 900) - ch, at.y - ch / 2)), width: cw, height: ch }; }
  const out = join(outDir, `${setName}-${s.name}.png`);
  await page.screenshot(s.clip ? { path: out, clip: s.clip } : { path: out });
  const stats = await page.evaluate(() => { const a = window.__dbw; return a ? { calls: a.world.drawCalls, tier: a.world.tier, tris: a.world.renderer.info.render.triangles } : null; });
  console.log(`${s.name}: ${out}  ${JSON.stringify(stats)}${errors.length ? '\n  ERRORS: ' + errors.join('\n  ') : ''}${requests.length ? '\n  NETWORK: ' + requests.join(', ') : ''}`);
  if (errors.length || requests.length) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 2 : 0);
