// Life in the ocean: ships on the surface, whales and schools of fish under it. Each stays inside one free tile.
// Six legends of the sea are here too. A visitor selects one to mark it in the passport (menu.js).
import * as THREE from 'three';
import { ROW } from './palette.js';
import { OCEAN_R, SEABED_R } from './world.js';
import { REDUCED } from './config.js';
import { rng, TAU } from './util.js';
import { PrimBatch, Builder } from './prims.js';

const V = THREE.Vector3;
const C = (row, tone, kind = 0, prm = 0) => [ROW[row], tone, kind, prm];
const _m = new THREE.Matrix4(), _up = new V(), _fw = new V(), _rt = new V(), _p = new V();

export const LEGENDS = [['whiteWhale', 'White whale'], ['kraken', 'Kraken'], ['charybdis', 'Charybdis'], ['titanic', 'Titanic'], ['nessie', 'Nessie'], ['queenAnne', "Queen Anne's Revenge"]];

// The model of each legend of the sea, in its own units (y = up, z = the way it looks). The ocean draws it, and the passport makes a picture of it.
// tt = the time (for the parts that move). ph = a number that is different for each one.
export const DRAW = {
  whiteWhale(b, tt, ph) {
    const tail = Math.sin(tt * 1.8 + ph) * 0.35, W = C('snow', 0.5), W2 = C('snow', 1.8);
    b.box(0.13, 0.11, 0.3, W, { y: -0.055 }); b.box(0.125, 0.125, 0.15, W, { y: -0.062, z: 0.2 }); b.box(0.07, 0.02, 0.12, W2, { y: -0.08, z: 0.2 });
    b.box(0.09, 0.07, 0.12, W, { y: -0.035, z: -0.2, rx: tail * 0.4 }); b.box(0.19, 0.014, 0.07, W2, { y: 0.0, z: -0.29, rx: tail });
    for (const sx of [-1, 1]) { b.box(0.07, 0.012, 0.05, W2, { x: sx * 0.09, y: -0.045, z: 0.08, rz: sx * 0.4 }); b.box(0.012, 0.012, 0.012, C('neutral', 9), { x: sx * 0.062, y: -0.012, z: 0.22 }); }
    for (let i = 0; i < 3; i++) b.box(0.004, 0.006, 0.07, C('rock', 5), { x: 0.066, y: -0.01 + i * 0.016, z: -0.05 + i * 0.05 });
  },
  kraken(b, tt, ph) {
    // The Kraken: a very large head that rises from the sea, two yellow eyes, and eight thick arms that come out of the water around it and curl.
    const B = C('purple', 7.4), B2 = C('purple', 6), PK = C('pink', 3.4), breathe = Math.sin(tt * 0.9 + ph) * 0.006;
    b.box(0.2, 0.1, 0.2, B, { y: -0.07 }); b.box(0.17, 0.09 + breathe, 0.19, B, { y: 0.03, z: -0.015 }); b.box(0.14, 0.07, 0.17, B2, { y: 0.12 + breathe, z: -0.04 }); b.box(0.1, 0.045, 0.12, B, { y: 0.19 + breathe, z: -0.06 });
    for (let i = 0; i < 5; i++) b.box(0.022, 0.014, 0.022, PK, { x: Math.sin(i * 2.4) * 0.05, y: 0.19 + breathe + (i % 2) * 0.045, z: -0.06 + Math.cos(i * 1.9) * 0.045 });   // pale spots on the top of the head
    b.box(0.19, 0.022, 0.03, B2, { y: 0.088, z: 0.085 });   // the brow
    for (const sx of [-1, 1]) { b.box(0.042, 0.04, 0.014, [ROW.yellow, 2.6, 2, 0], { x: sx * 0.052, y: 0.044, z: 0.082 }); b.box(0.01, 0.034, 0.008, C('neutral', 9.8), { x: sx * 0.052, y: 0.047, z: 0.09 }); }   // the eyes glow at night
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * TAU + 0.39, long = i % 3 === 0, n = long ? 8 : 6, ca = Math.cos(an), sa = Math.sin(an), reach = 0.6 + 0.4 * Math.sin(tt * 0.8 + i * 1.7 + ph);
      for (let k = 0; k < n; k++) {
        const q = k / (n - 1), w = 0.05 - q * 0.028, sway = Math.sin(tt * 1.4 + i * 1.3 + k * 0.7) * 0.012 * k;
        const rr = 0.23 + Math.sin(q * 2.8) * 0.06 - q * q * 0.07, y = -0.06 + q * (long ? 0.3 : 0.18) * reach;   // each arm goes up, out, then its tip curls back in
        b.box(w, 0.042, w, k % 2 ? B2 : B, { x: ca * rr - sa * sway, y, z: sa * rr + ca * sway, ry: -an });
        if (k % 2 === 0 && k > 0) b.box(w * 0.5, 0.012, w * 0.5, PK, { x: ca * (rr - w * 0.5) - sa * sway, y: y + 0.015, z: sa * (rr - w * 0.5) + ca * sway, ry: -an });   // suckers on the side that faces the head
      }
    }
  },
  charybdis(b, tt, ph) {
    const open = 0.5 + 0.5 * Math.sin(tt * 0.8 + ph);
    b.cyl(0.115, 0.012, C('sea', 9.4), { y: -0.014 }); b.cyl(0.07, 0.03, C('neutral', 9.6), { y: -0.04 }); b.cyl(0.035, 0.02 + open * 0.02, C('red', 7), { y: -0.03 });
    for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU, k = 0.35 + open * 0.75; b.pyr(0.032, 0.05 + (i % 2) * 0.018, 0.032, C('snow', 0.3), { x: Math.cos(an) * 0.105, y: -0.008, z: Math.sin(an) * 0.105, rz: Math.cos(an) * k, rx: -Math.sin(an) * k }); }
  },
  titanic(b, tt) {
    // The wreck of the Titanic on the sea bed, in two parts: the bow stands upright, the stern lies away from it and leans. Rust is on the hull. Bubbles go up.
    const HULL = C('neutral', 9), RED = C('red', 8), RUST = C('autumn', 6.6), WH = C('plaster', 1.6), FUN = C('yellow', 5.6), TOP = C('neutral', 9.7);
    const funnel = (x, y, z, rx, rz) => { b.push(x, y, z, 0, 1, rx, rz); b.cyl(0.022, 0.065, FUN, {}); b.cyl(0.023, 0.016, TOP, { y: 0.065 }); b.pop(); };
    b.push(0, 0, 0, 0, 1, 0.05, 0);                                                                                   // the bow part: its nose is a little down in the sand
    b.box(0.1, 0.03, 0.42, RED, { z: 0.16 }); b.box(0.1, 0.05, 0.42, HULL, { y: 0.03, z: 0.16 });
    b.box(0.074, 0.08, 0.06, HULL, { z: 0.4 }); b.box(0.044, 0.08, 0.05, HULL, { z: 0.45 }); b.box(0.02, 0.08, 0.03, HULL, { z: 0.485 });
    for (let i = 0; i < 5; i++) b.box(0.104, 0.016 + (i % 2) * 0.012, 0.04, RUST, { y: 0.04 - (i % 2) * 0.012, z: -0.02 + i * 0.09 });
    b.box(0.082, 0.03, 0.26, WH, { y: 0.08, z: 0.1 }); b.box(0.07, 0.02, 0.2, WH, { y: 0.11, z: 0.1 }); b.box(0.084, 0.006, 0.26, RUST, { y: 0.076, z: 0.1 });
    funnel(0, 0.13, 0.16, -0.12, 0); funnel(0, 0.13, 0.06, -0.2, 0.08);
    b.box(0.006, 0.006, 0.2, RUST, { y: 0.09, z: 0.31, rx: 0.22 });                                                    // the forward mast lies on the deck
    for (let i = 0; i < 4; i++) b.box(0.03 + (i % 2) * 0.03, 0.03 + (i % 3) * 0.02, 0.02, i % 2 ? RUST : HULL, { x: (i - 1.5) * 0.026, z: -0.058 });   // the torn edge where the ship broke
    b.pop();
    b.push(-0.15, 0, -0.3, 0.55, 1, 0, 0.24);                                                                         // the stern part
    b.box(0.1, 0.03, 0.22, RED, {}); b.box(0.1, 0.05, 0.22, HULL, { y: 0.03 }); b.box(0.07, 0.07, 0.05, HULL, { z: -0.13 });
    b.box(0.104, 0.02, 0.05, RUST, { y: 0.045, z: 0.03 }); b.box(0.08, 0.026, 0.13, WH, { y: 0.08, z: 0.01 });
    funnel(0, 0.106, 0.04, 0.25, 0);
    for (const sx of [-1, 1]) b.box(0.03, 0.006, 0.03, FUN, { x: sx * 0.025, y: 0.012, z: -0.165, rz: sx * 0.6 });   // the propellers
    b.pop();
    b.push(0.13, 0.022, -0.2, 0.9, 1, Math.PI / 2, 0); b.cyl(0.022, 0.065, FUN, {}); b.cyl(0.023, 0.016, TOP, { y: 0.065 }); b.pop();   // the last funnel fell off
    for (let i = 0; i < 7; i++) b.box(0.02 + (i % 3) * 0.012, 0.012, 0.02, i % 2 ? RUST : HULL, { x: Math.sin(i * 2.4) * 0.14, z: -0.12 - (i % 4) * 0.045, ry: i });   // parts on the sea bed between the two
    for (let i = 0; i < 5; i++) { const f = (tt * 0.22 + i / 5) % 1; b.box(0.012, 0.012, 0.012, C('snow', 0.3), { x: Math.sin(i * 2.1) * 0.06, y: 0.13 + f * 0.1, z: i * 0.07 - 0.12 }); }
  },
  nessie(b, tt, ph) {
    const G = C('forest', 7.6), G2 = C('forest', 6), nod = Math.sin(tt * 0.7 + ph) * 0.15;
    for (let i = 0; i < 3; i++) { const hg = 0.05 + Math.sin(tt * 1.2 - i * 1.1) * 0.02; b.box(0.075, hg, 0.1, G, { y: -0.02, z: -0.03 - i * 0.14 }); b.box(0.05, 0.018, 0.07, G2, { y: -0.02 + hg, z: -0.03 - i * 0.14 }); }
    b.box(0.03, 0.03, 0.09, G, { y: -0.012, z: -0.46, rx: -0.5 });
    b.push(0, -0.02, 0.1, 0, 1, 0.25 + nod); b.box(0.046, 0.2, 0.046, G, {}); b.box(0.02, 0.2, 0.01, G2, { z: -0.026 });
    b.push(0, 0.2, 0, 0, 1, -0.1 - nod); b.box(0.052, 0.046, 0.11, G, { z: 0.03 }); for (const sx of [-1, 1]) b.box(0.01, 0.01, 0.01, C('yellow', 3), { x: sx * 0.024, y: 0.028, z: 0.055 }); b.pop();
    b.pop();
  },
  queenAnne(b, tt, ph) {
    // Queen Anne's Revenge: a pirate ship with three masts, black sails, cannons, lamps at the stern, and a black flag.
    const HULL = C('neutral', 8.9), WOOD = C('earth', 7.4), SAIL = C('neutral', 8), SAIL2 = C('neutral', 7), IRON = C('neutral', 9.7), LAMP = [ROW.yellow, 2.6, 2, 0], fl = Math.sin(tt * 3 + ph) * 0.3;
    b.box(0.085, 0.045, 0.3, HULL, { y: -0.014 }); b.box(0.06, 0.04, 0.06, HULL, { y: -0.01, z: 0.17 }); b.box(0.034, 0.034, 0.04, HULL, { y: -0.004, z: 0.21 });
    b.box(0.088, 0.008, 0.3, C('red', 6.6), { y: 0.016 }); b.box(0.076, 0.006, 0.28, C('earth', 5.2), { y: 0.031 });
    b.box(0.085, 0.05, 0.075, WOOD, { y: 0.03, z: -0.125 }); b.box(0.089, 0.008, 0.08, HULL, { y: 0.08, z: -0.125 }); b.box(0.06, 0.018, 0.004, LAMP, { y: 0.048, z: -0.164 });   // the stern castle, with lit windows
    for (const sx of [-1, 1]) { b.box(0.01, 0.016, 0.01, LAMP, { x: sx * 0.034, y: 0.09, z: -0.16 }); for (let i = 0; i < 3; i++) b.box(0.014, 0.008, 0.008, IRON, { x: sx * 0.047, y: 0.008, z: -0.05 + i * 0.07 }); }   // two lamps; three cannons on each side
    b.box(0.008, 0.008, 0.13, WOOD, { y: 0.04, z: 0.25, rx: -0.28 });                                                  // the bowsprit
    [[-0.07, 0.2], [0.03, 0.27], [0.125, 0.2]].forEach(([z, h], i) => {
      b.push(0, 0, z, 0.5, 1);   // the sails are turned a little to the wind, so they show from the side too
      b.box(0.008, h, 0.008, WOOD, { y: 0.03 });
      b.box(0.11 - i % 2 * 0.006, 0.07, 0.006, SAIL, { y: 0.06, z: 0.01 }); b.box(0.08, 0.055, 0.006, SAIL, { y: 0.142, z: 0.01 });
      b.box(0.03, 0.02, 0.007, SAIL2, { x: (i - 1) * 0.02, y: 0.064, z: 0.01 }); b.box(0.02, 0.016, 0.007, SAIL2, { x: (1 - i) * 0.02, y: 0.16, z: 0.01 });   // torn places in the sails
      if (i === 1) b.box(0.07, 0.04, 0.006, SAIL, { y: 0.207, z: 0.01 });
      b.pop();
    });
    b.push(0, 0.3, 0.03, fl, 1, 0, 0); b.box(0.004, 0.034, 0.05, IRON, { z: -0.027 }); b.box(0.005, 0.014, 0.014, C('snow', 0.3), { y: 0.012, z: -0.022 }); b.box(0.005, 0.007, 0.007, C('red', 5), { y: 0.006, z: -0.04 }); b.pop();   // the black flag
  },
};

