// Makes single objects easy to find: the sun, the moon, the satellite, the comet, ships and sea animals, hero objects,
// the animals on a tile, and the hidden details. When the pointer is over one of them, it gets one blue silhouette line and a label.
import * as THREE from 'three';
import { CONFIG } from './config.js';

const V = THREE.Vector3;
const ORBIT = [[['moon', 'Moon', 'Select it to pull a wave from the sea', 0.1, -0.1, 0.1]], [['sat', 'Satellite', 'Select it for the wireframe view', 0.13, -0.04, 0.07], ['comet', 'Comet', 'Select it for a meteor shower', 0.34, -0.07, 0.07]]];
const ANIMAL = { sheep: 'Sheep', cow: 'Cow', deer: 'Deer', fox: 'Fox', arcticFox: 'Arctic fox', sandFox: 'Sand fox', rabbit: 'Rabbit', hare: 'Hare', greyRabbit: 'Rabbit', camel: 'Camel', lizard: 'Lizard', sandLizard: 'Lizard', fireLizard: 'Fire lizard', gecko: 'Gecko', bear: 'Polar bear', penguin: 'Penguin', frog: 'Frog', heron: 'Heron', flamingo: 'Flamingo', duck: 'Duck', gull: 'Gull', swan: 'Swan', crab: 'Crab', turtle: 'Turtle', goat: 'Goat', ibex: 'Ibex', darkGoat: 'Goat', monkey: 'Monkey', parrot: 'Parrot', greenParrot: 'Parrot', seal: 'Seal', giraffe: 'Giraffe', zebra: 'Zebra', elephant: 'Elephant' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function setupDiscover(app) {
  const { world, cam } = app, U = world.U, list = [], _o = new V(), _m = new V(), _r = new V();
  // One entry = a cylinder around the object: base point C, axis up, radius R, from a0 to a1 along the axis (world units).
  // zoom = a click zooms in on it (things that are not on a tile).
  const add = (key, label, sub, C, up, R, a0, a1, zoom) => list.push({ key, label, sub, C, up, R, a0, a1, zoom: !!zoom });
  const say = (text) => { const live = document.querySelector('#live'); if (live) live.textContent = text + '.'; cam.changed(); };
  // For the tests: do the action of one thing by its key.
  app.tapThing = (key) => { collect(); const c = list.find((q) => q.key === key || q.key.startsWith(key)); if (c && c.tap) { c.tap(); if (app.eggTap) app.eggTap(c.key); return true; } return false; };
  // Find one thing by its key (or the start of its key). null = it is not in view now.
  app.findThing = (key) => { collect(); return list.find((q) => q.key === key || q.key.startsWith(key)) || null; };
  // Bring one thing into view, with no zoom. The passport uses this for a found easter egg.
  // A thing in orbit (the sun, the moon, the satellite, the comet): the camera goes out and turns until the thing is in the middle, with the planet behind it.
  // A thing on a unique area (tile = its tile): the planet turns until that tile is in the middle.
  let show = null;
  app.showThing = (key, tile) => { show = { key, tile: tile || null, t: 0, hi: false }; if (!tile) world.keepOrbits = true; cam.auto = false; cam.changed(); return true; };
  function collect() {
    list.length = 0;
    if (world.orbits.visible && world.orbiters) {
      world.orbiters.forEach((o, oi) => {
        o.spin.updateWorldMatrix(true, false);
        o.pts.forEach((p, i) => {
          const [key, label, sub, R, a0, a1] = ORBIT[oi][i], C = p.clone().applyMatrix4(o.spin.matrixWorld);
          // The moon, the satellite, and the comet do something on a click, so they do not zoom.
          if (key === 'moon') list.push({ key, label, sub, C, up: C.clone().normalize(), R, a0, a1, zoom: false, tap: () => { world.wave(C.clone().normalize()); say('A wave rises under the moon'); } });
          else if (key === 'sat') list.push({ key, label, sub: world.wire ? 'Select it to go back to the normal view' : sub, C, up: C.clone().normalize(), R, a0, a1, zoom: false, tap: () => { world.setWire(!world.wire); say(world.wire ? 'Wireframe view' : 'Normal view'); } });
          else list.push({ key, label, sub, C, up: C.clone().normalize(), R, a0, a1, zoom: false, tap: () => { world.meteors(C.clone().normalize()); if (cam.mode === 'orbit') { cam.auto = false; cam.flyGoal = { lon: cam.lon, lat: cam.lat, dist: CONFIG.camera.zoomMax }; } say('A meteor shower'); } });   // the camera goes out, so the meteors that pass beside the planet are in view
        });
      });
      const s = world.sunMark.position; list.push({ key: 'sun', label: 'Sun', sub: 'Select it for a heat wave', C: s.clone(), up: s.clone().normalize(), R: 0.17, a0: -0.17, a1: 0.17, zoom: false, tap: () => { if (world.sunMark.flare) world.sunMark.flare(); const hot = world.sunHeat(); say(hot ? 'A heat wave: solar flares, the polar ice melts, and a hurricane grows under the sun' : 'Solar flares'); } });
    }
    for (const th of world.seaThings || []) if (th.pos) add('sea' + th.id, th.label, th.legend ? (app.legendFound && app.legendFound(th.legend) ? 'Legend of the sea · in your passport' : 'Legend of the sea · select it for your passport') : 'At sea', th.pos.clone(), th.pos.clone().normalize(), th.hr, th.a0, th.a1, true);
    const now = world.lastT || 0, cp = world.camera.position, cl = cp.length();
    for (const reg of [...app.samples, ...app.areas, ...(app.practice && app.practice.reg ? [app.practice.reg] : [])]) {
      const t = reg.tile; if (t.center.dot(cp) < 0.15 * cl) continue;   // on the far side
      if (reg.kind !== 'area') for (const it of reg.heroes || []) {
        const span = it.def.water === 'span', C = new V(it.cx ?? it.x, it.y ?? 0, it.cz ?? it.z).applyMatrix4(t.matrix);
        add('h' + t.index + '-' + it.i, it.def.label, reg.name, C, t.center, ((span ? 0.42 : it.type === 'windmill' ? 0.33 * it.sc : it.r) + 0.02) * t.rin, 0.006 * t.rin, (it.def.h * it.sc + 0.12) * t.rin);
      }
      (reg.animals || []).forEach((A, i) => {
        if (A.seen == null || now - A.seen > 0.4) return;   // it is not drawn now (far away, or behind the planet)
        const s = A.s * t.rin; add('a' + t.index + '-' + i, ANIMAL[A.name] || 'Animal', reg.name, new V(A.cx, A.cy, A.cz).applyMatrix4(t.matrix), t.center, 0.045 * s, 0.004 * t.rin, 0.09 * s);   // from just above the ground, so the ground is not in the outline
      });
      // Things on a unique area that do something on a click (the Publish button, the volcano, the lighthouse), or that only have a label.
      for (const q of reg.taps || []) {
        if (q.show && !q.show()) continue;
        list.push({ key: q.key + t.index, label: q.label, sub: q.sub(), C: new V(q.at[0], q.at[1], q.at[2]).applyMatrix4(t.matrix), up: t.center, R: q.R * t.rin, a0: q.a0 * t.rin, a1: q.a1 * t.rin, zoom: false,
          tap: q.tap ? () => { if (!q.tap()) return; if (q.toast && app.toast) app.toast(q.toast); say(q.label); } : null });
      }
      (reg.details || []).forEach((d, i) => {
        if (d.wx == null) return;
        add('d' + t.index + '-' + i, d.found ? cap(d.label) : 'Hidden detail', reg.name, new V(d.wx, d.wy, d.wz).applyMatrix4(t.matrix), t.center, 0.06 * t.rin, -0.017 * t.rin, 0.1 * t.rin);
      });
    }
  }
  // Is the planet between the camera and the point?
  const hidden = (P) => { const o = world.camera.position; _o.copy(P).sub(o); const L = _o.length(); _o.divideScalar(L); const tc = -o.dot(_o); return tc > 0 && tc < L - 0.02 && _m.copy(o).addScaledVector(_o, tc).length() < 0.985; };
  app.pickThing = (x, y) => {
    collect();
    _r.setFromMatrixColumn(world.camera.matrixWorld, 0);
    let best = null, bs = 1e9;
    for (const c of list) {
      const mid = c.C.clone().addScaledVector(c.up, (c.a0 + c.a1) / 2);
      if (hidden(mid)) continue;
      const s = cam.project(mid); if (!s.front) continue;
      const e = cam.project(mid.clone().addScaledVector(_r, Math.max(c.R, (c.a1 - c.a0) / 2))), sr = Math.max(12, Math.hypot(e.x - s.x, e.y - s.y) * 0.9);
      // The thing is a cylinder: from the side, it is a long shape on the screen, not a circle. So the pointer is on it when it is near the line from the bottom of the cylinder to its top.
      // (With a circle at the middle only, a tall thing near the edge of the planet did not get a click on its lower part: the volcano.)
      const pa = cam.project(_m.copy(c.C).addScaledVector(c.up, c.a0)), pb = cam.project(_o.copy(c.C).addScaledVector(c.up, c.a1));
      const er = cam.project(_m.copy(mid).addScaledVector(_r, c.R)), wr = Math.max(12, Math.hypot(er.x - s.x, er.y - s.y) * 0.9);
      const lx = pb.x - pa.x, ly = pb.y - pa.y, ll = lx * lx + ly * ly, q = ll > 0.01 ? Math.max(0, Math.min(1, ((x - pa.x) * lx + (y - pa.y) * ly) / ll)) : 0;
      const on = Math.hypot(s.x - x, s.y - y) < sr || Math.hypot(pa.x + lx * q - x, pa.y + ly * q - y) < wr;
      // The smallest thing under the pointer wins: an animal that stands next to a tower, not the tower.
      if (on && sr < bs) { bs = sr; best = c; c.sx = s.x; c.sy = s.y - sr * 1.05; }   // sx, sy: where the label goes (over the top of the object)
    }
    return best;
  };
  // Zoom in on one object and stay with it (a click on an object that is not on a tile).
  const size = (c) => Math.max(c.R, (c.a1 - c.a0) / 2);
  app.followThing = (c0) => {
    const fk = c0.key;
    const get = () => { collect(); const c = list.find((q) => q.key === fk); return c ? { C: c.C, up: c.up, mid: (c.a0 + c.a1) / 2 } : null; };
    app.following = fk; world.keepOrbits = fk.slice(0, 3) !== 'sea';
    cam.followObject(get, size(c0));
    back.hidden = false; back.textContent = 'Back to planet'; document.body.classList.add('focused');
    const live = document.querySelector('#live'); if (live) live.textContent = `${c0.label}. ${c0.sub}.`;
  };
  // quiet = the camera goes somewhere else next (a region opens), so do not fly back to the planet view.
  app.stopFollow = (quiet) => {
    if (!app.following) return;
    app.following = null; world.keepOrbits = false; back.hidden = true;
    if (!quiet) { document.body.classList.remove('focused'); cam.unfocus(); }
  };
  const back = document.querySelector('#backBtn'); back.onclick = () => app.stopFollow();
  let key = null, goal = 0, k = 0, hold = 0;
  app.setHi = (c) => { if (c) { key = c.key; goal = 1; hold = 0; apply(c); } else if (!hold) goal = 0; };
  // Keep the silhouette on one object with no pointer on it (a found hidden detail, or a row in the manual). sec: how long (Infinity = until releaseHi).
  app.holdHi = (kk, sec) => { collect(); const c = list.find((q) => q.key === kk); if (!c) return false; key = kk; goal = 1; hold = sec; apply(c); cam.changed(); return true; };
  app.releaseHi = (kk) => { if (hold && key === kk) { hold = 0; goal = 0; } };
  function apply(c) { U.uHiC.value.copy(c.C); U.uHiU.value.copy(c.up); U.uHiP.value.set(c.R, c.a0, c.a1); }
  const prev = app.update;
  app.update = (t, dt) => {
    if (prev) prev(t, dt);
    if (show) {
      show.t += dt;
      // The thing can move (the satellite, the comet), so the camera goes after it for a short time. A drag, a region, or a close view ends this.
      if (show.t > 3.4 || cam.dragging || cam.mode !== 'orbit' || app.current || app.following || app.mode === 'design') { if (!show.tile && !app.following) world.keepOrbits = false; show = null; }
      else {
        let dir = show.tile ? show.tile.center : null, c = null;
        if (!show.tile) { const vis = world.orbits.visible; world.orbits.visible = true; collect(); world.orbits.visible = vis; c = list.find((q) => q.key === show.key); if (c) dir = c.C; }
        if (dir) { const L = dir.length(); cam.flyGoal = { lon: Math.atan2(dir.z, dir.x), lat: Math.max(-1.2, Math.min(1.2, Math.asin(dir.y / L))), dist: show.tile ? Math.min(cam.dist, 2.7) : CONFIG.camera.zoomMax }; }
        // When it is in view, it gets the blue line for a short time, so the visitor sees what to select.
        if (!show.hi && show.t > 1) { show.hi = true; collect(); const q = list.find((x) => x.key === show.key || (show.tile && x.key === show.key + show.tile.index)); if (q) app.holdHi(q.key, 3.5); }
        app.busy = true;
      }
    }
    if (hold && hold !== Infinity) { hold -= dt; if (hold <= 0) { hold = 0; goal = 0; } }
    k += (goal - k) * (1 - Math.exp(-dt * 12));
    if (k < 0.01 && !goal) { k = 0; key = null; }
    // The object can move (a ship, a sheep): follow it.
    if (key) { collect(); const c = list.find((q) => q.key === key); if (c) apply(c); else goal = 0; }
    world.hiK = k;
    world.sunMark.hi = key === 'sun' ? k : 0;
    if (k > 0.01 && k < 0.99) app.busy = true;
  };
}
