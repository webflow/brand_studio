// Region generator. A region is a config of dials plus a seed. The same config gives the same region.
// Land, plants, and water use natural colors from the biome. Buildings and objects use the two accent hues.
import * as THREE from 'three';
import { Builder } from './prims.js';
import { rimmed, edgeE, voxelH, buildVoxelTerrain, VOX } from './terrain.js';
import { tileAnchors } from './goldberg.js';
import { regionPalette, ROW, HUE_LABEL, TONE_SET_LABEL } from './palette.js';
import { CROPS, HEROES, SIZES, colors, lavaBed, lavaFlow } from './heroes.js';
import { addAnimals, BIOME_ANIMALS } from './animals.js';
import { building, STYLES, NATURE_STYLES } from './buildings.js';
import { addDetails } from './details.js';
import { rng, fbm, clamp, lerp, smooth, TAU } from './util.js';

const PI = Math.PI;
const n = (x, z, f, seed, oct = 3) => fbm(x * f + 11.3, z * f + 7.1, seed, oct);
const N = (row, tone, kind = 0, prm = 0) => [ROW[row], tone, kind, prm];
const BLOSSOM = [ROW.coral, 1.6];

// ---- Plants. Each draws at the local origin. s = scale. kind 3 = leaves that fall, 11 = leaves that stay, 4 = blossom
const tree = {
  cone(b, c, r, s) {
    b.cyl(0.01 * s, 0.04 * s, c.trunk);
    b.cone(0.05 * s, 0.1 * s, c.f(0.86), { y: 0.03 * s, pat: 1 }); b.cone(0.038 * s, 0.085 * s, c.f(0.74), { y: 0.08 * s, pat: 1 });
    if (s > 1.05) b.cone(0.026 * s, 0.06 * s, c.f(0.62), { y: 0.125 * s, pat: 1 });
  },
  round(b, c, r, s) {
    b.cyl(0.008 * s, 0.065 * s, c.trunk);
    b.ball(0.045 * s, c.leaf(0.8), { y: 0.045 * s });
    b.ball(0.03 * s, c.leaf(0.62), { x: 0.026 * s, y: 0.082 * s, z: (r() - 0.5) * 0.03 * s });
    b.ball(0.026 * s, c.leaf(0.72), { x: -0.03 * s, y: 0.06 * s, z: 0.016 * s });
    if (r() < 0.6) b.ball(0.022 * s, c.leaf(0.55), { x: 0.0, y: 0.105 * s, z: -0.02 * s });
    if (r() < 0.5) b.ball(0.02 * s, c.leaf(0.88), { x: 0.02 * s, y: 0.04 * s, z: -0.03 * s });
    b.ball(0.012 * s, BLOSSOM, { x: -0.02 * s, y: 0.105 * s, z: 0.02 * s, k: 4, lod: 1 });
    b.ball(0.012 * s, BLOSSOM, { x: 0.03 * s, y: 0.085 * s, z: -0.012 * s, k: 4, lod: 1 }); b.ball(0.01 * s, N('plaster', 0.3, 4), { x: 0.0, y: 0.115 * s, z: 0.024 * s, lod: 1 });
    // Winter: the leaves are gone, and these bare branches show.
    for (const [bx, bz] of [[0.7, 0.2], [-0.6, 0.45], [0.1, -0.7]]) b.box(0.005 * s, 0.05 * s, 0.005 * s, c.trunk, { y: 0.058 * s, rz: -bx, rx: bz, lod: 1 });
    // Autumn: leaves on the ground, and two in the air.
    for (let i = 0; i < 3; i++) b.box(0.012 * s, 0.002, 0.012 * s, [ROW.autumn, 3 + i * 0.8, 15, 0], { x: Math.cos(i * 2.3 + 1) * 0.05 * s, y: 0.008, z: Math.sin(i * 2.3 + 1) * 0.05 * s, lod: 1 });
    for (let i = 0; i < 2; i++) b.box(0.009 * s, 0.002, 0.009 * s, [ROW.autumn, 3.6, 15, 0.5 + i * 0.35], { x: Math.cos(i * 3 + 2) * 0.045 * s, y: 0.085 * s, z: Math.sin(i * 3 + 2) * 0.045 * s, lod: 1 });
  },
  jungle(b, c, r, s) {
    const h = r.range(0.1, 0.19) * s;
    b.cyl(0.009 * s, h, c.trunk, { rz: (r() - 0.5) * 0.2 });
    b.cyl(0.06 * s, 0.022 * s, c.f(0.85), { y: h - 0.01, k: 11 }); b.cyl(0.042 * s, 0.022 * s, c.f(0.68), { y: h + 0.014 * s, k: 11 });
    if (r() < 0.5) b.cyl(0.024 * s, 0.018 * s, c.f(0.5), { y: h + 0.036 * s, k: 11 });
  },
  palm(b, c, r, s) {
    const h = 0.13 * s, lean = (r() - 0.5) * 0.5;
    b.push(0, 0, 0, r() * TAU, 1, 0, lean);
    b.cyl(0.007 * s, h, c.trunk, { t: 0.3 });
    for (let i = 0; i < 6; i++) b.ball(0.032 * s, c.f(0.75), { y: h - 0.012 * s, x: Math.cos(i * 1.047) * 0.03 * s, z: Math.sin(i * 1.047) * 0.03 * s, sy: 0.24, sz: 0.6, ry: -i * 1.047, k: 11 });
    b.pop();
  },
  cactus(b, c, r, s) {
    const h = r.range(0.07, 0.13) * s, col = N('forest', 5.4);
    b.cyl(0.014 * s, h, col); b.ball(0.014 * s, col, { y: h - 0.014 * s });
    if (r() < 0.8) { b.cyl(0.009 * s, 0.03 * s, col, { x: 0.03 * s, y: h * 0.5 }); b.box(0.03 * s, 0.014 * s, 0.014 * s, col, { x: 0.016 * s, y: h * 0.45 }); }
    if (r() < 0.5) { b.cyl(0.009 * s, 0.04 * s, col, { x: -0.028 * s, y: h * 0.32 }); b.box(0.028 * s, 0.014 * s, 0.014 * s, col, { x: -0.015 * s, y: h * 0.28 }); }
    if (r() < 0.4) b.ball(0.009 * s, BLOSSOM, { y: h, k: 4, lod: 1 });
  },
  rock(b, c, r, s) {
    const w = r.range(0.03, 0.06) * s;
    b.box(w, r.range(0.04, 0.12) * s, w, N('rock', 4.4), { t: 0.6, ry: r() * 3, rz: (r() - 0.5) * 0.3 });
    if (r() < 0.6) b.box(w * 0.6, r.range(0.03, 0.06) * s, w * 0.6, N('rock', 5.4), { x: w * 0.7, t: 0.5, ry: r() * 3 });
    b.ball(0.035 * s, N('snow', 0.4), { x: -w * 0.6, y: -0.02 * s, sy: 0.5, k: 7 });
  },
  boulder(b, c, r, s) { b.ball(r.range(0.014, 0.03) * s, N('rock', r.range(3.6, 5.4)), { y: -0.008, sy: 0.7, sx: r.range(0.8, 1.3) }); if (r() < 0.5) b.ball(0.012 * s, N('rock', 5), { x: 0.022 * s, y: -0.004, sy: 0.7 }); },
  reed(b, c, r, s) {
    for (let i = 0; i < 5; i++) { const x = (r() - 0.5) * 0.04, z = (r() - 0.5) * 0.04, h = r.range(0.05, 0.1) * s; b.cyl(0.003, h, N('olive', 6), { x, z, k: 11 }); b.cyl(0.005, 0.018 * s, N('earth', 6.5), { x, z, y: h, lod: 1 }); }
  },
  dead(b, c, r, s) {
    const h = r.range(0.07, 0.12) * s;
    b.cyl(0.008 * s, h, N('rock', 7.6)); b.cyl(0.005 * s, 0.05 * s, N('rock', 7.6), { y: h * 0.55, rz: 0.9 }); b.cyl(0.005 * s, 0.04 * s, N('rock', 7.6), { y: h * 0.7, rz: -0.8 });
  },
  shrub(b, c, r, s) { b.ball(0.028 * s, c.f(0.8), { sy: 0.7, k: 11 }); if (r() < 0.5) b.ball(0.018 * s, c.f(0.62), { x: 0.025 * s, sy: 0.7, k: 11 }); },
  flower(b, c, r, s) { for (let i = 0; i < 4; i++) b.ball(0.009 * s, r() < 0.5 ? N('autumn', 2.4) : N('plaster', 0.4), { x: (r() - 0.5) * 0.07, z: (r() - 0.5) * 0.07, y: 0.004, lod: 1 }); },
  // A flat-top tree of the savannah.
  acacia(b, c, r, s) {
    const lean = (r() - 0.5) * 0.4;
    b.push(0, 0, 0, r() * TAU, s, 0, lean); b.cyl(0.007, 0.07, c.trunk); b.box(0.004, 0.03, 0.004, c.trunk, { y: 0.05, rz: 0.7 }); b.box(0.004, 0.03, 0.004, c.trunk, { y: 0.05, rz: -0.7 });
    b.ball(0.06, c.f(0.72), { y: 0.066, sy: 0.3, k: 11 }); b.ball(0.036, c.f(0.58), { x: 0.02, y: 0.082, sy: 0.3, k: 11 }); b.pop();
  },
  // A street tree in a stone box.
  planter(b, c, r, s) { b.box(0.05 * s, 0.014, 0.05 * s, N('rock', 4.4)); b.box(0.04 * s, 0.004, 0.04 * s, N('earth', 7), { y: 0.014 }); b.cyl(0.006 * s, 0.05 * s, c.trunk, { y: 0.014 }); b.ball(0.036 * s, c.leaf(0.78), { y: 0.05 * s }); },
  // Tundra: a cluster of ice shards, a snow drift, and dry grass that shows through the snow.
  ice(b, c, r, s) { const k = r.int(2, 4); for (let i = 0; i < k; i++) { const a = r() * TAU, d = i ? r.range(0.02, 0.045) * s : 0, h = r.range(0.07, 0.17) * s * (i ? 0.7 : 1); b.box(0.03 * s, h, 0.03 * s, N(i % 2 ? 'sea' : 'snow', i % 2 ? 2.0 : 2.8), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: -0.004, t: 0.7, ry: r() * 3, rz: (r() - 0.5) * 0.5, sens: 0 }); } },
  drift(b, c, r, s) { b.ball(0.05 * s, N('snow', 0.4), { y: -0.03 * s, sy: 0.55, sx: r.range(1, 1.6) }); if (r() < 0.5) b.ball(0.03 * s, N('snow', 0.9), { x: 0.04 * s, y: -0.02 * s, sy: 0.5 }); },
  tuft(b, c, r, s) { for (let i = 0; i < 5; i++) b.box(0.005, r.range(0.014, 0.03) * s, 0.005, N('autumn', r.range(3.2, 4.6), 11), { x: (r() - 0.5) * 0.034, z: (r() - 0.5) * 0.034, rz: (r() - 0.5) * 0.6, sens: 0.15 }); },
  pine(b, c, r, s) { b.cyl(0.007 * s, 0.03 * s, c.trunk); b.cone(0.03 * s, 0.09 * s, c.f(0.9), { y: 0.02 * s, pat: 1 }); },
  prism(b, c, r, s) {
    const m = r.int(2, 4);
    for (let i = 0; i < m; i++) b.hex(r.range(0.014, 0.03) * s, r.range(0.06, 0.2) * s, N('amethyst', r.range(2.6, 5), 2, r()), { x: (r() - 0.5) * 0.05 * s, z: (r() - 0.5) * 0.05 * s, t: 0.55, ry: r() * 3, rz: (r() - 0.5) * 0.5, rx: (r() - 0.5) * 0.4 });
  },
  coral(b, c, r, s) {
    const t = r.int(0, 2), col = N('coral', r.range(3, 5.4));
    if (t === 0) { b.cyl(0.008 * s, 0.07 * s, col); b.cyl(0.006 * s, 0.045 * s, col, { y: 0.03 * s, rz: 0.7 }); b.cyl(0.006 * s, 0.04 * s, col, { y: 0.045 * s, rz: -0.7 }); b.ball(0.01 * s, col, { y: 0.065 * s }); }
    else if (t === 1) { b.half(0.08 * s, 0.06 * s, 0.01, col, { ry: r() * 3 }); b.half(0.05 * s, 0.04 * s, 0.01, N('plaster', 1), { ry: r() * 3, x: 0.02 }); }
    else { b.ball(0.03 * s, col, { sy: 0.7 }); b.ball(0.018 * s, N('sand', 1.6), { x: 0.03 * s, sy: 0.7 }); }
  },
};