// A small picture of the model of one legend, for the passport. It is made one time, then kept. If the picture cannot be made, the result is ''.
const PICS = new Map(), POSE = { whiteWhale: 0.6, kraken: 4.4, charybdis: 0.4, titanic: 0.25, nessie: 0.9, queenAnne: 0.2 };   // POSE: a time at which the model has a good pose
export function legendPicture(world, id, px = 224) {
  if (PICS.has(id)) return PICS.get(id);
  let url = '';
  try {
    const r = world.renderer, U = world.U, S = px * 2;
    const batch = new PrimBatch(world.spaceMat, { shadow: false });
    const b = new Builder(batch, null, new THREE.Matrix4().makeScale(0.25, 0.25, 0.25).setPosition(0, 1, 0), 0); b.sens = 0;
    DRAW[id](b, POSE[id], 0); batch.commit();
    // The box that holds all the shapes, then a camera that looks at it from the front, a little from above.
    const box = new THREE.Box3(), v = new V(), m = new THREE.Matrix4();
    for (const set of batch.sets) for (let i = 0; i < set.n; i++) { m.fromArray(set.m, i * 16); for (let k = 0; k < 8; k++) box.expandByPoint(v.set(k & 1 ? 0.5 : -0.5, k & 2 ? 1 : 0, k & 4 ? 0.5 : -0.5).applyMatrix4(m)); }
    const c = box.getCenter(new V()), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
    cam.position.copy(c).addScaledVector(v.set(0.82, 0.5, 0.6).normalize(), 3); cam.lookAt(c); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    let ex = 0.01; for (let k = 0; k < 8; k++) { v.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).applyMatrix4(cam.matrixWorldInverse); ex = Math.max(ex, Math.abs(v.x), Math.abs(v.y)); }
    ex *= 1.06; cam.left = -ex; cam.right = ex; cam.top = ex; cam.bottom = -ex; cam.updateProjectionMatrix();
    const scene = new THREE.Scene(); scene.add(batch.group);
    const rt = new THREE.WebGLRenderTarget(S, S, { depthBuffer: true }), buf = new Uint8Array(S * S * 4);
    // The picture has its own light, and no effect of the view (no dim, no wireframe, no cut).
    const keep = ['uFocusK', 'uWire', 'uShadowOn', 'uCut', 'uLitK', 'uLod', 'uHoverR', 'uAlpha'].map((k) => [k, U[k].value]), sun0 = world.sunDir.clone(), col0 = new THREE.Color(), a0 = r.getClearAlpha(), tgt0 = r.getRenderTarget();
    r.getClearColor(col0);
    for (const [k] of keep) U[k].value = k === 'uLod' || k === 'uAlpha' ? 1 : 0;
    world.sunDir.set(0.35, 0.8, 0.5).normalize();
    r.setRenderTarget(rt); r.setClearColor(0xffffff, 0); r.clear(); r.render(scene, cam);
    r.readRenderTargetPixels(rt, 0, 0, S, S, buf);
    r.setRenderTarget(tgt0); r.setClearColor(col0, a0); world.sunDir.copy(sun0); for (const [k, val] of keep) U[k].value = val;
    scene.remove(batch.group); batch.dispose(); rt.dispose();
    // Rows come from the bottom up. Then the picture is made smaller, which makes its edges smooth.
    const big = document.createElement('canvas'); big.width = big.height = S;
    const ctx = big.getContext('2d'), img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    ctx.putImageData(img, 0, 0);
    const out = document.createElement('canvas'); out.width = out.height = px;
    const o2 = out.getContext('2d'); o2.imageSmoothingQuality = 'high'; o2.drawImage(big, 0, 0, px, px);
    url = out.toDataURL('image/png');
  } catch (e) { url = ''; }
  PICS.set(id, url); return url;
}

