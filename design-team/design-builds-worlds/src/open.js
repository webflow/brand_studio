// The two biomes with no land: the ocean (things float on the open sea) and the sky (things stand on a cloud).
// Here: their kinds of scenery, and their landmarks. region.js builds a region from them. The cloud itself is in sky.js.
// In every shape below, y = 0 is the surface: the sea for the ocean, the top of the cloud for the sky.
import { ROW } from './palette.js';

const PI = Math.PI, TAU = PI * 2;
const N = (row, tone, kind = 0, p = 0) => [ROW[row], tone, kind, p];
const GLOW = (row, tone) => [ROW[row], tone, 2, 0];
const A = (row, tone, alpha) => [ROW[row], tone, 0, alpha];   // for the see-through batch (fb): a flat color with an alpha
export const CLOUD_Y = 0.6;    // the top of the cloud of a sky region, over its tile (in tile units)
export const CLOUD_R = 0.7;   // how far from the middle of the tile the top of the cloud goes

// Kinds of scenery. id: [label, biome, 1 = nature / 0 = buildings]
export const OPEN_STYLES = {
  islets: ['Island chain', 'ocean', 1], rafts: ['Raft village', 'ocean', 1], kelp: ['Kelp forest', 'ocean', 1], stacks: ['Sea stacks', 'ocean', 1], sandbars: ['Sandbars', 'ocean', 1], icefloes: ['Ice floes', 'ocean', 1],
  stilts: ['Stilt houses', 'ocean', 0], houseboats: ['Houseboats', 'ocean', 0], fishers: ['Fishing fleet', 'ocean', 0], piers: ['Pier town', 'ocean', 0], beacons: ['Beacon towers', 'ocean', 0], market: ['Floating market', 'ocean', 0],
  skyrocks: ['Floating rocks', 'sky', 1], skygardens: ['Hanging gardens', 'sky', 1], flocks: ['Bird flocks', 'sky', 1], starlets: ['Star clusters', 'sky', 1],
  cottages: ['Balloon cottages', 'sky', 0], spires: ['Cloud spires', 'sky', 0], windmills: ['Wind mills', 'sky', 0], docks: ['Airship docks', 'sky', 0],
};
// How much room one piece of each kind takes: the radius of its footprint at size 1. region.js uses it to keep the pieces apart.
export const OPEN_RAD = { islets: 0.125, rafts: 0.085, kelp: 0.085, stacks: 0.1, sandbars: 0.13, icefloes: 0.11, stilts: 0.085, houseboats: 0.1, fishers: 0.08, piers: 0.105, beacons: 0.07, market: 0.1,
  skyrocks: 0.1, skygardens: 0.09, flocks: 0.09, starlets: 0.09, skyflowers: 0.09, cottages: 0.075, spires: 0.07, windmills: 0.08, docks: 0.13 };

// ---- Parts that many shapes use. (The y of a ball is its lowest point.)
// A low mound: a ball that is pressed flat. top = the height of its highest point.
const mound = (b, x, z, R, top, col, sx = 1, sy = 0.3, o) => b.ball(R, col, { x, z, y: top - 2 * R * sy, sy, sx, ...o });
// Foam at a waterline: a broken ring of thin, short, pale lines around (x, z), each one along the waterline. It is not one flat shape.
const foam = (b, r, x, z, R, n = 12, sx = 1) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.5, d = R * r.range(0.96, 1.12);
    if (r() < 0.25) continue;
    b.box(r.range(0.012, 0.024), 0.003, 0.006, N(i % 3 ? 'snow' : 'sea', i % 3 ? 0.3 : 1.2), { x: x + Math.cos(a) * d * sx, z: z + Math.sin(a) * d, y: 0.0006, ry: -a + PI / 2 + (r() - 0.5) * 0.3, lod: 1 });
  }
};
// A flat patch with an edge that is not regular: thin slabs in the shape of a plus, each one turned a different way. y = its top. len = how long it is along x (1 = round). t = how much its edge slopes (in steps).
const patch = (b, r, x, z, R, y, col, len = 1, h = 0.003, t = 0) => {
  const n = Math.max(3, Math.round(2 + len * 1.6));
  for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5, q = R * r.range(0.62, 0.8) * (1 - Math.abs(f) * 0.3); b.cyl(q, h, col, { x: x + f * 2 * R * (len - 0.7), z: z + (r() - 0.5) * R * 0.3, y: y - h + i * 0.0004, ry: r() * PI, t }); }
};
// Low ground on a grid of square cells, as the land of the planet: all cells have the same direction, and no two shapes overlap.
// lvl(u, v) gives the level of the cell at (u, v), 0 = nothing. LV[level] = [color, bottom, height]. Cells of one level that are side by side in a row become one long block.
const terrace = (b, n, g, lvl, LV) => {
  for (let j = -n; j <= n; j++) {
    let i0 = -n, cur = 0;
    for (let i = -n; i <= n + 1; i++) { const L = i > n ? 0 : lvl(i * g, j * g); if (L !== cur) { if (cur) { const [col, y0, h] = LV[cur]; b.box((i - i0) * g, h, g, col, { x: ((i0 + i - 1) / 2) * g, z: j * g, y: y0 }); } cur = L; i0 = i; } }
  }
};
// The levels of a beach, from the sea up: 1 pale shallow water (a thin sheet just under the surface), 2 wet sand, 3 dry sand, 4 the pale crest. 
const BEACH = [null, [N('sea', 3.2), -0.007, 0.003], [N('sand', 4.3), -0.012, 0.015], [N('sand', 2.8), -0.012, 0.021], [N('sand', 2), -0.012, 0.026]];
const CREST = 0.014;   // the height of the top of the crest
// An island of sand: its edge is not regular. len = how long it is along x (1 = round). top = its highest level (0 = shallow water only, 1 = wet sand, 3 = all).
const sand = (b, r, x, z, R, len = 1, ry = 0, top = 3) => {
  const g = 0.018, ph = r() * 9, n = Math.ceil((R * len * 1.75) / g);
  b.push(x, 0, z, ry, 1);
  terrace(b, n, g, (u, v) => { const a = Math.atan2(v, u / len), q = Math.hypot(u / len, v) / (R * (1 + 0.16 * Math.sin(a * 3 + ph) + 0.1 * Math.sin(a * 5 + ph * 2))); return Math.min(top + 1, q < 0.36 ? 4 : q < 0.7 ? 3 : q < 1 ? 2 : q < 1.55 ? 1 : 0); }, BEACH);
  b.pop();
};
// A low, flat bar of sand that is only just over the water, on one grid: dry sand in its middle, wet sand at its edge, and then sand that goes on under the water
// in two low steps (darker sand, which the sea makes blue). So it goes into the sea with no pale sheet around it and no block under it. It is flat: it is not a pyramid.
const BAR = [null, [N('sand', 6.6), -0.036, 0.012], [N('sand', 5.4), -0.036, 0.027], [N('sand', 4.2), -0.036, 0.037], [N('sand', 2.6), -0.036, 0.041]], BAR_TOP = 0.005;
const bar = (b, r, x, z, R, len = 1, ry = 0) => {
  const g = 0.014, ph = r() * 9;
  b.push(x, 0, z, ry, 1);
  terrace(b, Math.ceil((R * len * 1.75) / g), g, (u, v) => { const a = Math.atan2(v, u / len), q = Math.hypot(u / len, v) / (R * (1 + 0.14 * Math.sin(a * 3 + ph) + 0.08 * Math.sin(a * 5 + ph * 2))); return q < 0.62 ? 4 : q < 1 ? 3 : q < 1.26 ? 2 : q < 1.6 ? 1 : 0; }, BAR);
  b.pop();
};
// A sea turtle that swims, with its nose at +x. fl = the angle of its front flippers.
const turtle = (db, x, y, z, ry, fl, s = 0.9) => {
  const OL = N('olive', 5.4);
  db.push(x, y, z, ry, s); db.box(0.03, 0.01, 0.024, N('olive', 6.4)); db.box(0.022, 0.006, 0.018, N('olive', 7.6), { y: 0.01 }); db.box(0.01, 0.008, 0.01, OL, { x: 0.02, y: 0.002 });
  for (const sz of [-1, 1]) { db.box(0.012, 0.003, 0.016, OL, { x: 0.01, y: 0.004, z: sz * 0.018, rx: sz * fl, ry: sz * 0.5 }); db.box(0.008, 0.003, 0.008, OL, { x: -0.014, y: 0.004, z: sz * 0.012 }); }
  db.pop();
};
const palm = (b, c, x, z, s, y = 0) => { b.push(x, y, z, 0, s, 0, 0.25); for (let q = 0; q < 4; q++) b.box(0.009, 0.02, 0.009, N('earth', q % 2 ? 6 : 7), { y: q * 0.018 }); for (let q = 0; q < 5; q++) { const a = (q / 5) * TAU; b.box(0.04, 0.004, 0.012, N('grass', q % 2 ? 5 : 6, 11), { x: Math.cos(a) * 0.02, z: Math.sin(a) * 0.02, y: 0.074, ry: -a, rz: -0.45 }); } b.pop(); };
const bird = (b, x, y, z, ry, col, flap = 0.4) => { b.push(x, y, z, ry, 1); b.box(0.022, 0.003, 0.009, col, { x: 0.01, rz: flap }); b.box(0.022, 0.003, 0.009, col, { x: -0.01, rz: -flap }); b.pop(); };
// Water that falls, drawn each frame with the see-through batch: one calm sheet, and many small light streaks that move down with no steps (each one comes and goes slowly).
const fall = (fb, t, x, y0, z, len, w, n = 22) => {
  fb.box(w, len, 0.008, A('sea', 2.6, 0.42), { x, y: y0 - len, z }); fb.box(w * 0.55, len, 0.01, A('sea', 1.6, 0.3), { x, y: y0 - len, z: z + 0.001 });
  for (let i = 0; i < n; i++) { const f = (t * 0.42 + i / n + ((i * 7) % 5) * 0.07) % 1, k = Math.sin(f * PI), sl = len * 0.16; fb.box(w * 0.14, sl, 0.011, A('snow', 0.2, 0.75 * k), { x: x + (((i * 37) % 11) / 11 - 0.5) * w * 0.8, y: y0 - sl - f * (len - sl), z: z + 0.002 }); }
};
const mist = (fb, t, x, y, z, R, n = 6) => { for (let i = 0; i < n; i++) { const f = (t * 0.22 + i / n) % 1, k = Math.sin(f * PI); fb.box(R * (0.5 + f), R * 0.3, R * (0.5 + f), A('snow', 0.2, 0.34 * k), { x: x + Math.sin(i * 2.4) * R * 0.5, y: y + f * R * 0.6, z: z + Math.cos(i * 1.7) * R * 0.5, ry: i }); } };

// A star with six points (a center and six spikes), in a flat bright color.
const star = (b, x, y, z, s, spin, col) => {
  b.push(x, y, z, spin, s, 0.3);
  b.box(0.014, 0.014, 0.014, [ROW.plaster, 0.1, 6, 0], { y: -0.007 });
  b.pyr(0.012, 0.036, 0.012, col, { y: 0.005 }); b.pyr(0.012, 0.036, 0.012, col, { y: -0.005, rx: PI });
  for (const q of [-1, 1]) { b.pyr(0.011, 0.026, 0.011, col, { x: q * 0.005, rz: -q * PI / 2 }); b.pyr(0.011, 0.026, 0.011, col, { z: q * 0.005, rx: q * PI / 2 }); }
  b.pop();
};
// Scenery that moves. region.js calls these each frame, one time for each piece, with the origin at the place of the piece. sd = a number that is different for each piece.
export const OPEN_LIVE = {
  // Five birds in a V. They fly around a long loop, go up and down a little, and move their wings.
  flocks(db, fb, t, sd, c) {
    const dir = sd % 2 ? 1 : -1, u = dir * t * (0.42 + (sd % 5) * 0.05) + sd * 1.7, x = Math.cos(u) * 0.075, z = Math.sin(u) * 0.045, vx = -Math.sin(u) * 0.075 * dir, vz = Math.cos(u) * 0.045 * dir;
    db.push(x, 0.13 + (sd % 4) * 0.03 + Math.sin(t * 0.8 + sd) * 0.014, z, Math.atan2(-vz, vx), 1, 0, 0);
    for (let i = 0; i < 5; i++) { const side = i % 2 ? 1 : -1, q = Math.ceil(i / 2), glide = Math.sin(t * 0.5 + sd + i) > 0.6; bird(db, -q * 0.03, q * 0.004 + Math.sin(t * 2.1 + i * 1.7 + sd) * 0.004, side * q * 0.026, PI / 2, i ? c.W : c.a(0.5), glide ? 0.12 : Math.sin(t * 8.5 + i * 1.3 + sd) * 0.6); }
    db.pop();
  },
  // A group of stars over the cloud: one large star and a few small ones. They turn slowly, go up and down, and get larger and smaller.
  starlets(db, fb, t, sd) {
    const n = 4 + (sd % 2);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + sd, d = i ? 0.035 + ((i * 7 + sd) % 3) * 0.014 : 0, big = i ? 0.5 + ((i + sd) % 3) * 0.12 : 1, tw = 1 + 0.16 * Math.sin(t * 2.6 + i * 2.1 + sd), x = Math.cos(a) * d, z = Math.sin(a) * d, y = (i ? 0.07 + ((i * 5 + sd) % 4) * 0.035 : 0.15) + Math.sin(t * 0.9 + i + sd) * 0.008;
      star(db, x, y, z, big * tw, t * 0.4 + i, [ROW.yellow, i % 3 === 1 ? 1.4 : 2.8, 6, 0]);
    }
  },
};
OPEN_LIVE.skyflowers = OPEN_LIVE.starlets;   // the old name of the star clusters, in regions that were saved before