// ---- Biomes. height() returns the raw land height (0 = water level). amp grows with the roughness dial.
// land = natural colors: row, tone at the shore (t0), tone at the top (t1), optional second row (alt).
export const BIOMES = {
  forest: { label: 'Forest', hint: 'cone trees', sens: 0.7, amp: [0.1, 0.5], waterK: 0.3, vegN: 150, field: 1, plants: ['cone', 'cone', 'cone', 'round', 'boulder'],
    land: { row: 'grass', t0: 5.6, t1: 4.2 }, side: ['earth', 7], leaf: 'forest', rows: ['grass', 'forest', 'earth'],
    height: (x, z, s, a) => 0.05 + (n(x, z, 1.7, s) - 0.3) * a },
  desert: { label: 'Desert', hint: 'dune bands, cacti', sens: 0.12, amp: [0.1, 0.35], waterK: 0.12, vegN: 50, plants: ['cactus', 'cactus', 'boulder', 'dead'], bandH: 0.028,
    land: { row: 'sand', t0: 4.6, t1: 2.6, alt: { row: 'earth', every: 3, tone: -1 } }, side: ['earth', 6], leaf: 'olive', rows: ['sand', 'earth', 'forest'],
    height: (x, z, s, a) => { const d = Math.sin(x * 4.6 + z * 3.1 + n(x, z, 1.2, s) * 6); return 0.045 + a * 0.5 * (0.5 + 0.5 * d) * (0.35 + n(x, z, 0.9, s + 3)) + (n(x, z, 1.1, s + 5) - 0.5) * a * 0.35; } },
  tundra: { label: 'Tundra', hint: 'snow, frozen ponds, ice, pines', sens: 1, amp: [0.14, 0.46], waterK: 0.1, vegN: 130, plants: ['pine', 'pine', 'ice', 'ice', 'rock', 'rock', 'drift', 'tuft', 'boulder'], frozen: true, bandH: 0.045,
    land: { row: 'snow', t0: 2.7, t1: 0.2, alt: { row: 'rock', from: 5, tone: 3.4 } }, side: ['rock', 5.6], water: 3.6, leaf: 'forest', rows: ['snow', 'rock', 'forest'],
    // Snow in steps that get whiter as they go up, wide hollows that hold frozen ponds, and bare rock on the highest ground.
    height: (x, z, s, a) => 0.05 + (n(x, z, 1.3, s) - 0.3) * a * 0.8 + (n(x, z, 3.4, s + 3) - 0.5) * 0.04 - Math.max(0, 0.47 - n(x, z, 2.0, s + 7)) * 0.6 },
  wetland: { label: 'Wetland', hint: 'reeds, ponds', sens: 0.6, amp: [0.1, 0.3], waterK: 0.2, vegN: 130, field: 1, plants: ['reed', 'reed', 'round', 'shrub'], wet: true,
    land: { row: 'olive', t0: 5.8, t1: 4.4 }, side: ['earth', 7.6], water: 5.6, leaf: 'forest', rows: ['olive', 'forest', 'sea'],
    height: (x, z, s, a) => (n(x, z, 2.3, s) - 0.47) * (0.12 + a * 0.5) + 0.01 },
  volcanic: { label: 'Volcanic', hint: 'dark rock, cones, flowing magma', sens: 0.2, amp: [0.2, 0.7], waterK: 0.2, vegN: 40, plants: ['dead', 'boulder', 'boulder'], lava: true,
    land: { row: 'rock', t0: 7.8, t1: 5.6 }, side: ['rock', 8.6], leaf: 'olive', rows: ['rock', 'orange', 'yellow'],
    height: (x, z, s, a) => { const cx = (n(0, 0, 1, s) - 0.5) * 0.4, cz = (n(5, 5, 1, s) - 0.5) * 0.4, d = Math.hypot(x - cx, z - cz); const cone = Math.max(0, 1 - d / 0.62); let h = 0.04 + Math.pow(cone, 1.3) * (0.18 + a * 0.5) + (n(x, z, 2.5, s) - 0.5) * 0.06; if (d < 0.14) h -= (1 - d / 0.14) * (0.1 + a * 0.2); return h; } },
  archipelago: { label: 'Archipelago', hint: 'small islets, much water', sens: 0.4, amp: [0.15, 0.5], waterK: 0.3, vegN: 60, plants: ['palm', 'palm', 'shrub', 'boulder'], sea: true,
    land: { row: 'sand', t0: 3.2, t1: 2.2, alt: { row: 'grass', from: 2, tone: 2 } }, side: ['sand', 5.6], water: 5.2, leaf: 'forest', rows: ['sand', 'grass', 'sea'],
    height: (x, z, s, a) => (n(x, z, 2.1, s) - 0.55) * (0.5 + a) + Math.max(0, 0.3 - Math.hypot(x, z)) * 0.3 },
  meadow: { label: 'Meadow', hint: 'rolling hills, round trees, flowers', sens: 0.7, amp: [0.08, 0.4], waterK: 0.3, vegN: 110, field: 2, plants: ['round', 'round', 'flower', 'flower', 'shrub'],
    land: { row: 'grass', t0: 4.9, t1: 3.5 }, side: ['earth', 6.6], leaf: 'forest', rows: ['grass', 'forest', 'earth'],
    height: (x, z, s, a) => 0.05 + (n(x, z, 1.2, s, 2) - 0.3) * a * 0.8 },
  canyon: { label: 'Canyon', hint: 'stepped strata', sens: 0.3, amp: [0.2, 0.6], waterK: 0.15, vegN: 40, field: 1, plants: ['shrub', 'cactus', 'dead', 'boulder'], bandH: 0.07,
    land: { row: 'earth', t0: 5.8, t1: 3.8, alt: { row: 'sand', every: 2, tone: -1 } }, side: ['earth', 7.6], leaf: 'olive', rows: ['earth', 'sand', 'olive'],
    height: (x, z, s, a) => { const p = 0.11 + n(x, z, 1.5, s) * a * 1.1, q = p / 0.07; let h = (Math.floor(q) + smooth(0.72, 1, q - Math.floor(q))) * 0.07; const ang = (s % 6) * 1.047, ca = Math.cos(ang), sa = Math.sin(ang); const dist = Math.abs(x * ca + z * sa + Math.sin((-x * sa + z * ca) * 3) * 0.09); if (dist < 0.17) h = lerp(-0.07, h, smooth(0.06, 0.17, dist)); return h; } },
  jungle: { label: 'Jungle', hint: 'dense tall trees', sens: 0.3, amp: [0.1, 0.45], waterK: 0.3, vegN: 190, plants: ['jungle', 'jungle', 'jungle', 'palm', 'shrub'],
    land: { row: 'forest', t0: 6.4, t1: 5 }, side: ['earth', 8], leaf: 'grass', rows: ['forest', 'grass', 'earth'],
    height: (x, z, s, a) => 0.05 + (n(x, z, 2.2, s) - 0.3) * a * 0.85 },
  alpine: { label: 'Alpine', hint: 'peaks', sens: 0.9, amp: [0.25, 0.8], waterK: 0.18, vegN: 70, plants: ['pine', 'pine', 'rock', 'boulder'],
    land: { row: 'grass', t0: 5.4, t1: 0, alt: { row: 'rock', from: 3, tone: 0 } }, side: ['rock', 6.6], leaf: 'forest', rows: ['grass', 'rock', 'snow'],
    height: (x, z, s, a) => { const ridge = 1 - Math.abs(2 * n(x, z, 1.5, s) - 1); return 0.03 + Math.pow(ridge, 2.2) * (0.12 + a * 0.55) + (n(x, z, 3, s + 9) - 0.5) * 0.04; } },
  crystal: { label: 'Crystal', hint: 'prisms', sens: 0.4, amp: [0.06, 0.25], waterK: 0.25, vegN: 60, plants: ['prism', 'prism', 'shrub', 'boulder'],
    land: { row: 'rock', t0: 4.8, t1: 3.2 }, side: ['rock', 6.8], leaf: 'forest', rows: ['rock', 'amethyst', 'forest'],
    height: (x, z, s, a) => 0.05 + (n(x, z, 2.6, s) - 0.4) * a * 0.6 },
  coral: { label: 'Coral', hint: 'reef shapes, shallow water', sens: 0.2, amp: [0.1, 0.3], waterK: 0.2, vegN: 110, plants: ['coral'], sea: true, wet: true,
    land: { row: 'sand', t0: 2.8, t1: 1.8 }, side: ['sand', 5], water: 3.8, leaf: 'forest', rows: ['sand', 'coral', 'sea'],
    height: (x, z, s, a) => (n(x, z, 2.4, s) - 0.5) * (0.14 + a * 0.5) - 0.02 + Math.max(0, 0.35 - Math.hypot(x, z)) * 0.3 },
  beach: { label: 'Beach', hint: 'sand, palms, shallow sea', sens: 0.25, amp: [0.08, 0.3], waterK: 0.3, vegN: 55, plants: ['palm', 'palm', 'shrub', 'boulder'], sea: true,
    land: { row: 'sand', t0: 2.6, t1: 1.6, alt: { row: 'grass', from: 3, tone: 2.6 } }, side: ['sand', 5.2], water: 4.4, leaf: 'forest', rows: ['sand', 'sea', 'grass'],
    // One side of the tile is land with low dunes. The land goes down to the water on the other side.
    height: (x, z, s, a) => { const ang = (s % 6) * 1.047, u = x * Math.cos(ang) + z * Math.sin(ang); return 0.035 + u * (0.13 + a * 0.22) + (n(x, z, 1.6, s) - 0.5) * a * 0.28 + Math.max(0, u) * Math.sin(u * 9 + n(x, z, 1.1, s + 4) * 4) * 0.02; } },
  valley: { label: 'Valley', hint: 'a river between two ridges', sens: 0.7, amp: [0.2, 0.7], waterK: 0.18, vegN: 120, field: 1, plants: ['round', 'cone', 'flower', 'shrub', 'round'],
    land: { row: 'grass', t0: 5.2, t1: 3.4, alt: { row: 'rock', from: 6, tone: 0.4 } }, side: ['earth', 7], leaf: 'forest', rows: ['grass', 'forest', 'rock'],
    height: (x, z, s, a) => { const ang = (s % 6) * 1.047, ca = Math.cos(ang), sa = Math.sin(ang), along = -x * sa + z * ca, d = Math.abs(x * ca + z * sa + Math.sin(along * 3.2 + s) * 0.07); let h = 0.04 + Math.pow(smooth(0.05, 0.95, d), 1.3) * (0.14 + a * 0.6) + (n(x, z, 2.2, s) - 0.5) * 0.05; if (d < 0.11) h = lerp(-0.07, h, smooth(0.035, 0.11, d)); return h; } },
  savannah: { label: 'Savannah', hint: 'golden grass, flat-top trees', sens: 0.35, amp: [0.04, 0.26], waterK: 0.16, vegN: 46, plants: ['acacia', 'acacia', 'shrub', 'dead', 'boulder'],
    land: { row: 'autumn', t0: 3.0, t1: 2.2, alt: { row: 'earth', every: 4, tone: 1.4 } }, side: ['earth', 6.4], leaf: 'olive', rows: ['autumn', 'olive', 'earth'],
    height: (x, z, s, a) => 0.05 + (n(x, z, 1.0, s, 2) - 0.36) * a * 0.62 },
  urban: { label: 'Urban', hint: 'streets, paved blocks, street trees', sens: 0.5, amp: [0, 1], waterK: 0, vegN: 70, plants: ['planter', 'planter', 'shrub', 'round'], bandH: 0.031, streets: true,   // waterK 0: the land is flat, so a water level would put all of it under water
    land: { row: 'rock', t0: 3.4, t1: 3.4, alt: { row: 'plaster', every: 2, tone: -1.6 } }, side: ['rock', 6.4], leaf: 'forest', rows: ['rock', 'plaster', 'forest'],
    // Flat ground with a grid of streets (see the streets in generateRegion). Some blocks between the streets are one or two steps higher.
    height: (x, z, s, a) => { const G = 0.42, fu = x / G - Math.round(x / G), fv = z / G - Math.round(z / G); if (Math.abs(fu) < 0.17 || Math.abs(fv) < 0.17) return 0.05; const hv = n(Math.floor(x / G) * 3.1 + 0.5, Math.floor(z / G) * 3.1 + 0.5, 7.3, s); return 0.05 + (hv < 0.25 + a * 0.6 ? 0.031 * (1 + (Math.floor(hv * 40) % 2)) : 0); } },
  suburban: { label: 'Suburban', hint: 'lawns, quiet streets, garden trees', sens: 0.7, amp: [0, 1], waterK: 0, vegN: 90, plants: ['round', 'round', 'shrub', 'flower', 'planter'], bandH: 0.031, streets: { G: 0.6, hedge: true },
    land: { row: 'grass', t0: 4.6, t1: 4.0 }, side: ['earth', 6.6], leaf: 'forest', rows: ['grass', 'forest', 'rock'],
    // Flat lawns between a wide grid of streets. Some lawns are one step higher.
    height: (x, z, s, a) => { const G = 0.6, fu = x / G - Math.round(x / G), fv = z / G - Math.round(z / G); if (Math.abs(fu) < 0.13 || Math.abs(fv) < 0.13) return 0.05; const hv = n(Math.floor(x / G) * 3.1 + 0.5, Math.floor(z / G) * 3.1 + 0.5, 7.3, s); return 0.05 + (hv < 0.15 + a * 0.55 ? 0.031 : 0); } },
  // The start of a new region: flat, bare ground with nothing on it. It is not in the list of biomes to pick.
  blank: { label: 'Not chosen', hint: '', sens: 0.2, amp: [0, 0], waterK: 0, vegN: 0, plants: [],
    land: { row: 'plaster', t0: 1.6, t1: 1.6 }, side: ['rock', 4.6], leaf: 'forest', rows: [],
    height: () => 0.05 },
};
export const BIOME_IDS = Object.keys(BIOMES).filter((k) => k !== 'blank');