export function addSeaLife(app) {
  const { world } = app, r = rng(404);
  const free = world.tiles.filter((t) => !app.byTile.has(t.index) && t !== app.practiceTile);
  // Spread the things over free tiles that are far from each other.
  const picks = []; let pool = free.slice();
  while (picks.length < 14 + LEGENDS.length && pool.length) {
    let best = null, bm = -2;
    for (const t of pool) { let m = 2; for (const q of picks) m = Math.min(m, 1 - t.center.dot(q.center)); if (m > bm) { bm = m; best = t; } }
    picks.push(best); pool = pool.filter((t) => t !== best);
  }
  const kinds = ['ship', 'whale', 'fish', 'cargo', 'fish', 'whale', 'ship', 'fish', 'fish', 'cargo', 'whale', 'fish', 'ship', 'fish'];
  const things = picks.map((tile, i) => ({ tile, kind: i < 14 ? kinds[i] : LEGENDS[i - 14][0], legend: i < 14 ? null : LEGENDS[i - 14][0], ph: r() * TAU, speed: r.range(0.05, 0.09) * (r() < 0.5 ? 1 : -1), rad: tile.rin * r.range(0.4, 0.62), hue: r.pick(['red', 'blue', 'orange', 'yellow']) }));
  // For the highlight line (discover.js): a name and a size for each thing. pos is set every frame.
  const INFO = { ship: ['Sailing ship', 0.03, 0.0012, 0.05], cargo: ['Cargo ship', 0.04, 0.0012, 0.03], whale: ['Whale', 0.045, -0.02, 0.014], fish: ['School of fish', 0.05, -0.02, 0.012],
    whiteWhale: ['White whale', 0.07, -0.03, 0.022], kraken: ['Kraken', 0.085, -0.03, 0.085], charybdis: ['Charybdis', 0.065, -0.012, 0.022], titanic: ['Titanic', 0.12, -0.004, 0.045], queenAnne: ["Queen Anne's Revenge", 0.06, 0.001, 0.09], nessie: ['Nessie', 0.07, -0.008, 0.06] };
  things.forEach((th, i) => { const [label, hr, a0, a1] = INFO[th.kind]; Object.assign(th, { id: i, label, hr, a0, a1, pos: null }); });
  world.seaThings = things;
  // A region is made on a tile that has a sea thing: the thing moves to a free tile with no other thing, so that no legend is lost.
  app.clearSeaTile = (tile) => {
    const used = new Set(things.map((th) => th.tile)), spare = free.filter((t) => !used.has(t) && t !== tile);
    for (const th of things) if (th.tile === tile && spare.length) { th.tile = spare.splice(Math.floor(spare.length / 2), 1)[0]; th.pos = null; }
  };

  // Small icebergs float on the empty ocean tiles next to the two poles. They go away from a tile when a region is made there.
  for (const pole of app.areas.filter((q) => q.def.ring === 'north' || q.def.ring === 'south')) for (const ni of pole.tile.neighbors) {
    const tile = world.tiles[ni]; if (app.byTile.has(ni)) continue;
    const ir = rng(ni * 13 + 5), bergs = [];
    for (let i = 0; i < 5; i++) { const a = ir() * TAU, d = 0.15 + Math.sqrt(ir()) * 0.55; bergs.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.6 + ir() * 0.9, ry: ir() * 3, ph: ir() * 6, kind: i % 3 }); }
    world.addAnimator(tile, (db, fb, t) => {
      if (app.practice && app.practice.cfg && app.practice.tile === tile) return;
      const tt = REDUCED ? 0 : t;
      for (const g of bergs) {
        db.push(g.x + Math.sin(tt * 0.05 + g.ph) * 0.03, Math.sin(tt * 0.8 + g.ph) * 0.004, g.z + Math.cos(tt * 0.04 + g.ph) * 0.03, g.ry + tt * 0.01, g.s, Math.sin(tt * 0.6 + g.ph) * 0.03);
        db.box(0.15, 0.05, 0.12, C('sea', 1.6), { y: -0.05 });                                             // the part under the water
        db.box(0.13, 0.035, 0.1, C('snow', 0.6), { y: -0.004 });
        if (g.kind !== 2) db.box(0.08, 0.05, 0.065, C('snow', 0.2), { x: -0.015, y: 0.03, z: 0.008, ry: 0.4 });
        if (g.kind === 0) db.box(0.04, 0.045, 0.035, C('snow', 0.9), { x: -0.02, y: 0.08, ry: 0.2, t: 0.6 });
        if (g.kind === 1) db.box(0.035, 0.02, 0.03, C('snow', 0.4), { x: 0.07, y: -0.004, z: 0.07 });
        db.pop();
      }
    }, { minLod: 0 });
  }

  // Put the builder at a point on a circle inside the tile. y = up, z = the way it moves.
  const place = (b, th, a, radius, scale, rec) => {
    const t = th.tile, ca = Math.cos(a), sa = Math.sin(a), d = th.speed > 0 ? 1 : -1;
    _up.copy(t.center).addScaledVector(t.e1, ca * th.rad).addScaledVector(t.e3, sa * th.rad).normalize();
    _fw.set(0, 0, 0).addScaledVector(t.e1, -sa * d).addScaledVector(t.e3, ca * d); _fw.addScaledVector(_up, -_fw.dot(_up)).normalize();
    _rt.crossVectors(_up, _fw);
    if (rec) (th.pos || (th.pos = new THREE.Vector3())).copy(_up).multiplyScalar(radius);
    _m.makeBasis(_rt, _up, _fw).scale(_p.set(scale, scale, scale)).setPosition(_p.copy(_up).multiplyScalar(radius));
    b.pushM(_m);
  };
  const S = 0.19;
  world.addAnimator(null, (b, fb, t, env) => {
    const tt = REDUCED ? 0 : t, cam = world.camera.position, cl = cam.length();
    for (const th of things) {
      if (app.practice && app.practice.cfg && th.tile === app.practice.tile) { th.pos = null; continue; }   // a region stands on this tile now
      if (th.tile.center.dot(cam) / cl < 1 / cl - 0.3) continue;
      const a = th.ph + tt * th.speed;
      if (th.kind === 'ship') {
        place(b, th, a, OCEAN_R + Math.sin(tt * 1.3 + th.ph) * 0.0008, S, 1);
        b.push(0, 0, 0, 0, 1, Math.sin(tt * 1.1 + th.ph) * 0.05, 0);
        b.box(0.07, 0.035, 0.2, C('earth', 6.4), { y: -0.012 }); b.box(0.05, 0.03, 0.05, C('earth', 6.4), { y: -0.008, z: 0.115 }); b.box(0.074, 0.008, 0.2, C('earth', 3.4), { y: 0.023 });
        b.box(0.008, 0.2, 0.008, C('earth', 7.6), { y: 0.03 }); b.box(0.006, 0.13, 0.1, C('plaster', 0.4), { y: 0.07, z: -0.012 }); b.box(0.006, 0.08, 0.06, C('plaster', 0.8), { y: 0.07, z: 0.075 });
        b.box(0.04, 0.03, 0.045, C('plaster', 1), { y: 0.03, z: -0.065 }); b.box(0.004, 0.02, 0.03, C(th.hue, 5), { y: 0.215, z: -0.012 });
        b.pop(); b.pop();
      } else if (th.kind === 'cargo') {
        place(b, th, a, OCEAN_R, S, 1);
        b.box(0.09, 0.05, 0.32, C(th.hue, 6), { y: -0.015 }); b.box(0.07, 0.04, 0.06, C(th.hue, 6), { y: -0.01, z: 0.18 }); b.box(0.094, 0.006, 0.32, C('rock', 5), { y: 0.035 });
        b.box(0.08, 0.07, 0.05, C('plaster', 0.6), { y: 0.04, z: -0.12 }); b.box(0.085, 0.012, 0.012, [ROW.rock, 7.8, 1, 0.05], { y: 0.085, z: -0.094 }); b.box(0.02, 0.04, 0.02, C(th.hue, 5), { y: 0.11, z: -0.13 });
        for (let i = 0; i < 6; i++) b.box(0.036, 0.03, 0.05, C(['red', 'blue', 'yellow', 'orange', 'green'][(i + things.indexOf(th)) % 5], 5), { x: (i % 2 ? 1 : -1) * 0.02, y: 0.041 + (i > 3 ? 0.03 : 0), z: -0.04 + (i >> 1) % 2 * 0.06 + (i > 3 ? 0.03 : 0) });
        b.pop();
      } else if (th.kind === 'whale') {
        // A whale swims under the water and comes up to breathe.
        const br = Math.max(0, Math.sin(tt * 0.22 + th.ph));
        place(b, th, a * 0.6, OCEAN_R - 0.03 + br * 0.026, S, 1);
        const tail = Math.sin(tt * 2 + th.ph) * 0.35;
        b.box(0.12, 0.1, 0.3, C('sea', 8.6), { y: -0.05 }); b.box(0.1, 0.085, 0.1, C('sea', 8.6), { y: -0.045, z: 0.19 }); b.box(0.11, 0.03, 0.3, C('snow', 1.5), { y: -0.06 });
        b.box(0.08, 0.06, 0.12, C('sea', 8.6), { y: -0.03, z: -0.2, rx: tail * 0.4 }); b.box(0.16, 0.014, 0.07, C('sea', 8.8), { y: 0.0, z: -0.28, rx: tail });
        for (const sx of [-1, 1]) b.box(0.07, 0.012, 0.05, C('sea', 8.8), { x: sx * 0.085, y: -0.04, z: 0.08, rz: sx * 0.4 });
        b.box(0.01, 0.01, 0.01, C('neutral', 9), { x: 0.052, y: 0.0, z: 0.2 });
        b.pop();
        if (br > 0.93) { place(b, th, a * 0.6, OCEAN_R, S); for (let i = 0; i < 5; i++) { const f = (tt * 1.5 + i / 5) % 1; b.box(0.018, 0.018, 0.018, C('snow', 0.2), { x: Math.sin(i * 2.4) * 0.03 * f, y: 0.02 + f * 0.12, z: 0.1 + Math.cos(i * 1.9) * 0.03 * f }); } b.pop(); }
      } else if (th.kind === 'whiteWhale') {
        // The white whale: large and pale, with old scars. It comes up to breathe.
        const br = Math.max(0, Math.sin(tt * 0.3 + th.ph));
        place(b, th, a * 0.6, OCEAN_R - 0.011 + br * 0.016, S * 1.35, 1);   // the back is always over the water
        DRAW.whiteWhale(b, tt, th.ph);
        b.pop();
        if (br > 0.9) { place(b, th, a * 0.6, OCEAN_R, S * 1.35); for (let i = 0; i < 6; i++) { const f = (tt * 1.5 + i / 6) % 1; b.box(0.02, 0.02, 0.02, C('snow', 0.2), { x: Math.sin(i * 2.4) * 0.04 * f, y: 0.02 + f * 0.16, z: 0.16 + Math.cos(i * 1.9) * 0.04 * f }); } b.pop(); }
      } else if (th.kind === 'kraken') {
        // The Kraken: it comes up from the sea a little, and goes down again. It moves slowly.
        const up = 0.5 + 0.5 * Math.sin(tt * 0.35 + th.ph);
        place(b, th, a * 0.5, OCEAN_R - 0.016 + up * 0.016, S * 1.3, 1);
        DRAW.kraken(b, tt, th.ph);
        b.pop();
      } else if (th.kind === 'charybdis') {
        // Charybdis: a whirlpool with a dark throat and a ring of teeth that open and close. It stays in one place.
        place(b, th, th.ph, OCEAN_R, S * 1.4, 1);
        DRAW.charybdis(b, tt, th.ph);
        b.pop();
        place(fb, th, th.ph, OCEAN_R + 0.0012, S * 1.4);
        for (let i = 0; i < 18; i++) { const an = tt * 0.9 + i * 0.52, rr = 0.14 + i * 0.011; fb.box(0.06, 0.003, 0.016, [ROW.snow, 0.2, 0, 0.55 - i * 0.022], { x: Math.cos(an) * rr, z: Math.sin(an) * rr, ry: -an - Math.PI / 2 }); }
        fb.pop();
      } else if (th.kind === 'titanic') {
        // The wreck of the Titanic: it lies on the sea bed and does not move. You see it through the water.
        place(b, th, th.ph, SEABED_R + 0.003, S * 1.5, 1);
        DRAW.titanic(b, tt, th.ph);
        b.pop();
      } else if (th.kind === 'queenAnne') {
        // Queen Anne's Revenge: the pirate ship sails on the sea, and rolls a little.
        place(b, th, a, OCEAN_R + Math.sin(tt * 1.3 + th.ph) * 0.0008, S * 1.45, 1);
        b.push(0, 0, 0, 0, 1, Math.sin(tt * 1.1 + th.ph) * 0.05, 0);
        DRAW.queenAnne(b, tt, th.ph);
        b.pop(); b.pop();
      } else if (th.kind === 'nessie') {
        // Nessie: three humps and a long neck over the water. It moves slowly.
        place(b, th, a * 0.5, OCEAN_R, S * 1.3, 1);
        DRAW.nessie(b, tt, th.ph);
        b.pop();
      } else {
        // A school of small fish.
        place(b, th, a * 1.4 + 0.7, OCEAN_R - 0.02, S, 1); b.pop();
        for (let i = 0; i < (env.low ? 5 : 9); i++) {
          const k = i * 0.6180339 % 1, wig = Math.sin(tt * 6 + i) * 0.3;
          place(b, th, a * 1.4 + i * 0.16 + Math.sin(tt * 0.5 + i) * 0.05, OCEAN_R - 0.012 - k * 0.022, S);
          const col = C(i % 3 ? th.hue : 'yellow', 4 + (i % 2));
          b.box(0.012, 0.022, 0.05, col, { x: (k - 0.5) * 0.12, ry: wig * 0.3 }); b.box(0.004, 0.02, 0.02, col, { x: (k - 0.5) * 0.12, z: -0.03, ry: wig });
          b.pop();
        }
      }
    }
  });
}