// Draw one piece of scenery at the origin. The result is how much room it takes (a radius). opt.line = it is one of a row (a sandbar).
export function openScenery(b, style, c, r, opt = {}) {
  const k = r.range(0.85, 1.15);
  switch (style) {
    // ---- the ocean: nature
    case 'islets': {
      sand(b, r, 0, 0, 0.066 * k, r.range(1, 1.4), 0);
      b.box(0.036, 0.005, 0.036, N('grass', 5, 11), { y: CREST }); b.box(0.018, 0.004, 0.018, N('grass', 4.2, 11), { x: 0.009, z: -0.009, y: CREST + 0.005 }); palm(b, c, 0.006, 0, k, CREST + 0.004); if (r() < 0.6) palm(b, c, -0.03, 0.02, k * 0.8, 0.008);
      b.ball(0.012, N('rock', 5), { x: -0.05, z: -0.03, y: -0.004, sy: 0.7 }); foam(b, r, 0, 0, 0.09 * k, 10);
      return 0.12;
    }
    case 'rafts': {
      b.box(0.1, 0.008, 0.08, N('earth', 5.4), { y: 0.004, pat: 3 }); for (const [x, z] of [[-0.04, -0.03], [0.04, -0.03], [-0.04, 0.03], [0.04, 0.03]]) b.cyl(0.012, 0.02, N('earth', 7.4), { x, z, y: -0.012 });
      b.box(0.044, 0.03, 0.04, c.s(0.4), { x: -0.02, y: 0.012 }); b.gable(0.052, 0.022, 0.048, c.a(0.55), { x: -0.02, y: 0.042 }); b.box(0.01, 0.014, 0.002, GLOW('yellow', 2.6), { x: -0.02, y: 0.02, z: 0.021 });
      b.cyl(0.002, 0.07, N('earth', 7.4), { x: 0.034, y: 0.012, z: 0.02 }); b.box(0.022, 0.014, 0.002, c.a(0.6), { x: 0.046, y: 0.066, z: 0.02 });
      b.box(0.012, 0.01, 0.012, N('earth', 6), { x: 0.03, y: 0.012, z: -0.022 }); return 0.085;
    }
    case 'kelp': {
      for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r.range(0, 0.06), x = Math.cos(a) * d, z = Math.sin(a) * d; for (let q = 0; q < 5; q++) b.box(0.008, 0.024, 0.008, N(q % 2 ? 'olive' : 'forest', 6.4 - q * 0.4, 11), { x: x + Math.sin(q * 1.3 + i) * 0.006, z, y: -0.1 + q * 0.022 }); b.box(0.026, 0.003, 0.012, N('olive', 5, 11), { x, z, y: 0.001, ry: a }); }
      b.box(0.004, 0.004, 0.012, N('orange', 5), { x: 0.02, y: -0.03, z: 0.02 }); return 0.085;
    }
    case 'stacks': {
      // Tall rocks in the sea, each made of layers. Under them: a shoal of sand and rubble. Around each one: broken foam.
      patch(b, r, 0, 0, 0.08, -0.06, N('rock', 8.4), 1.1, 0.04, 0.25); patch(b, r, 0, 0, 0.06, -0.026, N('rock', 7.2), 1.1, 0.04, 0.25);   // rock under the water
      const nn = r.int(2, 3);
      for (let i = 0; i < nn; i++) {
        const a = i * 2.2 + r(), d = i ? 0.05 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = r.range(0.08, 0.17) * k, w = r.range(0.03, 0.045), ry = r();
        b.box(w * 1.25, h * 0.4 + 0.06, w * 1.2, N('rock', 5.8 + i * 0.5), { x, z, y: -0.06, ry }); b.box(w, h * 0.4, w * 0.95, N('rock', 5.2 + i * 0.5), { x: x + 0.004, z, y: h * 0.4, ry: ry + 0.3 }); b.box(w * 0.8, h * 0.24, w * 0.75, N('rock', 4.6 + i * 0.5), { x, z: z + 0.003, y: h * 0.8, ry: ry - 0.2, t: 0.2 });
        b.box(w * 0.62, 0.007, w * 0.6, N('grass', 5.4, 11), { x, z, y: h * 1.04, ry: ry - 0.2 }); foam(b, r, x, z, w * 0.95, 7);
      }
      for (let q = 0; q < 4; q++) b.ball(r.range(0.008, 0.016), N('rock', 6 + (q % 2)), { x: Math.cos(q * 1.7) * 0.07, z: Math.sin(q * 1.7) * 0.07, y: -0.008, sy: 0.7 });
      return 0.1;
    }
    case 'sandbars': {
      // One long, low bar of sand along x, only just over the water. Its sand goes on under the water. In a region the bars lie one after the other in lines (see region.js).
      const len = r.range(1.9, 2.5), R = 0.044 * k;
      bar(b, r, 0, 0, R, len, 0);
      for (let q = 0; q < 3; q++) b.box(0.004, r.range(0.008, 0.016), 0.004, N('olive', 4.6, 11), { x: -0.028 + q * 0.02, y: BAR_TOP, z: (q % 2) * 0.008 - 0.004 });   // beach grass
      b.box(0.022, 0.003, 0.004, N('earth', 4.6), { x: 0.036, y: BAR_TOP, z: 0.004, ry: 0.5 }); b.box(0.005, 0.003, 0.005, N('coral', 3), { x: 0.014, y: BAR_TOP, z: -0.01, lod: 1 });   // driftwood, a shell
      for (let q = 0; q < 2; q++) { b.box(0.006, 0.007, 0.009, N('plaster', 0.3), { x: -0.05 - q * 0.014, y: BAR_TOP, z: -0.004 + q * 0.008, ry: q }); b.box(0.003, 0.003, 0.004, N('neutral', 7), { x: -0.05 - q * 0.014, y: BAR_TOP + 0.007, z: -0.004 + q * 0.008, ry: q }); }   // two gulls
      coral(b, r, 2, R * len * 1.32, -0.026, 0, 0.7, 'olive', 4.6); coral(b, r, 1, -R * len * 1.3, -0.026, 0.004, 0.7, 'coral', 4);   // a coral at each end, under the water
      for (let q = 0; q < 6; q++) b.box(r.range(0.014, 0.026), 0.003, 0.005, N('snow', 0.3), { x: -0.08 + q * 0.032 + (r() - 0.5) * 0.01, y: 0.0006, z: R * 1.08 + (r() - 0.5) * 0.006, lod: 1 });   // a thin line of foam on the side that the waves come from
      return opt.line ? 0.07 : 0.13;
    }
    case 'icefloes': {
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + r(), d = i ? r.range(0.04, 0.075) : 0, w = r.range(0.04, 0.075); b.box(w, 0.012, w * r.range(0.7, 1), N('snow', 0.3), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -0.005, ry: r() * 3 }); }
      b.box(0.03, 0.045 * k, 0.026, N('snow', 0.6), { y: 0.004, t: 0.5 }); b.box(0.034, 0.03, 0.03, N('sea', 2), { y: -0.03 }); return 0.11;
    }
    // ---- the ocean: buildings
    case 'stilts': {
      for (const [x, z] of [[-0.03, -0.024], [0.03, -0.024], [-0.03, 0.024], [0.03, 0.024]]) b.cyl(0.004, 0.1, N('earth', 7.6), { x, z, y: -0.06 });
      b.box(0.084, 0.006, 0.07, N('earth', 5.6), { y: 0.036, pat: 3 }); b.box(0.056, 0.034, 0.044, c.s(0.4), { y: 0.042, x: -0.006 }); b.gable(0.066, 0.026, 0.054, c.a(0.55), { y: 0.076, x: -0.006 });
      b.box(0.012, 0.016, 0.002, GLOW('yellow', 2.6), { x: -0.006, y: 0.052, z: 0.023 }); b.box(0.004, 0.05, 0.012, N('earth', 6.6), { x: 0.036, y: -0.008, z: 0.02, rz: 0.2 }); return 0.085;
    }
    case 'houseboats': {
      b.box(0.11, 0.022, 0.05, N('earth', 7.6), { y: -0.01 }); b.box(0.03, 0.02, 0.04, N('earth', 7.6), { x: 0.066, y: -0.008, t: 0.5 }); b.box(0.116, 0.004, 0.056, c.a(0.6), { y: 0.012 });
      b.box(0.064, 0.03, 0.04, c.W, { x: -0.014, y: 0.016 }); b.box(0.072, 0.005, 0.046, c.s(0.5), { x: -0.014, y: 0.046 }); for (const x of [-0.03, 0.002]) b.box(0.014, 0.012, 0.002, GLOW('yellow', 2.6), { x, y: 0.026, z: 0.021 });
      b.cyl(0.004, 0.022, N('neutral', 7), { x: -0.03, y: 0.05 }); b.cyl(0.009, 0.004, N('red', 5), { x: 0.036, y: 0.02, z: 0.027, rx: PI / 2 }); return 0.1;
    }
    case 'fishers': {
      b.box(0.08, 0.016, 0.034, c.a(0.6), { y: -0.006 }); b.box(0.02, 0.014, 0.026, c.a(0.6), { x: 0.046, y: -0.004, t: 0.5 }); b.box(0.084, 0.003, 0.038, c.W, { y: 0.01 });
      b.box(0.022, 0.02, 0.022, c.W, { x: -0.022, y: 0.012 }); b.cyl(0.002, 0.07, N('earth', 7.4), { x: 0.008, y: 0.012 }); b.box(0.05, 0.002, 0.002, N('earth', 7.4), { x: 0.03, y: 0.06, rz: -0.5 });
      b.box(0.016, 0.01, 0.016, N('earth', 6), { x: 0.026, y: 0.012 }); b.box(0.01, 0.004, 0.006, N('sea', 3), { x: 0.026, y: 0.022 }); b.ball(0.004, GLOW('yellow', 2.6), { x: 0.008, y: 0.084 }); return 0.08;
    }
    case 'piers': {
      const ry = r.int(0, 3) * PI / 2;
      b.push(0, 0, 0, ry, 1);
      b.box(0.15, 0.006, 0.026, N('earth', 5.6), { y: 0.016, pat: 3 }); b.box(0.026, 0.006, 0.09, N('earth', 5.6), { x: 0.05, y: 0.016, z: 0.03, pat: 3 });
      for (const [x, z] of [[-0.06, 0], [-0.02, 0], [0.02, 0], [0.06, 0], [0.05, 0.06]]) for (const sd of [-1, 1]) b.cyl(0.003, 0.07, N('earth', 7.6), { x: x + (z ? sd * 0.01 : 0), z: z + (z ? 0 : sd * 0.01), y: -0.05 });
      b.box(0.034, 0.028, 0.026, c.s(0.4), { x: -0.05, y: 0.022 }); b.gable(0.04, 0.018, 0.032, c.a(0.55), { x: -0.05, y: 0.05 });
      b.cyl(0.002, 0.04, c.K, { x: 0.05, y: 0.022, z: 0.068 }); b.ball(0.007, GLOW('yellow', 2.6), { x: 0.05, y: 0.062, z: 0.068 }); b.box(0.02, 0.008, 0.012, c.a(0.6), { x: 0.02, y: -0.002, z: 0.03 });
      b.pop(); return 0.105;
    }
    case 'beacons': {
      mound(b, 0, 0, 0.045, 0.012, N('rock', 5.6), 1, 0.4); foam(b, r, 0, 0, 0.042, 8);
      b.cyl(0.018, 0.09 * k, c.W, { y: 0.008, t: 0.35 }); b.cyl(0.0165, 0.014, c.a(0.55), { y: 0.038 * k }); b.cyl(0.014, 0.012, c.a(0.55), { y: 0.074 * k });
      b.cyl(0.016, 0.004, c.K, { y: 0.098 * k }); b.cyl(0.009, 0.014, GLOW('yellow', 2.4), { y: 0.102 * k }); b.cone(0.014, 0.014, c.a(0.6), { y: 0.116 * k }); return 0.07;
    }
    case 'market': {
      for (const [x, z, ry, q] of [[-0.03, -0.02, 0.3, 0], [0.034, 0.024, -0.5, 1]]) {
        b.push(x, 0, z, ry, 1); b.box(0.07, 0.014, 0.026, N('earth', 6.6), { y: -0.006 }); b.box(0.016, 0.012, 0.02, N('earth', 6.6), { x: 0.04, y: -0.004, t: 0.5 });
        for (const sx of [-1, 1]) b.cyl(0.0015, 0.034, N('earth', 7.6), { x: sx * 0.024, y: 0.008 }); b.box(0.06, 0.004, 0.032, q ? c.a(0.5) : c.s(0.5), { y: 0.042 }); b.box(0.02, 0.0045, 0.032, c.W, { y: 0.042 });
        for (let i = 0; i < 4; i++) b.ball(0.006, N(['red', 'orange', 'yellow', 'green'][(i + q) % 4], 4.6), { x: -0.02 + i * 0.012, y: 0.012, lod: 1 }); b.pop();
      }
      return 0.1;
    }
    // ---- the sky: nature
    case 'skyrocks': {
      const nn = r.int(2, 3);
      for (let i = 0; i < nn; i++) { const a = i * 2.3 + r(), d = i ? 0.06 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, s = (i ? r.range(0.5, 0.8) : 1) * k, y = 0.04 + i * 0.035 + r() * 0.03; b.cone(0.036 * s, 0.06 * s, N('rock', 5.4), { x, z, y: y + 0.004, rx: PI }); b.cyl(0.036 * s, 0.012 * s, N('rock', 4.4), { x, z, y }); b.cyl(0.034 * s, 0.006, N('grass', 4.6, 11), { x, z, y: y + 0.012 * s }); if (!i) { b.cyl(0.004, 0.024, N('earth', 7), { x, z, y: y + 0.016 }); b.ball(0.018, N('grass', 5.6, 11), { x, z, y: y + 0.036 }); } }
      return 0.1;
    }
    case 'skygardens': {
      mound(b, 0, 0, 0.06, 0.012, N('grass', 4.4, 11), 1, 0.25);
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(), x = Math.cos(a) * 0.03, z = Math.sin(a) * 0.03, s = r.range(0.8, 1.2) * k; b.cyl(0.005 * s, 0.05 * s, N('plaster', 0.8), { x, z }); b.ball(0.028 * s, N('grass', 3.8, 11), { x, z, y: 0.05 * s }); for (let q = 0; q < 3; q++) b.box(0.003, 0.03 * s, 0.003, N('grass', 5.4, 11), { x: x + Math.cos(q * 2.1) * 0.022 * s, z: z + Math.sin(q * 2.1) * 0.022 * s, y: 0.024 * s, lod: 1 }); }
      for (let q = 0; q < 5; q++) b.ball(0.006, q % 2 ? c.a(0.4) : N('pink', 2.6), { x: Math.cos(q * 1.3) * 0.05, z: Math.sin(q * 1.3) * 0.05, y: 0.008, lod: 1 });
      return 0.09;
    }
    case 'flocks': case 'skyflowers': case 'starlets': return OPEN_RAD[style];   // these move: OPEN_LIVE draws them each frame
    // ---- the sky: buildings
    case 'cottages': {
      b.box(0.05, 0.034, 0.044, c.s(0.4)); b.gable(0.06, 0.026, 0.054, c.a(0.55), { y: 0.034 }); b.box(0.012, 0.02, 0.002, c.K, { y: 0.0, z: 0.023 }); b.box(0.012, 0.012, 0.002, GLOW('yellow', 2.6), { x: 0.014, y: 0.014, z: 0.023 });
      b.cyl(0.001, 0.07, c.K, { x: -0.014, y: 0.05 }); b.ball(0.024 * k, r() < 0.5 ? c.a(0.45) : N('red', 4.6), { x: -0.014, y: 0.116, sy: 1.15 }); b.cone(0.006, 0.008, c.K, { x: -0.014, y: 0.106, rx: PI }); return 0.075;
    }
    case 'spires': {
      const h = r.range(0.12, 0.2) * k;
      b.cyl(0.024, 0.01, c.p ? c.p(0.8) : N('plaster', 1)); b.cyl(0.016, h, c.W, { y: 0.01, t: 0.2 }); b.cyl(0.02, 0.008, c.W, { y: h }); b.cone(0.022, 0.05, c.a(0.55), { y: h + 0.008 });
      b.box(0.006, 0.012, 0.002, GLOW('yellow', 2.6), { y: h * 0.6, z: 0.014 }); b.box(0.006, 0.012, 0.002, GLOW('yellow', 2.6), { y: h * 0.3, z: 0.016 }); b.cyl(0.001, 0.02, c.K, { y: h + 0.056 }); b.box(0.012, 0.007, 0.001, c.s(0.5), { x: 0.006, y: h + 0.07 }); return 0.07;
    }
    case 'windmills': {
      b.cyl(0.02, 0.07 * k, c.W, { t: 0.4 }); b.cone(0.016, 0.02, c.a(0.55), { y: 0.07 * k }); b.box(0.008, 0.016, 0.002, c.K, { z: 0.02 });
      b.push(0, 0.062 * k, 0.018, 0, 1, 0, r() * PI); for (let q = 0; q < 4; q++) b.box(0.012, 0.05, 0.002, q % 2 ? c.s(0.5) : c.W, { rz: q * PI / 2 }); b.cyl(0.005, 0.006, c.K, { rx: PI / 2 }); b.pop(); return 0.08;
    }
    case 'docks': {
      b.cyl(0.03, 0.008, N('earth', 5.6)); b.cyl(0.004, 0.11, N('neutral', 6), { y: 0.008 }); b.box(0.03, 0.004, 0.012, N('earth', 5.6), { x: 0.018, y: 0.07 }); b.ball(0.005, GLOW('yellow', 2.6), { y: 0.122 });
      b.ball(0.03 * k, c.a(0.5), { x: 0.07, y: 0.11, sx: 1.9, sy: 0.9 }); b.box(0.024, 0.008, 0.012, N('earth', 6.6), { x: 0.07, y: 0.076 }); b.box(0.014, 0.016, 0.002, c.s(0.5), { x: 0.022, y: 0.114 }); b.cyl(0.0008, 0.05, c.K, { x: 0.03, y: 0.1, rz: -1.2 }); return 0.13;
    }
  }
  return 0.08;
}

