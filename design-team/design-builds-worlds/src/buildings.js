// Small background buildings. Eight architecture styles. Each returns [footprint radius, roof height, roof offset].
// Walls are plaster or accent 2. Roofs are accent 1. Fine details (sills, shutters, steps) show at close zoom.
import { ROW } from './palette.js';
import { OPEN_STYLES } from './open.js';
const PI = Math.PI;
export const STYLES = {
  minimal: 'Modern Minimal', organic: 'Organic', city: 'Modern City', whimsical: 'Whimsical',
  modular: 'Modular', tower: 'Tower-heavy', village: 'Village', ruins: 'Ruins',
  grand: 'Grand Avenue', treehouse: 'Tree Houses', yurt: 'Yurts',
  // Scenery that is not a building. A region can have these and no building at all.
  woodland: 'Woodland', orchard: 'Orchard', farmland: 'Farmland', vineyard: 'Vineyard',
  flowers: 'Flower fields', boulders: 'Boulder field', palms: 'Grove',
};
// These kinds are fields: square plots, side by side on one grid, all turned the same way (see region.js).
export const GRID_STYLES = new Set(['orchard', 'farmland', 'vineyard', 'flowers']);
// The grove has the trees of the biome: palms on a beach, Joshua trees in a desert, birches in a forest.
export const GROVE = {
  forest: ['birch', 'Birch grove'], desert: ['joshua', 'Joshua trees'], tundra: ['spruce', 'Spruce grove'], wetland: ['willow', 'Willow grove'], volcanic: ['dragon', 'Dragon trees'],
  archipelago: ['palm', 'Palm grove'], meadow: ['cherry', 'Cherry grove'], canyon: ['juniper', 'Juniper grove'], jungle: ['banana', 'Banana grove'], alpine: ['larch', 'Larch grove'],
  crystal: ['gem', 'Crystal grove'], coral: ['mangrove', 'Mangrove'], beach: ['palm', 'Palm grove'], valley: ['poplar', 'Poplar grove'], savannah: ['baobab', 'Baobab grove'],
  urban: ['ginkgo', 'Ginkgo grove'], suburban: ['magnolia', 'Magnolia grove'],
};
// The name of a kind of scenery in one biome.
export const styleLabel = (k, biome) => (k === 'palms' ? (GROVE[biome] || ['palm', 'Grove'])[1] : STYLES[k]);
const G = (row, tone, kind = 0) => [ROW[row], tone, kind, 0];
// One tree of a grove, at the origin. s = its size.
const GROVE_TREE = {
  palm(b, c, r, s) { const lean = (r() - 0.5) * 0.5; b.push(0, 0, 0, r() * PI * 2, s, 0, lean); for (let q = 0; q < 5; q++) b.box(0.01, 0.022, 0.01, q % 2 ? c.trunk : c.wood, { y: q * 0.02, x: Math.sin(q * 0.5) * 0.004 }); for (let q = 0; q < 6; q++) { const fa = (q / 6) * PI * 2; b.box(0.05, 0.004, 0.014, c.f(q % 2 ? 0.8 : 0.62), { x: Math.cos(fa) * 0.024, z: Math.sin(fa) * 0.024, y: 0.1, ry: -fa, rz: -0.45, k: 11 }); } b.ball(0.006, c.soil(0.2), { y: 0.094, x: 0.006, lod: 1 }); b.pop(); },
  birch(b, c, r, s) { const h = 0.12 * s; b.cyl(0.006 * s, h, G('plaster', 0.6)); for (let q = 1; q < 4; q++) b.box(0.013 * s, 0.004, 0.013 * s, G('neutral', 8.6), { y: q * h * 0.24, lod: 1 }); b.ball(0.03 * s, G('grass', 3.6, 11), { y: h * 0.8, sy: 1.3 }); b.ball(0.02 * s, G('grass', 2.8, 11), { x: 0.012 * s, y: h * 1.1 }); },
  joshua(b, c, r, s) { const T = G('earth', 6.6), L = G('olive', 6, 11); b.cyl(0.008 * s, 0.06 * s, T); for (const [sx, a, h] of [[1, -0.7, 0.05], [-1, 0.6, 0.06], [0.2, -0.15, 0.045]]) { b.push(0, 0.055 * s, 0, r() * PI * 2, s, 0, a); b.cyl(0.006, h, T); b.ball(0.014, L, { y: h, sy: 0.9 }); b.cone(0.012, 0.02, G('olive', 5, 11), { y: h + 0.006 }); b.pop(); } },
  spruce(b, c, r, s) { b.cyl(0.006 * s, 0.03 * s, c.trunk); for (let q = 0; q < 4; q++) { b.cone((0.034 - q * 0.006) * s, 0.04 * s, G('forest', 8.2 - q * 0.3, 11), { y: (0.02 + q * 0.026) * s }); b.cone((0.026 - q * 0.005) * s, 0.012 * s, G('snow', 0.4), { y: (0.046 + q * 0.026) * s, lod: 1 }); } },
  willow(b, c, r, s) { b.cyl(0.009 * s, 0.07 * s, c.trunk); b.ball(0.04 * s, G('olive', 4.6, 11), { y: 0.06 * s, sy: 0.8 }); for (let q = 0; q < 7; q++) { const a = (q / 7) * PI * 2; b.box(0.008 * s, 0.06 * s, 0.008 * s, G('olive', q % 2 ? 4 : 5.2, 11), { x: Math.cos(a) * 0.036 * s, z: Math.sin(a) * 0.036 * s, y: 0.012 * s }); } },
  dragon(b, c, r, s) { b.cyl(0.009 * s, 0.07 * s, G('earth', 8)); for (let q = 0; q < 5; q++) { const a = (q / 5) * PI * 2; b.box(0.006 * s, 0.03 * s, 0.006 * s, G('earth', 7.4), { x: Math.cos(a) * 0.012 * s, z: Math.sin(a) * 0.012 * s, y: 0.064 * s, rz: -Math.cos(a) * 0.6, rx: Math.sin(a) * 0.6 }); } b.cyl(0.044 * s, 0.014 * s, G('forest', 8, 11), { y: 0.09 * s }); b.cyl(0.03 * s, 0.01 * s, G('forest', 7, 11), { y: 0.104 * s }); },
  cherry(b, c, r, s) { b.cyl(0.007 * s, 0.05 * s, G('earth', 8)); b.ball(0.036 * s, G('pink', 2.6), { y: 0.05 * s }); b.ball(0.026 * s, G('pink', 1.8), { x: 0.018 * s, y: 0.078 * s }); b.ball(0.022 * s, G('pink', 3.2), { x: -0.02 * s, y: 0.07 * s, z: 0.01 * s }); for (let q = 0; q < 3; q++) b.box(0.006, 0.002, 0.006, G('pink', 2), { x: Math.cos(q * 2.1) * 0.04 * s, z: Math.sin(q * 2.1) * 0.04 * s, lod: 2 }); },
  juniper(b, c, r, s) { const T = G('sand', 5.4); b.push(0, 0, 0, r() * PI * 2, s, 0, 0.35); b.cyl(0.008, 0.04, T); b.push(0, 0.038, 0, 0, 1, 0, -0.7); b.cyl(0.006, 0.04, T); b.ball(0.024, G('forest', 7.6, 11), { y: 0.04, sy: 0.7 }); b.pop(); b.ball(0.02, G('forest', 8.2, 11), { x: -0.014, y: 0.05, sy: 0.7 }); b.pop(); },
  banana(b, c, r, s) { b.cyl(0.008 * s, 0.07 * s, G('grass', 5.4)); for (let q = 0; q < 5; q++) { const a = (q / 5) * PI * 2 + 0.3; b.box(0.06 * s, 0.004, 0.022 * s, G('grass', q % 2 ? 4 : 5, 11), { x: Math.cos(a) * 0.028 * s, z: Math.sin(a) * 0.028 * s, y: 0.074 * s, ry: -a, rz: -0.5 }); } b.box(0.012 * s, 0.022 * s, 0.012 * s, G('yellow', 3.4), { x: 0.012 * s, y: 0.05 * s, lod: 1 }); },
  larch(b, c, r, s) { b.cyl(0.006 * s, 0.04 * s, c.trunk); for (let q = 0; q < 4; q++) b.cone((0.03 - q * 0.006) * s, 0.044 * s, G('yellow', 4.6 + q * 0.3, 11), { y: (0.024 + q * 0.03) * s }); },
  gem(b, c, r, s) { b.cyl(0.006 * s, 0.05 * s, G('neutral', 2)); for (let q = 0; q < 5; q++) { const a = (q / 5) * PI * 2; b.pyr(0.014 * s, 0.04 * s, 0.014 * s, [ROW.amethyst, 2.6 + (q % 3), 2, 0], { x: Math.cos(a) * 0.016 * s, z: Math.sin(a) * 0.016 * s, y: 0.046 * s, rz: -Math.cos(a) * 0.7, rx: Math.sin(a) * 0.7 }); } b.pyr(0.016 * s, 0.05 * s, 0.016 * s, [ROW.pink, 2.4, 2, 0], { y: 0.05 * s }); },
  mangrove(b, c, r, s) { for (let q = 0; q < 5; q++) { const a = (q / 5) * PI * 2; b.box(0.005 * s, 0.05 * s, 0.005 * s, G('earth', 7.6), { x: Math.cos(a) * 0.022 * s, z: Math.sin(a) * 0.022 * s, y: -0.012, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 }); } b.cyl(0.007 * s, 0.04 * s, G('earth', 7.6), { y: 0.03 * s }); b.ball(0.036 * s, G('forest', 6.6, 11), { y: 0.062 * s, sy: 0.7 }); b.ball(0.022 * s, G('grass', 5.4, 11), { x: 0.014 * s, y: 0.088 * s, sy: 0.7 }); },
  poplar(b, c, r, s) { b.cyl(0.006 * s, 0.03 * s, c.trunk); b.ball(0.02 * s, G('grass', 5.8, 11), { y: 0.022 * s, sy: 2.6 }); b.ball(0.014 * s, G('grass', 4.8, 11), { y: 0.082 * s, sy: 2.2 }); },
  baobab(b, c, r, s) { b.cyl(0.02 * s, 0.07 * s, G('earth', 5.4), { t: 0.3 }); for (let q = 0; q < 5; q++) { const a = (q / 5) * PI * 2 + 0.5; b.box(0.006 * s, 0.03 * s, 0.006 * s, G('earth', 6), { x: Math.cos(a) * 0.012 * s, z: Math.sin(a) * 0.012 * s, y: 0.066 * s, rz: -Math.cos(a) * 0.8, rx: Math.sin(a) * 0.8 }); b.ball(0.014 * s, G('olive', 5.4, 11), { x: Math.cos(a) * 0.034 * s, z: Math.sin(a) * 0.034 * s, y: 0.084 * s, sy: 0.6 }); } },
  ginkgo(b, c, r, s) { b.box(0.04 * s, 0.01, 0.04 * s, G('rock', 4.4)); b.cyl(0.006 * s, 0.06 * s, G('earth', 8), { y: 0.01 }); b.ball(0.032 * s, G('yellow', 3.4, 11), { y: 0.06 * s, sy: 1.2 }); b.ball(0.022 * s, G('yellow', 2.6, 11), { x: 0.01 * s, y: 0.092 * s }); },
  magnolia(b, c, r, s) { b.cyl(0.007 * s, 0.045 * s, G('earth', 8)); b.ball(0.034 * s, G('forest', 6.4, 11), { y: 0.046 * s }); for (let q = 0; q < 6; q++) { const a = q * 1.05; b.ball(0.009 * s, G('pink', q % 2 ? 1.4 : 0.6), { x: Math.cos(a) * 0.03 * s, z: Math.sin(a) * 0.03 * s, y: (0.06 + (q % 3) * 0.014) * s, lod: 1 }); } },
};
export const NATURE_STYLES = new Set(['woodland', 'orchard', 'farmland', 'vineyard', 'flowers', 'boulders', 'palms']);
export const LAND_STYLE_IDS = Object.keys(STYLES);   // the scenery for a region with land (the samples use these)
for (const [k, v] of Object.entries(OPEN_STYLES)) { STYLES[k] = v[0]; if (v[2]) NATURE_STYLES.add(k); }   // and the scenery of the ocean and of the sky
export const STYLE_IDS = Object.keys(STYLES);
// Which kind of biome has this scenery: 'land', 'ocean', or 'sky'.
export const styleBiome = (k) => (OPEN_STYLES[k] ? OPEN_STYLES[k][1] : 'land');

