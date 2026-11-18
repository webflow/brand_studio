// Building catalog: one page with every hero object and every architecture style, each alone on a flat tile.
// Output: catalog/building-catalog.html (self-contained; pictures are inside the file).
// Usage: node tools/catalog.mjs
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage(); const errs = [];
page.on('console', (m) => { if (!['log', 'info', 'debug'].includes(m.type())) errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(e.message));
await page.setViewport({ width: 880, height: 660 });
// samples=0: no sample regions, so the background is open sea.
await page.goto(file + '?tier=high&design=1&light=studio&season=0.3&samples=0'); await sleep(2200);
// The height of each hero object, read from the source. The camera comes closer to a low building.
const tall = {}; for (const m of readFileSync(join(root, 'src', 'heroes.js'), 'utf8').matchAll(/(\w+): \{\s*label: '[^']+', r: ([\d.]+), h: ([\d.]+)/g)) tall[m[1]] = [+m[2], +m[3]];
await page.click('.steps button[data-step="3"]'); await sleep(200);
const heroes = await page.evaluate(() => [...document.querySelectorAll('[data-add]')].map((e) => [e.dataset.add, (e.getAttribute('aria-label') || e.textContent).replace(/^Add\s+/i, '').trim()]));
await page.click('.steps button[data-step="2"]'); await sleep(200);
let styles = await page.evaluate(() => [...document.querySelectorAll('[data-set="arch"]')].map((e) => [e.dataset.v, e.textContent.trim()]));
if (!styles.length) { for (const st of ['0', '1', '4']) { await page.click(`.steps button[data-step="${st}"]`); await sleep(150); styles = await page.evaluate(() => [...document.querySelectorAll('[data-set="arch"]')].map((e) => [e.dataset.v, e.textContent.trim()])); if (styles.length) break; } }
await page.evaluate(() => { document.querySelector('#panel').style.visibility = 'hidden'; document.querySelector('#hud').style.display = 'none'; for (const id of ['lightBtn', 'tip']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
const shot = async () => 'data:image/jpeg;base64,' + await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 86 });
// Build one thing on the practice tile and aim the camera. turn = extra turn of the camera around the tile.
const setup = (cfg, cam) => page.evaluate((cfg, cam) => {
  const a = window.__dbw, P = a.practice;
  Object.assign(P.cfg, { biome: 'meadow', rough: 0, water: 0, veg: 0, bld: 0, whimsy: 0, hues: ['red', 'blue'], toneSet: 'mid', hueShift: 0.5, heroes: [], bare: true }, cfg);
  document.querySelector('.steps button[data-step="0"]').click(); document.querySelector(`[data-set="biome"][data-v="${P.cfg.biome}"]`).click();
  a.cam.setInset(0, 0); const f = a.cam.focus; f.dist = cam.dist; f.tilt = cam.tilt; f.lift = cam.lift; f.az = P.tile.rot0 + Math.PI / 3 + 0.5 + (cam.turn || 0); f.min = 0.12; a.world.U.uFocusK.value = 0;
  const an = cam.anchor ? P.reg.anchors[cam.anchor] : null; f.ox = an ? an.x : 0; f.oz = an ? an.z : 0;   // look at the building, not at the tile center
}, cfg, cam);
const turn = (t, dist) => page.evaluate((t, dist) => { const a = window.__dbw, f = a.cam.focus; f.az += t; if (dist) f.dist = dist; }, t, dist);
const items = [];
let n = 0;
for (const [id, label] of heroes) {
  const cfg = { heroes: [{ type: id, anchor: 0, rot: 1, size: 'large' }] };
  if (id === 'dock' || id === 'bridge') { cfg.heroes[0].anchor = 4; cfg.water = 0.2; }
  const [fr, fh] = tall[id] || [0.25, 0.4];
  await setup(cfg, { dist: 0.15 + Math.max(fh * 0.36, fr * 0.62), tilt: 1.1, lift: Math.max(0.12, fh * 0.6), anchor: cfg.heroes[0].anchor }); await sleep(900);
  const a = await shot(); await turn(Math.PI); await sleep(700); const b = await shot();
  items.push({ code: 'H' + String(++n).padStart(2, '0'), group: 'hero', id, label, a, b, la: 'Front', lb: 'Back' });
  process.stdout.write('.');
}
n = 0;
for (const [id, label] of styles) {
  await setup({ arch: id, bld: 1, whimsy: 0.3, seed: 4242 }, { dist: 0.5, tilt: 1.0, lift: 0.2 }); await sleep(1000);
  const a = await shot(); await turn(0.9, 0.24); await sleep(700); const b = await shot();
  items.push({ code: 'B' + (++n), group: 'style', id, label, a, b, la: 'Many buildings', lb: 'Close view' });
  process.stdout.write('+');
}
// Window styles to compare: the same three buildings with each style (CONFIG.texture.window).
const WIN = ['White frame with a cross (the old style)', 'Sky glass: thin dark frame, one bar', 'Deep set with dark glass (on all buildings)', 'Small panes: thin dark bars in a grid'];
const wins = [];
for (const w of [2]) {   // only the chosen style; use [0, 1, 2, 3] to compare all styles again
  await page.evaluate((w) => { window.__dbw.config.texture.window = w; }, w);
  const pics = [];
  await setup({ heroes: [{ type: 'lighthouse', anchor: 0, rot: 1, size: 'large' }] }, { dist: 0.2, tilt: 1.32, lift: 0.4 }); await sleep(900); pics.push([await shot(), 'Lighthouse']);
  await setup({ heroes: [{ type: 'coffee', anchor: 0, rot: 1, size: 'large' }] }, { dist: 0.2, tilt: 1.25, lift: 0.12 }); await sleep(900); pics.push([await shot(), 'Coffee house']);
  await setup({ arch: 'grand', bld: 1, whimsy: 0.3, seed: 4242 }, { dist: 0.17, tilt: 1.2, lift: 0.14, turn: 0.9 }); await sleep(1000); pics.push([await shot(), 'Grand Avenue buildings']);
  wins.push({ code: 'W' + (w + 1), id: 'window ' + w, label: WIN[w], pics });
  process.stdout.write('w');
}
// The farm grows a different crop in each biome.
const CROP = { meadow: 'wheat', forest: 'pumpkins', desert: 'agave', tundra: 'cabbage', wetland: 'rice', volcanic: 'grape vines', archipelago: 'pineapples', canyon: 'corn', jungle: 'banana plants', alpine: 'lavender', crystal: 'mushrooms' };
await page.evaluate(() => { window.__dbw.config.texture.window = 2; });
const cropPics = [];
for (const [biome, crop] of Object.entries(CROP)) {
  await setup({ biome, heroes: [{ type: 'farm', anchor: 0, rot: 1, size: 'large' }] }, { dist: 0.3, tilt: 0.95, lift: 0.08 }); await sleep(1000);
  cropPics.push([await shot(), biome[0].toUpperCase() + biome.slice(1) + ': ' + crop]);
  process.stdout.write('c');
}
const crops = { code: 'H07 crops', id: 'farm', label: 'Farm crops for each biome', pics: cropPics };
await browser.close();
const card = (it) => { const pics = it.pics || [[it.a, it.la], [it.b, it.lb]]; return `<section class="card${it.pics ? ' wide' : ''}" id="${it.code.replace(/\s+/g, '-')}"><header><b>${it.code}</b><h2>${it.label}</h2><code>${it.id}</code></header><div class="pics${it.pics ? ' p3' : ''}">${pics.map(([src, cap]) => `<figure><img loading="lazy" src="${src}" alt="${it.label}, ${cap.toLowerCase()}"><figcaption>${cap}</figcaption></figure>`).join('')}</div></section>`; };
const H = items.filter((i) => i.group === 'hero'), S = items.filter((i) => i.group === 'style');
const TITLE = 'Worlds Building Catalog';
const DARK = '--bg:#121212;--fg:#f2f2f2;--mut:#a8a8a8;--line:#343434;--card:#1c1c1c;color-scheme:dark';
const style = `<style>
/* Layout: one column of intro and links, then a grid of cards. Each card has a code, a name, and two pictures. */
:root{--bg:#fff;--fg:#080808;--mut:#5a5a5a;--line:#d8d8d8;--card:#f6f6f4;--pic:#fff;--cap:#333;--capbg:rgba(255,255,255,.86);--mono:ui-monospace,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1500px;margin:0 auto;padding-block:28px 60px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
h1{font-size:28px;margin:0 0 6px;text-wrap:balance}p{margin:0 0 10px;color:var(--mut);max-width:70ch}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 26px}nav a{font:12px/1 var(--mono);color:var(--fg);text-decoration:none;border:1px solid var(--line);padding:6px 8px}nav a:hover{background:var(--card)}nav a:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
h3{font-size:13px;letter-spacing:.08em;text-transform:uppercase;border-top:2px solid var(--fg);padding-top:10px;margin:34px 0 14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,620px),1fr));gap:16px}
.card{border:1px solid var(--line);background:var(--card);scroll-margin-top:12px;min-width:0}.card header{display:flex;align-items:baseline;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.card b{font:700 13px/1 var(--mono);background:var(--fg);color:var(--bg);padding:5px 7px}.card h2{font-size:17px;margin:0;flex:1;min-width:0}.card code{font:12px var(--mono);color:var(--mut)}
.pics{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}.pics.p3{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}.card.wide{grid-column:1/-1}figure{margin:0;background:var(--pic);position:relative}img{display:block;width:100%;max-width:100%;height:auto}
figcaption{position:absolute;left:8px;bottom:6px;font-size:11px;color:var(--cap);background:var(--capbg);padding:2px 5px}
</style>`;
const body = `<main>
<h1>Building catalog</h1>
<p>Design builds worlds prototype. ${H.length} hero objects and ${S.length} architecture styles, each alone on a flat meadow tile in studio light, with open sea around it. Accent 1 is red. Accent 2 is blue.</p>
<p>To comment, use the code of the item, for example "H07: make the roof flatter".</p>
<nav aria-label="Items">${[...wins, ...items].map((i) => `<a href="#${i.code}">${i.code} ${i.label}</a>`).join('')}</nav>
<h3>Window style</h3>
<p>W3 is the style of all windows in the prototype and in all pictures on this page: dark glass set back in the wall, a light sill, no bars. The other styles (W1, W2, W4) were removed from this page. At night, the glass shows warm light.</p>
<div class="grid">${wins.map(card).join('')}</div>
<h3>Hero objects (H01 to H${String(H.length).padStart(2, '0')})</h3><div class="grid">${H.map(card).join('')}</div>
<h3>Farm crops</h3>\n<p>The farm (H07) grows a crop that matches the biome of its region. The Coral biome uses the same crop as Archipelago.</p>\n<div class="grid">${card(crops)}</div>\n<h3>Architecture styles for small buildings (B1 to B${S.length})</h3>
<p>Each style makes many small buildings with random size and details. The left picture shows a tile full of them. The right picture is a close view.</p>
<div class="grid">${S.map(card).join('')}</div>
</main>`;
// Two files with the same content: a normal web page, and a page fragment for a Claude artifact (the artifact host adds the outer tags).
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${TITLE}</title>${style}</head><body>${body}</body></html>`;
const frag = `<title>${TITLE}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${style}\n${body}\n`;
mkdirSync(join(root, 'catalog'), { recursive: true });
const out = join(root, 'catalog', 'building-catalog.html');
writeFileSync(out, html); writeFileSync(join(root, 'catalog', 'building-catalog-artifact.html'), frag);
console.log(`\n${out}  ${(html.length / 1048576).toFixed(2)} MB  ${H.length} heroes, ${S.length} styles  ${errs.length ? 'ERRORS ' + [...new Set(errs)].join('|') : 'no errors'}`);
