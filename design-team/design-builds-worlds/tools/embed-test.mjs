// Test of the embed script (dist/design-builds-worlds.min.js) on a host page that has a <canvas> (tools/embed-test.html).
// Usage: node tools/embed-test.mjs
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(root, 'checkpoints'), { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files'] });
let fails = 0, passes = 0;
const ok = (name, cond, extra = '') => { if (cond) passes++; else fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && !cond ? '  [' + extra + ']' : ''}`); };

const page = await browser.newPage(); const errors = [], requests = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:') && !r.url().startsWith('about:')) requests.push(r.url()); });
await page.setViewport({ width: 1280, height: 800 });
await page.goto(pathToFileURL(join(root, 'tools', 'embed-test.html')).href);
await sleep(4000);

const inner = (fn, ...args) => page.evaluate(`(${fn})(document.querySelector('iframe').contentWindow, ...${JSON.stringify(args)})`);
const st = await page.evaluate(() => { const f = document.querySelector('iframe'), c = document.querySelector('canvas'); const r = f ? f.getBoundingClientRect() : null; return { frame: !!f, canvasLeft: !!c, id: f && f.id, cls: f && f.className, w: r && Math.round(r.width), h: r && Math.round(r.height), vw: document.documentElement.clientWidth }; });
ok('the frame takes the place of the canvas, with its id and class', st.frame && !st.canvasLeft && st.id === 'planet' && st.cls === 'stage', JSON.stringify(st));
ok('the frame has the size that the page gave to the canvas (100% wide, 620 px high)', st.w === st.vw && st.h === 620, JSON.stringify(st));
const app = await inner((w) => ({ ok: !!w.__dbw, calls: w.__dbw && w.__dbw.world.drawCalls, tier: w.__dbw && w.__dbw.world.tier, size: [w.innerWidth, w.innerHeight], embed: w.document.documentElement.className, hint: w.document.querySelector('#hint').textContent.slice(0, 60) }));
ok('the planet runs in the frame and draws', app.ok && app.calls > 20, JSON.stringify(app));
ok('the option on the canvas (data-tier) reaches the planet', app.tier === 'medium', JSON.stringify(app));
ok('the planet knows that the page around it scrolls', app.embed.includes('embed-scroll') && /Ctrl/.test(app.hint), JSON.stringify(app));
const styles = await inner((w) => { const d = w.document; d.querySelector('#settingsBtn').click(); const b = d.querySelector('#designBtn'), s = d.querySelector('#settings'); return { btnBg: w.getComputedStyle(b).backgroundColor, btnBorder: w.getComputedStyle(b).borderTopStyle, menu: w.getComputedStyle(s).display, font: Math.round(parseFloat(w.getComputedStyle(b).fontSize)) }; });
ok('the styles of the host page do not reach the planet (buttons, menu)', styles.btnBg !== 'rgb(255, 105, 180)' && styles.btnBorder !== 'dashed' && styles.menu !== 'none' && styles.font < 20, JSON.stringify(styles));
const host = await page.evaluate(() => ({ bodyFont: getComputedStyle(document.body).fontFamily, overflow: getComputedStyle(document.body).overflow, h1: getComputedStyle(document.querySelector('h1')).fontFamily }));
ok('the styles of the planet do not reach the host page', /Georgia/.test(host.bodyFont) && host.overflow !== 'hidden', JSON.stringify(host));
await inner((w) => w.document.querySelector('#settingsBtn').click());

// In the embed: no title, time, or season in the corner. The backdrop is clear, so the dark page shows behind the planet.
const look = await inner((w) => { const d = w.document, a = w.__dbw; return { brand: w.getComputedStyle(d.querySelector('#brand')).display, body: w.getComputedStyle(d.body).backgroundColor, cls: d.documentElement.className, alpha: a.world.renderer.getContext().getContextAttributes().alpha, clearA: a.world.renderer.getClearAlpha(), backdrop: a.world.backdrop.visible, bg: a.world.U.uBg.value.toArray().map((v) => Math.round(v * 255)).join(','), hint: w.getComputedStyle(d.querySelector('#hint')).color, clock: !!d.querySelector('#ppTimeT') || true }; });
ok('in the embed there is no title, time, or season in the corner', look.brand === 'none', JSON.stringify(look));
ok('the backdrop of the embed is clear, and the planet knows the color of the page (16, 20, 24)', look.body === 'rgba(0, 0, 0, 0)' && look.alpha === true && look.clearA === 0 && look.backdrop === false && look.bg === '16,20,24' && look.cls.includes('embed-dark'), JSON.stringify(look));
const shot = await page.screenshot({ encoding: 'base64' });
const px = await page.evaluate(async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const f = document.querySelector('iframe').getBoundingClientRect(); const at = (dx, dy) => [...x.getImageData(Math.round(f.x + dx), Math.round(f.y + dy), 1, 1).data].slice(0, 3); return { corner: at(8, 8), corner2: at(8, 300), mid: at(f.width / 2, f.height / 2) }; }, shot);
ok('on the screen the corners of the frame have the color of the page, not white, and the planet is in the middle', px.corner.every((v, i) => Math.abs(v - [16, 20, 24][i]) < 8) && px.corner2.every((v, i) => Math.abs(v - [16, 20, 24][i]) < 8) && px.mid.some((v) => v > 50), JSON.stringify(px));
const ph = await inner((w) => { const a = w.__dbw, c = a.photoCanvas(a.samples[2], 0, 'noon', 1, 0.25, 0, 0, 'off', 'white'), d = c.getContext('2d').getImageData(4, 4, 1, 1).data; return { px: [...d], clearA: a.world.renderer.getClearAlpha(), backdrop: a.world.backdrop.visible }; });
ok('a photo from the embed still has its white backdrop, and the live view is clear again after it', ph.px[0] > 245 && ph.px[1] > 245 && ph.px[2] > 245 && ph.px[3] === 255 && ph.clearA === 0 && ph.backdrop === false, JSON.stringify(ph));

// The wheel: with no key it scrolls the page. With Ctrl it zooms the planet.
const r = await page.evaluate(() => { const b = document.querySelector('iframe').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
await page.mouse.move(r.x, r.y);
const d0 = await inner((w) => w.__dbw.cam.dist);
await page.mouse.wheel({ deltaY: 300 }); await sleep(500);
const s1 = await page.evaluate(() => scrollY), d1 = await inner((w) => w.__dbw.cam.dist);
ok('the wheel with no key scrolls the page and does not zoom', s1 > 100 && Math.abs(d1 - d0) < 0.01, `scrollY ${s1}, dist ${d0} -> ${d1}`);
await page.evaluate(() => scrollTo(0, 0)); await sleep(300);
await page.mouse.move(r.x, r.y);
await page.keyboard.down('Control'); await page.mouse.wheel({ deltaY: -200 }); await page.keyboard.up('Control'); await sleep(500);
const s2 = await page.evaluate(() => scrollY), d2 = await inner((w) => w.__dbw.cam.dist);
ok('the wheel with Ctrl zooms the planet and does not scroll the page', s2 < 5 && Math.abs(d2 - d1) > 0.05, `scrollY ${s2}, dist ${d1} -> ${d2}`);

// A drag turns the planet. A click opens a region.
const lon0 = await inner((w) => w.__dbw.cam.lon);
await page.mouse.move(r.x, r.y); await page.mouse.down(); await page.mouse.move(r.x + 160, r.y + 10, { steps: 8 }); await page.mouse.up(); await sleep(400);
ok('a drag in the frame turns the planet', Math.abs((await inner((w) => w.__dbw.cam.lon)) - lon0) > 0.1);

// The drawing stops while the frame is out of view.
await page.evaluate(() => scrollTo(0, 2600)); await sleep(700);
const p1 = await inner((w) => !!w.__DBW_PAUSED);
await page.evaluate(() => scrollTo(0, 0)); await sleep(700);
const p2 = await inner((w) => !!w.__DBW_PAUSED);
ok('the drawing stops when the frame is out of view, and starts again', p1 === true && p2 === false, `${p1} ${p2}`);
ok('the storage of the browser works in the frame (the passport)', await inner((w) => { try { w.localStorage.setItem('dbw-test', '1'); const v = w.localStorage.getItem('dbw-test'); w.localStorage.removeItem('dbw-test'); return v === '1'; } catch (e) { return false; } }));
await page.screenshot({ path: join(root, 'checkpoints', 'embed-test.png') });
ok('no errors and no network requests', errors.length === 0 && requests.length === 0, errors.concat(requests).join(' | '));

// A canvas with no size and no mark: the script tag names it, and the frame gets a useful size.
const p2page = await browser.newPage(); const e2 = [];
p2page.on('pageerror', (e) => e2.push(e.message)); p2page.on('console', (m) => { if (m.type() === 'error') e2.push(m.text()); });
await p2page.setViewport({ width: 1000, height: 700 });
writeFileSync(join(root, 'checkpoints', '_embed2.html'), '<!doctype html><body style="margin:0"><div class="section" style="padding:40px"><canvas></canvas></div><script src="../dist/design-builds-worlds.min.js" data-target=".section canvas"></script></body>');
await p2page.goto(pathToFileURL(join(root, 'checkpoints', '_embed2.html')).href);
await sleep(3500);
const st2 = await p2page.evaluate(() => { const f = document.querySelector('iframe'); if (!f) return null; const b = f.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), run: !!(f.contentWindow && f.contentWindow.__dbw) }; });
ok('a canvas with no size and no mark: data-target on the script finds it, and the frame is 100% wide and 700 px high (the height of the window)', st2 && st2.w === 920 && st2.h === 700 && st2.run && e2.length === 0, JSON.stringify(st2) + ' ' + e2.join(' | '));

console.log(fails ? `${fails} FAILED` : `ALL PASSED (${passes})`);
await browser.close();
process.exit(fails ? 1 : 0);