// A grid of windows on the front wall (the window style draws its own sill). shut = add shutters.
function wins(b, c, w, h, z, cols, rows, y0 = 0.02, shut = false) {
  const ww = Math.min(0.022, (w * 0.7) / cols), hh = Math.min(0.03, (h * 0.6) / rows);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = (i - (cols - 1) / 2) * (w / cols), y = y0 + j * ((h - y0) / rows) + 0.008;
    b.box(ww, hh, 0.01, c.win(), { x, y, z, lod: 1 });
    if (shut) for (const s of [-1, 1]) b.box(ww * 0.42, hh, 0.006, c.s(0.7), { x: x + s * ww * 0.74, y, z: z + 0.001, lod: 2 });
  }
}
// A door with a step and a lintel.
function door(b, c, x, z, w = 0.018, h = 0.032) {
  b.box(w, h, 0.01, c.s(0.85), { x, z, lod: 1 });
  b.box(w * 1.5, 0.004, 0.016, c.W, { x, y: h, z, lod: 2 });
  b.box(w * 1.7, 0.005, 0.02, c.stone(0.3), { x, z: z + 0.008, lod: 2 });
}
// Windows on the other three walls of a box building.
function winsAround(b, c, w, h, d, cols, rows, y0, shut) {
  for (const [ry, ww, dd] of [[PI / 2, d, w], [PI, w, d], [-PI / 2, d, w]]) { b.push(0, 0, 0, ry); wins(b, c, ww, h, dd / 2, cols, rows, y0, shut); b.pop(); }
}
// Things on a flat roof: a low wall, then a tank, a mast, an air unit, solar panels, or a skylight.
function roofKit(b, c, r, w, d, y, ox = 0) {
  for (const s of [-1, 1]) { b.box(w, 0.007, 0.004, c.stone(0.35), { x: ox, y, z: s * (d / 2 - 0.002), lod: 1 }); b.box(0.004, 0.007, d, c.stone(0.35), { y, x: ox + s * (w / 2 - 0.002), lod: 1 }); }
  const n = r() < 0.5 ? 3 : 2, t0 = r.int(0, 4);
  for (let i = 0; i < n; i++) {
    const x = ox + (i - (n - 1) / 2) * w * 0.3 + (r() - 0.5) * 0.01, z = (r() - 0.5) * d * 0.5, t = (t0 + i * 2) % 5;
    if (t === 0) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.003, 0.012, 0.003, c.K, { x: x + sx * 0.008, y, z: z + sz * 0.008, lod: 2 }); b.box(0.022, 0.018, 0.022, c.wood, { x, y: y + 0.012, z, lod: 1, pat: 3 }); b.pyr(0.026, 0.008, 0.026, c.stone(0.6), { x, y: y + 0.03, z, lod: 2 }); }
    else if (t === 1) { b.box(0.002, 0.05, 0.002, c.K, { x, y, z, lod: 1 }); for (let j = 0; j < 3; j++) b.box(0.016 - j * 0.004, 0.0015, 0.0015, c.K, { x, y: y + 0.03 + j * 0.007, z, lod: 2 }); }
    else if (t === 2) { b.box(0.02, 0.01, 0.014, c.W, { x, y, z, lod: 1 }); b.box(0.012, 0.002, 0.008, c.K, { x, y: y + 0.01, z, lod: 2 }); }
    else if (t === 3) { for (let j = 0; j < 2; j++) b.box(0.018, 0.002, 0.014, [ROW.sea, 8.2], { x: x + (j - 0.5) * 0.021, y: y + 0.007, z, rx: -0.4, lod: 1 }); }
    else { b.box(0.022, 0.006, 0.016, c.stone(0.3), { x, y, z, lod: 1 }); b.box(0.018, 0.003, 0.012, c.win(), { x, y: y + 0.006, z, lod: 2 }); }
  }
}
// A balcony: a slab and a thin rail.
function balcony(b, c, x, y, z, w) {
  b.box(w, 0.003, 0.014, c.stone(0.3), { x, y, z: z + 0.007, lod: 1 });
  b.box(w, 0.0015, 0.0015, c.K, { x, y: y + 0.012, z: z + 0.013, lod: 2 });
  for (let i = 0; i < 4; i++) b.box(0.0015, 0.012, 0.0015, c.K, { x: x + (i / 3 - 0.5) * (w - 0.002), y: y + 0.003, z: z + 0.013, lod: 2 });
}
// A striped awning over a door or a shop window.
function awning(b, c, x, y, z, w) { const n = 5; for (let i = 0; i < n; i++) b.box(w / n, 0.003, 0.02, i % 2 ? c.W : c.a(0.55), { x: x + (i - (n - 1) / 2) * (w / n), y, z: z + 0.008, rx: 0.4, lod: 1 }); }
const pot = (b, c, x, z) => { b.cyl(0.006, 0.008, c.soil(0.4), { x, z, lod: 2 }); b.ball(0.008, c.f(0.75), { x, z, y: 0.007, lod: 2, k: 11 }); };

