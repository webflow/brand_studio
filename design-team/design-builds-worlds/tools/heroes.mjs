// Close-up sheet of the 19 hero objects (each alone on a flat practice tile).
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const extra = process.argv[2] || '';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage(); const errs = [];
page.on('console', (m) => { if (!['log', 'info', 'debug'].includes(m.type())) errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(e.message));
await page.setViewport({ width: 560, height: 460 });
await page.goto(file + '?tier=high&design=1&light=studio&' + extra); await sleep(2000);
await page.click('.steps button[data-step="3"]'); await sleep(200);
const ids = await page.evaluate(() => [...document.querySelectorAll('[data-add]')].map((e) => e.dataset.add));
await page.evaluate(() => { document.querySelector('#panel').style.visibility = 'hidden'; document.querySelector('#hud').style.display = 'none'; window.__dbw.cam.setInset(0, 0); });
const imgs = [];
for (const id of ids) {
  await page.evaluate((id) => { const a = window.__dbw, P = a.practice; Object.assign(P.cfg, { biome: 'meadow', rough: 0.0, water: 0.0, veg: 0.0, bld: 0.0, whimsy: 0, hues: ['green', 'red', 'yellow'], toneSet: 'mid', hueShift: 0.5, heroes: [{ type: id, anchor: 0, rot: 1, size: 'large' }] }); if (id === 'dock' || id === 'bridge') { P.cfg.heroes[0].anchor = 4; P.cfg.water = 0.2; } document.querySelector('.steps button[data-step="0"]').click(); document.querySelector('[data-set="biome"][data-v="meadow"]').click(); a.cam.setInset(0, 0); const f = a.cam.focus; f.dist = 0.42; f.tilt = 1.12; f.lift = 0.6; f.az = P.tile.rot0 + Math.PI / 3 + 0.5; a.world.U.uFocusK.value = 0; }, id);
  await sleep(700);
  imgs.push([id, await page.screenshot({ encoding: 'base64' })]);
}
const p2 = await browser.newPage(); await p2.setViewport({ width: 5 * 400, height: 4 * 330 });
await p2.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:#888">${imgs.map(([id, b]) => `<div style="position:relative"><img src="data:image/png;base64,${b}" style="width:100%;display:block"><b style="position:absolute;left:4px;top:2px;font:13px monospace;background:#fff">${id}</b></div>`).join('')}</body>`);
const out = join(root, 'checkpoints', `sheet-heroes${extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '_').slice(0, 20) : ''}.png`);
await p2.screenshot({ path: out }); console.log(out, errs.length ? 'ERRORS ' + [...new Set(errs)].join('|') : 'no errors');
await browser.close();