function terrainTop(B, maxH) {
  const L = B.land, bandH = B.bandH || 0.065, levels = Math.max(3, maxH / bandH);
  const top = { row: ROW[L.row], tone: L.t0, step: (L.t0 - L.t1) / levels, bandH };
  if (L.alt) { top.altRow = ROW[L.alt.row]; top.altEvery = L.alt.from != null ? 100 + L.alt.from : L.alt.every; top.altTone = L.alt.tone; }
  return top;
}

// Find where a bridge ends: the nearest anchor in the direction it points.
function bridgeEnd(anchors, ai, rotAngle) {
  const A = anchors[ai]; let best = null, bd = -2;
  anchors.forEach((p, i) => {
    if (i === ai) return;
    const dx = p.x - A.x, dz = p.z - A.z, d = Math.hypot(dx, dz);
    if (d > 0.75) return;
    const k = (dx * Math.cos(rotAngle) + dz * Math.sin(rotAngle)) / d;
    if (k > bd) { bd = k; best = i; }
  });
  return best;
}

export function describe(cfg) {
  const B = BIOMES[cfg.biome];
  const hues = [...new Set(cfg.hues)].map((h) => HUE_LABEL[h]).join(' and ');
  const objs = cfg.heroes.map((h) => HEROES[h.type].label.toLowerCase()).join(', ');
  const scen = STYLES[cfg.arch] ? (NATURE_STYLES.has(cfg.arch) ? `${STYLES[cfg.arch].toLowerCase()} as scenery` : `${STYLES[cfg.arch].toLowerCase()} buildings`) : 'no scenery yet';
  return `${cfg.name || 'A new region'}. ${cfg.biome === 'blank' ? 'Bare land, no biome yet' : B.label + ' land in natural colors'}, with ${scen}. Accent colors: ${hues}, ${cfg.toneSet} tones. Landmarks: ${objs || 'none yet'}.`;
}