// Thin glass strips on all four walls of a box (w x h x d), from height y0. n strips on each wall.
function strips(b, c, w, h, d, y0, n, lod = 1) {
  for (let q = 0; q < 4; q++) { const ww = q % 2 ? d : w, dd = q % 2 ? w : d; b.push(0, 0, 0, q * PI / 2); for (let i = 0; i < n; i++) b.box((ww * 0.6) / n, h, 0.006, c.win(), { x: (i - (n - 1) / 2) * ((ww * 0.86) / n), y: y0, z: dd / 2 - 0.001, lod: q ? 2 : lod }); b.pop(); }
}
// A wood water tank on legs (a city roof).
function tank(b, c, x, y, z) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.003, 0.014, 0.003, c.K, { x: x + sx * 0.008, y, z: z + sz * 0.008, lod: 2 });
  b.cyl(0.013, 0.02, c.wood, { x, y: y + 0.014, z, pat: 3, lod: 1 }); b.cone(0.015, 0.01, c.stone(0.6), { x, y: y + 0.034, z, lod: 1 });
}
// A ruined temple: a stepped base, a ring of columns (some are broken), parts of the beam, and one roof end.
function temple(b, c, r) {
  const st = (l) => c.stone(l), y0 = 0.03, ch = 0.115, xs = [-0.1, -0.06, -0.02, 0.02, 0.06, 0.1], zs = [-0.055, -0.018, 0.018, 0.055];
  b.box(0.275, 0.05, 0.175, st(0.5), { y: -0.05 });
  for (let i = 0; i < 3; i++) b.box(0.265 - i * 0.02, 0.01, 0.165 - i * 0.02, st(0.22 + i * 0.06), { y: i * 0.01 });
  const full = {}, col = (x, z, whole) => {
    const h = whole ? ch : r.range(0.02, 0.085); full[x + ',' + z] = whole;
    b.cyl(0.009, h, st(0.1), { x, y: y0, z }); b.box(0.022, 0.004, 0.022, st(0.3), { x, y: y0, z, lod: 1 });
    if (whole) b.box(0.024, 0.006, 0.024, st(0.18), { x, y: y0 + ch - 0.006, z, lod: 1 }); else b.box(0.014, 0.004, 0.014, st(0.4), { x, y: y0 + h, z, lod: 2 });
  };
  for (const x of xs) for (const z of [zs[0], zs[3]]) col(x, z, x < -0.05 || r() < 0.55);
  for (const x of [xs[0], xs[5]]) for (const z of [zs[1], zs[2]]) col(x, z, x < 0 || r() < 0.4);
  for (const z of [zs[0], zs[3]]) for (let i = 0; i < 5; i++) if (full[xs[i] + ',' + z] && full[xs[i + 1] + ',' + z]) b.box(0.052, 0.016, 0.024, st(0.15), { x: xs[i] + 0.02, y: y0 + ch, z });
  b.box(0.024, 0.016, 0.134, st(0.15), { x: xs[0], y: y0 + ch });
  b.push(xs[0], y0 + ch + 0.016, 0, PI / 2); b.gable(0.134, 0.032, 0.024, st(0.2)); b.pop();
  b.box(0.11, 0.07, 0.01, st(0.3), { x: -0.03, y: y0, z: -0.022 }); b.box(0.01, 0.05, 0.05, st(0.34), { x: -0.085, y: y0, z: 0 }); b.box(0.05, 0.035, 0.01, st(0.38), { x: 0.02, y: y0, z: 0.022 });
  b.cyl(0.009, 0.05, st(0.2), { x: 0.07, y: y0 + 0.009, z: 0.005, rx: PI / 2, ry: 0.5 }); b.cyl(0.009, 0.03, st(0.3), { x: 0.16, y: 0.009, z: 0.06, rx: PI / 2, ry: 2.1 });
  for (let i = 0; i < 6; i++) b.box(r.range(0.012, 0.03), r.range(0.008, 0.018), r.range(0.012, 0.024), st(r.range(0.2, 0.5)), { x: r.range(-0.02, 0.15), y: i < 3 ? y0 : 0, z: i < 3 ? r.range(-0.03, 0.03) : (r() < 0.5 ? -1 : 1) * r.range(0.09, 0.11), ry: r() * 3, lod: 1 });
  b.ball(0.014, c.f(0.8), { x: 0.11, y: y0, z: -0.03, sy: 0.6, k: 11, lod: 1 }); b.ball(0.012, c.f(0.6), { x: -0.14, y: 0, z: 0.07, sy: 0.6, k: 11, lod: 1 });
  return [0.23, 0];
}

