// Design builds worlds: prototype. One self-contained page, no network.
import { CONFIG, QUERY, deepMerge, EMBED, hostScrolls, CLEAR, HOST_BG, HOST_DARK } from './config.js';
import { World, TIERS } from './world.js';
import { Cam } from './camera.js';
import { buildContent } from './content.js';
import { setupInteraction } from './interact.js';
import { setupDesign } from './design.js';
import { setupExport } from './export.js';
import { setupDetails } from './details.js';
import { DEG } from './util.js';
import { setupDiscover } from './discover.js';
import { setupMenu } from './menu.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#c');
// In an embed on a page that scrolls: a finger that moves up or down scrolls the page (a move to the side turns the planet), and the hint says how to zoom.
if (CLEAR) document.documentElement.classList.add('embed-clear'); if (HOST_DARK) document.documentElement.classList.add('embed-dark');   // embed-dark: the color behind the planet is dark, so text that lies on the backdrop is light
if (!EMBED) document.documentElement.style.background = HOST_BG;   // the full page paints the color itself. In an embed the page around the frame shows.
if (EMBED) { document.documentElement.classList.add('embed'); if (hostScrolls()) { document.documentElement.classList.add('embed-scroll'); const h = $('#hint'); if (h) h.textContent = 'Drag to turn the planet. Pinch to zoom, or hold Ctrl or ⌘ and scroll. Select a region to open it, or an empty tile to claim it.'; } }
const world = new World(canvas);
const cam = new Cam(world, canvas);
const app = { world, cam, regions: new Map(), $ };
window.__dbw = app; // handy for testing in the console
app.config = CONFIG;

// ---- URL flags (for testing and screenshots)
if (QUERY.has('t')) { CONFIG.time.pauseDay = true; CONFIG.time.dayPhase = +QUERY.get('t'); }
if (QUERY.has('season')) { CONFIG.time.pauseSeason = true; CONFIG.time.seasonPhase = +QUERY.get('season'); }
if (QUERY.has('cam')) { const [lon, lat, dist] = QUERY.get('cam').split(',').map(Number); cam.lon = lon * DEG; cam.lat = lat * DEG; if (dist) cam.dist = dist; cam.auto = false; }
if (QUERY.get('samples') === '0') CONFIG.sampleCount = 0;
if (QUERY.get('light') === 'studio') CONFIG.light.lockToCamera = true;
if (QUERY.has('cfg')) { try { deepMerge(CONFIG, JSON.parse(QUERY.get('cfg'))); } catch (e) { /* ignore a bad value */ } }

buildContent(app);
// Start centered on the Webflow island: it is the "center" of the planet.
world.updateTime();
app.home = app.areas.find((a) => a.def.center) || null;
if (!QUERY.has('cam')) { if (app.home) { cam.lon = app.home.tile.lon; cam.lat = Math.max(-1.2, Math.min(1.2, app.home.tile.lat)); } else cam.lon = Math.atan2(world.sunDir.z, world.sunDir.x) + 0.55; }
setupInteraction(app);
setupDetails(app);
setupDiscover(app);
setupDesign(app);
const seasonMin = Math.round((CONFIG.time.yearHours * 60) / 4);
app.timeTip = `Solar time at longitude 0°, the meridian of the Webflow island. One day is ${CONFIG.time.dayMinutes} minutes. One season is ${seasonMin} minutes.`;
$('#clock').dataset.tip = app.timeTip; $('#clock').tabIndex = 0;
setupMenu(app);
setupExport(app);
// Room around the planet (the embed script sets it, from a length of the page around the frame): the planet stays this many pixels
// away from the top and from the bottom of the view, and the menu button moves down by the same amount.
const ZOOM_MAX0 = CONFIG.camera.zoomMax; let insetPx = 0;
app.setInset = (px) => {
  insetPx = Math.max(0, +px || 0);
  document.documentElement.style.setProperty('--inset', insetPx + 'px'); document.documentElement.classList.toggle('has-inset', insetPx > 0);
  const k = Math.max(0.45, 1 - (2 * insetPx) / (window.innerHeight || 1)), atMax = cam.dist >= CONFIG.camera.zoomMax - 0.01;
  CONFIG.camera.zoomMax = ZOOM_MAX0 / k;   // the camera can go out more, so the planet is smaller in the view
  if (atMax && cam.mode === 'orbit') cam.dist = CONFIG.camera.zoomMax;
  cam.changed();
};
window.__dbwInset = app.setInset;
if (QUERY.get('inset')) app.setInset(QUERY.get('inset'));
window.addEventListener('resize', () => { if (insetPx) app.setInset(insetPx); });
if (QUERY.has('design')) setTimeout(() => app.enterDesign(), 60);
if (QUERY.has('open')) { const v = QUERY.get('open'); const reg = v[0] === 'a' ? app.areas[+v.slice(1)] : app.samples[+v - 1]; if (reg) setTimeout(() => app.openRegion(reg, { dur: 0.01, noPanel: QUERY.has('nopanel') }), 50); }

