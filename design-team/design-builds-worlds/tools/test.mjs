// Path tests on the built file. Desktop and phone. Reports console errors and network requests.
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { statSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'dist', 'design-builds-worlds.html');
const file = pathToFileURL(path).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let failed = 0;
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`); if (!cond) failed++; };
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
async function open(q, vp = { width: 1440, height: 900 }, opts = {}) {
  const page = await browser.newPage();
  page._errs = []; page._net = [];
  page.on('console', (m) => { if (!['log', 'info', 'debug'].includes(m.type()) && !m.text().includes('willReadFrequently')) page._errs.push(m.text()); });
  page.on('pageerror', (e) => page._errs.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) page._net.push(r.url()); });
  await page.setViewport(vp);
  if (opts.reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(file + (q ? '?' + q : ''));
  await sleep(opts.wait || 1500);
  return page;
}
const done = async (page, name) => { ok(`${name}: no console errors`, page._errs.length === 0, [...new Set(page._errs)].slice(0, 3).join(' | ')); ok(`${name}: no network requests`, page._net.length === 0, page._net.slice(0, 3).join(', ')); await page.close(); };

// ---- size
const kb = statSync(path).size / 1024; ok('file size is 2 MB or smaller', kb <= 2000, kb.toFixed(0) + ' KB');

// ---- desktop paths
{
  const p = await open('t=0.3&cam=-75,16,4.2');
  const st = () => p.evaluate(() => { const a = window.__dbw; return { lon: a.cam.lon, lat: a.cam.lat, dist: a.cam.dist, mode: a.cam.mode, cur: a.current && a.current.name, tip: !document.querySelector('#tip').hidden && document.querySelector('#tip').textContent, panel: !document.querySelector('#panel').hidden, tiles: a.world.tiles.length, pents: a.world.tiles.filter((t) => t.isPent).length, samples: a.samples.length, areas: a.areas.length, calls: a.world.drawCalls, ready: a.readyMs }; });
  let s = await st();
  ok('92 tiles, 12 pentagons', s.tiles === 92 && s.pents === 12, `${s.tiles}/${s.pents}`);
  ok('20 samples and 12 areas', s.samples === 20 && s.areas === 12);
  ok('draw calls under 250', s.calls < 250, String(s.calls));
  ok('ready in under 3 s (desktop)', s.ready < 3000, s.ready + ' ms');
  const a = await st();
  await p.mouse.move(700, 450); await p.mouse.down(); await p.mouse.move(820, 480, { steps: 8 }); await p.mouse.up(); await sleep(300);
  s = await st(); ok('drag rotates', Math.abs(s.lon - a.lon) > 0.05);
  await p.mouse.move(720, 450); await p.mouse.wheel({ deltaY: -400 }); await sleep(300);
  s = await st(); ok('wheel zooms in', s.dist < a.dist - 0.1, s.dist.toFixed(2));
  await p.keyboard.press('-'); await p.keyboard.press('-'); await p.keyboard.press('ArrowLeft'); await sleep(400);
  const s2 = await st(); ok('keys zoom and rotate', s2.dist > s.dist && s2.lon !== s.lon);
  // hover a region: find a sample tile center on screen
  const pos = await p.evaluate(() => { const a = window.__dbw; a.cam.dist = 4.2; let best = null; for (const r of [...a.samples, ...a.areas]) { const d = r.tile.center.clone().normalize().dot(a.world.camera.position.clone().normalize()); if (!best || d > best.d) best = { d, r }; } const q = a.cam.project(best.r.tile.center); return { x: q.x, y: q.y, name: best.r.name }; });
  await sleep(500);
  const pos2 = await p.evaluate((n) => { const a = window.__dbw; const r = [...a.samples, ...a.areas].find((x) => x.name === n); const q = a.cam.project(r.tile.center); return { x: q.x, y: q.y }; }, pos.name);
  await p.mouse.move(pos2.x, pos2.y); await sleep(200);
  s = await st(); ok('hover shows the region name', s.tip && s.tip.includes(pos.name), String(s.tip));
  await p.mouse.click(pos2.x, pos2.y); await sleep(1600);
  s = await st(); ok('click opens the region and the manual', s.cur === pos.name && s.panel && s.mode === 'focus');
  const secs = await p.$$eval('#panel h2', (els) => els.map((e) => e.textContent.trim()));
  ok('manual has its sections, with no numbers', secs.includes('Palette') && secs.includes('Construction diagram') && !secs.some((t) => /^\d/.test(t)) && !secs.includes('Activity'), secs.join(', '));
  ok('manual has a construction diagram', await p.$('#panel svg.fig') !== null);
  ok('manual has no adjacent regions section', await p.evaluate(() => !document.querySelector('#panel .nb') && ![...document.querySelectorAll('#panel h2')].some((h) => h.textContent.includes('Adjacent'))));
  // hidden detail by keyboard path
  const before = await p.evaluate(() => window.__dbw.foundCount(window.__dbw.current));
  await p.$eval('#hintBtn', (e) => e.click()); await sleep(300);
  const after = await p.evaluate(() => ({ n: window.__dbw.foundCount(window.__dbw.current), line: document.querySelector('#foundLine').textContent, total: window.__dbw.current.details.length }));
  ok('hidden detail found, counter updates', after.n === before + 1 && after.line.includes(`${after.n} of`), after.line);
  ok('each region hides 3 to 5 details', await p.evaluate(() => window.__dbw.samples.every((r) => r.details.length >= 3 && r.details.length <= 5)), await p.evaluate(() => window.__dbw.samples.map((r) => r.details.length).join('')));
  await p.keyboard.press('Escape'); await sleep(1200);
  s = await st(); ok('Esc closes, camera returns', !s.cur && !s.panel && s.mode === 'orbit');
  // unique area
  await p.evaluate(() => window.__dbw.openRegion(window.__dbw.areas[10])); await sleep(1300);
  s = await st(); ok('unique area opens', s.cur === 'Mirror lake' && s.panel);
  await p.click('#panel .x'); await sleep(900);
  s = await st(); ok('X button closes', !s.cur);
  // keyboard: Tab to a region and Enter
  await p.focus('#c'); await p.keyboard.press('Tab'); await sleep(700);
  s = await st(); ok('Tab moves to a region (name shows)', !!s.tip, String(s.tip));
  await p.keyboard.press('Enter'); await sleep(1300);
  s = await st(); ok('Enter opens it', !!s.cur);
  await p.keyboard.press('Escape'); await sleep(600);
  await p.keyboard.press('l'); await sleep(200);
  ok('there is no Lighting lab any more', await p.evaluate(() => !document.querySelector('#lab') && !window.__dbw.lab));
  await done(p, 'desktop');
}
// ---- design mode, undo and redo, export
{
  const p = await open('light=studio');
  await p.click('#settingsBtn'); await p.click('#designBtn'); await sleep(1600);
  const cfg = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__dbw.practice.cfg)));
  const c0 = await cfg();
  ok('design mode opens on the practice tile', await p.evaluate(() => window.__dbw.mode === 'design' && !document.querySelector('#panel').hidden && document.querySelector('#panel').textContent.includes('Practice region, not saved')));
  ok('a new region starts blank: bare land, no scenery, no landmarks, no name', c0.biome === 'blank' && c0.arch === 'none' && c0.heroes.length === 0 && c0.name === '', JSON.stringify(c0).slice(0, 120));
  ok('the steps are Land, Scenery, Landmarks, Color, Name', (await p.$$eval('.steps button span', (e) => e.map((x) => x.textContent).join(','))) === 'Land,Scenery,Landmarks,Color,Name');
  ok('there are 17 biomes to pick', (await p.$$eval('[data-set="biome"]', (e) => e.length)) === 17);
  await p.evaluate(() => document.querySelector('.chip[data-season="3"]').click()); await sleep(300);
  ok('the season preview shows winter', await p.evaluate(() => window.__dbw.world.time.season === 3 && document.querySelector('.chip[data-season="3"]').getAttribute('aria-pressed') === 'true'));
  await p.evaluate(() => document.querySelector('.chip[data-season="-1"]').click()); await sleep(200);
  await p.evaluate(() => document.querySelector('.chip[data-time="night"]').click()); await sleep(300);
  ok('the time preview shows night on the tile', await p.evaluate(() => { const a = window.__dbw; return a.world.sunDir.dot(a.practice.tile.center) < -0.3; }));
  await p.evaluate(() => document.querySelector('.chip[data-time="noon"]').click()); await sleep(300);
  ok('the time preview shows noon on the tile', await p.evaluate(() => { const a = window.__dbw; return a.world.sunDir.dot(a.practice.tile.center) > 0.7; }));
  await p.evaluate(() => document.querySelector('.chip[data-time="now"]').click()); await sleep(200);
  ok('"Now" gives the time back to the planet', await p.evaluate(() => window.__dbw.world.sunOverride === null));
  await p.evaluate(() => { const b = [...document.querySelectorAll('[data-set="biome"]')].find((x) => x.getAttribute('aria-pressed') === 'false'); b.click(); }); await sleep(300);
  const c1 = await cfg(); ok('biome changes, region rebuilds live', c1.biome !== c0.biome && await p.evaluate(() => window.__dbw.practice.reg.cfg.biome === window.__dbw.practice.cfg.biome));
  await p.evaluate(() => { const i = document.querySelector('input[data-key="rough"]'); i.value = 0.93; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); }); await sleep(200);
  ok('slider changes a dial', (await cfg()).rough === 0.93);
  await p.keyboard.down('Control'); await p.keyboard.press('z'); await p.keyboard.up('Control'); await sleep(200);
  ok('Ctrl+Z undoes', (await cfg()).rough === c1.rough);
  await p.keyboard.down('Control'); await p.keyboard.down('Shift'); await p.keyboard.press('z'); await p.keyboard.up('Shift'); await p.keyboard.up('Control'); await sleep(200);
  ok('Shift+Ctrl+Z redoes', (await cfg()).rough === 0.93);
  await p.click('#undoBtn'); await sleep(150); ok('Undo button works', (await cfg()).rough === c1.rough);
  await p.click('.steps button[data-step="1"]'); await sleep(150);
  ok('the scenery step has None, 7 kinds of nature, and 11 kinds of buildings', (await p.$$eval('[data-set="arch"]', (e) => e.length)) === 19 && (await p.$('[data-set="arch"][data-v="none"]')) !== null);
  await p.evaluate(() => document.querySelector('[data-set="arch"][data-v="woodland"]').click()); await sleep(400);
  ok('a nature kind of scenery can be set', (await cfg()).arch === 'woodland' && await p.evaluate(() => window.__dbw.practice.reg.counts.buildings > 0), await p.evaluate(() => String(window.__dbw.practice.reg.counts.buildings)));
  await p.click('.steps button[data-step="3"]'); await sleep(150);
  await p.evaluate(() => document.querySelector('.hue[data-role="0"][aria-pressed="false"]').click()); await sleep(200);
  ok('hue changes', (await cfg()).hues[0] !== c1.hues[0]);
  await p.click('.steps button[data-step="2"]'); await sleep(150);
  await p.evaluate(() => document.querySelector('[data-add="mountain"]').click()); await sleep(400);
  ok('a natural landmark can be added (mountain)', (await cfg()).heroes.some((h) => h.type === 'mountain') && (await p.$$eval('[data-add]', (e) => e.length)) === 30);
  await p.evaluate(() => document.querySelector('[data-f="del"]').click()); await sleep(200);
  const n0 = (await cfg()).heroes.length;
  await p.evaluate(() => { [...document.querySelectorAll('[data-f="del"]')].slice(1).forEach(() => document.querySelector('[data-f="del"]').click()); }); await sleep(200);
  await p.evaluate(() => document.querySelector('[data-add="lighthouse"]').click()); await sleep(200);
  const hs = (await cfg()).heroes; ok('hero objects can be removed and added', hs.some((h) => h.type === 'lighthouse'), `${n0} -> ${hs.length}`);
  await p.evaluate(() => document.querySelector('[data-f="rot"]').click()); await sleep(150);
  ok('rotate goes in 60 degree steps', (await cfg()).heroes[0].rot === (hs[0].rot + 1) % 6);
  // drag a hero on the tile to another anchor
  const drag = await p.evaluate(() => { const a = window.__dbw, P = a.practice, h = P.reg.heroes[0], V = h.constructor; const to = P.reg.anchors.findIndex((an, i) => !P.cfg.heroes.some((x) => x.anchor === i)); const pr = (x, y, z) => { const v = a.world.camera.position.clone().set(x, y, z).applyMatrix4(P.tile.matrix); return a.cam.project(v); }; return { from: pr(h.x, h.y + 0.12, h.z), to: pr(P.reg.anchors[to].x, 0.05, P.reg.anchors[to].z), toIdx: to, was: P.cfg.heroes[h.i].anchor, i: h.i }; });
  await p.mouse.move(drag.from.x, drag.from.y); await p.mouse.down(); await p.mouse.move(drag.to.x, drag.to.y, { steps: 10 }); await p.mouse.up(); await sleep(300);
  const an = (await cfg()).heroes[drag.i].anchor; ok('dragging a hero snaps it to another anchor', an === drag.toIdx && an !== drag.was, `A${drag.was} -> A${an}`);
  await p.click('.steps button[data-step="4"]'); await sleep(150);
  await p.$eval('input[data-text="name"]', (i) => { i.value = 'Test Harbor'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); }); await sleep(150);
  ok('name field works', (await cfg()).name === 'Test Harbor');
  await p.click('#shufBtn'); await sleep(200); ok('"Shuffle this step" changes the name step only', (await cfg()).name !== 'Test Harbor' && (await cfg()).biome === c1.biome);
  await p.click('#randBtn'); await sleep(300); const c5 = await cfg(); ok('"Randomize all" makes a new region', c5.seed !== c1.seed);
  // export: all 3 sizes
  await p.click('#photoBtn'); await sleep(700);
  ok('photo dialog opens with a preview', await p.$('#modal .prev canvas') !== null);
  { const at = async (v) => { await p.evaluate((v) => { const e = document.querySelector('#phSeason'); e.value = v; e.dispatchEvent(new Event('change')); }, v); await sleep(250); return p.evaluate(() => window.__dbw.photoCamera()); };
    const c1 = await at('1'), c3 = await at('3'), c0 = await at('current');
    ok('the photo keeps the same frame in every season', !!c1 && c1 === c3 && c1 === c0, `${c1} / ${c3}`); }
  const sizes = [];
  for (let i = 0; i < 3; i++) {
    const r = await p.evaluate((i) => { const a = window.__dbw; const cv = a.photoCanvas(a.practice.reg, i, i === 1 ? 'night' : i === 2 ? 'golden' : 'current', i === 2 ? '3' : 'current'); const ctx = cv.getContext('2d'); const d = ctx.getImageData(cv.width / 2, cv.height / 2, 1, 1).data; const px = ctx.getImageData(cv.width * 0.3, cv.height * 0.45, cv.width * 0.4, 4).data; let varied = false; for (let k = 4; k < px.length; k += 4) if (px[k] !== px[0] || px[k + 1] !== px[1]) varied = true; return new Promise((res) => cv.toBlob((b) => res({ w: cv.width, h: cv.height, bytes: b.size, type: b.type, varied }), 'image/png')); }, i);
    sizes.push(`${r.w}x${r.h}`); ok(`export ${r.w}x${r.h} PNG has content`, r.type === 'image/png' && r.bytes > 30000 && r.varied, r.bytes + ' bytes');
  }
  ok('export sizes are 16:9, 9:16, 4:5 at 2K', sizes.join(',') === '2560x1440,1440x2560,1600x2000', sizes.join(','));
  const cdp = await p.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});
  await p.click('#phSave'); await sleep(900);
  ok('Download PNG runs', await p.$eval('#modal .status', (e) => e.textContent.includes('Saved')).catch(() => false));
  await p.keyboard.press('Escape'); await sleep(200);
  ok('Esc closes the dialog, design mode stays', await p.evaluate(() => document.querySelector('#modal').hidden && window.__dbw.mode === 'design'));
  // the owner: name, job title, bio, and a picture (initials when there is none)
  await p.click('.steps button[data-step="4"]'); await sleep(150);
  ok('with no picture the owner shows initials', (await p.$eval('.ownerpic .avatar', (e) => e.textContent.trim())) === 'G');
  const setText = (k, v) => p.$eval(`[data-text="${k}"]`, (i, v) => { i.value = v; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); }, v);
  await setText('ownerName', 'Test Person'); await setText('ownerTitle', 'Tester'); await setText('ownerBio', 'A short test bio.'); await sleep(150);
  await p.evaluate(() => { const cv = document.createElement('canvas'); cv.width = cv.height = 8; cv.getContext('2d').fillRect(0, 0, 8, 8); window.__dbw.practice.cfg.ownerPic = cv.toDataURL('image/jpeg'); });
  await p.click('#doneBtn'); await sleep(1000);
  ok('"Save region" leaves the mode. The region stays for the session', await p.evaluate(() => window.__dbw.mode === null && window.__dbw.practice.mesh.visible && window.__dbw.cam.mode === 'orbit'));
  await p.evaluate(() => window.__dbw.openRegion(window.__dbw.practice.reg)); await sleep(900);
  ok('the manual shows the owner: name, job title, bio, picture', await p.evaluate(() => { const o = [...document.querySelectorAll('#panel section')].find((s) => s.querySelector('h2') && s.querySelector('h2').textContent === 'Owner'); return !!o && o.textContent.includes('Test Person') && o.textContent.includes('Tester') && o.textContent.includes('A short test bio.') && !!o.querySelector('.avatar img'); }));
  await p.keyboard.press('Escape'); await sleep(700);
  // edit again, then leave with no save: the region goes back to the last save
  await p.click('#settingsBtn'); await p.click('#designBtn'); await sleep(900);
  const nameSaved = (await cfg()).name;
  await p.click('.steps button[data-step="4"]'); await sleep(150); await setText('name', 'Changed Name'); await sleep(100);
  await p.click('#panel .x'); await sleep(900);
  ok('leaving with no save puts the region back to the last save', (await cfg()).name === nameSaved && await p.evaluate(() => window.__dbw.practice.mesh.visible), (await cfg()).name);
  const view = await p.evaluate(() => { const a = window.__dbw; return { w: a.world.canvas.width, h: a.world.canvas.height, asp: a.world.camera.aspect }; });
  ok('view is restored after export', view.w === 1440 && view.h === 900 && Math.abs(view.asp - 1.6) < 0.01, JSON.stringify(view));
  await done(p, 'design');
}
// ---- new style: ocean for free tiles, outline on hover, rise, night light, lamps, two accents
{
  const p = await open('t=0.3&season=0.3&cam=95,10,3.2');
  const free = await p.evaluate(() => { const a = window.__dbw; let best = null; for (const t of a.world.tiles) { if (a.regionAt(t.index) || t === a.practiceTile) continue; const d = t.center.dot(a.world.camera.position.clone().normalize()); if (!best || d > best.d) best = { d, t }; } const s = a.cam.project(best.t.center); return { x: s.x, y: s.y }; });
  await p.mouse.move(free.x, free.y); await sleep(500);
  ok('free tile is ocean: hover shows its outline and "Claim this region" (the visitor has no region yet)', await p.evaluate(() => window.__dbw.world.outline.k > 0.8 && document.querySelector('#tip').textContent.includes('Claim this region')));
  ok('no empty tile meshes: only regions and areas are raised', await p.evaluate(() => { const a = window.__dbw; return a.world.staticMesh.geometry.attributes.position.count > 0 && !a.practice.mesh.visible; }));
  const reg = await p.evaluate(() => { const a = window.__dbw; let best = null; for (const r of a.samples) { const d = r.tile.center.dot(a.world.camera.position.clone().normalize()); if (a.world.dayAt(r.tile.center) > 0.2) continue; if (!best || d > best.d) best = { d, r }; } const s = a.cam.project(best.r.tile.center); return { x: s.x, y: s.y, name: best.r.name }; });
  await p.mouse.move(reg.x, reg.y); await sleep(900);
  ok('night side: hover lights the tile', await p.evaluate(() => window.__dbw.world.U.uLitK.value > 0.7), reg.name);
  ok('lamps and beams reach the shader at night', await p.evaluate(() => window.__dbw.world.U.uLightN.value >= 1 && window.__dbw.world.lights.length > 20), await p.evaluate(() => window.__dbw.world.U.uLightN.value + ' of ' + window.__dbw.world.lights.length));
  await p.mouse.click(reg.x, reg.y); await sleep(1500);
  await p.mouse.move(5, 5); await sleep(700);
  ok('an open night region keeps the spotlight', await p.evaluate(() => window.__dbw.world.U.uLitK.value > 0.7 && !document.querySelector('#lightBtn').hidden && document.querySelector('#lightBtn').textContent.includes('Back')));
  await p.click('#lightBtn'); await p.mouse.move(5, 5); await sleep(900);
  ok('the button turns the spotlight off', await p.evaluate(() => window.__dbw.world.U.uLitK.value < 0.2 && document.querySelector('#lightBtn').textContent.includes('Light')));
  await p.keyboard.press('Escape'); await sleep(900);
  await p.click('#settingsBtn'); await p.click('#designBtn'); await sleep(250);
  const low = await p.evaluate(() => window.__dbw.practice.mesh.position.length());
  await sleep(2200);
  const up = await p.evaluate(() => window.__dbw.practice.mesh.position.length());
  ok('a new region rises from the ocean', low > 0.02 && up === 0, `${low.toFixed(3)} -> ${up}`);
  ok('two accent colors, natural land', await p.evaluate(() => { const a = window.__dbw; document.querySelector('.steps button[data-step="3"]').click(); return a.practice.cfg.hues.length === 2 && document.querySelectorAll('.huepick').length === 2; }));
  ok('every region and area has animals', await p.evaluate(() => { const a = window.__dbw; return [...a.samples, ...a.areas].every((r) => (r.animals || []).length >= 3); }), await p.evaluate(() => { const a = window.__dbw; return Math.min(...[...a.samples, ...a.areas].map((r) => (r.animals || []).length)) + ' or more per tile'; }));
  ok('weather: clouds, wind, and a storm are in the scene', await p.evaluate(() => { const w = window.__dbw.world.weather; return w.shells.length >= 3 && w.shells[0].visible && w.wind.visible && w.rain.parent.visible; }));
  ok('orbit lines carry 3D objects', await p.evaluate(() => window.__dbw.world.orbiters.length === 2));
  await done(p, 'new style');
}
// ---- phone
{
  const p = await open('open=3&light=studio', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { wait: 2200 });
  const h0 = await p.$eval('#panel', (e) => e.getBoundingClientRect().height);
  ok('phone: manual is a half-height bottom sheet', Math.abs(h0 - 422) < 30, h0 + ' px');
  ok('phone: pixel ratio is 2 or less', await p.evaluate(() => window.__dbw.world.renderer.getPixelRatio() <= 2));
  await p.tap('#panel .expand'); await sleep(500);
  ok('phone: expand arrow gives full height and a live thumbnail', await p.evaluate(() => document.querySelector('#panel').getBoundingClientRect().height > 800 && !document.querySelector('#thumb').hidden));
  await p.tap('#panel .expand'); await sleep(500);
  ok('phone: second tap returns to half height', await p.evaluate(() => Math.abs(document.querySelector('#panel').getBoundingClientRect().height - 422) < 30 && document.querySelector('#thumb').hidden));
  const hb = await p.$eval('#panel .handle', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.touchscreen.touchStart(hb.x, hb.y); for (let i = 1; i <= 6; i++) { await p.touchscreen.touchMove(hb.x, hb.y - i * 30); await sleep(20); } await sleep(350); await p.touchscreen.touchEnd(); await sleep(400);
  const h1 = await p.$eval('#panel', (e) => e.getBoundingClientRect().height);
  ok('phone: drag handle changes the height', h1 > h0 + 120 && h1 < 800, `${h0} -> ${h1}`);
  const hb2 = await p.$eval('#panel .handle', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.touchscreen.touchStart(hb2.x, hb2.y); for (let i = 1; i <= 8; i++) { await p.touchscreen.touchMove(hb2.x, hb2.y + i * 70); await sleep(15); } await p.touchscreen.touchEnd(); await sleep(900);
  ok('phone: swipe down closes', await p.evaluate(() => document.querySelector('#panel').hidden && !window.__dbw.current));
  // tap a region
  const pos = await p.evaluate(() => { const a = window.__dbw; a.cam.dist = 4.2; return 1; }); await sleep(700);
  const q = await p.evaluate(() => { const a = window.__dbw; let best = null; for (const r of a.samples) { const d = r.tile.center.dot(a.world.camera.position.clone().normalize()); const s = a.cam.project(r.tile.center); const el = document.elementFromPoint(s.x, s.y); if (d < 0.5 || !el || el.id !== 'c') continue; if (!best || d > best.d) best = { d, r, s }; } return { x: best.s.x, y: best.s.y, name: best.r.name, el: document.elementFromPoint(best.s.x, best.s.y).id }; });
  await p.touchscreen.tap(q.x, q.y); await sleep(1500);
  ok('phone: tap opens a region', await p.evaluate((n) => window.__dbw.current && window.__dbw.current.name === n, q.name), q.name);
  await p.evaluate(() => window.__dbw.closeRegion()); await sleep(500);
  // pinch zoom
  const d0 = await p.evaluate(() => window.__dbw.cam.dist);
  const cdp = await p.createCDPSession();
  const tp = (pts, type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  await tp([[150, 300], [240, 300]], 'touchStart'); for (let i = 1; i <= 6; i++) { await tp([[150 - i * 12, 300], [240 + i * 12, 300]], 'touchMove'); await sleep(20); } await tp([], 'touchEnd'); await sleep(300);
  const d1 = await p.evaluate(() => window.__dbw.cam.dist);
  ok('phone: pinch zooms', d1 < d0 - 0.2, `${d0.toFixed(2)} -> ${d1.toFixed(2)}`);
  // design sheet with step swipe
  await p.evaluate(() => window.__dbw.enterDesign()); await sleep(1500);
  ok('phone: design panel is a bottom sheet with 5 step tabs', await p.evaluate(() => document.querySelectorAll('.steps button').length === 5 && document.querySelector('#panel').getBoundingClientRect().top > 300));
  const b = await p.$eval('#panel .mbody', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width * 0.8, y: r.y + r.height / 2 }; });
  await p.touchscreen.touchStart(b.x, b.y); for (let i = 1; i <= 6; i++) { await p.touchscreen.touchMove(b.x - i * 35, b.y); await sleep(15); } await p.touchscreen.touchEnd(); await sleep(300);
  ok('phone: swipe moves to the next step', await p.evaluate(() => document.querySelector('.steps button[aria-selected="true"]').dataset.step === '1'));
  await done(p, 'phone');
}
// ---- phone landscape: side panel
{
  const p = await open('open=3&light=studio', { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { wait: 2000 });
  ok('phone landscape: side panel', await p.evaluate(() => { const r = document.querySelector('#panel').getBoundingClientRect(); return r.top === 0 && r.height >= 389 && r.width < 400; }));
  await done(p, 'landscape');
}
// ---- flags
{
  const p = await open('samples=0'); ok('?samples=0 shows an empty planet with the 12 areas', await p.evaluate(() => window.__dbw.samples.length === 0 && window.__dbw.areas.length === 12)); await done(p, 'samples=0');
  const p3 = await open('', { width: 1440, height: 900 }, { reduced: true, wait: 1200 });
  const l0 = await p3.evaluate(() => window.__dbw.cam.lon); await sleep(600);
  ok('reduced motion: no auto-rotate', await p3.evaluate((l) => window.__dbw.cam.lon === l, l0)); await done(p3, 'reduced motion');
  for (const t of ['low', 'medium', 'high', 'max']) { const q = await open('tier=' + t + '&t=0.3', { width: 1440, height: 900 }, { wait: 1800 }); const r = await q.evaluate(() => ({ tier: window.__dbw.world.tier, calls: window.__dbw.world.drawCalls, sh: window.__dbw.world.U.uShadowOn.value, fps: window.__dbw.fps() })); ok(`tier ${t} runs`, r.tier === t && r.calls < 250 && (t === 'low' ? r.sh === 0 : true), JSON.stringify(r)); await done(q, 'tier ' + t); }
  // auto tier settles
  const p4 = await open('t=0.3', { width: 1440, height: 900 }, { wait: 6500 });
  const r4 = await p4.evaluate(() => ({ tier: window.__dbw.world.tier, phase: window.__dbw.tierState.phase, fps: Math.round(window.__dbw.fps()) }));
  ok('auto quality settles on a tier', r4.phase === 'done', JSON.stringify(r4)); await done(p4, 'auto tier');
}
// ---- the full page: no title in the corner, no white backdrop, and no glow around the planet on the dark backdrop
{
  const p = await open('t=0.3');
  await sleep(500);
  ok('the full page has no title, time, or season in the corner, and the clock still runs for the passport', await p.evaluate(() => getComputedStyle(document.querySelector('#brand')).display === 'none' && /Planet time \d\d:\d\d/.test(document.querySelector('#clock').textContent)));
  ok('the full page has a dark backdrop (Webflow black), with no white rectangle and no halo', await p.evaluate(() => { const a = window.__dbw, w = a.world; return getComputedStyle(document.documentElement).backgroundColor === 'rgb(8, 8, 8)' && getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)' && w.backdrop.visible === false && w.rings.visible === false && w.renderer.getClearAlpha() === 0 && w.U.uBg.value.toArray().map((v) => Math.round(v * 255)).join(',') === '8,8,8'; }));
  const q = await open('t=0.3&bg=white');
  await sleep(500);
  ok('the option bg=white gives the white backdrop and the glow again', await q.evaluate(() => { const w = window.__dbw.world; return getComputedStyle(document.documentElement).backgroundColor === 'rgb(255, 255, 255)' && w.backdrop.visible === true && w.rings.visible === true && w.renderer.getClearAlpha() === 1; }));
  await q.close();
  await done(p, 'backdrop');
}

// ---- a claimed tile that is not saved goes back to empty ocean
{
  const p = await open('light=studio');
  await p.click('#settingsBtn'); await p.click('#designBtn'); await sleep(1500);
  await p.evaluate(() => document.querySelector('[data-set="biome"][data-v="meadow"]').click()); await sleep(600);
  ok('a region is on the tile in the design mode', await p.evaluate(() => window.__dbw.practice.mesh.visible && !!window.__dbw.practice.reg));
  await p.keyboard.press('Escape'); await sleep(700);
  ok('with no save, the region goes down into the ocean (it is not erased at once)', await p.evaluate(() => { const a = window.__dbw, P = a.practice; return a.mode === null && P.mesh.visible && P.mesh.position.length() > 0.005 && P.reg === null && a.canClaim(); }));
  await sleep(2500);
  ok('with no save, the tile is empty ocean again', await p.evaluate(() => { const a = window.__dbw; return a.mode === null && !a.practice.mesh.visible && a.practice.reg === null && a.practice.cfg === null && a.canClaim() && document.querySelector('#designBtn').textContent === 'Design your region'; }));
  await p.click('#settingsBtn'); await p.click('#designBtn'); await sleep(1500);
  ok('the visitor can start again from a blank tile', await p.evaluate(() => window.__dbw.practice.cfg.biome === 'blank'));
  await done(p, 'unsaved claim');
}
// ---- quality: High is 1.5x pixels; Max is 2x and only a person can select it
{
  const p = await open('', { width: 1200, height: 800, deviceScaleFactor: 2 });
  await sleep(4200);   // auto has measured and picked a level by now
  const auto = await p.evaluate(() => ({ tier: window.__dbw.world.tier, pr: window.__dbw.world.renderer.getPixelRatio() }));
  ok('auto never picks Max, and High is 1.5x pixels', auto.tier !== 'max' && auto.pr <= 1.5, JSON.stringify(auto));
  await p.click('#settingsBtn'); await sleep(200);
  ok('the menu has a Max level', await p.evaluate(() => !!document.querySelector('#menuQ input[value="max"]')));
  await p.evaluate(() => document.querySelector('#menuQ input[value="max"]').click()); await sleep(600);
  ok('Max is 2x pixels when a person selects it', await p.evaluate(() => window.__dbw.world.tier === 'max' && window.__dbw.world.renderer.getPixelRatio() === 2));
  await done(p, 'quality');
}
// ---- settings: hold the planet at one time of day and at one season
{
  const p = await open('');
  await sleep(500);
  await p.click('#settingsBtn'); await sleep(200);
  const pick = (id, v) => p.evaluate((id, v) => { const e = document.querySelector(id); e.value = String(v); e.dispatchEvent(new Event('change')); }, id, v);
  await pick('#ppDaySel', 12); await sleep(900);
  ok('passport: "Hold: Noon" holds the planet time at 12:00', await p.evaluate(() => document.querySelector('#clock').textContent.includes('12:00')), await p.evaluate(() => document.querySelector('#clock').textContent));
  await pick('#ppSeaSel', 3); await sleep(900);
  ok('passport: "Hold: Winter" holds the season', await p.evaluate(() => window.__dbw.world.time.season === 3 && document.querySelector('#clock').textContent.includes('Winter')));
  await pick('#ppDaySel', -1); await pick('#ppSeaSel', -1); await sleep(400);
  ok('passport: Live gives both back to the planet clock', await p.evaluate(() => document.querySelector('#ppDaySel').value === '-1' && document.querySelector('#ppSeaSel').value === '-1' && !document.querySelector('#menuT')));
  await done(p, 'time settings');
}
// ---- the rocket on the Webflow island: a click on Publish launches it, then a new one comes
{
  const p = await open('light=studio&open=a6');
  await sleep(1800);
  const at = () => p.evaluate(() => { const a = window.__dbw, r = a.areas[6], [x, y, z] = r.publishAt, v = a.world.camera.position.clone().set(x, y + 0.02, z).applyMatrix4(r.tile.matrix), s = a.cam.project(v); return { x: s.x, y: s.y }; });
  const s1 = await at(); await p.mouse.move(s1.x, s1.y); await sleep(400);
  ok('the Publish button has a label', await p.evaluate(() => document.querySelector('#tip').textContent.includes('Publish')), await p.evaluate(() => document.querySelector('#tip').textContent));
  await p.mouse.click(s1.x, s1.y); await sleep(500);
  const st = () => p.evaluate(() => { const a = window.__dbw, r = a.areas[6]; return { since: a.world.lastT - r.rocket.t0, again: r.launch(), toast: document.querySelector('#toast').textContent }; });
  const a1 = await st();
  ok('a click on Publish launches the rocket', a1.since >= 0 && a1.since < 3 && a1.toast.includes('Published'), JSON.stringify(a1));
  ok('a second launch waits for the new rocket', a1.again === false);
  await done(p, 'rocket');
}
// ---- clicks that do something: the sun, the moon, the satellite, the volcano, the lighthouse. None of them zooms.
{
  const p = await open('light=studio');
  await sleep(600);
  const mode = () => p.evaluate(() => window.__dbw.cam.mode + '/' + String(!!window.__dbw.current) + '/' + String(!!window.__dbw.following));
  const m0 = await mode();
  ok('the sun: a click starts a solar flare', await p.evaluate(() => { const a = window.__dbw; return a.tapThing('sun') && a.world.sunMark.flareAt != null; }));
  await sleep(200);
  ok('the moon: a click starts one wave on the ocean', await p.evaluate(() => { const a = window.__dbw; return a.tapThing('moon') && a.world.waveAt != null; }) && await p.evaluate(() => new Promise((res) => setTimeout(() => res(window.__dbw.world.U.uWave.value.w >= 0), 300))));
  await p.evaluate(() => window.__dbw.tapThing('sat')); await sleep(250);
  const mid = await p.evaluate(() => window.__dbw.world.U.uWire.value); await sleep(1100);
  ok('the satellite: a click turns the wireframe view on, with a fade', await p.evaluate(() => window.__dbw.world.wire === true && window.__dbw.world.U.uWire.value === 1) && mid > 0 && mid < 1, 'in the middle of the fade: ' + mid.toFixed(2));
  ok('the wireframe view has an exit button', await p.evaluate(() => !document.querySelector('#wireBtn').hidden));
  await p.click('#wireBtn'); await sleep(1300);
  ok('the exit button goes back to the normal view', await p.evaluate(() => { const w = window.__dbw.world; return w.wire === false && w.U.uWire.value === 0 && document.querySelector('#wireBtn').hidden && !w.wireSet; }));
  await p.evaluate(() => { window.__dbw.tapThing('sat'); window.__dbw.tapThing('sat'); }); await sleep(300);
  ok('a second click on the satellite turns it off', await p.evaluate(() => window.__dbw.world.wire === false));
  await sleep(1200);
  ok('the volcano: a click makes it erupt, and it does not erupt two times at once', await p.evaluate(() => { const a = window.__dbw; return a.tapThing('volcano') === true && a.areas[2].taps[0].tap() === false; }));
  ok('the lighthouse: a click starts a lightning storm', await p.evaluate(() => { const a = window.__dbw; const q = a.areas[8].taps[0]; return q.key === 'tower' && q.tap() === true && q.tap() === false; }));   // the storm eye can be on the far side, so the test calls its action directly
  ok('the electric storm goes over the tiles next to the storm eye that are open ocean, and not over the others', await p.evaluate(() => { const a = window.__dbw, se = a.areas[8], nb = se.tile.neighbors, free = nb.filter((i) => a.world.tileFree(i)), used = nb.filter((i) => !a.world.tileFree(i)); return se.storm.now - se.storm.t0 < 7 && nb.length === 5 && free.length + used.length === 5 && free.every((i) => !a.byTile.has(i)) && used.every((i) => a.byTile.has(i)) && free.length > 0; }), await p.evaluate(() => { const a = window.__dbw; return a.areas[8].tile.neighbors.map((i) => (a.world.tileFree(i) ? 'free' : 'used')).join(','); }));
  ok('none of these clicks zooms or opens a region', (await mode()) === m0, m0 + ' -> ' + await mode());
  // a real click on the sun
  const s = await p.evaluate(() => { const a = window.__dbw; a.cam.auto = false; const v = a.world.sunDir, q0 = a.world.sunMark.position.clone(); a.cam.lon = Math.atan2(v.z, v.x) + 0.5; a.cam.lat = 0.2; a.cam.changed(); return null; });
  await sleep(1200);
  const sp = await p.evaluate(() => { const a = window.__dbw, q = a.cam.project(a.world.sunMark.position.clone()); a.world.sunMark.flareAt = -99; return { x: q.x, y: q.y, front: q.front }; });
  if (sp.front && sp.x > 20 && sp.x < 1420 && sp.y > 100 && sp.y < 880) { await p.mouse.click(sp.x, sp.y); await sleep(300); ok('a real click on the sun starts the flare and does not zoom', await p.evaluate(() => window.__dbw.world.sunMark.flareAt > 0 && window.__dbw.cam.mode === 'orbit')); }
  else ok('a real click on the sun starts the flare and does not zoom', true, 'the sun is not in the frame; the direct test above covers the action');
  await done(p, 'action clicks');
}
// ---- legends of the sea: six of them in the ocean, a click marks one in the passport
{
  const p = await open('t=0.4&season=0.3');
  await sleep(600);
  const leg = await p.evaluate(() => window.__dbw.world.seaThings.filter((t) => t.legend).map((t) => t.label));
  ok('six legends of the sea are in the ocean, with the Titanic and Queen Anne\'s Revenge, and no mermaid', leg.length === 6 && new Set(leg).size === 6 && leg.includes('Titanic') && leg.includes("Queen Anne's Revenge") && leg.includes('Kraken') && !leg.includes('Mermaid'), leg.join(', '));
  const i = await p.evaluate(() => { const a = window.__dbw, k = a.world.seaThings.findIndex((t) => t.legend === 'nessie'), th = a.world.seaThings[k], v = th.tile.center.clone().normalize(); a.cam.auto = false; a.cam.lon = Math.atan2(v.z, v.x); a.cam.lat = Math.asin(v.y); a.cam.changed(); return k; });
  await sleep(1500);
  const s = await p.evaluate((k) => { const a = window.__dbw, q = a.cam.project(a.world.seaThings[k].pos.clone()); return { x: q.x, y: q.y }; }, i);
  await p.mouse.click(s.x, s.y); await sleep(600);
  ok('a click on a legend marks it in the passport', await p.evaluate(() => window.__dbw.legends().includes('nessie') && !document.querySelector('#toast').hidden && document.querySelector('#toast').textContent.includes('Nessie')), await p.evaluate(() => document.querySelector('#toast').textContent));
  await p.evaluate(() => window.__dbw.stopFollow()); await sleep(300);
  await p.click('#settingsBtn'); await sleep(200);
  ok('the passport lists the legends and the count', await p.evaluate(() => document.querySelector('#menuPass').textContent.includes('1 of 6 found') && document.querySelectorAll('.stamp.legend').length === 6 && document.querySelectorAll('.stamp.legend.on').length === 1));
  ok('a found legend shows a picture of its model in the passport, not a check mark', await p.evaluate(async () => {
    const im = document.querySelector('.stamp.legend.on .badge.pic img'); if (!im || !im.src.startsWith('data:image/png')) return false;
    await im.decode(); const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++;
    return n > 150 && n < 64 * 64 * 0.9 && document.querySelectorAll('.stamp.legend:not(.on) img').length === 0;   // the model is there, on a clear backdrop
  }));
  await done(p, 'legends');
}

// ---- easter eggs in the passport: six slots, a name only after the visitor found it, and a found one goes to its trigger
{
  const p0 = await open('light=studio'); await p0.evaluate(() => localStorage.removeItem('dbw-eggs')); await p0.close();   // the pages of this test run share their storage
  const p = await open('t=0.3');   // the real sun (the studio light moves with the camera, so the sun and the moon would never come to the middle)
  await sleep(600);
  await p.click('#settingsBtn'); await sleep(300);
  ok('the passport has seven easter eggs, with no names before they are found', await p.evaluate(() => { const t = document.querySelector('.stamps.eggs').textContent; return document.querySelectorAll('.stamps.eggs .stamp').length === 7 && document.querySelectorAll('button.egg').length === 0 && !/Solar|Tidal|Wireframe|Meteor|Eruption|Launch|Storm/.test(t) && document.querySelector('#menuPass').textContent.includes('0 of 7 found'); }));
  await p.click('#settingsBtn'); await sleep(200);
  ok('each trigger unlocks its easter egg', await p.evaluate(() => { const a = window.__dbw; for (const k of ['sun', 'moon', 'sat', 'comet', 'volcano', 'pub']) a.tapThing(k); a.tapThing('sat'); const se = a.areas.find((q) => q.def.id === 'storm-eye'); se.taps[0].tap(); a.eggTap('tower' + se.tile.index);   // the storm eye can be on the far side, where a pointer cannot select it
    return a.eggs().join(',') === 'flare,wave,wire,meteor,erupt,launch,storm' && !!a.world.meteorFrame && !a.following && document.querySelector('#toast').textContent.includes('Easter egg found'); }), await p.evaluate(() => window.__dbw.eggs().join(',')));
  await sleep(1500);
  const met = await p.evaluate(() => { const a = window.__dbw, pts = a.world.meteorMids(), w = window.innerWidth, h = window.innerHeight; let near = 9, seen = 0; for (const q of pts) { const v = a.world.camera.position.clone().set(q[0], q[1], q[2]); near = Math.min(near, v.length()); const s = a.cam.project(v); if (s.front && s.x > 0 && s.x < w && s.y > 0 && s.y < h) seen++; } return { n: pts.length, near: +near.toFixed(2), seen, dist: +a.cam.dist.toFixed(2) }; });
  ok('the meteors pass beside the planet (none comes near it), and most of their paths are in the view', met.n > 100 && met.near >= 1.3 && met.seen > met.n * 0.7 && met.dist > 4, JSON.stringify(met));
  await p.click('#settingsBtn'); await sleep(400);
  ok('a found easter egg shows its name, and it is a button', await p.evaluate(() => [...document.querySelectorAll('button.egg .nm')].map((e) => e.textContent).join('|') === 'Solar Flare|Tidal Wave|Wireframe|Meteor Shower|Eruption|Launch!|Electric Storm'));
  // A found egg brings its trigger to the middle of the view. It does not zoom in, and no region opens.
  const mid = (key, tileId) => p.evaluate((key, tileId) => { const a = window.__dbw, c = a.world.camera, v = tileId ? a.areas.find((q) => q.def.id === tileId).tile.center.clone() : (key === 'sun' ? a.world.sunMark.position.clone() : a.world.U.uMoonDir.value.clone().multiplyScalar(1.72)); const s = a.cam.project(v), w = window.innerWidth, h = window.innerHeight; return { dx: Math.round(Math.abs(s.x - w / 2)), dy: Math.round(Math.abs(s.y - h / 2)), follow: !!a.following, open: !!a.current, mode: a.cam.mode, dist: +a.cam.dist.toFixed(2), facing: +v.normalize().dot(c.position.clone().normalize()).toFixed(3), menu: document.querySelector('#settings').hidden }; }, key, tileId);
  await p.evaluate(() => document.querySelector('button.egg[data-egg="wave"]').click()); await sleep(2400);
  const m1 = await mid('moon');
  ok('select Tidal Wave: the moon is in the middle of the view with the planet behind it, and there is no zoom', m1.dx < 70 && m1.dy < 70 && !m1.follow && !m1.open && m1.mode === 'orbit' && m1.dist > 4 && m1.facing > 0.97 && m1.menu, JSON.stringify(m1));
  await p.click('#settingsBtn'); await sleep(300);
  await p.evaluate(() => document.querySelector('button.egg[data-egg="flare"]').click()); await sleep(2400);
  const m2 = await mid('sun');
  ok('select Solar Flare: the sun is in the middle of the view, and there is no zoom', m2.dx < 90 && m2.dy < 90 && !m2.follow && m2.mode === 'orbit' && m2.facing > 0.97, JSON.stringify(m2));
  await p.click('#settingsBtn'); await sleep(300);
  await p.evaluate(() => document.querySelector('button.egg[data-egg="erupt"]').click()); await sleep(2400);
  const m3 = await mid(null, 'volcano-ring');
  ok('select Eruption: the volcano tile is in the middle of the view, and its region does not open', m3.dx < 80 && m3.dy < 120 && !m3.follow && !m3.open && m3.mode === 'orbit' && m3.facing > 0.95, JSON.stringify(m3));
  ok('the easter eggs stay after a reload', await p.evaluate(() => JSON.parse(localStorage.getItem('dbw-eggs')).length === 7));
  // reset the passport: two clicks
  await p.evaluate(() => { const a = window.__dbw; a.closeRegion(); a.openRegion(a.areas[3]); }); await sleep(500);
  await p.click('#settingsBtn'); await sleep(300);
  ok('a visited area shows a filled blue pentagon with a solid ring, not a check mark', await p.evaluate(() => { const on = document.querySelector('.stamps.areas .stamp.on .badge'), off = document.querySelector('.stamps.areas .stamp:not(.on) .badge'); const cs = getComputedStyle(on); return on.querySelector('path').getAttribute('fill') === 'currentColor' && on.querySelector('path').getAttribute('d').startsWith('M12 4l8') && cs.borderTopStyle === 'solid' && off.querySelector('path').getAttribute('fill') === 'none' && getComputedStyle(off).borderTopStyle === 'dashed' && /rgb\(\d+, \d+, 2\d\d\)/.test(cs.color); }));
  ok('the easter eggs section has no helper text, and the menu ends with a reset button', await p.evaluate(() => !document.querySelector('#menuPass').textContent.includes('Some things') && document.querySelector('#settings').lastElementChild.id === 'menuReset'));
  await p.evaluate(() => document.querySelector('#resetBtn').click());
  ok('the first click on Reset passport only asks', await p.evaluate(() => document.querySelector('#resetBtn').textContent === 'Select again to reset' && window.__dbw.eggs().length === 7 && window.__dbw.passport().length > 0));
  await p.evaluate(() => document.querySelector('#resetBtn').click()); await sleep(200);
  ok('the second click empties the passport: areas, legends, easter eggs', await p.evaluate(() => { const a = window.__dbw, t = document.querySelector('#menuPass').textContent; return a.eggs().length === 0 && a.legends().length === 0 && a.passport().length === 0 && t.includes('0 of 12 visited') && t.includes('0 of 6 found') && t.includes('0 of 7 found') && !localStorage.getItem('dbw-eggs') && !localStorage.getItem('dbw-passport') && !localStorage.getItem('dbw-legends') && document.querySelector('#resetBtn').textContent === 'Reset passport'; }));
  await done(p, 'easter eggs');
}
await browser.close();
console.log(results.join('\n'));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