export function building(b, style, c, r, wh, opt = {}) {
  const k = 1 + (r() - 0.5) * wh * 0.8;
  let top = 0;
  switch (style) {
    case 'minimal': {
      // Modern Minimal: low white boxes, wide glass, one volume that hangs over the other, thin roof slabs, one accent wall.
      b.wall = 0;
      const w = r.range(0.09, 0.125) * k, d = r.range(0.07, 0.09), h1 = 0.046, two = r() < 0.65, sx = r() < 0.5 ? 1 : -1;
      b.box(w * 1.04, 0.004, d * 1.04, c.stone(0.3));
      b.box(w, h1, d, c.W, { y: 0.004 });
      b.box(w * 0.5, h1 * 0.8, 0.008, c.win(), { x: -sx * w * 0.18, y: 0.008, z: d / 2 }); b.box(w * 0.13, h1 * 0.84, 0.008, c.a(0.55), { x: sx * w * 0.3, y: 0.004, z: d / 2, pat: 0, lod: 1 });   // the door is the one spot of accent color
      b.push(0, 0, 0, sx * PI / 2); b.box(d * 0.5, h1 * 0.5, 0.008, c.win(), { y: h1 * 0.36, z: w / 2, lod: 1 }); b.pop();
      b.box(w * 1.1, 0.004, d * 1.14, c.stone(0.55), { y: h1 + 0.004 });
      top = h1 + 0.008;
      if (two) {
        const w2 = w * 0.72, d2 = d * 0.86, ox = sx * w * 0.22, oz = d * 0.14;
        b.box(w2, h1 * 0.92, d2, r() < 0.5 ? c.s(0.2) : c.W, { x: ox, y: top, z: oz });
        b.box(w2 * 0.74, h1 * 0.66, 0.008, c.win(), { x: ox, y: top + 0.006, z: oz + d2 / 2 });
        b.push(ox, top, oz, sx * PI / 2); b.box(d2 * 0.6, h1 * 0.5, 0.008, c.win(), { y: h1 * 0.2, z: w2 / 2, lod: 1 }); b.pop();
        b.box(w2 * 1.08, 0.004, d2 * 1.1, c.stone(0.55), { x: ox, y: top + h1 * 0.92 });
        b.box(0.004, 0.01, d * 0.5, c.K, { x: -sx * w * 0.3, y: top, z: 0, lod: 2 }); b.box(w * 0.34, 0.01, 0.003, c.K, { x: -sx * w * 0.3, y: top, z: d * 0.5, lod: 2 });   // a glass rail on the roof deck
        top += h1 * 0.92 + 0.004;
      }
      b.box(0.006, h1 + 0.004, d * 0.6, c.wood, { x: -sx * (w / 2 + 0.003), y: 0.004, z: -d * 0.15, pat: 3 });   // a wood screen wall
      if (r() < 0.55) { b.box(w * 0.62, 0.004, 0.05, c.stone(0.2), { x: -sx * w * 0.1, z: d / 2 + 0.03 }); b.wcol(w * 0.42, 0.005, 0.026, [ROW.sea, 5, 5, 0.45], { x: -sx * w * 0.12, y: 0.003, z: d / 2 + 0.034 }); }   // a deck with a long pool
      else { b.box(w * 0.4, 0.003, 0.04, c.wood, { x: -sx * w * 0.1, z: d / 2 + 0.024, pat: 3, lod: 1 }); pot(b, c, -sx * w * 0.26, d / 2 + 0.03); }
      return [w * 0.78, top, 0];
    }
    case 'organic': {
      b.wall = 0;
      const R = r.range(0.04, 0.062) * k, h = r.range(0.03, 0.08);
      b.cyl(R, h, c.s(0.2)); b.dome(R, R * r.range(0.9, 1.5), r() < 0.5 ? c.a(0.5) : c.s(0.45), { y: h });
      b.cyl(R * 1.04, 0.006, c.stone(0.35));
      b.half(R * 0.7, R * 0.6, 0.012, c.s(0.85), { z: R - 0.002, lod: 1 });
      for (const sd of [-1, 1]) { b.push(0, 0, 0, sd * PI / 2); b.box(0.015, Math.min(0.018, h * 0.5), 0.008, c.win(), { y: h * 0.32, z: R - 0.003, lod: 1 }); b.pop(); }   // glass windows on the two sides
      b.cyl(0.005, 0.03, c.stone(0.6), { x: -R * 0.4, y: h + R * 0.7, z: -R * 0.3, lod: 1 });
      if (r() < 0.6) { const x = R * 1.35; b.dome(R * 0.5, R * 0.5, c.a(0.6), { x, y: h * 0.7 }); b.cyl(R * 0.5, h * 0.7, c.s(0.25), { x }); b.box(0.011, 0.012, 0.006, c.win(), { x, y: h * 0.28, z: R * 0.5 - 0.002, lod: 1 }); }
      pot(b, c, R * 0.9, R * 0.9);
      return [R * 1.5, 0];
    }
    case 'city': {
      // Modern City: stepped stone towers with spires, glass towers, and brick walk-ups with roof water tanks and fire stairs.
      const kind = r();
      if (kind < 0.4) {
        b.wall = 0;
        const w = r.range(0.06, 0.08) * k, h = r.range(0.3, 0.5) * (1 + wh * 0.2), col = c.stone(r.range(0.1, 0.3));
        let y = 0;
        b.box(w * 1.08, 0.012, w * 1.08, c.stone(0.5));
        [[1, 0.45], [0.78, 0.3], [0.56, 0.17], [0.34, 0.08]].forEach(([f, hf], i) => {
          const hh = h * hf; b.box(w * f, hh, w * f, col, { y, pat: 0 }); strips(b, c, w * f, hh * 0.84, w * f, y + hh * 0.08, i < 2 ? 3 : 2, i < 2 ? 1 : 2);
          b.box(w * f * 1.05, 0.004, w * f * 1.05, c.a(0.6), { y: y + hh, lod: 1 }); y += hh;
        });
        b.pyr(w * 0.3, h * 0.05, w * 0.3, c.a(0.6), { y }); b.box(0.003, h * 0.1, 0.003, c.K, { y: y + h * 0.04 }); b.box(0.006, 0.006, 0.006, [ROW.red, 5, 2, 0.3], { y: y + h * 0.14, lod: 1 });
        door(b, c, 0, (w * 1.08) / 2, 0.022, 0.03);
        return [w * 0.78, 0];
      }
      if (kind < 0.7) {
        b.wall = 0;
        const w = r.range(0.06, 0.085) * k, d = r.range(0.05, 0.07), h = r.range(0.2, 0.4) * (1 + wh * 0.2), nf = Math.floor((h - 0.03) / 0.03);
        b.box(w * 1.05, 0.006, d * 1.05, c.stone(0.5)); b.box(w, h, d, r() < 0.5 ? c.s(0.5) : c.stone(0.7), { pat: 0 });
        for (let q = 0; q < 4; q++) { const ww = q % 2 ? d : w, dd = q % 2 ? w : d; b.push(0, 0, 0, q * PI / 2); for (let j = 0; j < nf; j++) b.box(ww * 0.9, 0.021, 0.005, c.win(), { y: 0.03 + j * 0.03, z: dd / 2, lod: q ? 2 : 1 }); b.pop(); }
        b.box(w * 0.6, 0.022, 0.006, c.win(true), { y: 0.005, z: d / 2 }); b.box(w * 0.7, 0.003, 0.016, c.a(0.5), { y: 0.028, z: d / 2 + 0.006, lod: 1 });
        b.box(w * 0.5, 0.014, d * 0.5, c.stone(0.55), { y: h }); b.box(0.002, 0.05, 0.002, c.K, { x: w * 0.15, y: h + 0.014, lod: 1 });
        return [w * 0.74, h, 0];
      }
      b.wall = 2;
      const w = r.range(0.07, 0.095) * k, d = r.range(0.06, 0.08), nf = r.int(3, 5), fh = 0.03, h = nf * fh + 0.01;
      b.box(w, h, d, [ROW.earth, r.range(4.4, 6.2)]); b.box(w * 1.03, 0.005, d * 1.03, c.stone(0.5), { y: h - 0.012, lod: 1 }); b.box(w * 1.07, 0.008, d * 1.07, c.stone(0.3), { y: h });
      wins(b, c, w, h - 0.012, d / 2, 3, nf - 1, fh); winsAround(b, c, w, h - 0.012, d, 2, nf - 1, fh);
      b.box(w * 0.46, fh * 0.7, 0.008, c.win(true), { x: -w * 0.2, y: 0.004, z: d / 2 }); door(b, c, w * 0.28, d / 2, 0.016, 0.024); awning(b, c, -w * 0.2, fh * 0.84, d / 2, w * 0.52);
      for (let j = 1; j < nf; j++) {   // the fire stairs
        b.box(w * 0.3, 0.002, 0.012, c.K, { x: w * 0.3, y: j * fh + 0.004, z: d / 2 + 0.006, lod: 2 }); b.box(w * 0.3, 0.001, 0.001, c.K, { x: w * 0.3, y: j * fh + 0.013, z: d / 2 + 0.012, lod: 2 });
        b.box(0.002, fh, 0.002, c.K, { x: w * (0.2 + (j % 2) * 0.2), y: (j - 1) * fh + 0.006, z: d / 2 + 0.011, lod: 2 });
      }
      tank(b, c, (r() - 0.5) * w * 0.4, h + 0.008, (r() - 0.5) * d * 0.3);
      if (r() < 0.4) { b.box(0.022, 0.007, 0.011, [ROW.yellow, 4.5], { x: -w * 0.1, z: d / 2 + 0.035, lod: 2 }); b.box(0.011, 0.005, 0.01, [ROW.yellow, 4.5], { x: -w * 0.1, y: 0.007, z: d / 2 + 0.035, lod: 2 }); }   // a yellow cab
      return [w * 0.74, h + 0.008, 0];
    }
    case 'whimsical': {
      b.wall = 2;
      const R = r.range(0.03, 0.045) * k, h = r.range(0.09, 0.2) * (1 + wh * 0.5);
      b.push(0, 0, 0, 0, 1, (r() - 0.5) * 0.3 * wh, (r() - 0.5) * 0.4 * wh);
      b.cyl(R, h, c.s(0.2), { t: 0.18 });
      b.cone(R * 1.6, h * r.range(0.5, 0.9), c.a(0.55), { y: h, x: (r() - 0.5) * 0.02, rz: (r() - 0.5) * 0.35 });
      b.box(0.014, 0.02, 0.008, c.win(), { y: h * 0.52, z: R * 0.84, lod: 1 }); b.box(0.012, 0.016, 0.008, c.win(), { y: h * 0.3, z: R * 0.9, lod: 2 }); b.box(0.018, 0.03, 0.01, c.s(0.85), { z: R, lod: 1 });
      b.cyl(R * 1.25, 0.006, c.s(0.6), { y: h * 0.72, lod: 1 });
      b.pop();
      if (r() < 0.5) { const x = R * 2; b.cyl(R * 0.6, h * 0.5, c.s(0.4), { x, t: 0.2 }); b.cone(R, h * 0.35, c.a(0.75), { x, y: h * 0.5 }); }
      pot(b, c, -R * 1.3, R * 0.8);
      return [R * 2, 0];
    }
    case 'modular': {
      b.wall = 3;
      const u = 0.052 * k, nx = r.int(1, 2), nz = r.int(1, 2);
      for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
        const nn = r.int(1, 3), x = (ix - (nx - 1) / 2) * u, z = (iz - (nz - 1) / 2) * u;
        for (let j = 0; j < nn; j++) {
          b.box(u * 0.92, u * 0.92, u * 0.92, (ix + iz + j) % 2 ? c.s(0.2) : c.s(0.5), { x, z, y: j * u });
          if (iz === nz - 1) { b.box(u * 0.5, u * 0.4, 0.01, c.win(), { x, y: j * u + u * 0.3, z: z + u * 0.46, lod: 1 }); if (j) balcony(b, c, x, j * u + u * 0.08, z + u * 0.46, u * 0.72); }
        }
        b.box(u, 0.01, u, c.a(0.6), { x, z, y: nn * u - 0.004 });
        top = nn * u;
      }
      for (let i = 0; i < 4; i++) b.box(0.014, 0.008 + i * 0.008, 0.012, c.stone(0.4), { x: (nx * u) / 2 + 0.008, z: -0.02 + i * 0.012, lod: 2 });
      return [u * 1.15, 0];
    }
    case 'tower': {
      b.wall = 5;
      const w = r.range(0.04, 0.058) * k, h = r.range(0.18, 0.4) * (1 + wh * 0.3), round = r() < 0.4;
      if (round) { b.cyl(w / 2, h, c.s(0.2), { t: 0.12 }); b.cone(w * 0.62, w * 1.5, c.a(0.6), { y: h }); b.cyl(w * 0.62, 0.006, c.s(0.7), { y: h * 0.8, lod: 1 }); }
      else { b.box(w, h, w, c.s(0.2), { t: 0.1 }); b.box(w * 1.05, 0.012, w * 1.05, c.W, { y: h }); b.pyr(w, w * 1.4, w, c.a(0.6), { y: h + 0.012 }); b.box(w * 1.12, 0.005, w * 1.12, c.s(0.7), { y: h * 0.78, lod: 1 }); }
      // A wide base in three steps, so the tower stands firm.
      if (round) { b.cyl(w * 1.05, h * 0.05, c.stone(0.45)); b.cyl(w * 0.86, h * 0.09, c.stone(0.3), { y: h * 0.05, t: 0.2 }); b.cyl(w * 0.68, h * 0.14, c.s(0.3), { y: h * 0.14, t: 0.24 }); }
      else { b.box(w * 2.1, h * 0.05, w * 2.1, c.stone(0.45)); b.box(w * 1.72, h * 0.09, w * 1.72, c.stone(0.3), { y: h * 0.05, t: 0.2 }); b.box(w * 1.36, h * 0.14, w * 1.36, c.s(0.3), { y: h * 0.14, t: 0.24 }); }
      b.box(0.02, 0.03, 0.008, c.K, { y: h * 0.05, z: w * (round ? 0.84 : 0.86), lod: 1 });
      const nn = Math.floor(h / 0.06);
      for (let j = 0; j < nn; j++) b.box(0.014, 0.024, 0.01, c.win(), { y: 0.03 + j * 0.06, z: w / 2 - 0.003 - j * 0.0012, lod: 1 });
      for (let q = 1; q < 4; q++) { b.push(0, 0, 0, q * PI / 2); for (let j = q % 2; j < nn; j += 2) b.box(0.012, 0.02, 0.01, c.win(), { y: 0.03 + j * 0.06, z: w / 2 - 0.003 - j * 0.0012, lod: 2 }); b.pop(); }
      b.cyl(0.002, 0.03, c.K, { y: h + w * 1.4, lod: 2 }); b.box(0.014, 0.008, 0.002, c.a(0.4), { x: 0.008, y: h + w * 1.4 + 0.02, lod: 2 });
      return [w * 1.2, 0];
    }
    case 'village': {
      b.wall = r() < 0.5 ? 3 : 0;
      const w = r.range(0.065, 0.095) * k, d = r.range(0.06, 0.085), h = r.range(0.04, 0.065);
      const rh = h * r.range(0.7, 1.1); top = h + rh;
      b.box(w, h, d, r() < 0.5 ? c.s(0.15) : c.W); b.gable(w * 1.12, rh, d * 1.12, c.a(r.range(0.5, 0.75)), { y: h });
      b.box(w * 1.04, 0.006, d * 1.04, c.stone(0.4));
      door(b, c, w * 0.2, d / 2, 0.016, 0.03);
      b.box(0.018, 0.018, 0.01, c.win(), { x: -w * 0.2, y: h * 0.4, z: d / 2, lod: 1 });
      for (const s of [-1, 1]) b.box(0.007, 0.018, 0.006, c.s(0.7), { x: -w * 0.2 + s * 0.013, y: h * 0.4, z: d / 2 + 0.001, lod: 2 });
      if (r() < 0.7) { b.box(0.014, h * 0.9, 0.014, c.stone(0.55), { x: -w * 0.25, y: h, z: -d * 0.2 }); b.box(0.018, 0.004, 0.018, c.stone(0.3), { x: -w * 0.25, y: h * 1.9, z: -d * 0.2, lod: 2 }); }
      b.push(0, 0, 0, PI / 2); b.box(0.016, 0.016, 0.01, c.win(), { y: h * 0.4, z: w / 2, lod: 1 }); b.pop();
      b.box(0.01, 0.01, 0.008, c.win(), { y: h + rh * 0.2, z: d * 0.56, lod: 2 });
      if (r() < 0.5) { b.push(w * 0.3, h + rh * 0.16, 0, PI / 2); b.box(0.022, 0.016, 0.03, c.W, { lod: 1 }); b.gable(0.028, 0.01, 0.034, c.a(0.7), { y: 0.016, lod: 1 }); b.box(0.01, 0.01, 0.004, c.win(), { y: 0.003, z: 0.015, lod: 2 }); b.pop(); }
      if (r() < 0.5) for (let i = 0; i < 3; i++) b.box(0.02, 0.005, 0.008, c.wood, { x: w * 0.56, y: i * 0.005, z: -d * 0.2 + (i % 2) * 0.002, lod: 2 });
      if (r() < 0.6) pot(b, c, w * 0.4, d / 2 + 0.01);
      // A little garden at the side of the house: soil, rows of plants and flowers, a picket fence, a gate at the front.
      { const gs = r() < 0.5 ? 1 : -1, gw = 0.05, gd = d * 0.95, gx = gs * (w / 2 + gw / 2 + 0.006), fl = [[ROW.coral, 3.4], [ROW.autumn, 2.6], [ROW.plaster, 0.5], [ROW.amethyst, 3.6]];
        b.box(gw, 0.004, gd, c.soil(0.65), { x: gx, lod: 1 });
        for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { const x = gx + (i - 0.5) * 0.022, z = -gd * 0.36 + j * gd * 0.24, hh = 0.007 + r() * 0.007; b.box(0.008, hh, 0.008, c.f(0.5 + r() * 0.4), { x, y: 0.004, z, k: 11, lod: 1 }); if ((i + j) % 2) b.box(0.006, 0.005, 0.006, fl[r.int(0, 3)], { x, y: 0.004 + hh, z, lod: 2 }); }
        for (let j = 0; j <= 5; j++) b.box(0.003, 0.013, 0.003, c.W, { x: gx + gs * gw / 2, z: -gd / 2 + (j / 5) * gd, lod: 2 });
        b.box(0.002, 0.002, gd, c.W, { x: gx + gs * gw / 2, y: 0.008, lod: 2 });
        for (const e of [-1, 1]) { for (let j = 0; j < 3; j++) if (!(e > 0 && j === 1)) b.box(0.003, 0.013, 0.003, c.W, { x: gx + (j / 2 - 0.5) * gw, z: e * gd / 2, lod: 2 }); if (e < 0) b.box(gw, 0.002, 0.002, c.W, { x: gx, y: 0.008, z: e * gd / 2, lod: 2 }); }
        if (r() < 0.5) { b.box(0.006, 0.02, 0.006, c.trunk, { x: gx, z: -gd * 0.3, lod: 1 }); b.ball(0.016, c.f(0.7), { x: gx, y: 0.018, z: -gd * 0.3, k: 11, lod: 1 }); }
      }
      return [w * 0.95, top, 0];
    }
    case 'grand': {
      // Grand Avenue: old-style city blocks. A stone base with arches, a tall body with rows of windows, a heavy top edge, and a fancy roof.
      b.wall = 0;
      const w = r.range(0.075, 0.105) * k, d = r.range(0.065, 0.085), nf = r.int(4, 8), fh = 0.028, hb = 0.04, h = hb + nf * fh, body = r() < 0.6 ? c.W : c.s(0.2);
      b.box(w * 1.04, hb, d * 1.04, c.stone(0.42), { pat: 5 }); b.box(w * 1.08, 0.006, d * 1.08, c.stone(0.2), { y: hb });
      for (const x of [-w * 0.32, 0, w * 0.32]) b.arch(w * 0.2, hb * 0.8, 0.012, c.K, { x, y: 0.002, z: d * 0.52 });
      b.box(w * 0.26, 0.004, 0.022, c.a(0.5), { y: hb * 0.86, z: d * 0.52 + 0.01, lod: 1 });
      b.box(w, nf * fh, d, body, { y: hb, pat: 0 });
      wins(b, c, w, h, d / 2, 3, nf, hb); winsAround(b, c, w, h, d, 2, nf, hb);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.007, nf * fh, 0.007, c.stone(0.25), { x: sx * w / 2, y: hb, z: sz * d / 2, lod: 1 });
      for (let j = 2; j < nf; j += 3) b.box(w * 1.03, 0.004, d * 1.03, c.stone(0.25), { y: hb + j * fh, lod: 2 });
      b.box(w * 1.1, 0.008, d * 1.1, c.stone(0.2), { y: h }); b.box(w * 1.17, 0.006, d * 1.17, c.stone(0.36), { y: h + 0.008 });
      top = h + 0.014;
      const crown = r();
      if (crown < 0.38) {   // a steep roof with small roof windows
        b.box(w * 1.05, 0.036, d * 1.05, c.a(0.65), { y: top, t: 0.24, pat: 1 });
        for (const x of [-w * 0.28, 0, w * 0.28]) { b.box(0.014, 0.017, 0.01, c.W, { x, y: top + 0.005, z: d * 0.47, lod: 1 }); b.box(0.008, 0.009, 0.004, c.win(), { x, y: top + 0.009, z: d * 0.47 + 0.005, lod: 2 }); }
        b.box(w * 0.78, 0.004, d * 0.78, c.stone(0.5), { y: top + 0.036 }); top += 0.04;
      } else if (crown < 0.66) {   // a small dome at the corner
        const x = w * 0.3, z = d * 0.24; b.cyl(0.021, 0.022, c.W, { x, y: top, z }); b.dome(0.022, 0.024, c.a(0.55), { x, y: top + 0.022, z }); b.box(0.002, 0.016, 0.002, c.K, { x, y: top + 0.044, z, lod: 1 });
        roofKit(b, c, r, w * 0.5, d, top, -w * 0.2);
      } else if (crown < 0.86) {   // a clock tower
        const tw = w * 0.36; b.box(tw, 0.07, tw, body, { y: top, pat: 0 }); b.box(tw * 0.62, tw * 0.62, 0.004, c.W, { y: top + 0.03, z: tw / 2, lod: 1 }); b.box(0.002, tw * 0.24, 0.002, c.K, { y: top + 0.03 + tw * 0.3, z: tw / 2 + 0.003, lod: 2 }); b.box(tw * 0.2, 0.002, 0.002, c.K, { x: tw * 0.08, y: top + 0.03 + tw * 0.3, z: tw / 2 + 0.003, lod: 2 });
        b.box(tw * 1.16, 0.006, tw * 1.16, c.stone(0.3), { y: top + 0.07 }); b.pyr(tw * 1.05, 0.05, tw * 1.05, c.a(0.6), { y: top + 0.076 }); b.box(0.002, 0.02, 0.002, c.K, { y: top + 0.124, lod: 1 });
      } else roofKit(b, c, r, w, d, top);
      return [w * 0.8, top, 0];
    }
    case 'treehouse': {
      // Tree Houses: a round hut on a deck high in a great tree, with a ladder, a lamp, and leaves above. Plank bridges join the trees (see region.js).
      b.wall = 3;
      const h = r.range(0.27, 0.38) * (1 + wh * 0.15), tw = r.range(0.022, 0.03), py = h * r.range(0.4, 0.52), R = r.range(0.045, 0.058);
      const bark = [ROW.earth, 7.6], thatch = r() < 0.5 ? c.a(0.6) : [ROW.autumn, 4.4];
      b.cyl(tw * 1.6, 0.022, bark, { t: 0.35, pat: 0 }); b.cyl(tw, h, bark, { t: 0.25, pat: 0 });
      b.cyl(R * 1.25, 0.006, c.wood, { y: py, pat: 3 }); b.cyl(R * 0.7, 0.012, bark, { y: py - 0.012 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.39, e = R * 1.16; if (i !== 1) b.box(0.003, 0.014, 0.003, c.wood, { x: Math.cos(a) * e, y: py + 0.006, z: Math.sin(a) * e, lod: 2 }); }
      b.cyl(R * 0.8, 0.034, [ROW.sand, 3.8], { y: py + 0.006, pat: 3 }); b.cone(R * 1.12, R * 0.95, thatch, { y: py + 0.04 });
      b.box(0.012, 0.022, 0.006, bark, { x: -R * 0.16, y: py + 0.006, z: R * 0.8, lod: 1 }); b.box(0.011, 0.011, 0.006, c.win(), { x: R * 0.26, y: py + 0.018, z: R * 0.8, lod: 1 });
      for (const sx of [-1, 1]) b.box(0.002, py, 0.002, c.wood, { x: R * 0.45 + sx * 0.007, z: R * 1.27, lod: 2 });
      for (let i = 1; i * 0.014 < py; i++) b.box(0.014, 0.002, 0.002, c.wood, { x: R * 0.45, y: i * 0.014, z: R * 1.27, lod: 2 });
      b.box(0.002, 0.012, 0.002, c.K, { x: -R * 0.8, y: py - 0.012, z: R * 0.6, lod: 2 }); b.ball(0.007, c.lamp, { x: -R * 0.8, y: py - 0.026, z: R * 0.6, lod: 1 });
      b.ball(R * 1.5, c.f(0.75), { y: h - R * 0.5, k: 11 }); b.ball(R * 1.1, c.f(0.55), { x: R * 0.8, y: h + R * 0.3, z: -R * 0.3, k: 11 }); b.ball(R * 0.9, c.f(0.9), { x: -R * 0.9, y: h - R * 0.2, z: R * 0.4, k: 11 });
      if (r() < 0.5) { const yy = Math.min(h - 0.05, py + 0.04 + R * 0.95 + 0.012); b.cyl(R * 0.55, 0.008, c.wood, { x: 0, y: yy, pat: 3, lod: 1 }); b.box(0.002, 0.03, 0.002, c.K, { x: R * 0.4, y: yy + 0.008, lod: 2 }); b.box(0.014, 0.008, 0.002, c.a(0.5), { x: R * 0.4 + 0.008, y: yy + 0.03, lod: 2 }); }
      return [R * 1.5, 0, 0, py + 0.006];
    }
    case 'yurt': {
      // Yurts: round felt tents with a low wall, a roof with a crown ring, a bright door, and color bands.
      b.wall = 0;
      const R = r.range(0.042, 0.062) * k, hw = R * 0.62, tone = r.range(0.5, 1.6), felt = [ROW.plaster, tone], band = r() < 0.5 ? c.a(0.55) : c.s(0.7);
      b.cyl(R * 1.1, 0.005, c.stone(0.4)); b.cyl(R, hw, felt, { y: 0.005, pat: 0 });
      b.cyl(R * 1.02, 0.007, band, { y: 0.005 + hw * 0.7, lod: 1 }); b.cyl(R * 1.015, 0.003, c.wood, { y: 0.005 + hw * 0.32, lod: 2 });
      b.cyl(R * 1.08, R * 0.62, [ROW.plaster, tone + 0.9], { y: 0.005 + hw, t: 0.72, pat: 0 });
      b.cyl(R * 0.32, 0.008, band, { y: 0.005 + hw + R * 0.62 }); b.cyl(R * 0.2, 0.004, c.K, { y: 0.013 + hw + R * 0.62, lod: 1 });
      b.box(R * 0.5, hw * 0.92, 0.008, c.a(0.7), { y: 0.005, z: R - 0.002 }); b.box(R * 0.34, hw * 0.78, 0.004, c.wood, { y: 0.005, z: R + 0.004, pat: 3, lod: 1 }); b.box(R * 0.6, 0.005, 0.012, c.wood, { y: 0.005 + hw * 0.92, z: R - 0.002, lod: 1 });
      b.box(0.004, R * 0.55, 0.004, c.K, { x: R * 0.36, y: hw + R * 0.3, z: -R * 0.2, lod: 1 });
      const e = r();
      if (e < 0.35) for (let i = 0; i < 4; i++) b.box(0.022, 0.006, 0.008, c.wood, { x: R * 1.3, y: (i >> 1) * 0.006, z: R * 0.2 + (i % 2) * 0.009, lod: 2 });
      else if (e < 0.65) { const cx = -R * 1.9, rr = R * 0.62; for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2; b.box(0.003, 0.014, 0.003, c.wood, { x: cx + Math.cos(a) * rr, z: Math.sin(a) * rr, lod: 2 }); } b.box(0.02, 0.01, 0.01, [ROW.earth, 5], { x: cx, y: 0.008, lod: 2 }); b.box(0.007, 0.008, 0.007, [ROW.earth, 5], { x: cx + 0.012, y: 0.014, lod: 2 }); for (const sx of [-1, 1]) b.box(0.003, 0.008, 0.003, [ROW.earth, 7], { x: cx + sx * 0.007, lod: 2 }); }
      else if (e < 0.85) { for (const sx of [-1, 1]) b.box(0.003, 0.03, 0.003, c.wood, { x: R * 1.3, z: sx * R * 0.5, lod: 2 }); b.box(0.002, 0.002, R, c.K, { x: R * 1.3, y: 0.028, lod: 2 }); for (let i = 0; i < 4; i++) b.box(0.002, 0.012, 0.01, [c.a(0.5), c.W, c.s(0.7), c.W][i], { x: R * 1.3, y: 0.016, z: (i / 3 - 0.5) * R * 0.8, lod: 2 }); }
      return [R * 1.4, 0];
    }
    default: { // ruins
      if (opt.big) return temple(b, c, r);
      b.wall = 5;
      const nn = r.int(3, 5), R = 0.07 * k;
      for (let i = 0; i < nn; i++) {
        const a = (i / nn) * PI * 2 + r() * 0.5, x = Math.cos(a) * R, z = Math.sin(a) * R, h = r.range(0.03, 0.16);
        b.cyl(0.013, h, c.stone(0.15), { x, z }); b.cyl(0.017, 0.008, c.stone(0.4), { x, z });
        if (h > 0.12) b.box(0.036, 0.01, 0.036, c.stone(0.3), { x, z, y: h });
      }
      if (r() < 0.6) b.arch(0.09, 0.11, 0.025, c.stone(0.25), { ry: r() * PI });
      b.box(0.03, 0.022, 0.05, c.stone(0.5), { x: R * 0.4, z: -R * 0.3, ry: r() * 3, rz: 0.25 });
      b.box(0.022, 0.014, 0.03, c.stone(0.35), { x: -R * 0.5, z: R * 0.2, ry: r() * 3, lod: 1 });
      b.ball(0.016, c.f(0.8), { x: R * 0.2, z: R * 0.5, sy: 0.6, k: 11, lod: 1 });
      if (r() < 0.4) b.ball(0.01, c.lamp, { y: 0.02, lod: 1 });
      return [R * 1.3, 0];
    }
    // ---- Scenery that is not a building. No walls, no windows, no lamps.
    case 'woodland': {   // an old wood: tall, dark trees on a floor of moss, with a log, ferns, and red mushrooms. It does not look like the trees of the biome.
      b.auto = false;
      b.cyl(0.085, 0.006, G('forest', 8.4), { y: -0.002 }); b.cyl(0.06, 0.005, G('olive', 6.6), { x: 0.02, z: -0.01, y: 0.002 });
      const nn = r.int(4, 5);
      for (let i = 0; i < nn; i++) {
        const a = (i / nn) * PI * 2 + r() * 0.6, d = i ? r.range(0.04, 0.07) : 0.012, x = Math.cos(a) * d, z = Math.sin(a) * d, s = r.range(0.85, 1.2) * k, h = 0.13 * s;
        b.cyl(0.011 * s, h, G('earth', 8.6), { x, z, t: 0.25 });
        b.ball(0.05 * s, G('forest', 8), { x, z, y: h * 0.72, sy: 0.8, k: 11 }); b.ball(0.038 * s, G('forest', 7.2), { x: x + 0.014 * s, z: z - 0.008 * s, y: h * 1.02, sy: 0.8, k: 11 }); b.ball(0.026 * s, G('forest', 6.2), { x: x - 0.006 * s, z, y: h * 1.26, sy: 0.8, k: 11 });
      }
      b.cyl(0.009, 0.06, G('earth', 7.4), { x: 0.05, z: 0.05, y: 0.008, rz: PI / 2, ry: r() * 3 });   // a log on the ground
      for (let q = 0; q < 3; q++) { const a = q * 2.2 + r(), x = Math.cos(a) * 0.066, z = Math.sin(a) * 0.066; b.cyl(0.003, 0.012, G('plaster', 0.6), { x, z, lod: 1 }); b.dome(0.009, 0.007, G('red', 5), { x, z, y: 0.012, lod: 1 }); }
      for (let q = 0; q < 4; q++) { const a = q * 1.7 + 0.8, x = Math.cos(a) * 0.052, z = Math.sin(a) * 0.052; b.cone(0.012, 0.022, G('grass', 6.4, 11), { x, z, lod: 2 }); }
      b.auto = true; return [0.095, 0];
    }
    case 'orchard': {   // a square plot: nine small fruit trees in three rows
      b.auto = false;
      const fc = r() < 0.5 ? 2 : 3;   // red or orange fruit (palette rows)
      b.box(0.17, 0.004, 0.17, c.g ? c.g(0.5) : c.f(0.86));
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const x = i * 0.056, z = j * 0.056, s = 0.9 + ((i * 7 + j * 3 + 20) % 4) * 0.05;
        b.cyl(0.005, 0.03 * s, c.trunk, { x, z }); b.ball(0.024 * s, c.leaf(0.7), { x, z, y: 0.024 * s });
        for (let q = 0; q < 3; q++) { const a = q * 2.1 + i + j; b.ball(0.005, [fc, 5, 0, 0], { x: x + Math.cos(a) * 0.019 * s, y: 0.036 * s + (q % 2) * 0.01, z: z + Math.sin(a) * 0.019 * s, lod: 1 }); }
      }
      b.auto = true; return [0.095, 0];
    }
    case 'farmland': {   // a square plot with many rows of crops. Plots next to each other have different crops: the crop of the biome, wheat, greens, or a harvested plot with hay.
      b.auto = false;
      const W = 0.17, kind = r.int(0, 3), cs = c.crop, wet = kind === 0 && cs && cs.wet;
      b.box(W, 0.006, W, wet ? [ROW.sea, 4.4] : c.soil(0.62));
      for (const sd of [-1, 1]) { b.box(W + 0.008, 0.008, 0.005, c.soil(0.9), { z: sd * (W / 2 + 0.001) }); b.box(0.005, 0.008, W, c.soil(0.9), { x: sd * (W / 2 + 0.001) }); }   // a low bank around the plot
      if (kind === 3) {   // harvested: short stubble and hay bales
        for (let i = 0; i < 8; i++) b.box(W * 0.94, 0.004, 0.007, c.soil(0.12), { z: -0.07 + i * 0.02, y: 0.005 });
        for (const [x, z] of [[-0.04, -0.03], [0.045, 0.01], [-0.01, 0.05]]) b.cyl(0.014, 0.022, c.soil(0.02), { x, z, y: 0.019, rx: PI / 2 });
      } else for (let i = 0; i < 8; i++) for (let q = 0; q < 9; q++) {
        const x = -0.072 + q * 0.018, z = -0.07 + i * 0.02;
        if (kind === 0 && cs) { b.box(cs.stem[0], cs.stem[1], cs.stem[0], cs.stem[2], { x, z, y: 0.005 }); if (cs.head) b.box(cs.head[0], cs.head[1], cs.head[0], cs.head[2], { x, z, y: 0.005 + cs.stem[1], lod: 1 }); }
        else if (kind === 1 || kind === 0) { b.box(0.006, 0.026, 0.006, c.soil(0.06), { x, z, y: 0.005, k: 11 }); b.box(0.009, 0.01, 0.009, c.soil(0.0), { x, z, y: 0.031, lod: 1 }); }   // wheat
        else b.box(0.014, 0.012, 0.014, c.f(q % 2 ? 0.82 : 0.66), { x, z, y: 0.005, k: 11 });   // greens
      }
      b.auto = true; return [0.095, 0];
    }
    case 'vineyard': {   // a square plot: five straight rows of vines on posts and wires, with grapes
      b.auto = false;
      b.box(0.17, 0.004, 0.17, c.soil(0.55));
      for (let i = -2; i <= 2; i++) {
        const z = i * 0.034;
        for (const sx of [-1, 0, 1]) b.box(0.005, 0.034, 0.005, c.wood, { x: sx * 0.078, z });
        b.box(0.16, 0.002, 0.002, c.wood, { y: 0.03, z, lod: 1 }); b.box(0.16, 0.002, 0.002, c.wood, { y: 0.018, z, lod: 2 });
        b.box(0.15, 0.02, 0.014, c.f(0.74), { y: 0.012, z, k: 11 });
        for (let q = 0; q < 7; q++) b.ball(0.005, [6, 6, 0, 0], { x: -0.066 + q * 0.022, y: 0.012, z: z + 0.008, lod: 1 });
      }
      b.auto = true; return [0.095, 0];
    }
    case 'flowers': {   // a square plot of flowers in straight rows. Each row has one color, so the field has stripes. The two accent colors of the region are in it.
      b.auto = false;
      const cols = [c.a(0.45), c.s(0.5), [4, 3, 0, 0], c.W, [7, 3, 0, 0]], off = r.int(0, 4);
      b.box(0.17, 0.005, 0.17, c.g ? c.g(0.45) : c.f(0.86));   // the ground of the biome under the flowers
      for (let i = 0; i < 8; i++) { const col = cols[(Math.floor(i / 2) + off) % cols.length], z = -0.07 + i * 0.02; b.box(0.158, 0.008, 0.006, c.f(0.74), { z, y: 0.004, k: 11 }); for (let q = 0; q < 10; q++) b.box(0.011, 0.008, 0.011, col, { x: -0.072 + q * 0.016, z, y: 0.012 }); }
      b.auto = true; return [0.095, 0];
    }
    case 'boulders': {   // a few large and small rocks
      b.auto = false;
      const nn = r.int(3, 5);
      for (let i = 0; i < nn; i++) { const a = r() * PI * 2, d = i ? r.range(0.03, 0.07) : 0, s = (i ? r.range(0.5, 1) : 1.2) * k; b.ball(0.034 * s, (c.rock || c.stone)(r.range(0.25, 0.7)), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -0.012 * s, sy: r.range(0.6, 0.95), sx: r.range(0.8, 1.3) }); }
      b.ball(0.014, c.f(0.8), { x: 0.05, z: 0.03, sy: 0.6, k: 11, lod: 1 });
      b.auto = true; return [0.085, 0];
    }
    case 'palms': {   // a grove: three or four trees of the kind that fits the biome (see GROVE)
      b.auto = false;
      const draw = GROVE_TREE[(GROVE[c.biome] || ['palm'])[0]] || GROVE_TREE.palm, nn = r.int(3, 4);
      for (let i = 0; i < nn; i++) {
        const a = (i / nn) * PI * 2 + r() * 0.8, d = i ? r.range(0.045, 0.075) : 0.01;
        b.push(Math.cos(a) * d, 0, Math.sin(a) * d, r() * PI * 2, 1); draw(b, c, r, r.range(0.85, 1.25) * k); b.pop();
      }
      b.auto = true; return [0.09, 0];
    }
  }
}