// ---- Quality tiers: start at Medium, measure for 2 seconds, then move up or down.
const tier = { mode: 'auto', samples: [], phase: 'measure', t0: 0 };
function setTier(name, manual) {
  if (manual) { tier.mode = name; tier.phase = 'done'; }
  if (world.tier !== name) world.setTier(name);
  renderSettings();
}
function renderSettings() {
  const el = $('#menuQ');
  const opts = [['auto', `Auto (${TIERS[world.tier].label})`], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['max', 'Max']];
  el.innerHTML = '<h3>Quality</h3>' + opts.map(([v, l]) => `<label><input type="radio" name="q" value="${v}" ${tier.mode === v ? 'checked' : ''}> ${l}</label>`).join('') +
    '<p>Auto measures the frame rate, then picks Low, Medium, or High. Max is the sharpest picture; you must select it.</p>';
  el.querySelectorAll('input').forEach((i) => (i.onchange = () => { if (i.value === 'auto') { tier.mode = 'auto'; tier.phase = 'measure'; tier.samples = []; tier.t0 = 0; renderSettings(); } else setTier(i.value, true); }));
}
const forced = QUERY.get('tier');
if (forced && TIERS[forced]) setTier(forced, true); else renderSettings();
function autoTier(now, frameMs) {
  if (tier.mode !== 'auto' || tier.phase === 'done') return;
  if (!tier.t0) { tier.t0 = now + 600; return; }
  if (now < tier.t0) return;
  tier.samples.push(frameMs);
  if (now - tier.t0 < 2000) return;
  const s = tier.samples.sort((a, b) => a - b), avg = s[Math.floor(s.length * 0.6)] || 16;
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  tier.samples = []; tier.t0 = 0;
  if (tier.phase === 'measure') {
    if (avg > 25) { setTier('low'); tier.phase = 'done'; }
    else if (avg < 18.5 && !coarse) { setTier('high'); tier.phase = 'check'; }
    else tier.phase = 'done';
  } else if (tier.phase === 'check') { if (avg > 21) setTier('medium'); tier.phase = 'done'; renderSettings(); }
}

// ---- Clock in the corner
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
let clockAt = 0;
function clock(now) {
  if (now - clockAt < 500) return; clockAt = now;
  // The planet time is the solar time at the meridian of the Webflow island (longitude 0): it is 12:00 there when the sun is over that meridian.
  const ref = app.home ? app.home.tile.lon : 0, sunLon = Math.atan2(world.sunDir.z, world.sunDir.x);
  const frac = CONFIG.light.lockToCamera ? world.time.dayPhase : (((0.5 - (sunLon - ref) / (Math.PI * 2)) % 1) + 1) % 1;
  const m = Math.floor(frac * 1440);
  $('#clock').textContent = `Planet time ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} · ${SEASONS[world.time.season]}`;
  if (app.passTime) app.passTime(m, world.time.season);   // the same time in the passport, as a clock face
}

// ---- Keyboard
window.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'radio' && e.target.type !== 'checkbox') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'ArrowLeft') cam.nudge(1, 0); else if (k === 'ArrowRight') cam.nudge(-1, 0);
  else if (k === 'ArrowUp') cam.nudge(0, 1); else if (k === 'ArrowDown') cam.nudge(0, -1);
  else if (k === '+' || k === '=') cam.zoom(0.88); else if (k === '-' || k === '_') cam.zoom(1.14);
  else return;
  if (k.startsWith('Arrow')) e.preventDefault();
});

// ---- Frame loop. Pause when the tab is hidden. Slow down when the person is idle.
let last = performance.now(), lastRender = 0, fpsAvg = 16.7, t0 = last;
window.addEventListener('resize', () => { world.resize(); cam.changed(); });
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || window.__DBW_PAUSED) { last = now; return; }   // __DBW_PAUSED: the embed script sets it while the frame is not in view
  const idle = now - cam.lastInput > 9000 && !cam.busy && !app.busy;
  const target = idle ? 30 : world.T.fps;
  if (now - lastRender < 1000 / target - 3) return;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const frameMs = now - lastRender; lastRender = now;
  fpsAvg += (Math.min(frameMs, 100) - fpsAvg) * 0.05;
  world.updateTime();
  cam.update(dt);
  if (app.update) app.update(now / 1000, dt);
  world.render((now - t0) / 1000, dt, { target: cam.target });
  if (app.afterRender) app.afterRender();
  clock(now);
  if (!idle) autoTier(now, frameMs);
}
document.addEventListener('visibilitychange', () => { last = performance.now(); });
requestAnimationFrame(frame);
app.setTier = setTier; app.tierState = tier; app.fps = () => 1000 / fpsAvg;
app.readyMs = Math.round(performance.now());