const WARM = [1.0, 0.86, 0.6], FIRE = [1.0, 0.6, 0.32];
// What scenery and landmarks take from the biome: its tree, its rock, and if it is hot or cold land.
const BIOME_LOOK = {
  forest: { tree: 'cone' }, desert: { tree: 'cactus', stone: 'earth', hot: 1 }, tundra: { tree: 'pine', cold: 1 }, wetland: { tree: 'round' },
  volcanic: { tree: 'dead', dark: 1, hot: 1 }, archipelago: { tree: 'palm', stone: 'sand', hot: 1 }, meadow: { tree: 'round' }, canyon: { tree: 'cactus', stone: 'earth', hot: 1 },
  jungle: { tree: 'jungle', hot: 1 }, alpine: { tree: 'pine', cold: 1 }, crystal: { tree: 'prism' }, coral: { tree: 'palm', stone: 'sand', hot: 1 },
  beach: { tree: 'palm', stone: 'sand', hot: 1 }, valley: { tree: 'round' }, savannah: { tree: 'acacia', stone: 'earth', hot: 1 }, urban: { tree: 'planter' }, suburban: { tree: 'round' }, blank: { tree: 'round' },
};

// out = { batch, acc, addAnimator(tile, fn, opts), addLight(light) }
export function generateRegion(cfg, tile, out) {
  const B = BIOMES[cfg.biome], seed = cfg.seed % 100000;
  const r = rng(cfg.seed), P = regionPalette(cfg), c = colors(P, rng(cfg.seed + 7), { ground: B.land.row, leaf: B.leaf });
  c.biome = cfg.biome;   // the farm picks a crop for the biome
  const look = BIOME_LOOK[cfg.biome] || {}, stone = look.stone || 'rock', sT = stone === 'sand' ? [2.4, 3] : stone === 'earth' ? [3.6, 3.6] : look.dark ? [6.4, 2.8] : [3.6, 3.4];
  c.hot = !!look.hot; c.cold = !!look.cold;
  c.rock = (l) => [ROW[stone], sT[0] + clamp(l) * sT[1]];
  c.tree = (bb, x, y, z, sc = 1) => { bb.push(x, y, z, r() * TAU, 1); tree[look.tree || 'round'](bb, c, r, sc); bb.pop(); };
  { const cr = CROPS[cfg.biome] || CROPS.meadow, col = (q, k) => [ROW[q[0]], q[1], k || 0, 0]; c.crop = { wet: !!cr.wet, stem: [cr.stem[0], cr.stem[1], col(cr.stem[2], 11)], head: cr.head ? [cr.head[0], cr.head[1], col(cr.head[2], cr.head[3])] : null }; }
  const anchors = tileAnchors(tile);
  const amp = lerp(B.amp[0], B.amp[1], cfg.rough);
  const wOff = (cfg.water - 0.3) * B.waterK * 1.4;
  const wh = cfg.whimsy;

  // Hero placement: snapped anchors, 60-degree turns, three sizes.
  const pads = [], carves = [], placed = [], lands = [];   // lands: landmarks that are part of the land (a mountain, a volcano, a lake)
  cfg.heroes.forEach((h, i) => {
    const def = HEROES[h.type]; if (!def) return;
    const ai = clamp(h.anchor | 0, 0, 6), A = anchors[ai], sc = SIZES[h.size] || 1;
    let ang = tile.rot0 + (h.rot | 0) * (PI / 3), ry = PI / 2 - ang;
    const it = { i, type: h.type, def, x: A.x, z: A.z, sc, ang, ry, anchor: ai, r: def.r * sc };
    if (def.land) { lands.push(it); }
    else if (def.water === 'span') {
      const bi = bridgeEnd(anchors, ai, ang), Bp = anchors[bi];
      it.ang = ang = Math.atan2(Bp.z - A.z, Bp.x - A.x); it.ry = -ang; it.sc = 1; it.end = bi;
      const mx = (A.x + Bp.x) / 2, mz = (A.z + Bp.z) / 2;
      carves.push({ type: 'channel', x: mx, z: mz, nx: Math.cos(ang), nz: Math.sin(ang) });
      pads.push({ x: A.x, z: A.z, r: 0.1, hero: it, fixed: 0.05 }, { x: Bp.x, z: Bp.z, r: 0.1, fixed: 0.05 });
      it.cx = mx; it.cz = mz;
    } else {
      if (def.water === 'bay') {
        // The bay, and a channel from the bay to the nearest edge of the tile, so the dock has a way out to the ocean.
        const bx = A.x + Math.cos(ang) * 0.36 * sc, bz = A.z + Math.sin(ang) * 0.36 * sc, bl = Math.hypot(bx, bz);
        carves.push({ type: 'bay', x: bx, z: bz, r: 0.27 * sc, ux: bl > 0.12 ? bx / bl : Math.cos(ang), uz: bl > 0.12 ? bz / bl : Math.sin(ang) });
      }
      pads.push({ x: A.x, z: A.z, r: def.water === 'bay' ? 0.1 * sc : it.r, hero: it });
    }
    placed.push(it);
  });
  const raw0 = (x, z) => B.height(x, z, seed, amp) - wOff;
  for (const p of pads) p.y = p.fixed ?? Math.max(raw0(p.x, p.z), 0.05);
  for (const L of lands) L.y0 = Math.max(raw0(L.x, L.z), 0.05);
  const raw = (x, z) => {
    let h = raw0(x, z);
    for (const cv of carves) {
      if (cv.type === 'bay') { const dx = x - cv.x, dz = z - cv.z, d = Math.hypot(dx, dz); h = Math.min(h, lerp(-0.09, 0.3, smooth(cv.r * 0.7, cv.r, d))); if (dx * cv.ux + dz * cv.uz > 0) h = Math.min(h, lerp(-0.09, 0.3, smooth(0.1, 0.17, Math.abs(dx * cv.uz - dz * cv.ux)))); }
      else { const dx = x - cv.x, dz = z - cv.z, d = Math.abs(dx * cv.nx + dz * cv.nz), along = Math.abs(-dx * cv.nz + dz * cv.nx); if (along < 0.75) h = Math.min(h, lerp(-0.09, 0.4, smooth(0.1, 0.19, d + smooth(0.5, 0.75, along) * 0.2))); }
    }
    for (const p of pads) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r + 0.2) h = lerp(p.y, h, smooth(p.r * 0.9, p.r + 0.2, d)); }
    for (const L of lands) {
      const t = L.def.land, dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz), R = t.r * L.sc;
      if (d > R * 1.3) continue;
      if (t.type === 'pond') { h = Math.min(Math.max(h, lerp(0.045, h, smooth(R, R * 1.3, d))), lerp(-0.1, 0.4, smooth(R * 0.62, R * 1.02, d + (n(x, z, 5, seed + 3) - 0.5) * 0.07))); continue; }
      // A peak or a crater: a cone with ridges and gullies. A crater has a bowl in its top.
      const a = Math.atan2(dz, dx), dd = d * (1 + 0.14 * Math.sin(a * 3 + L.x * 9 + 1) + 0.08 * Math.sin(a * 5 + 2.3));
      let hh = L.y0 + Math.pow(Math.max(0, 1 - dd / R), t.type === 'crater' ? 1.15 : 1.4) * t.h * L.sc;
      if (t.type === 'crater') { const cr = R * 0.24; if (d < cr) hh -= (1 - d / cr) * t.h * L.sc * 0.34; }
      if (dd < R) h = Math.max(h, hh);
    }
    return h;
  };
  const H = voxelH(rimmed(tile, raw));
  let maxH = 0.1;
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) maxH = Math.max(maxH, H(i * 0.2, j * 0.2));
  const top = terrainTop(B, maxH);
  const b = new Builder(out.batch, out.acc, tile.matrix, tile.index);
  b.sens = B.sens; b.water = out.water || null;
  const tspec = { H, top, side: [ROW[B.side[0]], B.side[1]], water: [ROW.sea, B.water || 6], sens: B.sens };
  if (lands.length) tspec.over = (x, z, h) => {
    for (const L of lands) {
      const t = L.def.land; if (t.type === 'pond') continue;
      const d = Math.hypot(x - L.x, z - L.z), R = t.r * L.sc, rise = h - L.y0, full = t.h * L.sc;
      if (d > R || rise < 0.02) continue;
      if (t.type === 'peak') { if (rise > full * 0.62) return c.hot ? c.rock(0.02) : [ROW.snow, 0.5]; if (rise > full * 0.3) return c.rock(0.75 - (rise / full) * 0.6); }   // snow on top, but not on hot land
      else return d < R * 0.26 ? [ROW.rock, 9] : [ROW.rock, 6.2 + (rise / full) * 2.4];
    }
    return null;
  };
  buildVoxelTerrain(b, tile, tspec);
  const occ = [];
  const free = (x, z, rad) => { for (const o of occ) { const dx = x - o.x, dz = z - o.z, rr = rad + o.r; if (dx * dx + dz * dz < rr * rr) return false; } return true; };
  const reg = { cfg, tile, P, H, anchors, heroes: placed, details: [], animators: [], lights: [], roofs: [], desc: describe(cfg), counts: {} };
  const anim = (fn, o) => { const a = out.addAnimator(tile, fn, o); reg.animators.push(a); return a; };
  const _v = new THREE.Vector3();
  const light = (base, x, y, z, rad, type, phase) => {
    if (!out.addLight) return;
    const L = { pos: _v.set(x, y, z).applyMatrix4(base).clone(), r: rad * tile.rin * 1.25, col: type === 'f' ? FIRE : WARM, dir: tile.center, spin: type === 'spin' ? { base, phase: phase || 0 } : null };
    reg.lights.push(out.addLight(L));
  };

  // Hero objects.
  let tallest = null;
  b.auto = true; b.wall = 2;
  for (const it of placed) {
    const y = H(it.x, it.z);
    it.y = it.def.land ? it.y0 : y;   // a land feature: its base, not its top
    b.push(it.x, y - 0.006, it.z, it.ry, it.sc);
    const before = b.count;
    // What a landmark can ask about the land around it: h(x, z) = how high the land is there, in its own units and over its own base. water = where the water plane is.
    const cr = Math.cos(it.ry), sr = Math.sin(it.ry), y0 = y - 0.006, hx = it.x, hz = it.z, hs = it.sc;
    const ctx = { h: (lx, lz) => (H(hx + (lx * cr + lz * sr) * hs, hz + (-lx * sr + lz * cr) * hs) - y0) / hs, water: -y0 / hs, r };
    b.auto = !it.def.nature;
    it.def.build(b, c, ctx);
    b.auto = true;
    it.shapes = b.count - before;
    const base = b.top.clone();
    b.pop();
    if (it.def.anim) anim((db, fb, t, env) => it.def.anim(db, fb, t, env, c, ctx), { base });
    for (const [lx, ly, lz, lr, lt, lp] of it.def.lights || []) light(base, lx, ly, lz, lr * it.sc, lt, lp);
    occ.push({ x: it.cx ?? it.x, z: it.cz ?? it.z, r: it.def.water === 'span' ? 0.36 : it.r + 0.02 });
    if (it.def.water === 'bay') occ.push({ x: it.x + Math.cos(it.ang) * 0.3 * it.sc, z: it.z + Math.sin(it.ang) * 0.3 * it.sc, r: 0.2 * it.sc });
    if (it.def.water === 'span') for (const e of [-0.14, 0.74]) occ.push({ x: it.x + Math.cos(it.ang) * e, z: it.z + Math.sin(it.ang) * e, r: 0.1 });
    const hh = it.def.h * it.sc;
    if (!tallest || hh > tallest.hh) tallest = { it, hh };
  }
  b.auto = false;
  // Urban land: a grid of streets with a dashed center line and lamp posts. Plants and scenery stay off the streets.
  if (B.streets) {
    const G = B.streets.G || 0.42, seg = 0.07, streets = [], hedge = !!B.streets.hedge;
    for (let k = -3; k <= 3; k++) for (let i = -16; i <= 16; i++) for (const dir of [0, 1]) {
      const u = k * G, v = (i + 0.5) * seg, x = dir ? v : u, z = dir ? u : v;
      if (edgeE(tile, x, z) < 0.07 || !free(x, z, 0.03)) continue;
      const y = H(x, z); if (y < 0.03) continue;
      b.box(dir ? seg : 0.078, 0.004, dir ? 0.078 : seg, N('neutral', 7.6), { x, z, y: y - 0.001 + dir * 0.0006 });
      if (i % 2 === 0) b.box(dir ? 0.03 : 0.006, 0.002, dir ? 0.006 : 0.03, N('plaster', 0.6), { x, z, y: y + 0.0036, lod: 1 });
      if ((((i + k * 3) % 7) + 7) % 7 === 0) { const lx = x + (dir ? 0 : 0.052), lz = z + (dir ? 0.052 : 0), ly = H(lx, lz); b.cyl(0.004, 0.07, c.K, { x: lx, z: lz, y: ly - 0.004, lod: 1 }); b.ball(0.011, c.lamp, { x: lx, z: lz, y: ly + 0.064, lod: 1 }); }
      if (hedge && (((i + k) % 3) + 3) % 3 !== 0) for (const sd of [-1, 1]) { const hx = x + (dir ? 0 : sd * 0.06), hz = z + (dir ? sd * 0.06 : 0), hy = H(hx, hz); if (hy > 0.03 && free(hx, hz, 0.02) && Math.abs(Math.abs(dir ? hx : hz) / G - Math.round(Math.abs(dir ? hx : hz) / G)) > 0.14) b.box(dir ? seg * 0.9 : 0.016, 0.018, dir ? 0.016 : seg * 0.9, N('forest', 6, 11), { x: hx, z: hz, y: hy - 0.003, lod: 1 }); }   // a low hedge along the street, with gaps
      streets.push({ x, z, r: 0.042 });
    }
    occ.push(...streets);
  }
  // Hero angle: stand so the tallest object is at the back of the frame.
  let az = PI / 2 + 0.35;
  if (tallest && Math.hypot(tallest.it.x, tallest.it.z) > 0.1) az = Math.atan2(-tallest.it.z, -tallest.it.x) + 0.3;
  reg.az = cfg.az ?? az;
  const th = tallest ? tallest.hh + Math.max(0, tallest.it.y - 0.1) : 0.3;
  reg.lift = 0.1 + th * 0.32; reg.camDist = 0.76 + Math.max(0, th - 0.35) * 0.42;

  // Paths between the hero objects: pale paving on land, plank bridges over water, lamp posts along the way.
  const pathPts = [];
  const built = placed.filter((p) => !p.def.nature);   // paths, lamps, and people belong to built things, not to nature
  const anyBuilt = built.length > 0 || (!!STYLES[cfg.arch] && !NATURE_STYLES.has(cfg.arch) && cfg.bld > 0.02);
  const hub = built.find((p) => p.anchor === 0) || built[0];
  if (hub) built.forEach((it, k) => {
    if (it === hub) return;
    const x0 = hub.cx ?? hub.x, z0 = hub.cz ?? hub.z, x1 = it.cx ?? it.x, z1 = it.cz ?? it.z, len = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(2, Math.round(len / 0.055)), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 1; i < steps; i++) {
      const f = i / steps, x = lerp(x0, x1, f), z = lerp(z0, z1, f);
      if (placed.some((q) => Math.hypot(x - (q.cx ?? q.x), z - (q.cz ?? q.z)) < q.r * 0.82)) continue;
      const y = H(x, z);
      if (y > 0.02) b.box(0.06, 0.007, 0.05, c.path, { x, z, y: y - 0.002, ry: PI / 2 - ang });
      else { b.box(0.06, 0.006, 0.045, c.wood, { x, z, y: 0.028, ry: PI / 2 - ang, pat: 3 }); if (i % 2) for (const sd of [-1, 1]) b.cyl(0.005, 0.07, c.trunk, { x: x - Math.sin(ang) * 0.02 * sd, z: z + Math.cos(ang) * 0.02 * sd, y: -0.04, lod: 1 }); }
      pathPts.push({ x, z, r: 0.034 });
      if (i % 4 === 2 && y > 0.03) { const lx = x - Math.sin(ang) * 0.04, lz = z + Math.cos(ang) * 0.04; b.cyl(0.004, 0.07, c.K, { x: lx, z: lz, y: H(lx, lz) - 0.004, lod: 1 }); b.ball(0.011, c.lamp, { x: lx, z: lz, y: H(lx, lz) + 0.064, lod: 1 }); pathPts.push({ x: lx, z: lz, r: 0.02 }); }
    }
  });
  occ.push(...pathPts);

  // Lava stripes for volcanic land: banded rings that glow at night.
  if (B.lava) {
    const cx = (n(0, 0, 1, seed) - 0.5) * 0.4, cz = (n(5, 5, 1, seed) - 0.5) * 0.4;
    if (free(cx, cz, 0.05)) {
      const hy = H(cx, cz);
      b.cyl(0.11, 0.012, N('yellow', 4, 2, 0.3), { x: cx, z: cz, y: hy + 0.01 });
      // Magma flows from the middle down five channels.
      const yAt = (x, z) => H(cx + x, cz + z), dirs = [0, 1, 2, 3, 4].map((i) => i * 1.257 + (seed % 7));
      b.push(cx, 0, cz); for (const a of dirs) lavaBed(b, a, 0.1, 0.46, yAt); b.pop();
      anim((db, fb, t) => { db.push(cx, 0, cz); dirs.forEach((a, i) => lavaFlow(db, t, a, 0.08, 0.46, yAt, i * 0.23)); db.cyl(0.07 + Math.sin(t * 1.7) * 0.008, 0.01, N('yellow', 2.8, 2), { y: hy + 0.016 }); db.pop(); }, { minLod: 0.12 });
      if (out.addLight) { const L = { pos: _v.set(cx, hy + 0.12, cz).applyMatrix4(tile.matrix).clone(), r: 0.5 * tile.rin, col: FIRE, dir: tile.center, spin: null }; reg.lights.push(out.addLight(L)); }
    }
  }

  // Small buildings: on a 60-degree lattice (rows), near the hero objects. Whimsy adds disorder.
  const nB = STYLES[cfg.arch] ? Math.round(cfg.bld * 26) : 0;   // no scenery kind yet: nothing
  if (nB > 0) {
    const cand = [], sp = 0.2, rot = tile.rot0;
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      const lx = (i + j * 0.5) * sp, lz = j * sp * 0.866;
      let x = lx * Math.cos(rot) - lz * Math.sin(rot) + (r() - 0.5) * wh * 0.12, z = lx * Math.sin(rot) + lz * Math.cos(rot) + (r() - 0.5) * wh * 0.12;
      if (edgeE(tile, x, z) < 0.16) continue;
      let near = Math.hypot(x, z) * 0.6;
      for (const it of placed) near = Math.min(near, Math.hypot(x - it.x, z - it.z));
      cand.push({ x, z, k: near + n(x, z, 3, seed + 21) * 0.5 });
    }
    cand.sort((a, bb) => a.k - bb.k);
    let made = 0, bigN = 0; const decks = [];
    b.auto = true;
    for (const p of cand) {
      if (made >= nB) break;
      const y = H(p.x, p.z);
      if (y < 0.03 || !free(p.x, p.z, 0.075)) continue;
      if (Math.abs(H(p.x + 0.06, p.z) - y) + Math.abs(H(p.x, p.z + 0.06) - y) > 0.07) continue;
      // Ruins: now and then a large temple, where there is room for it.
      const big = cfg.arch === 'ruins' && bigN < 2 && made >= bigN * 6 && free(p.x, p.z, 0.25) && edgeE(tile, p.x, p.z) > 0.3 && Math.abs(H(p.x + 0.12, p.z) - y) + Math.abs(H(p.x - 0.12, p.z) - y) + Math.abs(H(p.x, p.z + 0.1) - y) < 0.05;
      const face = wh < 0.5 ? PI / 2 - (tile.rot0 + Math.round((reg.az - tile.rot0) / (PI / 3) + (r() < wh ? r.int(-1, 1) : 0)) * (PI / 3)) : r() * TAU;
      const bs = big ? 1.35 : lerp(1, r.range(0.7, 1.45), wh);
      b.push(p.x, y - 0.008, p.z, face, bs);
      const [rad, topY, ox, deck] = building(b, cfg.arch, c, r, wh, { big });
      b.pop();
      if (big) bigN++;
      if (deck) decks.push({ x: p.x, z: p.z, y: y - 0.008 + deck * bs });
      if (topY > 0) reg.roofs.push({ x: p.x + Math.cos(face) * (ox || 0) * bs, y: y - 0.008 + topY * bs, z: p.z - Math.sin(face) * (ox || 0) * bs });
      occ.push({ x: p.x, z: p.z, r: rad });
      made++;
    }
    b.auto = false;
    // Tree houses: a plank bridge with rope rails from each tree to the nearest tree.
    const done = new Set();
    decks.forEach((A, i) => {
      let bj = -1, bd = 0.36;
      decks.forEach((Bq, j) => { if (j !== i) { const dd = Math.hypot(Bq.x - A.x, Bq.z - A.z); if (dd < bd) { bd = dd; bj = j; } } });
      const key = Math.min(i, bj) + ':' + Math.max(i, bj);
      if (bj < 0 || done.has(key)) return;
      done.add(key);
      const Bq = decks[bj], len = bd - 0.03;
      b.push((A.x + Bq.x) / 2, (A.y + Bq.y) / 2, (A.z + Bq.z) / 2, -Math.atan2(Bq.z - A.z, Bq.x - A.x), 1, 0, Math.atan2(Bq.y - A.y, bd));
      b.box(len, 0.003, 0.014, c.wood, { pat: 3 });
      for (const sz of [-1, 1]) { b.box(len, 0.0015, 0.0015, c.K, { y: 0.012, z: sz * 0.007, lod: 1 }); for (let q = 0; q <= 4; q++) b.box(0.0015, 0.012, 0.0015, c.K, { x: (q / 4 - 0.5) * len, z: sz * 0.007, lod: 2 }); }
      b.pop();
    });
    reg.counts.buildings = made;
  }

  // Crop fields with a fence and a scarecrow.
  // cfg.bare (catalog pictures only): no crop fields and no animals, so one building stands alone.
  for (let f = 0; f < (cfg.bare || !anyBuilt ? 0 : B.field || 0); f++) for (let tries = 0; tries < 40; tries++) {
    const a = r() * TAU, d = r.range(0.3, 0.72), x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z);
    if (y < 0.03 || edgeE(tile, x, z) < 0.3 || !free(x, z, 0.2) || Math.abs(H(x + 0.14, z) - y) + Math.abs(H(x, z + 0.14) - y) + Math.abs(H(x - 0.14, z) - y) > 0.04) continue;
    const ry = PI / 2 - (tile.rot0 + r.int(0, 5) * (PI / 3)), crop = r.pick([N('autumn', 3), N('grass', 3.4), N('autumn', 4.4)]);
    b.push(x, y - 0.004, z, ry, 1);
    b.box(0.3, 0.006, 0.26, c.soil(0.6));
    for (let i = 0; i < 7; i++) { b.box(0.28, 0.014, 0.018, crop, { z: -0.108 + i * 0.036, y: 0.004 }); for (let k = 0; k < 6; k++) b.box(0.014, 0.022, 0.014, N('forest', 5.4), { x: -0.12 + k * 0.048, z: -0.108 + i * 0.036, y: 0.012, lod: 2, k: 11 }); }
    for (let i = 0; i <= 6; i++) for (const sd of [-1, 1]) { b.box(0.008, 0.035, 0.008, c.wood, { x: -0.16 + i * 0.0533, z: sd * 0.145, lod: 1 }); if (i < 6) b.box(0.008, 0.035, 0.008, c.wood, { x: sd * 0.16, z: -0.12 + i * 0.048, lod: 1 }); }
    for (const sd of [-1, 1]) { b.box(0.33, 0.005, 0.005, c.wood, { z: sd * 0.145, y: 0.022, lod: 1 }); b.box(0.005, 0.005, 0.29, c.wood, { x: sd * 0.16, y: 0.022, lod: 1 }); }
    b.box(0.006, 0.06, 0.006, c.wood, { x: 0.06, y: 0.01 }); b.box(0.04, 0.006, 0.006, c.wood, { x: 0.06, y: 0.05, lod: 1 }); b.box(0.016, 0.016, 0.016, N('autumn', 2.4), { x: 0.06, y: 0.066, lod: 1 }); b.box(0.024, 0.02, 0.012, c.a(0.5), { x: 0.06, y: 0.032, lod: 1 });
    b.pop();
    occ.push({ x, z, r: 0.2 });
    break;
  }
  // Small people along the paths and near the buildings.
  {
    const spots = pathPts.filter((_, i) => i % 3 === 1).slice(0, 5).map((p) => [p.x + (r() - 0.5) * 0.05, p.z + (r() - 0.5) * 0.05]);
    for (let i = 0; i < (anyBuilt ? 4 : 0); i++) { const o = occ[Math.floor(r() * occ.length)]; if (o) spots.push([o.x + Math.cos(i * 2) * (o.r + 0.03), o.z + Math.sin(i * 2) * (o.r + 0.03)]); }
    for (const [x, z] of spots) {
      const y = H(x, z); if (y < 0.03 || edgeE(tile, x, z) < 0.1) continue;
      b.push(x, y - 0.004, z, r() * TAU, r.range(0.9, 1.15));
      b.box(0.012, 0.014, 0.008, c.K, { lod: 1 }); b.box(0.014, 0.018, 0.01, r() < 0.5 ? c.a(0.5) : c.s(0.6), { y: 0.014, lod: 1 }); b.box(0.01, 0.01, 0.01, N('coral', 2.2), { y: 0.032, lod: 1 });
      if (r() < 0.4) b.box(0.016, 0.004, 0.016, c.a(0.7), { y: 0.042, lod: 2 });
      b.pop();
    }
  }

  // Plants: a row lattice, filled where a noise mask is highest (clumps).
  const nV = Math.round(cfg.veg * B.vegN);
  if (nV > 0) {
    const cand = [], sp = 0.082, rot = tile.rot0 + ((seed % 3) * PI) / 3;
    for (let i = -16; i <= 16; i++) for (let j = -16; j <= 16; j++) {
      const lx = (i + (j & 1) * 0.5) * sp, lz = j * sp * 0.866;
      const x = lx * Math.cos(rot) - lz * Math.sin(rot) + (r() - 0.5) * (0.03 + wh * 0.07), z = lx * Math.sin(rot) + lz * Math.cos(rot) + (r() - 0.5) * (0.03 + wh * 0.07);
      if (edgeE(tile, x, z) < 0.07) continue;
      cand.push({ x, z, k: n(x, z, 2.2, seed + 40) + r() * 0.15 });
    }
    cand.sort((a, bb) => bb.k - a.k);
    let made = 0;
    for (const p of cand) {
      if (made >= nV) break;
      const y = H(p.x, p.z);
      const kind = B.plants[Math.floor(r() * B.plants.length)];
      const aquatic = kind === 'coral' || (kind === 'reed' && y > -0.03);
      if (aquatic ? (y > 0.02 || y < -0.09) : y < 0.032) continue;
      if (!free(p.x, p.z, 0.02)) continue;
      b.push(p.x, aquatic ? Math.max(y, -0.05) : y - 0.006, p.z, r() * TAU, 1);
      b.lod = kind === 'flower' || kind === 'boulder' ? 1 : 0;
      tree[kind](b, c, r, lerp(1, r.range(0.6, 1.5), 0.35 + wh * 0.65));
      b.lod = 0;
      b.pop();
      made++;
    }
    reg.counts.plants = made;
  }
  // Frozen land: the ponds have a sheet of ice in every season, with a few dark cracks.
  if (B.frozen) {
    const keepSens = b.sens; b.sens = 0;
    for (let i = -18; i < 18; i++) for (let j = -18; j < 18; j++) {
      const x = (i + 0.5) * VOX, z = (j + 0.5) * VOX; if (edgeE(tile, x, z) < 0.012 || H(x, z) >= 0) continue;
      const hv = n(x * 7.1, z * 7.1, 3.3, seed + 5);
      b.box(VOX, 0.006, VOX, N('sea', 1.5 + hv * 1.4), { x, y: -0.003, z });   // pale blue ice
      if (hv < 0.3) b.box(VOX * 0.9, 0.002, 0.004, N('sea', 5.4), { x, y: 0.0035, z, ry: hv * 20, lod: 1 });
    }
    b.sens = keepSens;
  }
  // Seasons. Spring: small flowers come up across the land (kind 4 shows only in spring). Winter: ice lies on the ponds (kind 7 shows only in winter).
  if (!cfg.bare && cfg.biome !== 'blank') {
    const rs = rng(cfg.seed + 77), grassy = ['grass', 'forest', 'olive', 'autumn'].includes(B.land.row), fl = [N('pink', 3, 4), N('yellow', 3.4, 4), N('purple', 3.6, 4), N('plaster', 0.3, 4)];
    const keepSens = b.sens; b.sens = 0;
    for (let i = 0, k = 0; i < 700 && k < (grassy ? 52 : 16); i++) {
      const a = rs() * TAU, d = Math.sqrt(rs()) * 0.98, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z);
      if (y < 0.03 || edgeE(tile, x, z) < 0.06 || !free(x, z, 0.015)) continue;
      k++;
      for (let j = 0; j < 4; j++) { const fx = x + (rs() - 0.5) * 0.07, fz = z + (rs() - 0.5) * 0.07, fy = H(fx, fz); if (Math.abs(fy - y) > 0.012) continue; b.box(0.004, 0.016, 0.004, N('grass', 5.6, 4), { x: fx, z: fz, y: fy - 0.002 }); b.box(0.014, 0.011, 0.014, fl[(k + j) % 4], { x: fx, z: fz, y: fy + 0.014 }); }
    }
    for (let i = 0, k = 0; i < 400 && k < 8; i++) {
      const a = rs() * TAU, d = Math.sqrt(rs()) * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d, q = rs();
      if (edgeE(tile, x, z) < 0.14 || H(x, z) > -0.04 || H(x + 0.06, z) > -0.04 || H(x - 0.06, z) > -0.04 || H(x, z + 0.06) > -0.04 || H(x, z - 0.06) > -0.04) continue;
      const w = 0.05 + q * 0.05; b.box(w, 0.008, w * 0.7, N('plaster', 0.3, 7), { x, y: -0.002, z, ry: q * 9 }); k++;
    }
    b.sens = keepSens;
  }
  // Tufts of grass, pebbles, and small flowers. Close zoom only.
  b.lod = 2;
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 1.05, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z), k = r();
    if (y < 0.03 || edgeE(tile, x, z) < 0.05 || !free(x, z, 0.012)) continue;
    if (k < 0.5 && (B.land.row === 'grass' || B.land.row === 'forest' || B.land.row === 'olive')) { b.box(0.01, r.range(0.012, 0.024), 0.01, c.f(r.range(0.5, 0.8)), { x, z, y: y - 0.003, k: 11 }); if (r() < 0.4) b.box(0.008, 0.008, 0.008, r() < 0.5 ? N('autumn', 2.4) : N('plaster', 0.4), { x: x + 0.012, z, y: y + 0.008 }); }
    else if (k < 0.8) b.box(r.range(0.01, 0.02), 0.008, r.range(0.01, 0.018), N('rock', r.range(3.6, 5.4)), { x, z, y: y - 0.003, ry: r() * 3 });
  }
  b.lod = 0;
  // Lily pads on ponds.
  if (B.wet) for (let i = 0; i < 14; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d; if (H(x, z) < -0.02 && edgeE(tile, x, z) > 0.1 && free(x, z, 0.03)) b.cyl(r.range(0.018, 0.03), 0.004, N('grass', 4.4), { x, z, y: 0.002, lod: 1 }); }

  // Animals that match the biome. They walk a little and rest (see animals.js).
  reg.animals = addAnimals({ anim, H, tile, list: BIOME_ANIMALS[cfg.biome] || BIOME_ANIMALS.meadow, n: cfg.bare || cfg.biome === 'blank' ? 0 : 4 + (seed % 3), seed, free, occ });
  // Birds that circle (medium and high quality).
  const bseed = seed % 10;
  anim((db, fb, t) => {
    for (let i = 0; i < 3; i++) {
      const a = t * (0.25 + i * 0.05) + i * 2.1 + bseed, rad = 0.45 + i * 0.12, flap = Math.sin(t * 7 + i) * 0.5;
      db.push(Math.cos(a) * rad, 0.55 + i * 0.07, Math.sin(a) * rad, -a, 1);
      db.box(0.03, 0.004, 0.012, c.K, { x: 0.014, rz: flap, lod: 1 }); db.box(0.03, 0.004, 0.012, c.K, { x: -0.014, rz: -flap, lod: 1 });
      db.pop();
    }
  }, { extra: true, minLod: 0.2 });

  reg.occ = occ; reg.c = c;
  addDetails(reg, b, anim, r);
  return reg;
}