// ---- Landmarks. The same form as in heroes.js. open = the biome that has it. ctx.r = random numbers for this landmark.
// clouds (sky only): parts of the landmark that are made of cloud, [x, z, radius, bottom, top] with y = 0 at the top of the cloud of the region. sky.js draws them with that cloud.
// A whale, with its nose at +z. pitch < 0: the nose is up. tail: the angle of the tail (it goes up and down). bend: the body bends when the whale turns.
const whale = (b, x, y, z, ry, pitch, s, tail, bend) => {
  const SK = N('sea', 8.6), DK = N('sea', 9.2), BL = N('snow', 1.8);
  b.push(x, y, z, ry, s, pitch);
  b.box(0.066, 0.05, 0.11, SK, { y: -0.03 }); b.box(0.058, 0.012, 0.1, BL, { y: -0.034 }); b.box(0.046, 0.008, 0.08, DK, { y: 0.019, z: -0.004 });   // the body, its pale belly, its back
  b.box(0.01, 0.012, 0.022, DK, { y: 0.026, z: -0.036, tz: 0.6 });                                                                                 // the small fin on its back
  for (const sx of [-1, 1]) b.box(0.042, 0.006, 0.02, SK, { x: sx * 0.05, y: -0.026, z: 0.024, rz: -sx * 0.45, ry: sx * 0.35 });                     // the side fins
  b.push(0, 0, 0.05, bend * 0.5);                                                                                                                  // the head turns into the bend
  b.box(0.06, 0.044, 0.07, SK, { y: -0.028, z: 0.034 }); b.box(0.048, 0.032, 0.03, SK, { y: -0.024, z: 0.08 }); b.box(0.05, 0.01, 0.094, BL, { y: -0.032, z: 0.044 });
  for (const sx of [-1, 1]) b.box(0.003, 0.004, 0.004, N('neutral', 10), { x: sx * 0.03, y: -0.008, z: 0.05 });
  for (let q = 0; q < 3; q++) b.box(0.036, 0.002, 0.003, N('snow', 3), { y: -0.0325, z: 0.05 + q * 0.014 });                                          // the lines under its mouth
  b.pop();
  b.push(0, -0.004, -0.052, -bend, 1, tail * 0.5); b.box(0.046, 0.036, 0.062, SK, { y: -0.02, z: -0.03 });                                             // the tail, in two parts that bend
  b.push(0, 0, -0.058, -bend, 1, tail); b.box(0.03, 0.022, 0.05, SK, { y: -0.012, z: -0.024 });
  for (const sx of [-1, 1]) b.box(0.052, 0.007, 0.03, DK, { x: sx * 0.03, y: -0.004, z: -0.058, ry: sx * 0.35 });                                    // the flukes
  b.pop(); b.pop(); b.pop();
};
// The colors of coral: more of the natural colors, and a few bright ones.
const CORAL = [['coral', 4], ['sand', 5.2], ['pink', 3.4], ['olive', 4.6], ['orange', 4.4], ['amethyst', 4.4], ['yellow', 4], ['earth', 4.6], ['purple', 5], ['red', 5.2]];
// One coral, with its base at y. g = its size.
const coral = (b, r, kind, x, y, z, g, row, tone) => {
  const col = N(row, tone), dk = N(row, Math.min(9.5, tone + 1.3)), lt = N(row, Math.max(0.6, tone - 1.3));
  if (kind === 0) {   // staghorn: a group of thin branches
    for (let q = 0; q < 5; q++) { const a = q * 1.26 + r(), d = q ? 0.011 * g : 0, h = r.range(0.022, 0.044) * g, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d; b.box(0.005 * g, h, 0.005 * g, q % 2 ? col : lt, { x: cx, z: cz, y, rz: -Math.cos(a) * 0.3, rx: Math.sin(a) * 0.3 }); if (q % 2) b.box(0.014 * g, 0.004 * g, 0.004 * g, lt, { x: x + Math.cos(a) * d * 1.9, z: z + Math.sin(a) * d * 1.9, y: y + h * 0.66, ry: -a }); }
  } else if (kind === 1) {   // table coral: flat plates on short stems
    b.cyl(0.005 * g, 0.014 * g, dk, { x, z, y }); b.cyl(0.022 * g, 0.004 * g, col, { x, z, y: y + 0.014 * g, ry: r() });
    if (g > 1.2) { b.cyl(0.004 * g, 0.012 * g, dk, { x: x + 0.008 * g, z, y: y + 0.018 * g }); b.cyl(0.015 * g, 0.004 * g, lt, { x: x + 0.008 * g, z: z + 0.004, y: y + 0.03 * g, ry: r() }); }
  } else if (kind === 2) {   // brain coral: a round head, with a groove
    const q = 0.017 * g; b.ball(q, col, { x, z, y: y - q * 0.3, sy: 0.8 }); b.box(q * 1.1, 0.003, 0.004, dk, { x, z, y: y + q * 1.29, ry: r() * PI });
  } else if (kind === 3) {   // a sea fan
    const h = r.range(0.03, 0.05) * g, ry = r() * PI; b.box(0.004, h * 0.4, 0.004, dk, { x, z, y }); b.box(0.034 * g, h * 0.5, 0.003, col, { x, z, y: y + h * 0.35, ry }); b.box(0.022 * g, h * 0.3, 0.003, lt, { x, z, y: y + h * 0.82, ry });
  } else if (kind === 4) {   // tube sponges
    for (let q = 0; q < 3; q++) { const h = r.range(0.02, 0.04) * g, cx = x + (q - 1) * 0.011 * g, cz = z + (q % 2) * 0.008 * g; b.cyl(0.006 * g, h, col, { x: cx, z: cz, y }); b.cyl(0.0035 * g, 0.002, N('neutral', 9.4), { x: cx, z: cz, y: y + h }); }
  } else {   // soft coral: a low tuft
    for (let q = 0; q < 4; q++) b.box(0.004 * g, r.range(0.01, 0.02) * g, 0.004 * g, q % 2 ? col : lt, { x: x + Math.cos(q * 1.6) * 0.006 * g, z: z + Math.sin(q * 1.6) * 0.006 * g, y });
  }
};
// The atoll: a ring of coral reef. N parts around a circle; part GAP is the opening to the sea; the parts in CAYS have a small island of sand.
const ATOLL = { N: 12, R: 0.21, GAP: 3, CAYS: [0, 5, 7, 10] };
const atollAt = (i) => { const a = (i / ATOLL.N) * TAU; return [Math.cos(a) * ATOLL.R, Math.sin(a) * ATOLL.R, -a - PI / 2, 0.058 * (0.9 + 0.25 * ((i * 5) % 4) / 3)]; };   // x, z, turn (the part is long along the ring), size
const REEF = [[-0.075, 0.015, 0.17, 0.3, 1.25], [0.1, -0.05, 0.125, 1.4, 1.1], [0.04, 0.115, 0.1, 2.3, 1]];   // the three parts of the coral reef: x, z, size, turn, how long
const CASTLE = [[-0.14, 0.1, 0.34, 0.052], [0.14, 0.1, 0.34, 0.052], [-0.14, -0.1, 0.42, 0.052], [0.14, -0.1, 0.42, 0.052], [0, -0.02, 0.56, 0.07]];   // the towers of the sky castle: x, z, top, radius of the roof
export const OPEN_HEROES = {
  // ---- the ocean: nature
  reef: { label: 'Coral reef', r: 0.27, h: 0.1, nature: true, open: 'ocean',
    // A reef that stands in the sea. It has three parts of different size, as a real reef has. Each part comes up from the deep in steps:
    // dark rock far down, paler rock, then sand near the surface. Each kind of coral has its depth: thin branches on the top, tables and round heads on the slope,
    // fans and sponges far down. Corals of one kind and color grow in groups. Around the reef: single coral heads on rock, sea grass, clams, starfish.
    // The sea breaks on one side of the reef only (the side that the waves come from). Fish, a turtle, and a ray move there (see anim).
    build(b, c, ctx) {
      const r = ctx.r, STEP = [[1, -0.13, N('sea', 8.8)], [0.9, -0.092, N('rock', 7.4)], [0.8, -0.06, N('rock', 6)], [0.7, -0.034, N('sea', 2.4)]];   // the top step is the reef flat: pale sand under a little water
      const topAt = (f) => { for (let i = STEP.length - 1; i >= 0; i--) if (f < STEP[i][0] * 0.74) return STEP[i][1]; return null; };
      REEF.forEach(([lx, lz, R, turn, len], li) => {
        b.push(lx, 0, lz, turn, 1);
        for (const [f, top, col] of STEP) patch(b, r, 0, 0, R * f, top, col, len, 0.04, 0.25);
        for (let i = 0; i < 3; i++) b.cyl(R * r.range(0.1, 0.18), 0.003, N('sand', 3), { x: Math.cos(i * 2.2 + li) * R * 0.3 * len, z: Math.sin(i * 2.2 + li) * R * 0.25, y: -0.0345, ry: r() * PI });   // sand on the flat
        const nC = Math.round(34 * R / 0.17);
        for (let i = 0; i < nC; i++) {
          const f = 0.06 + 0.67 * Math.sqrt((i + 0.5) / nC), a = i * 2.4 + r(), x = Math.cos(a) * R * f * len * 0.85, z = Math.sin(a) * R * f, y = topAt(f); if (y == null) continue;
          const flat = y > -0.04, zone = f < 0.36 ? [0, 2, 5, 1, 0, 5] : flat ? [1, 2, 0, 1] : [3, 4, 2, 3, 1], [row, tone] = CORAL[(li * 3 + Math.floor(i / 3)) % CORAL.length];
          coral(b, r, zone[i % zone.length], x, y - 0.002, z, flat ? r.range(0.7, 0.9) : 1.3 + (f - 0.5) * 2, row, tone + (r() - 0.5) * 0.8);
        }
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + li, x = Math.cos(a) * R * 0.34 * len, z = Math.sin(a) * R * 0.34; if (i === 0) { b.box(0.016, 0.007, 0.012, N('amethyst', 6.4), { x, z, y: -0.034, ry: a }); b.box(0.013, 0.003, 0.004, N('blue', 4), { x, z, y: -0.027, ry: a }); } else b.cyl(0.007, 0.003, N(i % 2 ? 'orange' : 'red', 5), { x, z, y: -0.034, ry: a }); }   // a clam, and starfish, on the sand
        b.pop();
      });
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.2, d = 0.21 + (i % 2) * 0.03, x = Math.cos(a) * d, z = Math.sin(a) * d, top = -0.05 - (i % 3) * 0.02, [row, tone] = CORAL[(i * 3 + 1) % CORAL.length]; b.cyl(0.018, 0.1, N('rock', 7.2), { x, z, y: top - 0.1, t: 0.3, ry: i }); coral(b, r, 2, x, top, z, 1.5, row, tone); coral(b, r, i % 2 ? 3 : 4, x + 0.014, top - 0.03, z + 0.006, 1.3, 'purple', 5); }   // single coral heads, each on a rock
      for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.5, d = 0.235; b.box(0.006, r.range(0.03, 0.07), 0.006, N(i % 2 ? 'olive' : 'forest', 6.2, 11), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -0.15, lod: 1 }); }   // sea grass in the deep water
      { const [lx, lz, R, turn] = REEF[0]; for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) { if (k && i % 2) continue; const a = 2.0 + i * 0.26 + r() * 0.1, d = R * (0.66 + k * 0.16) * (1 + 0.06 * Math.sin(i * 2)); b.push(lx, 0, lz, turn, 1); b.box(r.range(0.014, 0.03), 0.003, 0.007, N('snow', k ? 1 : 0.3), { x: Math.cos(a) * d * 1.2, z: Math.sin(a) * d, y: 0.0006, ry: -a + PI / 2, lod: k }); b.pop(); } }   // the sea breaks on one side of the reef
    },
    anim(db, fb, t) {
      const FC = ['orange', 'yellow', 'sea', 'pink'];
      REEF.forEach(([cx, cz, R], q) => {   // a group of small fish goes around each part of the reef
        const dir = q % 2 ? 1 : -1;
        for (let i = 0; i < 6; i++) { const u = dir * (t * (0.32 + q * 0.06) - i * 0.16) + q * 2 + Math.sin(t * 0.7 + i) * 0.08, rad = R * 0.62 * (1 + 0.18 * Math.sin(u * 3 + i)); db.push(cx + Math.cos(u) * rad * 1.15, -0.03 - 0.012 * Math.sin(u * 2 + i * 0.5) - (i % 2) * 0.006, cz + Math.sin(u) * rad, -u - dir * PI / 2 + Math.sin(t * 6 + i) * 0.2, 1); db.box(0.012, 0.007, 0.004, N(FC[(q + (i % 2)) % 4], q === 2 ? 2 : 4)); db.box(0.005, 0.008, 0.003, N('snow', 0.6), { x: -0.008 }); db.pop(); }
      });
      { const u = t * 0.12; turtle(db, Math.cos(u) * 0.19, -0.026 + Math.sin(t * 0.5) * 0.008, Math.sin(u * 1.3) * 0.15, Math.atan2(-Math.cos(u * 1.3) * 1.03, -Math.sin(u)), Math.sin(t * 2.2) * 0.5); }   // a sea turtle
      { const u = -t * 0.09 + 2, x = Math.cos(u) * 0.14 + 0.02, z = Math.sin(u) * 0.2, fl = Math.sin(t * 1.6) * 0.3, GR = N('neutral', 7.6);   // a ray, far down
        db.push(x, -0.075, z, -u + PI / 2, 1); db.box(0.022, 0.005, 0.03, GR); for (const sz of [-1, 1]) db.box(0.018, 0.003, 0.02, GR, { z: sz * 0.022, y: 0.002, rx: sz * fl }); db.box(0.03, 0.002, 0.003, GR, { x: -0.024, y: 0.002 }); db.pop(); }
    } },
  whalepod: { label: 'Whale pack', r: 0.26, h: 0.14, nature: true, open: 'ocean',
    // Three whales and a calf that travel together. They are not on a circle: the first whale goes along a slow path that bends and does not repeat soon, and the others
    // follow it, each a little behind and to one side. Each whale comes up to breathe in its own time: its nose comes up first, its back makes an arc, and it goes down again.
    // Its tail goes up and down, and its body bends when it turns. A small school of fish stays under them.
    build(b, c, ctx) { const r = ctx.r; for (let i = 0; i < 14; i++) { const a = r() * TAU, d = r.range(0.02, 0.1); b.box(0.008, 0.004, 0.003, N('sea', 2), { x: Math.cos(a) * d, y: -0.07 - r() * 0.03, z: Math.sin(a) * d, ry: 0.4 + r() * 0.4 }); } },
    anim(db, fb, t) {
      const path = (u) => [0.1 * Math.cos(u) + 0.036 * Math.cos(2.3 * u + 1), 0.085 * Math.sin(u) + 0.036 * Math.sin(1.7 * u + 2)];
      const POD = [[0, 0, 0.6, 0], [0.35, -0.045, 0.3, 0.07], [0.95, 0.07, 0.5, 0.42], [1.5, -0.07, 0.54, 0.71]];   // each whale: how far behind the first one, how far to the side, its size, when it comes up
      for (const [lag, side, s, ph] of POD) {
        const u = t * 0.13 - lag + Math.sin(t * 0.07 + lag * 3) * 0.2, [x0, z0] = path(u), [x1, z1] = path(u + 0.08), [x2, z2] = path(u - 0.08);
        const hx = x1 - x0, hz = z1 - z0, hl = Math.hypot(hx, hz) || 1, head = Math.atan2(hx, hz);
        let bend = head - Math.atan2(x0 - x2, z0 - z2); bend = Math.max(-0.45, Math.min(0.45, Math.atan2(Math.sin(bend), Math.cos(bend)) * 2.2));
        const cyc = (t * 0.085 + ph) % 1, on = cyc < 0.42, k = on ? cyc / 0.42 : 0, up = on ? Math.sin(k * PI) : 0, roll = on ? Math.cos(k * PI) : 0;
        const x = x0 - (hz / hl) * side, z = z0 + (hx / hl) * side, y = -0.05 * s - 0.012 + up * (0.05 * s + 0.014) + Math.sin(t * 0.9 + lag * 2) * 0.003;
        whale(db, x, y, z, head, -roll * 0.32, s, Math.sin(t * 1.5 + lag * 2.4) * 0.28 - roll * 0.3, bend);
        if (on && k > 0.22 && k < 0.5) { const q = Math.sin(((k - 0.22) / 0.28) * PI), bx = x + (hx / hl) * 0.06 * s, bz = z + (hz / hl) * 0.06 * s; for (let i = 0; i < 6; i++) { const f = (i + ((t * 2.2) % 1)) / 6; fb.box(0.008 + f * 0.03 * s, 0.014, 0.008 + f * 0.03 * s, A('snow', 0.2, 0.55 * q * (1 - f)), { x: bx, y: y + 0.03 * s + f * 0.09 * s, z: bz, ry: i }); } }   // its breath
        if (up > 0.35) for (let i = 0; i < 8; i++) { const a = i * 0.785 + lag, d = (0.05 + 0.03 * ((t * 0.6 + i * 0.37) % 1)) * s * 1.6; fb.box(0.022 * s, 0.002, 0.008 * s, A('snow', 0.2, 0.6 * (up - 0.35) * (1 - ((t * 0.6 + i * 0.37) % 1))), { x: x + Math.cos(a) * d * 0.7, y: 0.002, z: z + Math.sin(a) * d, ry: -a + PI / 2 }); }   // the water moves where its back comes out
      }
    } },
  atoll: { label: 'Atoll', r: 0.3, h: 0.16, nature: true, open: 'ocean',
    // An atoll: a ring of coral reef around a lagoon, made as the coral reef is. Each part of the ring comes up from the deep in steps: dark rock, paler rock, then the pale reef flat
    // under a little water, with coral on each step. The parts join, so the ring is whole, but for one opening to the sea. The lagoon is shallow and pale, with coral heads in it.
    // Three parts of the ring have a small, flat island of sand with palms. The sea breaks on the outer side, where the waves come from. Wildlife moves there (see anim).
    build(b, c, ctx) {
      const r = ctx.r, STEP = [[1, -0.13, N('sea', 8.8)], [0.88, -0.092, N('rock', 7.4)], [0.76, -0.06, N('rock', 6)], [0.64, -0.034, N('sea', 2.4)]];
      const topAt = (f) => { for (let i = STEP.length - 1; i >= 0; i--) if (f < STEP[i][0] * 0.74) return STEP[i][1]; return null; };
      patch(b, r, 0, 0, 0.185, -0.04, N('sea', 1.6), 1, 0.03, 0.2); patch(b, r, 0.01, -0.01, 0.09, -0.0395, N('sea', 2.6), 1, 0.003);                 // the floor of the lagoon: shallow and very pale, a little darker in the middle
      for (let i = 0; i < 9; i++) { const a = i * 0.8 + 0.4, d = 0.03 + (i % 3) * 0.04, [row, tone] = CORAL[(i * 3) % CORAL.length]; coral(b, r, [2, 1, 2, 4, 5, 2, 1, 2, 5][i], Math.cos(a) * d, -0.042, Math.sin(a) * d, 0.8 + (i % 2) * 0.2, row, tone); }   // coral heads in the lagoon
      for (let i = 0; i < ATOLL.N; i++) {
        const [x, z, turn, R] = atollAt(i), len = 1.35;
        b.push(x, 0, z, turn, 1);
        if (i === ATOLL.GAP) { patch(b, r, 0, 0, R * 0.9, -0.085, N('rock', 7.4), len, 0.04, 0.25); coral(b, r, 3, 0.02, -0.087, 0, 1.4, 'purple', 5); coral(b, r, 4, -0.03, -0.087, 0.01, 1.3, 'yellow', 4); b.pop(); continue; }   // the opening: the ring is low here
        for (const [f, top, col] of STEP) patch(b, r, 0, 0, R * f, top, col, len, 0.04, 0.25);
        const cay = ATOLL.CAYS.includes(i);
        for (let j = 0; j < 10; j++) {
          const f = 0.1 + 0.63 * Math.sqrt((j + 0.5) / 10), a = j * 2.4 + r(), cx = Math.cos(a) * R * f * len * 0.85, cz = Math.sin(a) * R * f, y = topAt(f); if (y == null || (cay && f < 0.52)) continue;
          const flat = y > -0.04, [row, tone] = CORAL[(i * 3 + Math.floor(j / 3)) % CORAL.length];
          coral(b, r, (flat ? [0, 2, 5, 1, 0, 1] : [3, 4, 2, 3, 1])[j % (flat ? 6 : 5)], cx, y - 0.002, cz, flat ? r.range(0.7, 0.9) : 1.3 + (f - 0.5) * 2, row, tone + (r() - 0.5) * 0.8);
        }
        if (cay) {   // a small, flat island of sand on the reef flat
          bar(b, r, 0, 0, R * 0.42, 1.35, 0);
          b.box(0.026, 0.004, 0.02, N('grass', 5, 11), { y: BAR_TOP }); palm(b, c, 0.004, 0, r.range(0.9, 1.15), BAR_TOP + 0.003); if (R > 0.06) palm(b, c, -0.016, 0.006, 0.7, BAR_TOP + 0.003);
          b.box(0.01, 0.007, 0.01, N('forest', 6, 11), { x: 0.016, y: BAR_TOP + 0.004, z: -0.004 }); b.box(0.018, 0.003, 0.004, N('earth', 4.6), { x: -0.006, y: BAR_TOP, z: 0.012, ry: 0.6 });
        }
        if (i >= 6 && i <= 10) for (let q = 0; q < 3; q++) b.box(r.range(0.014, 0.026), 0.003, 0.005, N('snow', q ? 0.3 : 1), { x: (q - 1) * 0.034 + (r() - 0.5) * 0.01, y: 0.0006, z: -R * (0.66 + (q % 2) * 0.1), lod: q % 2 });   // the sea breaks on the outer side
        b.pop();
      }
    },
    // Small fish go around the ring, outside it and in the lagoon. A turtle swims in the lagoon. Sea birds fly over the ring. A crab goes from side to side on each island of sand.
    anim(db, fb, t) {
      const FC = ['orange', 'yellow', 'sea', 'pink'];
      for (let q = 0; q < 2; q++) { const dir = q ? 1 : -1, R = q ? 0.275 : 0.11; for (let i = 0; i < 7; i++) { const u = dir * (t * (0.2 + q * 0.12) - i * (q ? 0.07 : 0.16)) + q * 2 + Math.sin(t * 0.7 + i) * 0.05, rad = R * (1 + 0.06 * Math.sin(u * 5 + i)); db.push(Math.cos(u) * rad, -0.03 - 0.01 * Math.sin(u * 2 + i * 0.5) - (i % 2) * 0.006, Math.sin(u) * rad, -u - dir * PI / 2 + Math.sin(t * 6 + i) * 0.2, 1); db.box(0.012, 0.007, 0.004, N(FC[(q * 2 + (i % 2)) % 4], q ? 2 : 4)); db.box(0.005, 0.008, 0.003, N('snow', 0.6), { x: -0.008 }); db.pop(); } }
      { const u = t * 0.2; turtle(db, Math.cos(u) * 0.07, -0.02 + Math.sin(t * 0.5) * 0.005, Math.sin(u) * 0.055, Math.atan2(-Math.cos(u) * 0.055, -Math.sin(u) * 0.07), Math.sin(t * 2.2) * 0.5, 0.8); }
      for (let i = 0; i < 4; i++) { const dir = i % 2 ? 1 : -1, u = dir * t * (0.3 + i * 0.05) + i * 1.7, R = 0.12 + i * 0.035; bird(db, Math.cos(u) * R, 0.13 + i * 0.03 + Math.sin(t * 0.7 + i) * 0.015, Math.sin(u) * R * 0.8, Math.atan2(-Math.sin(u) * dir, Math.cos(u) * 0.8 * dir), N('plaster', 0.3), Math.sin(t * 0.4 + i * 2) > 0.5 ? 0.1 : Math.sin(t * 7 + i) * 0.55); }
      ATOLL.CAYS.forEach((ci, i) => { const [x, z, turn] = atollAt(ci), s = Math.sin(t * 0.6 + i * 2) * 0.022; db.push(x, BAR_TOP + Math.abs(Math.sin(t * 9 + i)) * 0.002, z, turn, 1); db.box(0.01, 0.005, 0.007, N('red', 5), { x: s, z: 0.014, y: 0.001 }); for (const sx of [-1, 1]) db.box(0.004, 0.004, 0.003, N('red', 4), { x: s + sx * 0.007, y: 0.003, z: 0.018 }); db.pop(); });
    } },
  seaarch: { label: 'Sea arch', r: 0.28, h: 0.4, nature: true, open: 'ocean',
    // Two pillars of layered rock and a bridge of rock between them. Bands of lighter and darker rock, ledges, grass and bushes on top, plants that hang, a small stack beside it, rubble and foam at the feet.
    build(b, c, ctx) {
      const r = ctx.r, band = (i) => N('rock', 4.4 + ((i * 7) % 5) * 0.5);
      for (const [px, w, hN] of [[-0.14, 0.1, 9], [0.14, 0.085, 8]]) {
        for (let i = 0; i < hN; i++) { const y = -0.06 + i * 0.034, s = 1 - i * 0.03 + (i % 2) * 0.05; b.box(w * s, 0.036, 0.11 * s, band(i + (px > 0 ? 2 : 0)), { x: px + Math.sin(i * 1.9) * 0.006 + (i > hN - 4 ? (px > 0 ? -1 : 1) * (i - hN + 4) * 0.014 : 0), y, z: Math.cos(i * 2.3) * 0.005, ry: Math.sin(i) * 0.08 }); }
        foam(b, r, px, 0, 0.075, 9); for (let q = 0; q < 3; q++) b.ball(r.range(0.012, 0.022), N('rock', 6 + q * 0.4), { x: px + Math.cos(q * 2.1 + px) * 0.075, z: Math.sin(q * 2.1 + px) * 0.07, y: -0.01, sy: 0.7 });
      }
      for (let i = 0; i < 3; i++) b.box(0.3 - i * 0.03, 0.03, 0.105 - i * 0.008, band(i + 5), { y: 0.21 + i * 0.03, x: Math.sin(i * 2) * 0.006 });   // the bridge of rock
      for (const sx of [-1, 1]) { b.box(0.05, 0.028, 0.1, band(3), { x: sx * 0.085, y: 0.184 }); b.box(0.03, 0.024, 0.098, band(1), { x: sx * 0.058, y: 0.194 }); }   // the underside of the arch comes down in steps
      b.box(0.26, 0.01, 0.092, N('grass', 5.4, 11), { y: 0.3 }); for (let q = 0; q < 6; q++) b.ball(r.range(0.012, 0.02), N(q % 2 ? 'forest' : 'grass', 5.6, 11), { x: -0.11 + q * 0.044, y: 0.306, z: (q % 2 ? 1 : -1) * 0.02, sy: 0.8 });
      b.cyl(0.004, 0.03, N('earth', 7), { x: 0.07, y: 0.31 }); b.ball(0.02, N('forest', 6.4, 11), { x: 0.07, y: 0.336 });
      for (let q = 0; q < 4; q++) { const h = r.range(0.03, 0.06); b.box(0.004, h, 0.004, N('grass', 6, 11), { x: -0.1 + q * 0.06, y: 0.3 - h, z: 0.054, lod: 1 }); }   // plants that hang from the bridge
      for (let i = 0; i < 4; i++) b.box(0.05 - i * 0.008, 0.04, 0.045 - i * 0.006, band(i + 1), { x: 0.25, y: -0.05 + i * 0.038, z: 0.1, ry: 0.3 }); foam(b, r, 0.25, 0.1, 0.04, 7);   // a small stack beside it
      bird(b, -0.05, 0.38, 0.02, 0.4, N('plaster', 0.3)); bird(b, 0.02, 0.41, -0.03, 0.9, N('plaster', 0.3));
    } },
  // ---- the ocean: built
  suntower: { label: 'Sunken tower', r: 0.2, h: 0.5, open: 'ocean',
    build(b, c, ctx) {
      b.push(0, -0.08, 0, 0, 1, 0, 0.16);
      b.cyl(0.085, 0.4, c.p ? c.p(0.7) : N('rock', 4), { t: 0.12 }); for (let i = 0; i < 4; i++) b.cyl(0.088 - i * 0.003, 0.012, N('rock', 6), { y: 0.1 + i * 0.09 });
      for (let i = 0; i < 6; i++) { const a = i * 1.05; b.box(0.02, 0.03, 0.006, i % 2 ? GLOW('yellow', 2.8) : c.K, { x: Math.cos(a) * 0.076, z: Math.sin(a) * 0.076, y: 0.14 + (i % 3) * 0.08, ry: PI / 2 - a }); }
      for (let i = 0; i < 5; i++) { const a = i * 1.26; if (i !== 2) b.box(0.03, 0.03 + (i % 2) * 0.03, 0.03, N('rock', 5), { x: Math.cos(a) * 0.058, z: Math.sin(a) * 0.058, y: 0.4, ry: -a }); }
      for (let i = 0; i < 5; i++) b.box(0.01, 0.07, 0.004, N('olive', 5.4, 11), { x: Math.cos(i * 1.3) * 0.086, z: Math.sin(i * 1.3) * 0.086, y: 0.05, ry: -i * 1.3 });
      b.pop(); foam(b, ctx.r, -0.012, 0, 0.1, 12);
    }, lights: [[0, 0.3, 0, 0.5]] },
  oilrig: { label: 'Oil rig', r: 0.24, h: 0.6, open: 'ocean',
    build(b, c, ctx) {
      for (const [x, z] of [[-0.11, -0.09], [0.11, -0.09], [-0.11, 0.09], [0.11, 0.09]]) { b.cyl(0.018, 0.26, N('neutral', 6.6), { x, z, y: -0.1 }); b.cyl(0.026, 0.02, c.a(0.6), { x, z, y: 0.0 }); foam(b, ctx.r, x, z, 0.03, 6); }
      b.box(0.3, 0.02, 0.26, N('neutral', 5.4), { y: 0.16 }); b.box(0.31, 0.008, 0.27, c.a(0.6), { y: 0.18 }); b.box(0.12, 0.06, 0.1, c.W, { x: -0.07, y: 0.188, z: -0.06 }); b.box(0.1, 0.03, 0.08, c.s(0.5), { x: -0.07, y: 0.248, z: -0.06 });
      for (let q = 0; q < 6; q++) { const s = 0.07 - q * 0.009; b.box(s, 0.004, s, N('neutral', 7.6), { x: 0.06, y: 0.19 + q * 0.05, z: 0.03 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.004, 0.05, 0.004, N('neutral', 7), { x: 0.06 + sx * s * 0.5, y: 0.19 + q * 0.05, z: 0.03 + sz * s * 0.5 }); }
      b.cyl(0.07, 0.006, N('neutral', 3), { x: -0.08, y: 0.188, z: 0.08 }); b.box(0.03, 0.002, 0.006, c.a(0.5), { x: -0.08, y: 0.195, z: 0.08 });
      b.box(0.14, 0.006, 0.006, N('neutral', 7), { x: 0.14, y: 0.24, z: -0.09, rz: 0.5 }); b.cyl(0.006, 0.05, N('neutral', 7), { x: 0.2, y: 0.27, z: -0.09 });
    },
    anim(db, fb, t) { const f = 0.8 + 0.2 * Math.sin(t * 9); db.cone(0.016, 0.06 * f, [ROW.orange, 4.6, 6, 0], { x: 0.2, y: 0.32, z: -0.09 }); db.cone(0.009, 0.04 * f, [ROW.yellow, 2.6, 6, 0], { x: 0.2, y: 0.32, z: -0.09 }); },
    lights: [[0.2, 0.36, -0.09, 0.6, 'f'], [0, 0.26, 0, 0.5]] },
  shipwreck: { label: 'Shipwreck', r: 0.26, h: 0.2, open: 'ocean',
    // An old wooden ship that went down. Only the ship: no rocks, no sand, and nothing that floats. It is whole and it is under the water: it leans to one side, and you see it through the sea.
    // Only the top of its main mast, with the crow's nest and an old flag, comes out of the water. The sea has made it its own: sea plants grow from the deck, there are barnacles
    // on the hull and coral on the deck. Details: planks of different tones, a band of old paint, rails with gaps, gun ports, a part of the side where you see the ribs,
    // a hatch, a hole in the deck, a cabin at the stern, a bowsprit, an anchor, ropes, and one mast that is broken. Fish swim around it and air comes up from it (see anim).
    build(b, c, ctx) {
      const r = ctx.r, WD = (i) => N('earth', 5.6 + ((i * 7) % 4) * 0.5), DK = N('earth', 4.8), RIB = N('earth', 8.2), HOLE = N('neutral', 9.6), ROPE = N('sand', 5), BARN = [N('sand', 1.6), N('plaster', 2.2)], L = 0.24;
      b.push(0, -0.17, 0, 0.4, 1.15, -0.05, 0.26);
      for (let j = 0; j < 4; j++) { const w = 0.05 + j * 0.013, y = j * 0.018; b.box(w, 0.019, L, WD(j), { y }); b.box(w * 0.72, 0.019, 0.04, WD(j + 1), { y, z: L / 2 + 0.018 }); b.box(w * 0.4, 0.019, 0.036, WD(j + 2), { y, z: L / 2 + 0.05 }); b.box(w * 0.86, 0.019, 0.03, WD(j + 3), { y, z: -L / 2 - 0.013 }); }   // the hull: layers of planks, wider to the top, with a point at the bow
      b.box(0.014, 0.012, L + 0.1, RIB, { y: -0.008, z: 0.02 }); b.box(0.092, 0.006, L + 0.03, c.a(0.72), { y: 0.06, z: 0.015 }); b.box(0.08, 0.004, L - 0.004, DK, { y: 0.072, pat: 3 });   // the keel, a band of old paint, the deck
      for (const sx of [-1, 1]) { for (let q = 0; q < 8; q++) if ((q + (sx > 0 ? 1 : 0)) % 4) b.box(0.005, 0.014, 0.024, WD(q), { x: sx * 0.044, y: 0.076, z: -L / 2 + 0.015 + q * 0.03 }); for (let q = 0; q < 4; q++) b.box(0.003, 0.012, 0.014, HOLE, { x: sx * 0.0385, y: 0.04, z: -0.085 + q * 0.05 }); }   // rails with gaps, gun ports
      b.box(0.004, 0.036, 0.07, HOLE, { x: 0.0445, y: 0.02, z: 0.03 }); for (let q = 0; q < 4; q++) b.box(0.006, 0.04, 0.005, RIB, { x: 0.046, y: 0.018, z: 0.003 + q * 0.018 });   // a part of the side where the planks are gone: you see the ribs
      b.box(0.022, 0.012, 0.022, WD(3), { x: 0.014, y: 0.076, z: 0.05 }); b.box(0.03, 0.003, 0.03, HOLE, { x: -0.014, y: 0.0745, z: -0.025 });       // a hatch, and a hole in the deck
      b.box(0.084, 0.034, 0.06, WD(1), { y: 0.076, z: -L / 2 + 0.02 }); b.box(0.09, 0.004, 0.066, DK, { y: 0.11, z: -L / 2 + 0.02 }); for (const sx of [-1, 0, 1]) b.box(0.014, 0.014, 0.003, HOLE, { x: sx * 0.024, y: 0.088, z: -L / 2 - 0.011 });   // the cabin at the stern, with dark windows
      b.box(0.006, 0.05, 0.03, WD(2), { y: -0.004, z: -L / 2 - 0.04 }); b.box(0.008, 0.008, 0.1, WD(1), { y: 0.082, z: L / 2 + 0.09, rx: -0.2 });      // the rudder, the bowsprit
      b.box(0.004, 0.05, 0.004, HOLE, { x: 0.034, y: 0.012, z: L / 2 + 0.01 }); b.box(0.022, 0.005, 0.005, HOLE, { x: 0.034, y: 0.01, z: L / 2 + 0.01 });   // the anchor
      b.cyl(0.008, 0.1, WD(2), { y: 0.076 }); b.box(0.13, 0.006, 0.006, WD(1), { y: 0.135, rz: 0.12 }); for (const sx of [-1, 1]) b.box(0.002, 0.05, 0.002, ROPE, { x: sx * 0.058, y: 0.086 + sx * 0.007 });   // the main mast, its yard, ropes that hang
      b.cyl(0.019, 0.012, WD(3), { y: 0.172 }); b.cyl(0.004, 0.05, WD(2), { y: 0.184 }); b.box(0.03, 0.014, 0.002, N('red', 7.6), { x: 0.016, y: 0.218 }); b.box(0.01, 0.008, 0.002, N('red', 7.6), { x: 0.034, y: 0.214 });   // the crow's nest and an old flag: these are out of the water
      b.cyl(0.007, 0.05, WD(1), { y: 0.076, z: 0.08 }); for (let q = 0; q < 3; q++) b.box(0.003, 0.01 + q * 0.006, 0.003, WD(q + 1), { x: (q - 1) * 0.004, y: 0.126, z: 0.08 + (q % 2) * 0.004 }); b.cyl(0.006, 0.13, WD(2), { x: 0.01, y: 0.09, z: 0.08, rz: 1.45, ry: 0.4 });   // the front mast is broken: a part of it lies on the rail
      for (let i = 0; i < 9; i++) { const x = (i % 3 - 1) * 0.028, z = -0.085 + i * 0.022, n = 3 + (i % 3); for (let q = 0; q < n; q++) b.box(0.006, 0.02, 0.006, N(q % 2 ? 'olive' : 'forest', 5.6, 11), { x: x + Math.sin(q * 1.3 + i) * 0.005, y: (i < 2 ? 0.114 : 0.076) + q * 0.019, z }); }   // sea plants that grow from the deck
      for (let i = 0; i < 26; i++) { const j = i % 4, sx = i % 2 ? 1 : -1, w = r.range(0.005, 0.01); b.box(0.004, w, w, BARN[i % 2], { x: sx * ((0.05 + j * 0.013) / 2 + 0.001), y: j * 0.018 + 0.004, z: -0.11 + r() * 0.22, lod: 1 }); }   // barnacles on the hull
      coral(b, r, 2, -0.022, 0.076, 0.085, 0.8, 'orange', 4.4); coral(b, r, 0, 0.024, 0.076, -0.055, 0.8, 'pink', 3.4); coral(b, r, 4, -0.026, 0.114, -0.105, 0.7, 'yellow', 4); coral(b, r, 1, 0.02, 0.114, -0.09, 0.8, 'coral', 4);
      b.pop();
    },
    anim(db, fb, t) {
      for (let i = 0; i < 9; i++) { const u = t * 0.3 - i * 0.14 + Math.sin(t * 0.7 + i) * 0.06, x = Math.cos(u) * 0.17, z = Math.sin(u) * 0.1; db.push(x * 0.92 + z * 0.39, -0.05 - 0.02 * Math.sin(u * 2 + i * 0.5) - (i % 3) * 0.008, -x * 0.39 + z * 0.92, -u - PI / 2 + 0.4 + Math.sin(t * 6 + i) * 0.2, 1); db.box(0.012, 0.007, 0.004, N(i % 3 ? 'sea' : 'yellow', i % 3 ? 2 : 4)); db.box(0.005, 0.008, 0.003, N('snow', 0.6), { x: -0.008 }); db.pop(); }   // fish go around the ship
      for (let i = 0; i < 6; i++) { const f = (t * 0.22 + i / 6 + ((i * 7) % 5) * 0.06) % 1, q = 0.004 + f * 0.005; fb.box(q, q, q, A('snow', 0.2, 0.5 * Math.sin(f * PI)), { x: [-0.03, 0.05, 0.0][i % 3] + Math.sin(t * 2 + i) * 0.004, y: -0.09 + f * 0.088, z: [0.06, -0.04, -0.09][i % 3] }); }   // air comes up from it
    } },
  seafort: { label: 'Sea fort', r: 0.28, h: 0.52, open: 'ocean',
    // An ancient fort of stone in the sea. All of it is stone in grey tones: no paint, no bright roofs. The sea has worked on it for a long time:
    // a dark band of sea plants where the tide goes, groups of pale barnacles on the lower walls and on the towers, sea plants that hang, stones that stand out of the wall,
    // cracks, a part of the battlements that fell, one tower that is broken, rust on the cannons and on the gate. A stone landing, a keep with a low roof of slate, two lit windows, an old flag.
    build(b, c, ctx) {
      const r = ctx.r, ST = (i) => N('rock', 4.2 + ((i * 7) % 5) * 0.4), HOLE = N('neutral', 9.6), RUST = N('earth', 6.2), WEED = N('olive', 6.2, 11), BARN = [N('sand', 1.6), N('plaster', 2.2), N('rock', 2.6)];
      const face = (k, sft, R) => { const a = k * PI / 2, ca = Math.cos(a), sa = Math.sin(a); return { x: ca * R - sa * sft, z: sa * R + ca * sft, ry: PI / 2 - a }; };   // a place on one of the four flat faces of the wall
      b.cyl(0.215, 0.1, N('rock', 7.2), { y: -0.09, t: 0.06 }); b.cyl(0.208, 0.022, N('forest', 8.8), { y: -0.008 }); b.cyl(0.2, 0.15, ST(1), { y: 0.01, t: 0.05 });   // the base, the dark band where the tide goes, the wall
      for (let i = 0; i < 3; i++) b.cyl(0.199 - i * 0.003, 0.006, N('rock', 6), { y: 0.04 + i * 0.04 });                                            // courses of stone
      for (let i = 0; i < 28; i++) { const k = i % 4, f = face(k, -0.09 + ((i * 5) % 7) * 0.03, 0.193); b.box(0.028, 0.014, 0.014, ST(i), { ...f, y: 0.03 + ((i * 3) % 6) * 0.02 }); }   // stones that stand out of the wall
      for (let i = 0; i < 110; i++) { const k = i % 4, cl = (i * 7 + k * 3) % 5, f = face(k, Math.max(-0.105, Math.min(0.105, -0.09 + cl * 0.045 + (r() - 0.5) * 0.05)), 0.197), w = r.range(0.006, 0.013); b.box(w, w * r.range(0.7, 1), 0.016, BARN[i % 3], { ...f, y: -0.006 + r() * r() * 0.09, lod: i % 3 ? 0 : 1 }); }   // barnacles, in groups, most of them low on the wall
      for (let i = 0; i < 20; i++) { const h = r.range(0.016, 0.04), f = face(i % 4, -0.1 + ((i * 3) % 9) * 0.025, 0.2); b.box(0.005, h, 0.012, WEED, { ...f, y: 0.006 - h, lod: 1 }); }      // sea plants that hang into the water
      for (let q = 0; q < 4; q++) { const f = face(1, 0.03 + (q % 2) * 0.008, 0.196); b.box(0.004, 0.026, 0.012, HOLE, { ...f, y: 0.05 + q * 0.022 }); }       // a crack
      b.cyl(0.204, 0.012, N('rock', 6.2), { y: 0.16 }); b.cyl(0.17, 0.004, N('rock', 5.2), { y: 0.172 });                                          // the wall walk
      for (let i = 0; i < 20; i++) { const k = i % 4, q = Math.floor(i / 4), f = face(k, -0.096 + q * 0.048, 0.188); if (k === 3 && q > 1 && q < 4) { if (q === 2) { b.box(0.03, 0.012, 0.022, ST(i), { ...f, y: 0.172, rz: 0.5 }); b.box(0.016, 0.01, 0.014, ST(i + 1), { x: f.x * 0.84, z: f.z * 0.84, y: 0.176, ry: 0.6 }); } continue; } b.box(0.03, 0.026, 0.024, ST(i), { ...f, y: 0.172 }); }   // battlements: a part of them fell
      for (let k = 0; k < 4; k++) { if (k === 0) continue; const f = face(k, -0.05, 0.198), g = face(k, -0.05, 0.215); b.box(0.03, 0.022, 0.008, HOLE, { ...f, y: 0.1 }); b.box(0.012, 0.012, 0.05, RUST, { ...g, y: 0.104 }); }   // cannons with rust, in openings
      for (let i = 0; i < 4; i++) {
        const a = i * (PI / 2) + PI / 4, x = Math.cos(a) * 0.186, z = Math.sin(a) * 0.186, broken = i === 2, h = broken ? 0.2 : 0.27;
        b.cyl(0.036, h, ST(i + 2), { x, z, y: 0.0 }); b.cyl(0.038, 0.016, N('forest', 8.8), { x, z, y: -0.008 });
        if (broken) { for (let q = 0; q < 3; q++) b.box(0.022, 0.02 + q * 0.016, 0.022, ST(q), { x: x + (q - 1) * 0.018, z: z + (q % 2) * 0.016 - 0.008, y: h }); b.box(0.02, 0.014, 0.018, ST(4), { x: x * 0.82, z: z * 0.82, y: 0.176, ry: 0.7 }); }
        else { b.cyl(0.041, 0.012, N('rock', 6.2), { x, z, y: h }); for (let q = 0; q < 4; q++) b.box(0.018, 0.018, 0.018, ST(q + i), { x: x + (q % 2 ? 1 : -1) * 0.027, z: z + (q < 2 ? 1 : -1) * 0.027, y: h + 0.012 }); }
        for (let q = 0; q < 2; q++) b.box(0.006, 0.022, 0.004, HOLE, { x: x * 1.19, z: z * 1.19, y: 0.09 + q * 0.07, ry: PI / 2 - a });               // dark slits
        for (let q = 0; q < 9; q++) { const k = q % 4, w = r.range(0.006, 0.011), ka = k * PI / 2; b.box(w, w, 0.012, BARN[q % 3], { x: x + Math.cos(ka) * 0.033, z: z + Math.sin(ka) * 0.033, y: -0.004 + r() * 0.07, ry: PI / 2 - ka, lod: 1 }); }
      }
      { const f = face(0, 0, 0.196); b.half(0.07, 0.09, 0.02, HOLE, { ...f, y: 0.0 }); for (let q = -2; q <= 2; q++) { const g = face(0, q * 0.012, 0.208); b.box(0.004, 0.066, 0.004, RUST, { ...g, y: 0.004 }); } b.box(0.06, 0.004, 0.004, RUST, { ...face(0, 0, 0.208), y: 0.04 }); }   // the gate, with an iron grille that has rust
      b.box(0.08, 0.016, 0.13, N('rock', 6), { x: 0.25, y: -0.004 }); b.box(0.03, 0.01, 0.1, N('rock', 6.6), { x: 0.295, y: -0.012 }); for (const sz of [-1, 1]) b.box(0.012, 0.018, 0.012, N('rock', 5), { x: 0.275, y: 0.012, z: sz * 0.05 });   // a stone landing with steps
      for (let q = 0; q < 6; q++) { const w = r.range(0.006, 0.011); b.box(0.014, w, w, BARN[q % 3], { x: 0.29, y: -0.006 + r() * 0.012, z: -0.055 + q * 0.022, lod: 1 }); }
      b.box(0.04, 0.012, 0.02, N('earth', 7), { x: 0.27, y: -0.004, z: 0.1, ry: 0.3 });                                                              // a small boat
      b.cyl(0.085, 0.18, ST(3), { y: 0.172 }); b.cyl(0.092, 0.012, N('rock', 6.2), { y: 0.352 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.03, 0.022, 0.02, ST(i), { x: Math.cos(a) * 0.08, z: Math.sin(a) * 0.08, y: 0.364, ry: -a }); }   // the keep
      b.cone(0.066, 0.07, N('rock', 7.8), { y: 0.364 }); b.box(0.03, 0.006, 0.03, N('olive', 6, 11), { x: 0.02, y: 0.38, z: 0.02 }); b.cyl(0.002, 0.07, c.K, { y: 0.43 }); b.box(0.034, 0.02, 0.002, N('red', 7.6), { x: 0.019, y: 0.476 }); b.box(0.012, 0.012, 0.002, N('red', 7.6), { x: 0.036, y: 0.468 });   // a low roof of slate, with moss, and an old flag
      for (let i = 0; i < 6; i++) { const f = face(i % 4, (i % 3 - 1) * 0.02, 0.083); b.box(0.014, 0.03, 0.006, i === 0 || i === 3 ? GLOW('yellow', 3) : HOLE, { ...f, y: 0.23 + (i % 2) * 0.05 }); }   // windows: two have light
      for (let i = 0; i < 10; i++) { const f = face(i % 4, -0.04 + ((i * 3) % 5) * 0.02, 0.083); b.box(0.02, 0.012, 0.01, ST(i), { ...f, y: 0.19 + ((i * 5) % 7) * 0.02 }); }
      b.box(0.03, 0.02, 0.02, N('earth', 7), { x: -0.11, y: 0.176, z: 0.07 }); b.box(0.016, 0.012, 0.016, RUST, { x: 0.1, y: 0.176, z: -0.1 });        // an old crate, and a pile of cannon balls
      bird(b, 0.13, 0.31, 0.13, 0.6, N('plaster', 0.3), 0.15); bird(b, -0.02, 0.44, 0.03, 2, N('plaster', 0.3), 0.15);
      foam(b, r, 0, 0, 0.235, 22);
    }, lights: [[0, 0.3, 0, 0.5]] },
  // ---- the sky: nature
  rainbow: { label: 'Rainbow', r: 0.3, h: 0.36, nature: true, open: 'sky',
    // See-through bands of color, like the bands of an aurora: each band is a thin sheet of light, its strength moves slowly along the arc, and the two ends go away into the cloud.
    build(b) { for (const sx of [-1, 1]) for (let q = 0; q < 4; q++) b.ball(0.04 - q * 0.004, N('plaster', 0.2), { x: sx * (0.25 + (q % 2) * 0.04), y: -0.014 + (q % 2) * 0.016, z: (q - 1.5) * 0.03, sy: 0.7 }); },
    anim(db, fb, t) {
      const rows = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'], M = 30;
      rows.forEach((row, k) => { const R = 0.31 - k * 0.019, len = (R - 0.01) * PI / M; for (let i = 0; i < M; i++) { const f = (i + 0.5) / M, a = f * PI, end = Math.min(1, Math.min(f, 1 - f) * 7), sh = 0.7 + 0.3 * Math.sin(t * 0.7 + f * 9 + k * 0.8); fb.box(len, 0.019, 0.004, A(row, 3.6, 0.55 * end * sh), { x: Math.cos(a) * R, y: Math.sin(a) * R - 0.012, rz: a + PI / 2 }); } });
    } },
  cloudfall: { label: 'Cloud falls', r: 0.2, h: 0.3, nature: true, open: 'sky',
    build(b, c, ctx) {
      const r = ctx.r;
      for (let i = 0; i < 4; i++) b.box(0.17 - i * 0.03, 0.03, 0.13 - i * 0.022, N('rock', 4.2 + (i % 2) * 0.8), { y: -0.012 + i * 0.028, x: Math.sin(i * 2) * 0.008, ry: i * 0.15 });
      b.cyl(0.046, 0.008, N('sea', 3), { y: 0.1 }); b.box(0.05, 0.02, 0.03, N('rock', 5), { y: 0.086, z: 0.05 });
      for (let q = 0; q < 4; q++) b.ball(r.range(0.014, 0.024), N(q % 2 ? 'grass' : 'forest', 5.2, 11), { x: Math.cos(q * 1.7 + 2) * 0.06, y: 0.07 + (q % 2) * 0.02, z: Math.sin(q * 1.7 + 2) * 0.045 - 0.01, sy: 0.8 });
      b.cyl(0.004, 0.03, N('earth', 7), { x: -0.05, y: 0.1, z: -0.02 }); b.ball(0.022, N('grass', 4.6, 11), { x: -0.05, y: 0.124, z: -0.02 });
    },
    // The water goes over the edge and falls through the cloud to the sea, far below.
    anim(db, fb, t) { fall(fb, t, 0, 0.106, 0.07, 0.7, 0.044, 26); mist(fb, t, 0, -0.6, 0.08, 0.07); mist(fb, t + 3, 0, 0.0, 0.085, 0.035, 4); } },
  skytree: { label: 'Great sky tree', r: 0.22, h: 0.5, nature: true, open: 'sky',
    build(b, c) {
      b.cyl(0.04, 0.22, N('plaster', 1.4), { t: 0.3 }); for (let i = 0; i < 5; i++) { const a = i * 1.26; b.box(0.014, 0.06, 0.014, N('plaster', 1.8), { x: Math.cos(a) * 0.04, z: Math.sin(a) * 0.04, y: -0.01, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 }); b.box(0.012, 0.1, 0.012, N('plaster', 1.6), { x: Math.cos(a) * 0.03, z: Math.sin(a) * 0.03, y: 0.19, rz: -Math.cos(a) * 0.8, rx: Math.sin(a) * 0.8 }); }
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = i ? 0.06 + (i % 3) * 0.035 : 0; b.ball(0.085 - (i % 3) * 0.014, N(i % 2 ? 'pink' : 'plaster', i % 2 ? 2 + (i % 3) * 0.5 : 0.3, 11), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: 0.27 + (i % 4) * 0.035, sy: 0.75 }); }
      for (let i = 0; i < 6; i++) b.ball(0.006, GLOW('yellow', 2.4), { x: Math.cos(i * 1.05) * 0.12, z: Math.sin(i * 1.05) * 0.12, y: 0.2 + (i % 3) * 0.02, lod: 1 });
    }, lights: [[0, 0.24, 0, 0.5]] },
  floatisle: { label: 'Floating island', r: 0.26, h: 0.6, nature: true, open: 'sky',
    // A piece of land that hangs over the cloud: layers of rock and earth that get narrow to a point below, roots that hang down, grass, a hill with rock,
    // a pond and a stream that goes over the edge, trees, bushes, flowers, and small rocks that float around it.
    build(b, c, ctx) {
      const r = ctx.r;
      b.push(0, 0.27, 0);
      for (let i = 0; i < 7; i++) { const s = 0.17 * Math.pow(1 - i / 7.5, 1.25); b.cyl(s, 0.034, N(i % 2 ? 'earth' : 'rock', i % 2 ? 6.4 : 5 + i * 0.25), { y: -i * 0.03, x: Math.sin(i * 1.7) * 0.004 * i, z: Math.cos(i * 2.1) * 0.004 * i, t: 0.25, rx: PI }); }
      b.cone(0.03, 0.06, N('rock', 6.4), { y: -0.2, x: 0.012, rx: PI });
      for (let q = 0; q < 7; q++) { const a = q * 0.9 + 0.3, d = 0.1 + (q % 3) * 0.02, h = r.range(0.04, 0.1); b.box(0.004, h, 0.004, N(q % 2 ? 'earth' : 'grass', q % 2 ? 7.4 : 6, q % 2 ? 0 : 11), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -0.03 - h, lod: 1 }); }   // roots and plants that hang down
      b.cyl(0.172, 0.022, N('rock', 4.6)); b.cyl(0.168, 0.012, N('grass', 4.8, 11), { y: 0.022 });
      mound(b, -0.06, -0.05, 0.07, 0.085, N('grass', 5.4, 11), 1.1, 0.5); b.box(0.04, 0.03, 0.035, N('rock', 5), { x: -0.08, y: 0.07, z: -0.06, t: 0.3, ry: 0.4 });   // a hill, with rock
      b.cyl(0.042, 0.003, N('sand', 3), { x: 0.055, y: 0.033, z: 0.03 }); b.cyl(0.036, 0.004, N('sea', 3), { x: 0.055, y: 0.034, z: 0.03 }); b.box(0.02, 0.004, 0.13, N('sea', 3), { x: 0.055, y: 0.0335, z: 0.105 });   // a pond and a stream
      for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.6, d = 0.1 + (i % 2) * 0.04, x = Math.cos(a) * d, z = Math.sin(a) * d, s = r.range(0.8, 1.3); if (Math.abs(x - 0.055) < 0.05 && z > -0.02 || Math.hypot(x + 0.06, z + 0.05) < 0.07) continue; b.cyl(0.005 * s, 0.035 * s, N('earth', 7), { x, z, y: 0.034 }); b.ball(0.026 * s, N(i % 2 ? 'grass' : 'forest', 5.6, 11), { x, z, y: 0.034 + 0.03 * s }); }
      for (let q = 0; q < 7; q++) { const a = q * 0.9 + 2.2, d = 0.06 + (q % 3) * 0.04; b.ball(0.006, q % 2 ? N('pink', 2.6) : N('yellow', 3), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: 0.034, lod: 1 }); }
      for (const [x, y, z, s] of [[0.24, -0.06, 0.05, 1], [-0.23, 0.02, -0.06, 0.7], [0.19, 0.08, -0.14, 0.5]]) { b.cone(0.03 * s, 0.05 * s, N('rock', 5.6), { x, y: y + 0.003, z, rx: PI }); b.cyl(0.03 * s, 0.012 * s, N('rock', 4.6), { x, y, z }); b.cyl(0.028 * s, 0.006, N('grass', 4.8, 11), { x, y: y + 0.012 * s, z }); }   // small rocks that float
      b.pop();
    },
    anim(db, fb, t) { fall(fb, t, 0.055, 0.303, 0.172, 0.3, 0.02, 14); mist(fb, t, 0.055, 0.0, 0.176, 0.04, 5); } },
  // ---- the sky: built
  zeppelin: { label: 'Zeppelin', r: 0.28, h: 0.5, open: 'sky',
    // A mooring mast with a platform and a ladder. The airship floats at the mast: a long hull with rings, a nose cap, four tail fins with rudders,
    // a cabin with windows on two sides, two engines with propellers that turn, lights, and a flag.
    build(b, c) {
      b.push(-0.2, 0, 0);
      b.cyl(0.04, 0.01, N('earth', 5.6)); b.cyl(0.006, 0.28, N('neutral', 6), { y: 0.01 }); b.cyl(0.03, 0.006, N('earth', 5.6), { y: 0.2 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.cyl(0.0015, 0.02, c.K, { x: Math.cos(a) * 0.028, z: Math.sin(a) * 0.028, y: 0.206 }); }
      for (let q = 0; q < 9; q++) b.box(0.014, 0.002, 0.002, N('earth', 7), { x: 0.012, y: 0.02 + q * 0.02, z: 0.006 }); b.box(0.002, 0.19, 0.002, N('earth', 7), { x: 0.019, y: 0.01, z: 0.006 });
      b.ball(0.006, GLOW('red', 4), { y: 0.29 }); b.box(0.02, 0.016, 0.02, N('earth', 6), { x: -0.02, y: 0.01, z: 0.02 });
      b.pop();
    },
    anim(db, fb, t, env, c) {
      const y = 0.3 + Math.sin(t * 0.6) * 0.008, L = 0.2, HR = 0.08, rad = (x) => HR * Math.sqrt(Math.max(0, 1 - (x / L) * (x / L)));
      db.push(0.04, y, 0, PI, 1);                                                                                              // the nose (+x here) points at the mast
      db.ball(HR, c.a(0.5), { y: -HR, sx: L / HR }); db.ball(HR * 0.42, c.s(0.5), { x: L * 0.84, y: -HR * 0.42, sx: 1.4 });           // the hull and the nose cap
      for (let i = -3; i <= 3; i++) { const x = i * 0.05; db.cyl(rad(x) * 1.025, 0.007, i % 2 ? c.W : c.s(0.55), { x: x + 0.0035, rz: PI / 2 }); }   // rings around the hull
      for (const rx of [0, PI / 2, PI, -PI / 2]) { db.push(-L * 0.8, 0, 0, 0, 1, rx); db.box(0.07, 0.06, 0.005, c.s(0.5), { y: 0.014, t: 0.45 }); db.box(0.026, 0.05, 0.006, c.a(0.6), { x: -0.036, y: 0.014 }); db.pop(); }   // four fins, each with a rudder
      db.box(0.13, 0.03, 0.044, N('earth', 6.6), { y: -HR - 0.034 }); db.box(0.134, 0.004, 0.048, c.s(0.5), { y: -HR - 0.006 }); db.box(0.03, 0.022, 0.04, N('earth', 6.6), { x: 0.074, y: -HR - 0.03, t: 0.4 });   // the cabin
      for (const sz of [-1, 1]) for (const x of [-0.045, -0.015, 0.015, 0.045]) db.box(0.018, 0.012, 0.002, GLOW('yellow', 2.6), { x, y: -HR - 0.024, z: sz * 0.0225 });
      for (const sz of [-1, 1]) { const ez = sz * 0.068, ey = -HR * 0.62; db.box(0.036, 0.016, 0.016, N('neutral', 6), { x: -0.06, y: ey, z: ez }); db.box(0.004, 0.004, 0.02, c.K, { x: -0.06, y: ey + 0.012, z: ez - sz * 0.012 }); db.push(-0.08, ey + 0.008, ez, 0, 1, t * 16); db.box(0.004, 0.05, 0.007, c.K, { y: -0.025 }); db.box(0.004, 0.007, 0.05, c.K, { y: -0.0035 }); db.pop(); }   // two engines
      db.cyl(0.001, 0.05, c.K, { x: -L * 0.97, y: 0.014 }); db.box(0.03, 0.016, 0.001, c.s(0.5), { x: -L * 0.97 - 0.016, y: 0.05, rz: Math.sin(t * 5) * 0.15 });   // a flag at the tail
      db.ball(0.005, GLOW('red', 4), { x: L, y: -0.005 }); db.ball(0.005, GLOW('green', 4), { x: -L * 0.9, y: -0.04 });
      db.pop();
      db.box(0.04, 0.002, 0.002, c.K, { x: -0.18, y: 0.29 + (y - 0.3) * 0.5 });                                                    // the rope from the mast to the nose
    }, lights: [[0.04, 0.2, 0, 0.5]] },
  skycastle: { label: 'Sky Castle', r: 0.28, h: 0.7, open: 'sky',
    // A castle that is made of cloud. Its body and its towers are cloud (see clouds: sky.js draws them with the cloud of the region).
    // What is not cloud: the roofs, the flags, the gate, the lit windows, and thin bridges between the towers.
    clouds: [[0, 0, 0.2, 0.0, 0.25], ...CASTLE.map(([x, z, top, rr]) => [x, z, rr * 1.35, 0.1, top + 0.05]), ...[0, 1, 2, 3, 4, 5, 6, 7].map((q) => [Math.cos(q * 0.785 + 0.39) * 0.165, Math.sin(q * 0.785 + 0.39) * 0.165, 0.036, 0.2, 0.285]), [0, 0.235, 0.055, -0.01, 0.045], [0, 0.29, 0.04, -0.02, 0.02]],
    build(b, c) {
      b.push(0, 0.05, 0);
      for (const [x, z, top, rr] of CASTLE) {
        b.cyl(rr * 0.9, 0.008, c.s(0.5), { x, z, y: top - 0.014 }); b.cone(rr, rr * 2.6, c.a(0.55), { x, z, y: top - 0.006 }); b.cyl(0.0012, 0.04, c.K, { x, z, y: top - 0.006 + rr * 2.6 }); b.box(0.022, 0.012, 0.001, c.s(0.5), { x: x + 0.011, z, y: top + 0.02 + rr * 2.6 });
        for (let q = 0; q < 3; q++) { const a = q * 2.1 + x * 9 + 1; b.box(0.012, 0.022, 0.003, GLOW('yellow', 2.4), { x: x + Math.cos(a) * rr * 1.1, z: z + Math.sin(a) * rr * 1.1, y: top * (0.45 + q * 0.16), ry: PI / 2 - a }); }
      }
      b.arch(0.09, 0.1, 0.014, c.a(0.6), { y: 0.0, z: 0.19 }); b.box(0.05, 0.07, 0.004, GLOW('yellow', 2.2), { y: 0.0, z: 0.186 });                       // the gate: light comes out of it
      for (const z of [0.1, -0.1]) b.box(0.2, 0.006, 0.014, c.s(0.5), { y: z > 0 ? 0.26 : 0.32, z }); for (const sx of [-1, 1]) b.box(0.014, 0.006, 0.14, c.s(0.5), { x: sx * 0.14, y: 0.29 });   // thin bridges between the towers
      for (let q = 0; q < 6; q++) b.ball(0.005, GLOW('yellow', 2.2), { x: Math.cos(q * 1.05) * 0.22, y: 0.1 + (q % 3) * 0.04, z: Math.sin(q * 1.05) * 0.22, lod: 1 });
      b.pop();
    }, lights: [[0, 0.15, 0.2, 0.6], [0, 0.55, 0, 0.5]] },
  aviary: { label: 'Aviary', r: 0.24, h: 0.46, open: 'sky',
    // An open garden for birds, with no cage: a large tree with perches and bird houses, three light arches with plants, a bird bath, feeders, and a nest.
    // It has no floor: low mounds of moss and a few stones lie in the cloud, so the cloud comes up between them.
    build(b, c, ctx) {
      const r = ctx.r;
      for (let i = 0; i < 9; i++) { const a = i * 0.7 + r(), d = i ? r.range(0.06, 0.18) : 0; mound(b, Math.cos(a) * d, Math.sin(a) * d, r.range(0.04, 0.075), 0.004 + r() * 0.012, N(i % 3 ? 'grass' : 'forest', 4.6 + r(), 11), r.range(1, 1.4), 0.3); }
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.5; b.cyl(0.014, 0.006, N('rock', 3.6), { x: Math.cos(a) * 0.12, z: Math.sin(a) * 0.12, y: 0.004 }); }   // stepping stones
      b.cyl(0.022, 0.2, N('earth', 7), { t: 0.3 });
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.3, h = 0.1 + (i % 3) * 0.035, ca = Math.cos(a), sa = Math.sin(a);
        b.box(0.09, 0.008, 0.008, N('earth', 6.6), { x: ca * 0.045, z: sa * 0.045, y: h, ry: -a }); b.ball(0.03, N(i % 2 ? 'grass' : 'forest', 5, 11), { x: ca * 0.1, z: sa * 0.1, y: h - 0.004, sy: 0.8 });   // a perch
        if (i % 2) { b.cyl(0.0008, 0.03, c.K, { x: ca * 0.07, z: sa * 0.07, y: h - 0.03 }); b.box(0.02, 0.018, 0.018, c.a(0.55), { x: ca * 0.07, z: sa * 0.07, y: h - 0.056 }); b.pyr(0.026, 0.01, 0.024, c.s(0.5), { x: ca * 0.07, z: sa * 0.07, y: h - 0.038 }); }   // a bird house that hangs
      }
      b.ball(0.07, N('grass', 4.6, 11), { y: 0.18, sy: 0.8 }); b.ball(0.05, N('forest', 5.6, 11), { x: 0.03, y: 0.25, z: -0.02, sy: 0.8 }); b.ball(0.04, N('grass', 4, 11), { x: -0.03, y: 0.28, z: 0.02, sy: 0.8 });
      for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.9; b.push(Math.cos(a) * 0.17, 0.004, Math.sin(a) * 0.17, PI / 2 - a, 1); b.arch(0.1, 0.13, 0.012, c.W); b.box(0.11, 0.008, 0.016, c.a(0.6), { y: 0.13 }); for (let q = 0; q < 4; q++) { const h = r.range(0.02, 0.04); b.box(0.003, h, 0.003, N('grass', 5.4, 11), { x: -0.036 + q * 0.024, y: 0.13 - h, z: 0.008, lod: 1 }); } b.pop(); }   // arches, with plants
      b.cyl(0.006, 0.04, N('plaster', 1.2), { x: 0.1, y: 0.006, z: 0.07 }); b.cyl(0.026, 0.008, N('plaster', 1), { x: 0.1, y: 0.046, z: 0.07 }); b.cyl(0.02, 0.003, N('sea', 3), { x: 0.1, y: 0.054, z: 0.07 });   // a bird bath
      for (const [x, z] of [[-0.11, 0.06], [-0.05, -0.13]]) { b.cyl(0.003, 0.07, N('earth', 7), { x, z, y: 0.004 }); b.cyl(0.018, 0.004, N('earth', 6), { x, z, y: 0.074 }); b.ball(0.006, N('yellow', 3.4), { x, z, y: 0.078 }); b.pyr(0.03, 0.012, 0.03, c.s(0.5), { x, z, y: 0.098 }); for (const sx of [-1, 1]) b.cyl(0.0008, 0.02, c.K, { x: x + sx * 0.01, z, y: 0.078 }); }   // feeders
      b.cyl(0.016, 0.008, N('earth', 6.6), { x: 0.06, y: 0.113, z: 0.05 }); for (let q = 0; q < 3; q++) b.ball(0.004, N('sea', 2), { x: 0.056 + q * 0.004, y: 0.119, z: 0.05 });   // a nest with eggs
    },
    anim(db, fb, t) {
      for (let i = 0; i < 9; i++) { const a = t * (0.4 + (i % 4) * 0.09) * (i % 2 ? 1 : -1) + i * 1.3, rad = 0.1 + (i % 3) * 0.05, flap = Math.sin(t * 9 + i) * 0.6; bird(db, Math.cos(a) * rad, 0.2 + (i % 4) * 0.06 + Math.sin(t * 1.4 + i) * 0.014, Math.sin(a) * rad, -a + (i % 2 ? 0 : PI), [ROW[['red', 'yellow', 'blue', 'green', 'pink', 'orange', 'purple'][i % 7]], 4.6, 0, 0], flap); }
      for (let i = 0; i < 3; i++) { const a = i * 2.2 + 1, hop = Math.max(0, Math.sin(t * 3 + i * 2)) * 0.006; db.box(0.012, 0.01, 0.008, [ROW[['blue', 'red', 'yellow'][i]], 4.6, 0, 0], { x: Math.cos(a) * 0.12, y: 0.012 + hop, z: Math.sin(a) * 0.12, ry: t * 0.3 + i }); }
    } },
  stardome: { label: 'Star dome', r: 0.24, h: 0.5, open: 'sky',
    // A place to look at the stars, in dark blue and brass: a round floor with a map of the stars, three brass rings that make an open dome,
    // one very large telescope on a fork mount that points out between the rings, steps, lamps, a desk, and small stars that turn around it.
    // (It must not look like the white observatory of the land: no walls, no closed dome, no white.)
    build(b, c) {
      const NAVY = N('darkblue', 8), BR = N('yellow', 4.6), BR2 = N('yellow', 6);
      b.cyl(0.2, 0.02, NAVY, { y: -0.012 }); b.cyl(0.205, 0.006, BR, { y: 0.004 }); b.cyl(0.19, 0.004, N('darkblue', 9), { y: 0.008 });
      for (let i = 0; i < 16; i++) { const a = i * 2.4, d = 0.03 + ((i * 0.37) % 1) * 0.14; b.box(0.008, 0.002, 0.008, GLOW('yellow', 2.2), { x: Math.cos(a) * d, y: 0.012, z: Math.sin(a) * d, ry: a }); }   // the map of the stars
      for (let i = 0; i < 5; i++) b.box(0.03 + (i % 2) * 0.03, 0.001, 0.002, GLOW('yellow', 3), { x: Math.cos(i * 2.4) * 0.07, y: 0.012, z: Math.sin(i * 2.4) * 0.07, ry: i * 1.1 });
      for (let k = 0; k < 3; k++) { b.push(0, 0.03, 0, PI / 6 + k * (PI / 3), 1); for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; if (Math.sin(a) < -0.12) continue; b.box(0.0427, 0.008, 0.008, k === 1 ? BR2 : BR, { x: Math.cos(a) * 0.19, y: Math.sin(a) * 0.19 + 0.02, rz: a + PI / 2 }); } b.pop(); }   // three brass rings: an open dome
      b.ball(0.014, BR, { y: 0.226 });
      b.cyl(0.05, 0.03, NAVY, { y: 0.012 }); for (const sz of [-1, 1]) b.box(0.016, 0.14, 0.012, BR2, { y: 0.042, z: sz * 0.05 }); b.cyl(0.008, 0.12, BR, { y: 0.17, z: -0.06, rx: PI / 2 });   // the fork mount
      b.push(0, 0.17, 0, 0, 1, 0, -0.7);                                                                                                                   // the telescope: it points high into the sky
      b.cyl(0.038, 0.3, NAVY, { y: -0.1 }); b.cyl(0.042, 0.02, BR, { y: 0.2 }); b.cyl(0.04, 0.012, BR, { y: -0.1 }); b.cyl(0.04, 0.008, BR, { y: 0.05 }); b.cyl(0.036, 0.004, [ROW.sea, 2, 1, 0.1], { y: 0.221 });
      b.cyl(0.016, 0.06, BR2, { y: -0.16 }); b.cyl(0.02, 0.016, NAVY, { y: -0.176 }); b.cyl(0.01, 0.14, BR2, { z: 0.05, y: -0.02 }); b.cyl(0.013, 0.012, BR, { z: 0.05, y: 0.12 });   // the eyepiece, and a small finder scope
      b.pop();
      for (let q = 0; q < 3; q++) b.box(0.07, 0.008, 0.03, N('darkblue', 7), { y: -0.012 + q * 0.006, z: 0.23 - q * 0.02 });   // steps
      for (let i = 0; i < 4; i++) { const a = i * (PI / 2) + PI / 4; b.cyl(0.003, 0.06, BR2, { x: Math.cos(a) * 0.185, z: Math.sin(a) * 0.185, y: 0.01 }); b.ball(0.008, GLOW('yellow', 2.4), { x: Math.cos(a) * 0.185, z: Math.sin(a) * 0.185, y: 0.07 }); }
      b.box(0.04, 0.03, 0.03, NAVY, { x: -0.1, y: 0.012, z: 0.1 }); b.box(0.03, 0.002, 0.022, N('plaster', 1), { x: -0.1, y: 0.043, z: 0.1, ry: 0.3 });   // a desk with a chart
    },
    anim(db, fb, t) { for (let i = 0; i < 7; i++) { const a = t * (0.25 + (i % 3) * 0.06) + i * 0.9, rad = 0.2 + (i % 2) * 0.05, y = 0.3 + (i % 4) * 0.05 + Math.sin(t + i) * 0.01, s = 0.7 + 0.3 * Math.sin(t * 3 + i * 2), col = [ROW[i % 3 ? 'yellow' : 'plaster'], i % 3 ? 2.2 : 0.2, 6, 0]; db.push(Math.cos(a) * rad, y, Math.sin(a) * rad, t + i, s); db.box(0.018, 0.005, 0.005, col); db.box(0.005, 0.018, 0.005, col, { y: -0.0065 }); db.box(0.005, 0.005, 0.018, col); db.pop(); } },
    lights: [[0, 0.2, 0, 0.6]] },
};
