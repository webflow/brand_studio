// "Try it" design mode. Anyone can design a practice region. Nothing is saved. It lives only in this tab.
import * as THREE from 'three';
import { REDUCED } from './config.js';
import { PrimBatch, MeshAcc } from './prims.js';
import { generateRegion, randomConfig, BIOMES, BIOME_IDS, HUE_IDS } from './region.js';
import { STYLES, STYLE_IDS, NATURE_STYLES } from './buildings.js';
import { HEROES, HERO_IDS } from './heroes.js';
import { toneHex, HUE_LABEL, TONE_SET_LABEL, ROW } from './palette.js';
import { heroGlyph } from './glyphs.js';
import { initials } from './manual.js';

// id, name. Scenery = the small things that repeat across the land (buildings or nature). Landmarks = the large single objects.
const STEPS = [['land', 'Land'], ['scenery', 'Scenery'], ['heroes', 'Landmarks'], ['color', 'Color'], ['name', 'Name']];
const SEASON_NAMES = ['Now', 'Spring', 'Summer', 'Autumn', 'Winter'];
const TIMES = [['now', 'Now'], ['dawn', 'Dawn'], ['noon', 'Noon'], ['dusk', 'Dusk'], ['night', 'Night']], SUN_UP = { dawn: 9, noon: 62, dusk: 4, night: -35 };   // how high the sun is over this tile, in degrees
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAX_HEROES = 5;
const SINK_S = 2.4, SINK_DEPTH = 0.44;   // a region that is not saved: the seconds it takes to go down, and how far. At the end all of it is under the bed of the sea, so nothing is in view when it is removed.