// A random config from a seed (for samples, "Randomize all", and tests).
const NAMES_A = ['Mora', 'Tesse', 'Quill', 'Ombra', 'Pilo', 'Vanta', 'Sunda', 'Kesh', 'Lumo', 'Brindle', 'Farro', 'Nori', 'Zephyr', 'Halo', 'Cobalt', 'Wren', 'Juno', 'Peri', 'Sable', 'Tango', 'Echo', 'Fable', 'Mica', 'Opal'];
const NAMES_B = ['Hollow', 'Reach', 'Flats', 'Point', 'Bay', 'Ridge', 'Works', 'Gardens', 'Landing', 'Heights', 'Cove', 'Terrace', 'Yard', 'Quarter', 'Steps', 'Commons', 'Shoals', 'Rise'];
const MOTTOS = ['Shape first. Then color.', 'Less, but brighter.', 'Built in straight lines.', 'Round is a good shape.', 'Every roof a triangle.', 'One hill at a time.', 'Make it bold.', 'Stack. Repeat. Smile.', 'The grid is our friend.', 'Small place. Big shapes.', 'Color does the talking.', 'Measured twice. Painted once.', 'Soft light. Hard edges.', 'A good arch helps.'];
const HUE_IDS = ['blue', 'darkblue', 'red', 'orange', 'yellow', 'green', 'purple', 'pink'];
export function randomConfig(seed, part) {
  const r = rng(seed * 7919 + 13);
  const pickHues = () => { const a = r.pick(HUE_IDS); let s = r.pick(HUE_IDS); for (let i = 0; i < 8 && s === a; i++) s = r.pick(HUE_IDS); return [a, s]; };
  const nH = r.int(2, 5), used = new Set(), heroes = [];
  const ids = Object.keys(HEROES);
  for (let i = 0; i < nH; i++) { let an = r.int(0, 6); for (let k = 0; k < 8 && used.has(an); k++) an = r.int(0, 6); used.add(an); heroes.push({ type: r.pick(ids), anchor: an, rot: r.int(0, 5), size: r.pick(['small', 'medium', 'medium', 'large']) }); }
  const all = {
    biome: r.pick(BIOME_IDS), rough: r.range(0.1, 0.9), water: r.range(0.1, 0.7), veg: r.range(0.25, 1),
    hues: pickHues(), toneSet: r.pick(['mid', 'mid', 'mid', 'deep', 'mixed', 'pastel']), hueShift: r.range(0.3, 0.8),
    arch: r.pick(Object.keys(STYLES)), bld: r.range(0.2, 0.9), whimsy: r.range(0, 1),
    heroes,
    name: r.pick(NAMES_A) + ' ' + r.pick(NAMES_B), motto: r.pick(MOTTOS),
    seed: (seed * 2654435761) >>> 0,
  };
  if (!part) return all;
  const groups = { land: ['biome', 'rough', 'water', 'veg'], color: ['hues', 'toneSet', 'hueShift'], buildings: ['arch', 'bld', 'whimsy'], scenery: ['arch', 'bld', 'whimsy'], heroes: ['heroes'], name: ['name', 'motto'] };
  const o = {}; for (const k of groups[part]) o[k] = all[k]; return o;
}
export { HUE_IDS, TONE_SET_LABEL };