export function setupDesign(app) {
  const { world, cam, $ } = app, panel = $('#panel');
  let tile = app.practiceTile;   // a visitor with no region can claim a different free tile (app.claimTile)
  const P = app.practice = { tile, reg: null, cfg: null, batch: new PrimBatch(world.lit), mesh: null, water: [new PrimBatch(world.tileSeaDepth, { shadow: false, order: 0.8 }), new PrimBatch(world.tileSea, { shadow: false, order: 0.9 })] };
  world.scene.add(P.batch.group, P.water[0].group, P.water[1].group);
  // The practice tile starts as open ocean. The region rises from the water when it is first made.
  P.mesh = new THREE.Mesh(new THREE.BufferGeometry(), world.lit); P.mesh.frustumCulled = false; P.mesh.layers.enable(1); P.mesh.visible = false; world.scene.add(P.mesh);

  let step = 0, hist = [], hi = -1, dirty = false, dragHero = -1, seedN = (Date.now() % 100000) + 17, rise = -1, sink = -1, sinkReg = null;
  const addAnimator = (t, fn, o) => world.addAnimator(t, fn, o), addLight = (L) => world.addLight(L);

  const setLift = (off) => { P.mesh.position.copy(tile.center).multiplyScalar(off); for (const g of [P.batch.group, P.water[0].group, P.water[1].group]) g.position.copy(P.mesh.position); };
  function rebuild() {
    dirty = false;
    if (P.reg) { world.removeAnimators(P.reg.animators); world.removeLights(P.reg.lights); }
    P.batch.reset(); P.water[0].reset(); P.water[1].reset();
    const acc = new MeshAcc();
    const reg = generateRegion(P.cfg, tile, { acc, batch: P.batch, water: P.water, addAnimator, addLight });
    reg.kind = 'practice'; reg.name = P.cfg.name || 'Your region'; reg.number = 0;
    P.batch.commit(); P.water[0].commit(); P.water[1].commit();
    const old = P.mesh.geometry; P.mesh.geometry = acc.toGeometry(); old.dispose();
    const first = !P.mesh.visible;
    if (first) { world.setShore([...world.tiles.filter((t) => app.byTile.has(t.index)), tile]); rise = 0; }
    P.mesh.visible = true; P.reg = reg;
    if (first && app.refreshFree) app.refreshFree();
    if (rise >= 0) for (const a of reg.animators) a.off = true;
    if (app.current && app.current.kind === 'practice') app.current = reg;
    P.reg = reg;
    if (app.onPracticeRebuilt) app.onPracticeRebuilt(reg);
  }
  const touch = () => { dirty = true; cam.changed(); };
  function commit() { hist = hist.slice(0, hi + 1); hist.push(JSON.stringify(P.cfg)); if (hist.length > 80) hist.shift(); hi = hist.length - 1; syncButtons(); }
  function restore(i) { hi = i; P.cfg = JSON.parse(hist[hi]); touch(); render(); }
  const undo = () => { if (hi > 0) restore(hi - 1); }, redo = () => { if (hi < hist.length - 1) restore(hi + 1); };
  function syncButtons() { const u = panel.querySelector('#undoBtn'), r = panel.querySelector('#redoBtn'); if (u) u.disabled = hi <= 0; if (r) r.disabled = hi >= hist.length - 1; }

  const slider = (key, label) => `<label class="sl"><span>${label}</span><input type="range" min="0" max="1" step="0.01" value="${P.cfg[key]}" data-key="${key}"><output>${(+P.cfg[key]).toFixed(2)}</output></label>`;
  const hueRow = (i, label) => `<fieldset class="huepick"><legend>${label} <b>${HUE_LABEL[P.cfg.hues[i]]}</b></legend><div class="hues">${HUE_IDS.map((h) => `<button class="hue" data-role="${i}" data-hue="${h}" aria-pressed="${P.cfg.hues[i] === h}" aria-label="${label}: ${HUE_LABEL[h]}" title="${HUE_LABEL[h]}" style="--c:${toneHex(h, 5)}"><i></i></button>`).join('')}</div></fieldset>`;

  function stepHTML() {
    const c = P.cfg, id = STEPS[step][0];
    const opt = (set, v, label, hint) => `<button class="opt" data-set="${set}" data-v="${v}" aria-pressed="${c[set] === v}"><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</button>`;
    if (id === 'land') return `${c.biome === 'blank' ? '<p class="note">Your region starts as bare land. Pick a biome to give it a shape.</p>' : ''}<h3>Biome</h3><div class="grid g3">${BIOME_IDS.map((b) => `<button class="opt" data-set="biome" data-v="${b}" aria-pressed="${c.biome === b}"><b>${BIOMES[b].label}</b><small>${BIOMES[b].hint}</small></button>`).join('')}</div>
      <h3>Terrain</h3>${slider('rough', 'Roughness')}${slider('water', 'Water level')}${slider('veg', 'Vegetation')}`;
    if (id === 'color') return `<p class="note">Land, plants, and water take natural colors from the biome. Pick two accent colors for the buildings and objects.</p>${hueRow(0, 'Accent 1 · roofs, large shapes')}${hueRow(1, 'Accent 2 · walls, details')}
      <h3>Tone set</h3><div class="grid g2">${Object.keys(TONE_SET_LABEL).map((t) => `<button class="opt" data-set="toneSet" data-v="${t}" aria-pressed="${c.toneSet === t}"><b>${TONE_SET_LABEL[t].split(' (')[0]}</b><small>${TONE_SET_LABEL[t].replace(/^.*\(|\)$/g, '')}</small></button>`).join('')}</div>
      ${slider('hueShift', 'Hue shift')}`;
    if (id === 'scenery') return `<p class="note">The small things that repeat across your land. Pick nature, or buildings, or nothing.</p>
      <div class="grid g2">${opt('arch', 'none', 'None', 'only the biome')}</div>
      <h3>Nature</h3><div class="grid g2">${STYLE_IDS.filter((k) => NATURE_STYLES.has(k)).map((k) => opt('arch', k, STYLES[k])).join('')}</div>
      <h3>Buildings</h3><div class="grid g2">${STYLE_IDS.filter((k) => !NATURE_STYLES.has(k)).map((k) => opt('arch', k, STYLES[k])).join('')}</div>
      <h3>Amount and mood</h3>${slider('bld', 'Density')}${slider('whimsy', 'Whimsy')}`;
    // A small map of the tile with its 7 positions, turned the same way as the view. Blue = this landmark. Grey = taken by a different landmark (not available).
    const posMap = (hi) => {
      const A = P.reg.anchors, az = cam.focus ? cam.focus.az : P.reg.az, sa = Math.sin(az), ca = Math.cos(az), S = 19, name = HEROES[c.heroes[hi].type].label;
      const pt = (x, z) => [(28 + (x * sa - z * ca) * S).toFixed(1), (26 + (x * ca + z * sa) * S).toFixed(1)];
      return `<svg class="posmap" viewBox="0 0 56 52" width="56" height="52" role="group" aria-label="Position of ${name}"><polygon points="${(tile.shape || tile.poly).map((q) => pt(q.x, q.z).join(',')).join(' ')}"/>${A.map((an, k) => {
        const [x, y] = pt(an.x, an.z), mine = c.heroes[hi].anchor === k, taken = !mine && c.heroes.some((q) => q.anchor === k);
        return `<circle class="${mine ? 'on' : taken ? 'off' : ''}" cx="${x}" cy="${y}" r="4.6" ${mine || taken ? 'aria-disabled="true"' : `data-h="${hi}" data-f="anchor" data-a="${k}" tabindex="0"`} role="button" aria-label="${mine ? 'Its position now' : taken ? 'Taken' : 'Move ' + name + ' here'}"><title>${mine ? 'Here now' : taken ? 'Taken' : 'Move here'}</title></circle>`; }).join('')}</svg>`;
    };
    const addBtn = (h) => `<button class="opt hero" data-add="${h}" ${c.heroes.length >= MAX_HEROES ? 'disabled' : ''}>${heroGlyph(h, 30)}<small>${HEROES[h].label}</small></button>`;
    if (id === 'heroes') return `<p class="note">The large single objects. Pick up to ${MAX_HEROES}. To move one, pick a free position on its small map, or drag it on the tile.</p>
      <ol class="hlist">${c.heroes.map((h, i) => `<li><span class="hg">${heroGlyph(h.type, 30)}</span><b>${HEROES[h.type].label}</b>
        ${posMap(i)}
        <select data-h="${i}" data-f="size" aria-label="Size of ${HEROES[h.type].label}">${['small', 'medium', 'large'].map((s) => `<option value="${s}" ${h.size === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
        <button class="mini" data-h="${i}" data-f="rot" aria-label="Rotate ${HEROES[h.type].label} by 60 degrees" title="Rotate 60°">↻ ${(h.rot * 60) % 360}°</button>
        <button class="mini" data-h="${i}" data-f="del" aria-label="Remove ${HEROES[h.type].label}" title="Remove">×</button></li>`).join('')}</ol>
      <h3>Add from nature <small>${c.heroes.length} of ${MAX_HEROES}</small></h3><div class="grid g4">${HERO_IDS.filter((h) => HEROES[h].nature).map(addBtn).join('')}</div>
      <h3>Add a built object</h3><div class="grid g4">${HERO_IDS.filter((h) => !HEROES[h].nature).map(addBtn).join('')}</div>`;
    return `<label class="tx"><span>Region name</span><input type="text" maxlength="24" value="${esc(c.name)}" placeholder="Your region" data-text="name" autocomplete="off" spellcheck="false"></label>
      <label class="tx"><span>Motto</span><input type="text" maxlength="48" value="${esc(c.motto)}" data-text="motto" autocomplete="off"></label>
      <h3>Owner</h3>
      <div class="ownerpic"><div class="avatar">${c.ownerPic ? `<img src="${c.ownerPic}" alt="">` : `<span aria-hidden="true">${esc(initials(c.ownerName || 'Guest'))}</span>`}</div>
        <div><label class="btn small" for="picFile">${c.ownerPic ? 'Change picture' : 'Add a picture'}</label><input type="file" id="picFile" accept="image/png,image/jpeg,image/webp" class="sr">${c.ownerPic ? ' <button class="btn small" id="picDel">Remove</button>' : ''}
        <p class="note">With no picture, your initials show. The picture stays in this browser tab. Nothing is uploaded.</p></div></div>
      <label class="tx"><span>Full name</span><input type="text" maxlength="40" value="${esc(c.ownerName || '')}" data-text="ownerName" autocomplete="off" spellcheck="false"></label>
      <label class="tx"><span>Job title</span><input type="text" maxlength="48" value="${esc(c.ownerTitle || '')}" data-text="ownerTitle" autocomplete="off"></label>
      <label class="tx"><span>Short bio</span><textarea maxlength="160" rows="3" data-text="ownerBio">${esc(c.ownerBio || '')}</textarea></label>
      <p class="note">This is a practice region. “Save region” keeps it on the planet for this visit. It is not stored after you close the page. Use “Export image” to keep a picture.</p>`;
  }

  function render() {
    if (app.mode !== 'design') return;
    const sc = panel.querySelector('.mbody'), keep = sc ? sc.scrollTop : 0;
    panel.className = 'design' + (panel.classList.contains('full') ? ' full' : ''); panel.style.setProperty('--acc', toneHex(P.cfg.hues[0], 5));
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Design your region');
    panel.innerHTML = `<div class="handle" aria-hidden="true"><i></i></div>
      <header class="mtop"><span>Design your region</span><span class="mid">Practice region, not saved</span>
        <button class="expand" aria-label="Expand the panel" aria-pressed="false"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
        <button class="x" aria-label="Leave and do not save"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6"/></svg></button></header>
      <nav class="steps" role="tablist" aria-label="Design steps">${STEPS.map(([, l, short], i) => `<button role="tab" aria-selected="${i === step}" data-step="${i}" aria-label="Step ${i + 1}: ${l}"><i>${i + 1}</i><span>${short || l}</span></button>`).join('')}</nav>
      <div class="seasonbar" role="group" aria-label="Season preview"><span>Season</span>${SEASON_NAMES.map((l, i) => `<button class="chip" data-season="${i - 1}" aria-pressed="${seasonPrev === i - 1}">${l}</button>`).join('')}</div>
      <div class="seasonbar" role="group" aria-label="Time of day preview"><span>Time</span>${TIMES.map(([v, l]) => `<button class="chip" data-time="${v}" aria-pressed="${timePrev === v}">${l}</button>`).join('')}</div>
      <div class="mbody dbody" tabindex="-1" role="tabpanel" aria-label="${STEPS[step][1]}">${stepHTML()}</div>
      <footer class="dfoot"><div class="frow">
        <button class="btn small" id="undoBtn" aria-label="Undo" title="Undo (Ctrl or Cmd+Z)">↶ Undo</button><button class="btn small" id="redoBtn" aria-label="Redo" title="Redo (Shift+Ctrl or Cmd+Z)">↷ Redo</button>
        <button class="btn small" id="shufBtn">Shuffle this step</button><button class="btn small" id="randBtn">Randomize all</button></div>
        <div class="frow"><button class="btn" id="photoBtn">Export image</button><button class="btn primary" id="doneBtn">Save region</button></div></footer>`;
    panel.querySelector('.mbody').scrollTop = keep;
    bind(); syncButtons();
  }

  function bind() {
    const q = (s) => panel.querySelectorAll(s);
    panel.querySelector('.x').onclick = () => app.exitDesign();
    panel.querySelector('#doneBtn').onclick = () => app.exitDesign(true);
    q('.seasonbar .chip[data-season]').forEach((b) => (b.onclick = () => { setSeason(+b.dataset.season); render(); refocus(`.seasonbar .chip[data-season="${seasonPrev}"]`); }));
    q('.seasonbar .chip[data-time]').forEach((b) => (b.onclick = () => { setTime(b.dataset.time); render(); refocus(`.seasonbar .chip[data-time="${timePrev}"]`); }));
    q('.steps button').forEach((b) => (b.onclick = () => { step = +b.dataset.step; render(); panel.querySelector(`.steps button[data-step="${step}"]`).focus(); }));
    q('[data-set]').forEach((b) => (b.onclick = () => { P.cfg[b.dataset.set] = b.dataset.v; touch(); commit(); render(); refocus(`[data-set="${b.dataset.set}"][data-v="${b.dataset.v}"]`); }));
    q('.hue').forEach((b) => (b.onclick = () => { P.cfg.hues[+b.dataset.role] = b.dataset.hue; touch(); commit(); render(); refocus(`.hue[data-role="${b.dataset.role}"][data-hue="${b.dataset.hue}"]`); }));
    q('input[type=range]').forEach((inp) => { inp.oninput = () => { P.cfg[inp.dataset.key] = +inp.value; inp.nextElementSibling.textContent = (+inp.value).toFixed(2); touch(); }; inp.onchange = () => commit(); });
    q('[data-text]').forEach((inp) => { inp.oninput = () => { P.cfg[inp.dataset.text] = inp.value.slice(0, +inp.maxLength); if (P.reg) P.reg.name = P.cfg.name || 'Your region'; }; inp.onchange = () => { touch(); commit(); }; });
    q('[data-add]').forEach((b) => (b.onclick = () => {
      const used = new Set(P.cfg.heroes.map((h) => h.anchor)); let a = 0; while (used.has(a) && a < 6) a++;
      P.cfg.heroes.push({ type: b.dataset.add, anchor: a, rot: faceRot(), size: 'small' }); touch(); commit(); render();
    }));
    q('[data-h]').forEach((el) => {
      const i = +el.dataset.h, f = el.dataset.f, h = P.cfg.heroes[i];
      const go = () => {
        if (f === 'del') P.cfg.heroes.splice(i, 1);
        else if (f === 'rot') h.rot = (h.rot + 1) % 6;
        else if (f === 'size') h.size = el.value;
        else if (f === 'anchor') moveHero(i, +(el.dataset.a ?? el.value));
        touch(); commit(); render(); if (f === 'rot') refocus(`[data-h="${i}"][data-f="rot"]`);
      };
      if (el.tagName === 'SELECT') el.onchange = go; else { el.onclick = go; if (el.tagName === 'circle') el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }
    });
    // The owner picture: the file is read in the browser, cut to a square, made small, and kept in the region data. It goes nowhere else.
    const pf = panel.querySelector('#picFile');
    if (pf) pf.onchange = () => {
      const f = pf.files && pf.files[0]; if (!f || !/^image\/(png|jpeg|webp)$/.test(f.type)) return;
      const url = URL.createObjectURL(f), img = new Image();
      img.onload = () => { const S = 160, cv = document.createElement('canvas'), m = Math.min(img.width, img.height); cv.width = cv.height = S; cv.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S); URL.revokeObjectURL(url); P.cfg.ownerPic = cv.toDataURL('image/jpeg', 0.86); commit(); render(); refocus('label[for="picFile"]'); };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    };
    const pd = panel.querySelector('#picDel'); if (pd) pd.onclick = () => { delete P.cfg.ownerPic; commit(); render(); };
    panel.querySelector('#undoBtn').onclick = undo; panel.querySelector('#redoBtn').onclick = redo;
    panel.querySelector('#shufBtn').onclick = () => { const part = randomConfig(++seedN, STEPS[step][0]); Object.assign(P.cfg, part); if (STEPS[step][0] === 'land') P.cfg.seed = (seedN * 2654435761) >>> 0; if (part.heroes) part.heroes.forEach((h) => (h.rot = faceRot())); touch(); commit(); render(); };
    panel.querySelector('#randBtn').onclick = () => { const o = P.cfg; P.cfg = fresh(++seedN); for (const k of ['ownerName', 'ownerTitle', 'ownerBio', 'ownerPic']) if (o[k]) P.cfg[k] = o[k]; touch(); commit(); render(); };   // the owner stays
    panel.querySelector('#photoBtn').onclick = () => app.takePhoto && app.takePhoto(P.reg);
    if (app.bindSheet) app.bindSheet(panel, () => app.exitDesign(), (dir) => { const s = Math.max(0, Math.min(STEPS.length - 1, step + dir)); if (s !== step) { step = s; render(); } });
  }
  // Season preview: look at the region in one season while you design it. "Now" follows the planet again.
  let seasonPrev = -1;
  function setSeason(i) { seasonPrev = i; world.timeOverride = i < 0 ? null : { yearPhase: (i + 0.5) / 4 }; cam.changed(); }
  // Time of day preview: put the sun at one height over this tile. "Now" follows the planet again. At night the region keeps its own light.
  let timePrev = 'now';
  function setTime(k) {
    timePrev = k;
    if (k === 'now' || !P.reg) world.sunOverride = null;
    else { const el = (SUN_UP[k] * Math.PI) / 180, ha = (P.reg.az ?? Math.PI / 2) + 1.95, n = tile.center; world.sunOverride = n.clone().multiplyScalar(Math.sin(el)).addScaledVector(tile.e1, Math.cos(ha) * Math.cos(el)).addScaledVector(tile.e3, Math.sin(ha) * Math.cos(el)).normalize(); }
    cam.changed();
  }
  const refocus = (sel) => { const el = panel.querySelector(sel); if (el) el.focus({ preventScroll: true }); };
  function moveHero(i, a) { const hs = P.cfg.heroes, other = hs.findIndex((h, k) => k !== i && h.anchor === a); if (other >= 0) hs[other].anchor = hs[i].anchor; hs[i].anchor = a; }
  // Turn new objects to face the camera, snapped to 60 degrees.
  function faceRot() { const az = cam.focus ? cam.focus.az : Math.PI / 2; return ((Math.round((az - tile.rot0) / (Math.PI / 3)) % 6) + 6) % 6; }
  function fresh(seed) { const c = randomConfig(seed); c.heroes.forEach((h) => (h.rot = faceRot())); return c; }
  // A new region starts blank: bare land, no scenery, no landmarks, no name. The visitor fills it step by step.
  function blank(seed) { return { biome: 'blank', rough: 0.4, water: 0.3, veg: 0.6, hues: ['blue', 'yellow'], toneSet: 'mid', hueShift: 0.5, arch: 'none', bld: 0.5, whimsy: 0.3, heroes: [], name: '', motto: '', seed: (seed * 2654435761) >>> 0 }; }

  app.enterDesign = () => {
    if (sink >= 0) discard();   // a region that is on its way down: it is gone now
    if (app.following) app.stopFollow();
    if (app.current) app.closeRegion();
    app.mode = 'design';
    if (!P.cfg) { P.cfg = blank(seedN); rebuild(); }
    document.body.classList.add('panel-open', 'focused', 'designing');
    panel.hidden = false; step = 0; render();
    app.layoutInset(); app.setFocusDim(true, tile); app.pinLight(tile);
    cam.focusTile(tile, { az: P.reg.az, lift: P.reg.lift, dist: P.reg.camDist });
    hist = [JSON.stringify(P.cfg)]; hi = 0;   // undo does not go back past the start of this visit to the design mode
    $('#live').textContent = 'Design mode. Practice region, not saved. Step 1 of 5: Land.';
    setTimeout(() => refocus('.steps button[aria-selected="true"]'), 60);
  };
  // A visitor who has no region yet can claim a free tile: the region is made there.
  app.canClaim = () => !P.cfg && app.mode !== 'design';
  app.claimTile = (t) => {
    if (!app.canClaim() || app.byTile.has(t.index)) return false;
    if (sink >= 0) discard();
    if (app.clearSeaTile) app.clearSeaTile(t);
    if (t !== tile) { tile = P.tile = app.practiceTile = t; world.removeAnimators([dotsAnim]); dotsAnim = world.addAnimator(tile, anchorDots); }
    app.enterDesign(); return true;
  };
  // Take the region off its tile: the tile is empty ocean again, and the visitor can claim a tile again.
  function discard() {
    const gone = P.reg || sinkReg; sinkReg = null;
    if (gone) { world.removeAnimators(gone.animators); world.removeLights(gone.lights); }
    P.batch.reset(); P.water[0].reset(); P.water[1].reset(); P.batch.commit(); P.water[0].commit(); P.water[1].commit();
    const old = P.mesh.geometry; P.mesh.geometry = new THREE.BufferGeometry(); old.dispose(); P.mesh.visible = false;
    P.reg = null; P.cfg = null; hist = []; hi = -1; rise = -1; sink = -1; dirty = false; setLift(0);
    world.setShore(world.tiles.filter((t) => app.byTile.has(t.index)));
    if (app.refreshFree) app.refreshFree();
  }
  // save = true: "Save region" keeps what is on the tile. If not: the region goes back to how it was at the last save,
  // or, when it was never saved, the tile goes back to empty ocean. A region with no biome has nothing to save.
  let saved = null;
  app.exitDesign = (save) => {
    if (app.mode !== 'design') return;
    if (dirty) rebuild();
    if (save === true && P.cfg.biome !== 'blank') saved = JSON.stringify(P.cfg);
    else if (saved) { if (JSON.stringify(P.cfg) !== saved) { P.cfg = JSON.parse(saved); rebuild(); if (app.toast) app.toast('Not saved<small>Your region is as it was at the last save</small>'); } }
    else {
      // The region goes back down into the ocean. Then the tile is empty (see app.update). With reduced motion there is no move.
      if (REDUCED || !P.mesh.visible) discard();
      else { sink = 0; rise = -1; sinkReg = P.reg; for (const a of sinkReg.animators) a.off = true; world.removeLights(sinkReg.lights); P.reg = null; P.cfg = null; hist = []; hi = -1;   // it is not the visitor's region any more: a new tile can be claimed at once
        world.setShore(world.tiles.filter((t) => app.byTile.has(t.index))); if (app.refreshFree) app.refreshFree(); }   // the sea over the tile is open water again, so the land goes under clear water (not under the pale water of a shore)
      if (app.toast) app.toast('Not saved<small>The tile is empty ocean again</small>');
    }
    app.mode = null; dragHero = -1; setSeason(-1); setTime('now');
    panel.hidden = true; panel.innerHTML = ''; panel.classList.remove('full'); $('#thumb').hidden = true;
    document.body.classList.remove('panel-open', 'focused', 'designing');
    app.setFocusDim(false); app.pinLight(null); app.layoutInset(); cam.unfocus();
    $('#designBtn').textContent = P.cfg ? 'Edit your region' : 'Design your region'; $('#goBtn').hidden = !P.reg; $('#settingsBtn').focus({ preventScroll: true });
  };
  $('#designBtn').onclick = () => app.enterDesign();

  // Drag a hero object on the tile. It snaps to the nearest anchor point.
  const _v = new THREE.Vector3(), _inv = new THREE.Matrix4(), _pl = new THREE.Plane();
  const heroAt = (x, y) => { let best = -1, bd = 54; P.reg.heroes.forEach((h) => { _v.set(h.cx ?? h.x, h.y + 0.12, h.cz ?? h.z).applyMatrix4(tile.matrix); const p = cam.project(_v), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = h.i; } }); return best; };
  cam.onDrag = (phase, x, y) => {
    if (app.mode !== 'design' || STEPS[step][0] !== 'heroes' || !P.reg) return false;
    if (phase === 'start') { dragHero = heroAt(x, y); return dragHero >= 0; }
    if (dragHero < 0) return false;
    if (phase === 'move') {
      const ray = cam.ray(x, y); _pl.setFromNormalAndCoplanarPoint(tile.center, tile.center);
      if (!ray.intersectPlane(_pl, _v)) return true;
      _v.applyMatrix4(_inv.copy(tile.matrix).invert());
      let best = 0, bd = 9; P.reg.anchors.forEach((a, i) => { const d = Math.hypot(a.x - _v.x, a.z - _v.z); if (d < bd) { bd = d; best = i; } });
      if (P.cfg.heroes[dragHero].anchor !== best) { moveHero(dragHero, best); touch(); }
    } else { dragHero = -1; commit(); render(); }
    return true;
  };
  // Show the 7 anchor points while the hero step is open.
  const anchorDots = (db, fb) => {
    if (app.mode !== 'design' || STEPS[step][0] !== 'heroes' || !P.reg) return;
    P.reg.anchors.forEach((a, i) => { const used = P.cfg.heroes.some((h) => h.anchor === i), y = P.reg.H(a.x, a.z) + 0.012; fb.cyl(0.05, 0.004, [ROW.neutral, 10, 0, used ? 0.25 : 0.7], { x: a.x, z: a.z, y }); fb.cyl(0.02, 0.006, [ROW.neutral, 0, 0, 0.95], { x: a.x, z: a.z, y: y + 0.002 }); });
  };
  let dotsAnim = world.addAnimator(tile, anchorDots);

  window.addEventListener('keydown', (e) => {
    if (app.mode !== 'design' || app.modalOpen || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
    if (e.target && ((e.target.tagName === 'INPUT' && e.target.type === 'text') || e.target.tagName === 'TEXTAREA')) return;
    e.preventDefault(); if (e.shiftKey) redo(); else undo();
  });
  const prev = app.update;
  app.update = (t, dt) => {
    if (prev) prev(t, dt);
    if (dirty) rebuild();
    // A new region rises from the ocean.
    if (rise >= 0) {
      rise += dt / 1.5;
      const k = 1 - Math.pow(1 - Math.min(1, rise), 3), off = -(1 - k) * 0.1;
      setLift(off);
      if (rise >= 1) { rise = -1; setLift(0); if (P.reg) for (const a of P.reg.animators) a.off = false; }
      cam.changed();
    }
    // A region that was not saved goes back down into the ocean: slow at first, then faster. Then the tile is empty.
    if (sink >= 0) {
      sink += dt / SINK_S;
      const k = Math.min(1, sink);
      setLift(-k * k * (3 - 2 * k) * SINK_DEPTH);   // slow start, slow end
      if (sink >= 1) discard();
      cam.changed();
    }
  };
}
