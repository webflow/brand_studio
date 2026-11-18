// The 19 hero objects. Each is built from primitives in local units (1 = tile inradius).
// Local frame: y up, +z is the front. build() adds the static shapes. anim() adds the moving shapes each frame.
import { ROW } from './palette.js';
import { OPEN_HEROES } from './open.js';
import { TAU } from './util.js';

const PI = Math.PI;
export const WATER = [ROW.sea, 3.0], WATER_D = [ROW.sea, 5];
const LOAF = [ROW.autumn, 4.6, 0, 0], LOAF2 = [ROW.autumn, 3.4, 0, 0], CRUMB = [ROW.sand, 1.4, 0, 0];
const SPRAY = [ROW.sea, 1.8, 0, 0], FOAM = [ROW.sea, 0.5, 0, 0];
const N = (row, tone, kind = 0) => [ROW[row], tone, kind, 0];
// A pool of water in the shape of the blocky "round" bowls (a plus shape), from three pieces that do not overlap.
function pool(b, R, h, y) { const D = R * 2, w = [ROW.sea, 5, 5, 0.45]; b.wcol(D, h, D * 0.6, w, { y }); for (const s of [-1, 1]) b.wcol(D * 0.6, h, D * 0.2, w, { y, z: s * D * 0.4 }); }
// Farm crops for each biome: n plants in a row, a stem [width, height, [row, tone]], and a head [width, height, [row, tone], kind].
export const CROPS = {
  meadow: { name: 'wheat', n: 13, stem: [0.006, 0.024, ['autumn', 2.6]], head: [0.008, 0.012, ['autumn', 3.8]] },
  forest: { name: 'pumpkins', n: 8, stem: [0.016, 0.006, ['forest', 5.6]], head: [0.014, 0.012, ['orange', 5]] },
  desert: { name: 'agave', n: 7, stem: [0.018, 0.01, ['olive', 5.6]], head: [0.008, 0.014, ['olive', 4.2]] },
  tundra: { name: 'cabbage', n: 8, stem: [0.017, 0.009, ['forest', 6.2]], head: [0.01, 0.007, ['grass', 2.6]] },
  wetland: { name: 'rice', n: 15, stem: [0.005, 0.02, ['grass', 4.4]], wet: true },
  volcanic: { name: 'grape vines', n: 8, stem: [0.02, 0.022, ['forest', 5.8]], head: [0.009, 0.008, ['amethyst', 6.4]] },
  archipelago: { name: 'pineapples', n: 8, stem: [0.012, 0.012, ['autumn', 3.6]], head: [0.008, 0.013, ['forest', 5]] },
  canyon: { name: 'corn', n: 11, stem: [0.006, 0.04, ['grass', 5.2]], head: [0.009, 0.014, ['yellow', 4]] },
  jungle: { name: 'banana plants', n: 7, stem: [0.007, 0.036, ['grass', 4.6]], head: [0.028, 0.006, ['forest', 5.4], 11] },
  alpine: { name: 'lavender', n: 11, stem: [0.012, 0.012, ['forest', 5.6]], head: [0.01, 0.012, ['amethyst', 4.6]] },
  crystal: { name: 'mushrooms', n: 8, stem: [0.006, 0.012, ['plaster', 1]], head: [0.016, 0.008, ['amethyst', 4.2]] },
};
CROPS.coral = CROPS.archipelago;
const LAMP = [ROW.yellow, 4, 6, 0], LENS = [ROW.yellow, 1.6, 6, 0], DARKM = [ROW.neutral, 8.6, 0, 0];

// Color helper for one region. Buildings and objects use the two accent hues, plaster, and stone.
// Plants and land use the natural rows of the biome (nat = { ground, leaf }).
export function colors(P, r, nat = {}) {
  const leafRow = ROW[nat.leaf || 'forest'], gRow = ROW[nat.ground || 'grass'];
  const stone = (l) => [ROW.rock, 2.2 + l * 4.6];
  return {
    p: stone, stone, s: P.s, a: P.a, W: P.W, K: P.K, r,
    soil: (l) => [ROW.earth, 3.2 + l * 4.4],
    g: (l) => [gRow, 2.4 + l * 4.6],
    wood: [ROW.earth, 6.6], trunk: [ROW.earth, 7.8], path: [ROW.plaster, 2.4],
    f: (l) => [leafRow, 2.9 + l * 4.3],
    leaf: (l) => [leafRow, 2.9 + l * 4.3, 3, ROW.autumn / 255],   // leaves that fall. In autumn they turn ochre.
    win: (early) => [ROW.rock, 7.8, 1, early ? 0 : r()],            // dark glass by day, warm at night
    lamp: [ROW.plaster, 0.4, 1, 0.04],
    glow: (l = 0.3) => { const c = P.a(l); return [c[0], c[1], 2, r()]; },
  };
}

// Magma on a slope. lavaBed = the dark channel that stays (drawn one time). lavaFlow = bright pieces that move down the channel (drawn each frame).
// a = the direction, d0 to d1 = from where to where, yAt(x, z) = the height of the land. The magma is yellow at the top; it cools to orange and dark red as it goes.
export function lavaBed(b, a, d0, d1, yAt, w = 0.034) {
  const ca = Math.cos(a), sa = Math.sin(a), n = Math.max(3, Math.round((d1 - d0) / 0.028));
  for (let i = 0; i <= n; i++) { const d = d0 + (i / n) * (d1 - d0), x = ca * d, z = sa * d; b.box(w * (1.1 - 0.3 * (i / n)), 0.008, 0.034, [ROW.orange, 6.8, 2, 0.3 + (i % 3) * 0.2], { x, z, y: yAt(x, z) - 0.005, ry: Math.PI / 2 - a }); }
}
export function lavaFlow(db, t, a, d0, d1, yAt, k = 0, w = 0.03) {
  const ca = Math.cos(a), sa = Math.sin(a), n = 7;
  for (let i = 0; i < n; i++) {
    const f = (t * 0.11 + i / n + k) % 1, d = d0 + f * (d1 - d0), x = ca * d, z = sa * d, e = Math.sin(f * Math.PI);
    db.box(w * (0.7 + 0.5 * e), 0.011 + 0.008 * e, w * 1.5, f < 0.3 ? [ROW.yellow, 3.2, 2, 0] : f < 0.65 ? [ROW.orange, 4.6, 2, 0] : [ROW.orange, 6.2, 2, 0], { x, z, y: yAt(x, z) - 0.002, ry: Math.PI / 2 - a });
  }
}

// Rising, fading puffs (smoke or steam).
export function puffs(b, t, x, y, z, n, rise, col, size = 0.03, speed = 0.22) {
  for (let i = 0; i < n; i++) {
    const ph = (t * speed + i / n) % 1;
    const s = size * (0.45 + ph * 0.9) * (1 - ph * ph * 0.7);
    b.ball(s, col, { x: x + Math.sin(ph * 5 + i * 2) * 0.03 * ph, y: y + ph * rise, z: z + ph * 0.05 });
  }
}
// A simple four-legged animal.
export function critter(b, x, z, ry, s, body, legs, o = {}) {
  b.push(x, o.y || 0, z, ry, s);
  for (const [lx, lz] of [[-0.02, -0.012], [-0.02, 0.012], [0.02, -0.012], [0.02, 0.012]]) b.cyl(0.005, 0.022, legs, { x: lx, z: lz });
  b.ball(0.022, body, { y: 0.016, sx: 1.5 });
  b.ball(0.013, o.head || body, { x: 0.035, y: 0.03 });
  b.pop();
}
const ring8 = (n, rad, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU; fn(Math.cos(a) * rad, Math.sin(a) * rad, a, i); } };
const win = (b, c, w, h, o, early) => b.box(w, h, 0.012, c.win(early), { lod: 1, ...o });
function awning(b, c, x0, n, y, z, w = 0.04) {
  for (let i = 0; i < n; i++) b.box(w, 0.008, 0.085, i % 2 ? c.W : c.a(0.5), { x: x0 + i * w, y, z, rx: 0.5 });
}

const VASES = [
  [[0, 0], [0.5, 0], [0.85, 0.3], [0.95, 0.5], [0.55, 0.82], [0.42, 0.92], [0.6, 1], [0, 1]],
  [[0, 0], [0.6, 0], [0.5, 0.2], [0.9, 0.55], [0.7, 0.85], [0.75, 1], [0, 1]],
  [[0, 0], [0.7, 0], [1, 0.15], [1, 0.3], [0.35, 0.6], [0.3, 0.85], [0.5, 1], [0, 1]],
];

// Rock in the color of the biome (sandstone in a desert, dark rock on volcanic land). t = a tone from 3.4 (light) to 6.8 (dark).
const RK = (c, t) => (c && c.rock ? c.rock((t - 3.4) / 3.4) : N('rock', t));
export const HEROES = {
  lighthouse: {
    label: 'Lighthouse', r: 0.2, h: 0.75,
    build(b, c) {
      b.cyl(0.2, 0.035, c.p(0.85)); b.cyl(0.16, 0.03, c.W, { y: 0.035 });
      let y = 0.065, R = 0.105;
      for (let i = 0; i < 5; i++) { const R2 = R * 0.87; b.cyl(R, 0.1, i % 2 ? c.W : c.a(0.5), { y, t: 1 - R2 / R }); y += 0.1; R = R2; }
      b.cyl(R * 1.9, 0.018, c.K, { y });
      ring8(8, R * 1.72, (x, z) => b.cyl(0.006, 0.04, c.K, { x, z, y: y + 0.018, lod: 1 }));
      // The lamp room is open glass: thin posts, a lamp on a stand. The glass and the turning lens are drawn in anim().
      ring8(8, R * 0.9, (x, z) => b.box(0.005, 0.078, 0.005, c.K, { x, z, y: y + 0.018 }));
      b.cyl(R * 1.02, 0.006, c.K, { y: y + 0.09 });
      b.cyl(0.014, 0.016, c.K, { y: y + 0.018 }); b.box(0.02, 0.034, 0.02, LAMP, { y: y + 0.034 });
      b.cone(R * 1.4, 0.08, c.a(0.75), { y: y + 0.096 }); b.ball(0.014, c.K, { y: y + 0.17 });
      b.box(0.04, 0.07, 0.014, c.K, { y: 0.065, z: 0.1 });
      for (let i = 0; i < 3; i++) win(b, c, 0.022, 0.036, { y: 0.21 + i * 0.12, z: 0.089 - i * 0.012 });
      b.box(0.1, 0.06, 0.09, c.s(0.25), { x: -0.14, y: 0.035, z: 0.02 }); b.gable(0.11, 0.04, 0.1, c.a(0.75), { x: -0.14, y: 0.095, z: 0.02 });
      win(b, c, 0.03, 0.025, { x: -0.14, y: 0.055, z: 0.066 });
    },
    anim(b, fb, t, env) {
      // The beams are soft pools of light on the land and the sea (see the light table below). There is no hard beam shape.
      // Inside the glass room, a lens turns around the lamp at the same speed as the beams.
      const y = 0.583;
      b.push(0, y + 0.03, 0, t * 0.7);
      for (const s of [-1, 1]) { b.box(0.005, 0.042, 0.03, LENS, { x: s * 0.027 }); b.box(0.05, 0.042, 0.004, DARKM, { z: s * 0.017 }); }
      b.pop();
      fb.box(0.092, 0.078, 0.092, [ROW.sea, 1.4, 2, 0.24], { y });               // the glass (by day)
      fb.box(0.092, 0.078, 0.092, [ROW.yellow, 1.0, 1, 0.3], { y });                      // at night the room is full of warm light
      fb.cyl(0.085, 0.11, [ROW.yellow, 1.6, 1, 0.14], { y: y - 0.016 });          // and it has a soft glow around it
    },
  },
  observatory: {
    label: 'Observatory', r: 0.24, h: 0.42,
    build(b, c) {
      b.cyl(0.23, 0.03, c.p(0.8)); b.cyl(0.17, 0.2, c.s(0.2), { y: 0.03 }); b.cyl(0.182, 0.022, c.a(0.6), { y: 0.23 });
      b.arch(0.075, 0.1, 0.02, c.K, { y: 0.03, z: 0.165 }); b.box(0.11, 0.015, 0.06, c.W, { z: 0.2, y: 0.02 });
      ring8(7, 0.17, (x, z, a, i) => { if (i !== 2) win(b, c, 0.03, 0.05, { x, z, y: 0.12, ry: -a + PI / 2 }); });
      b.box(0.12, 0.1, 0.12, c.s(0.4), { x: -0.2, y: 0.03, z: 0.04 }); b.dome(0.06, 0.05, c.a(0.6), { x: -0.2, y: 0.13, z: 0.04 });
      b.cyl(0.006, 0.12, c.K, { x: 0.2, y: 0.03, z: -0.08, lod: 1 }); b.cyl(0.03, 0.006, c.W, { x: 0.2, y: 0.15, z: -0.08, rx: 0.9, lod: 1 });
    },
    anim(b, fb, t, env, c) {
      b.push(0, 0.252, 0, t * 0.12);
      b.dome(0.165, 0.16, c.W); b.half(0.34, 0.168, 0.07, c.K);
      // The telescope looks out of the slit: a main tube with bands, a wide front shield with a lens, a finder scope, an eyepiece.
      b.push(0, 0.04, 0, 0, 1, 0, -0.78);
      b.cyl(0.03, 0.31, c.s(0.9));
      b.cyl(0.035, 0.02, c.K, { y: -0.005 }); b.cyl(0.034, 0.012, c.a(0.55), { y: 0.1 }); b.cyl(0.034, 0.012, c.a(0.55), { y: 0.2 });
      b.cyl(0.04, 0.07, c.W, { y: 0.27 }); b.cyl(0.042, 0.008, c.K, { y: 0.34 }); b.cyl(0.032, 0.004, [ROW.sea, 2.2, 6, 0], { y: 0.348 });
      b.cyl(0.01, 0.13, c.K, { y: 0.13, z: 0.04 }); b.cyl(0.013, 0.014, c.W, { y: 0.26, z: 0.04 });
      for (const yy of [0.15, 0.23]) b.box(0.008, 0.008, 0.02, c.K, { y: yy, z: 0.03 });
      b.cyl(0.012, 0.03, c.K, { y: -0.035 }); b.box(0.016, 0.012, 0.03, c.K, { y: 0.03, z: -0.035 });
      b.pop();
      b.box(0.04, 0.06, 0.1, c.K, { y: 0, x: -0.01 });   // the mount
      b.pop();
    },
  },
  windmill: {
    label: 'Windmill', r: 0.2, h: 0.55,
    build(b, c) {
      b.cyl(0.19, 0.03, c.p(0.8)); b.cyl(0.12, 0.36, c.s(0.15), { y: 0.03, t: 0.42 }); b.cyl(0.127, 0.035, c.a(0.6), { y: 0.03 });
      b.cone(0.09, 0.1, c.a(0.7), { y: 0.39 });
      b.box(0.04, 0.075, 0.014, c.K, { y: 0.065, z: 0.115 });
      win(b, c, 0.025, 0.035, { y: 0.2, z: 0.095 }); win(b, c, 0.022, 0.03, { y: 0.3, z: 0.08 });
      b.box(0.045, 0.045, 0.06, c.s(0.6), { y: 0.36, z: 0.06 });
      b.box(0.1, 0.012, 0.07, c.W, { y: 0.03, z: 0.15 });
      for (let i = 0; i < 4; i++) b.box(0.03, 0.02 + (i % 2) * 0.012, 0.03, c.a(0.3), { x: 0.14 + (i % 2) * 0.035, y: 0.03, z: -0.05 + (i >> 1) * 0.04, lod: 1 });
    },
    anim(b, fb, t, env, c) {
      b.push(0, 0.385, 0.1, 0, 1, 0, t * 0.9);
      // The sails: a long wood spar, a ladder frame on one side of it, and canvas over part of the frame. Each sail is turned a little into the wind.
      const wood = c.wood || c.K;
      b.cyl(0.016, 0.06, wood, { rx: PI / 2, z: -0.03 }); b.box(0.03, 0.03, 0.012, c.K, { y: -0.015, z: 0.024 });
      for (let k = 0; k < 4; k++) {
        b.push(0, 0, 0.026, 0, 1, 0, k * PI / 2); b.push(0, 0, 0, 0.22);
        b.box(0.009, 0.285, 0.007, wood);                                                      // spar
        b.box(0.004, 0.215, 0.004, wood, { x: 0.052, y: 0.06 }); b.box(0.004, 0.215, 0.004, wood, { x: -0.014, y: 0.06, lod: 1 });   // long rails
        for (let i = 0; i < 8; i++) b.box(0.07, 0.004, 0.004, wood, { x: 0.019, y: 0.06 + i * 0.0302, lod: 1 });                  // cross bars
        b.box(0.044, 0.15, 0.002, c.W, { x: 0.028, y: 0.062, z: -0.003 });                     // canvas (part of the frame is open)
        b.pop(); b.pop();
      }
      b.pop();
    },
  },
  monument: {
    label: 'Monument', r: 0.22, h: 0.62,
    build(b, c) {
      for (let i = 0; i < 3; i++) b.box(0.38 - 0.08 * i, 0.03, 0.38 - 0.08 * i, i % 2 ? c.p(0.8) : c.W, { y: i * 0.03 });
      b.box(0.14, 0.055, 0.14, c.a(0.55), { y: 0.09 });
      b.box(0.095, 0.4, 0.095, c.s(0.15), { y: 0.145, t: 0.45 }); b.pyr(0.054, 0.06, 0.054, c.a(0.6), { y: 0.545 });
      b.box(0.07, 0.03, 0.01, c.W, { y: 0.1, z: 0.07, lod: 1 });
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { b.cyl(0.013, 0.045, c.K, { x: x * 0.2, z: z * 0.2 }); b.ball(0.014, c.lamp, { x: x * 0.2, z: z * 0.2, y: 0.045, lod: 1 }); }
      for (const s of [-1, 1]) { b.cyl(0.005, 0.2, c.K, { x: s * 0.13, y: 0.03, z: 0.13 }); b.box(0.05, 0.03, 0.004, c.a(0.5), { x: s * 0.13 + 0.027, y: 0.19, z: 0.13 }); }
      ring8(6, 0.115, (x, z) => b.ball(0.012, [ROW.coral, 1.6], { x, z, y: 0.09, lod: 1, k: 4 }));
    },
  },
  arch: {
    label: 'Arch', r: 0.27, h: 0.56,
    build(b, c) {
      for (let i = 0; i < 3; i++) b.box(0.56 - 0.05 * i, 0.02, 0.26 - 0.04 * i, i % 2 ? c.p(0.8) : c.W, { y: i * 0.02 });
      b.arch(0.44, 0.42, 0.13, c.s(0.2), { y: 0.06 });
      b.arch(0.264, 0.336, 0.09, c.a(0.5), { y: 0.06 });
      b.arch(0.158, 0.269, 0.05, c.W, { y: 0.06 });
      b.box(0.5, 0.025, 0.16, c.W, { y: 0.48 });
      for (let i = 0; i < 6; i++) b.box(0.035, 0.03, 0.16, c.s(0.5), { x: -0.2 + i * 0.08, y: 0.505 });
      for (const s of [-1, 1]) { b.box(0.07, 0.3, 0.09, c.s(0.5), { x: s * 0.27, y: 0.04, t: 0.3 }); b.pyr(0.06, 0.05, 0.07, c.a(0.6), { x: s * 0.27, y: 0.34 }); }
    },
    anim(b, fb, t, env, c) {
      const x = Math.sin(t * 0.3) * 0.2;
      b.cyl(0.011, 0.034, c.K, { x, y: 0.535 }); b.ball(0.011, c.a(0.4), { x, y: 0.569 });
    },
  },
  fountain: {
    label: 'Fountain', r: 0.21, h: 0.34,
    build(b, c) {
      // The water is the same see-through, reflecting water as the ponds and the sea (kind 5).
      b.cyl(0.21, 0.018, c.W); b.cyl(0.195, 0.04, c.s(0.3), { y: 0.018 }); pool(b, 0.178, 0.014, 0.058);
      b.cyl(0.04, 0.1, c.W, { y: 0.05 });
      b.cyl(0.12, 0.022, c.s(0.3), { y: 0.15 }); pool(b, 0.106, 0.012, 0.172);
      b.cyl(0.03, 0.08, c.W, { y: 0.17 });
      b.cyl(0.07, 0.02, c.s(0.3), { y: 0.25 }); pool(b, 0.058, 0.01, 0.27);
      b.cyl(0.018, 0.04, c.W, { y: 0.27 }); b.ball(0.022, c.a(0.5), { y: 0.305 });
      ring8(8, 0.195, (x, z) => b.ball(0.014, c.a(0.45), { x, z, y: 0.05, lod: 1 }));
      ring8(4, 0.27, (x, z, a) => b.box(0.07, 0.014, 0.022, c.K, { x, z, y: 0.012, ry: -a + PI / 2, lod: 1 }));
    },
    anim(b, fb, t, env) {
      // A jet at the top. Thin streams fall from each bowl to the one below. Foam where they land.
      const n = env.extras ? 14 : 8;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.7 + i / n) % 1, a = i * 2.4, rad = 0.004 + ph * 0.05, s = 0.008 * (1 - 0.3 * ph);
        b.box(s, s, s, i % 3 ? SPRAY : FOAM, { x: Math.cos(a) * rad, z: Math.sin(a) * rad, y: 0.325 + 0.1 * ph - 0.16 * ph * ph, lod: 1 });
      }
      for (const [r1, y1, y0] of [[0.058, 0.276, 0.184], [0.106, 0.18, 0.072]]) for (let k = 0; k < 4; k++) for (const o of env.low ? [0] : [-0.45, 0.45]) {
        const a = k * PI / 2, ca = Math.cos(a), sa = Math.sin(a), ox = -sa * o * r1, oz = ca * o * r1;
        for (let j = 0; j < 3; j++) {
          const ph = (t * 1.1 + j / 3 + k * 0.13 + o) % 1, rr = r1 + 0.004 + ph * 0.012;
          b.box(0.006, 0.018, 0.006, j % 2 ? SPRAY : FOAM, { x: ca * rr + ox, z: sa * rr + oz, y: y1 - (y1 - y0) * ph * ph - 0.01, lod: 1 });
        }
        const rp = 0.008 + 0.006 * Math.sin(t * 6 + k + o * 3);
        b.box(rp * 2, 0.003, rp * 2, FOAM, { x: ca * (r1 + 0.016) + ox, z: sa * (r1 + 0.016) + oz, y: y0, lod: 1 });
      }
    },
  },
  farm: {
    label: 'Farm', r: 0.3, h: 0.28,
    build(b, c) {
      // The field: soil rows with a crop that matches the biome of the region (see CROPS).
      const crop = CROPS[c.biome] || CROPS.meadow, rr = c.r || (() => 0.5);
      for (let i = 0; i < 7; i++) {
        const z = 0.03 + i * 0.036;
        b.box(0.4, 0.012, 0.034, c.soil(i % 2 ? 0.7 : 0.5), { z });
        if (crop.wet) b.wcol(0.4, 0.005, 0.014, [ROW.sea, 5, 5, 0.45], { y: 0.011, z: z + 0.018 });   // water between the rice rows
        for (let j = 0; j < crop.n; j++) {
          const x = -0.185 + (j + 0.5) * (0.37 / crop.n) + (rr() - 0.5) * 0.006, k = 0.8 + rr() * 0.4, [sw, sh, sc] = crop.stem;
          b.box(sw, sh * k, sw, N(...sc), { x, y: 0.012, z, lod: 1, k: 11 });
          if (crop.head) { const [hw, hh, hc, hk] = crop.head; b.box(hw, hh, hw, N(...hc), { x, y: 0.012 + sh * k, z, lod: 1, k: hk ?? 0 }); }
        }
      }
      b.box(0.2, 0.12, 0.15, c.s(0.4), { x: -0.1, z: -0.13 }); b.gable(0.22, 0.085, 0.17, c.a(0.7), { x: -0.1, y: 0.12, z: -0.13 });
      // The barn door: two wood leaves in a white frame. Each leaf has a white cross brace.
      b.box(0.082, 0.085, 0.01, c.wood, { x: -0.1, z: -0.053 });
      b.box(0.094, 0.008, 0.014, c.W, { x: -0.1, y: 0.085, z: -0.052 }); b.box(0.004, 0.085, 0.014, c.W, { x: -0.1, z: -0.052 });
      for (const sd of [-1, 1]) {
        b.box(0.006, 0.085, 0.014, c.W, { x: -0.1 + sd * 0.044, z: -0.052 });
        for (const th of [-0.44, 0.44]) b.box(0.005, 0.082, 0.004, c.W, { x: -0.1 + sd * 0.021 + Math.sin(th) * 0.041, y: 0.0425 - Math.cos(th) * 0.041, z: -0.046, rz: th, lod: 1 });
      }
      win(b, c, 0.03, 0.025, { x: -0.1, y: 0.135, z: -0.05 });
      b.cyl(0.05, 0.2, c.W, { x: 0.12, z: -0.14 }); b.dome(0.05, 0.05, c.a(0.6), { x: 0.12, y: 0.2, z: -0.14 });
      b.cyl(0.052, 0.012, c.a(0.6), { x: 0.12, y: 0.07, z: -0.14 }); b.cyl(0.052, 0.012, c.a(0.6), { x: 0.12, y: 0.14, z: -0.14 });
      for (let i = 0; i < 7; i++) b.cyl(0.006, 0.035, c.K, { x: -0.21 + i * 0.07, z: 0.005, lod: 1 });
      b.box(0.43, 0.005, 0.005, c.K, { y: 0.025, z: 0.005, lod: 1 });
      critter(b, 0.2, -0.03, 0.6, 1.2, c.W, c.K, { head: c.K }); critter(b, 0.03, -0.03, 2.5, 1.0, c.W, c.K, { head: c.a(0.8) });
      for (let i = 0; i < 3; i++) b.cyl(0.028, 0.03, [ROW.autumn, 2.6], { x: 0.2 + (i % 2) * 0.03, z: -0.2 + i * 0.03, rx: PI / 2, y: 0.028, lod: 1 });
    },
  },
  museum: {
    label: 'Museum', r: 0.29, h: 0.38,
    build(b, c) {
      for (let i = 0; i < 3; i++) b.box(0.52 - 0.03 * i, 0.02, 0.36 - 0.035 * i, c.W, { y: 0.02 * i, z: 0.01 - 0.01 * i });
      b.box(0.42, 0.2, 0.22, c.s(0.2), { y: 0.06, z: -0.04 });
      for (let i = 0; i < 6; i++) { b.cyl(0.016, 0.17, c.W, { x: -0.175 + i * 0.07, y: 0.06, z: 0.1 }); b.box(0.04, 0.012, 0.04, c.W, { x: -0.175 + i * 0.07, y: 0.218, z: 0.1, lod: 1 }); }
      b.box(0.47, 0.032, 0.3, c.W, { y: 0.23, z: -0.01 });
      b.gable(0.47, 0.095, 0.3, c.a(0.55), { y: 0.262, z: -0.01 });
      b.gable(0.34, 0.066, 0.31, c.a(0.3), { y: 0.266, z: -0.01 });
      b.cyl(0.02, 0.32, c.W, { y: 0.29, z: -0.165, rx: PI / 2, lod: 1 });
      b.box(0.075, 0.125, 0.012, c.K, { y: 0.06, z: 0.072 });
      for (const x of [-0.14, -0.07, 0.07, 0.14]) win(b, c, 0.03, 0.07, { x, y: 0.1, z: 0.072 });
      for (const s of [-1, 1]) { b.box(0.03, 0.13, 0.008, c.a(0.5), { x: s * 0.105, y: 0.09, z: 0.075, lod: 1 }); b.box(0.045, 0.04, 0.045, c.W, { x: s * 0.23, y: 0.02, z: 0.13 }); b.ball(0.02, c.a(0.5), { x: s * 0.23, y: 0.06, z: 0.13 }); }
    },
  },
  clocktower: {
    label: 'Clock tower', r: 0.16, h: 0.85,
    build(b, c) {
      b.box(0.24, 0.03, 0.24, c.W); b.box(0.2, 0.05, 0.2, c.p(0.8), { y: 0.03 });
      b.box(0.15, 0.47, 0.15, c.s(0.2), { y: 0.08, t: 0.22 });
      b.box(0.14, 0.11, 0.14, c.s(0.4), { y: 0.55 }); b.box(0.16, 0.014, 0.16, c.W, { y: 0.66 });
      b.pyr(0.165, 0.15, 0.165, c.a(0.65), { y: 0.674 }); b.ball(0.012, c.K, { y: 0.815 });
      for (let k = 0; k < 4; k++) {
        b.push(0, 0, 0, k * PI / 2);
        b.cyl(0.056, 0.008, c.K, { y: 0.605, z: 0.068, rx: PI / 2 }); b.cyl(0.049, 0.012, c.W, { y: 0.605, z: 0.068, rx: PI / 2 });
        for (let i = 0; i < 3; i++) win(b, c, 0.02, 0.04, { y: 0.16 + i * 0.12, z: 0.072 - i * 0.006 });
        b.pop();
      }
      b.arch(0.06, 0.075, 0.014, c.K, { y: 0.08, z: 0.074 });
    },
    anim(b, fb, t, env, c) {
      for (let k = 0; k < (env.low ? 2 : 4); k++) {
        b.push(0, 0.605, 0, k * PI / 2);
        b.box(0.009, 0.028, 0.004, c.K, { z: 0.081, rz: -env.dayPhase * TAU });
        b.box(0.006, 0.042, 0.004, c.a(0.8), { z: 0.084, rz: -env.dayPhase * 12 * TAU });
        b.pop();
      }
    },
  },
  opera: {
    label: 'Opera theater', r: 0.29, h: 0.42,
    build(b, c) {
      // A classic opera house. Front: steps with a red carpet, a row of columns, and a pediment. Middle: the hall with a dome. Back: the tall stage tower.
      b.box(0.5, 0.036, 0.42, c.p(0.5), { z: -0.03 });
      for (let i = 0; i < 3; i++) { b.box(0.4 - i * 0.03, 0.012, 0.1, c.W, { y: i * 0.012, z: 0.21 - i * 0.012 }); b.box(0.07, 0.013, 0.102, c.a(0.5), { y: i * 0.012, z: 0.21 - i * 0.012, lod: 1 }); }
      b.box(0.4, 0.15, 0.12, c.s(0.2), { y: 0.036, z: 0.09 });
      for (let i = 0; i < 6; i++) { const x = -0.165 + i * 0.066; b.cyl(0.012, 0.132, c.W, { x, y: 0.036, z: 0.168 }); b.box(0.03, 0.007, 0.03, c.W, { x, y: 0.036, z: 0.168, lod: 1 }); b.box(0.03, 0.008, 0.03, c.W, { x, y: 0.166, z: 0.168, lod: 1 }); }
      b.box(0.43, 0.022, 0.085, c.W, { y: 0.174, z: 0.15 }); b.box(0.44, 0.006, 0.09, c.p(0.5), { y: 0.196, z: 0.15, lod: 1 });
      b.gable(0.42, 0.062, 0.08, c.a(0.6), { y: 0.202, z: 0.15 }); b.box(0.05, 0.03, 0.006, c.W, { y: 0.21, z: 0.191, lod: 1 });
      for (const x of [-0.066, 0, 0.066]) { b.arch(0.04, 0.074, 0.014, c.K, { x, y: 0.036, z: 0.151 }); win(b, c, 0.024, 0.03, { x, y: 0.126, z: 0.151 }); }
      for (const sd of [-1, 1]) { win(b, c, 0.024, 0.03, { x: sd * 0.132, y: 0.126, z: 0.151 }); b.box(0.022, 0.06, 0.004, c.a(0.5), { x: sd * 0.132, y: 0.05, z: 0.152, lod: 1 }); b.box(0.026, 0.004, 0.008, c.K, { x: sd * 0.132, y: 0.11, z: 0.153, lod: 1 }); }
      for (const sd of [-1, 1]) { b.box(0.016, 0.03, 0.016, c.W, { x: sd * 0.195, y: 0.196, z: 0.15, lod: 1 }); b.ball(0.009, c.a(0.45), { x: sd * 0.195, y: 0.226, z: 0.15, lod: 1 }); b.cyl(0.005, 0.055, c.K, { x: sd * 0.225, y: 0.036, z: 0.165, lod: 1 }); b.ball(0.011, c.lamp, { x: sd * 0.225, y: 0.091, z: 0.165, lod: 1 }); }
      b.box(0.44, 0.19, 0.2, c.s(0.25), { y: 0.036, z: -0.07 }); b.box(0.46, 0.014, 0.22, c.W, { y: 0.226, z: -0.07 });
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { win(b, c, 0.026, 0.05, { x: sd * 0.221, y: 0.13, z: -0.13 + i * 0.06, ry: sd * PI / 2 }); b.box(0.008, 0.19, 0.016, c.W, { x: sd * 0.222, y: 0.036, z: -0.16 + i * 0.06, lod: 1 }); }
      b.cyl(0.115, 0.028, c.W, { y: 0.24, z: -0.06 }); b.dome(0.108, 0.085, c.a(0.55), { y: 0.268, z: -0.06 }); b.cyl(0.014, 0.022, c.W, { y: 0.35, z: -0.06 }); b.ball(0.011, c.lamp, { y: 0.372, z: -0.06 });
      b.box(0.32, 0.31, 0.1, c.s(0.4), { y: 0.036, z: -0.2 }); b.box(0.34, 0.012, 0.115, c.W, { y: 0.346, z: -0.2 }); b.gable(0.33, 0.05, 0.11, c.a(0.7), { y: 0.358, z: -0.2 });
    },
  },
  zoo: {
    label: 'Zoo', r: 0.28, h: 0.26,
    build(b, c) {
      b.cyl(0.275, 0.008, [ROW.sand, 2.6]);
      ring8(16, 0.26, (x, z, a, i) => { if (i !== 4) b.cyl(0.008, 0.05, c.K, { x, z, lod: 1 }); });
      b.ring(0.266, 0.254, 0.008, c.K, { y: 0.036 });
      b.arch(0.14, 0.15, 0.03, c.a(0.55), { z: 0.26 }); b.box(0.17, 0.035, 0.02, c.W, { y: 0.15, z: 0.26 });
      b.cyl(0.07, 0.006, WATER, { x: -0.11, y: 0.008, z: -0.09 });
      // giraffe: tall cylinders
      b.push(0.09, 0.008, -0.04, 0.5);
      for (const [x, z] of [[-0.022, -0.012], [-0.022, 0.012], [0.022, -0.012], [0.022, 0.012]]) b.cyl(0.006, 0.09, [ROW.autumn, 3], { x, z });
      b.box(0.075, 0.035, 0.036, [ROW.autumn, 3], { y: 0.085 }); b.cyl(0.011, 0.14, [ROW.autumn, 3], { x: 0.03, y: 0.11, rz: -0.35 });
      b.box(0.035, 0.018, 0.02, [ROW.autumn, 3], { x: 0.088, y: 0.235 }); b.cyl(0.003, 0.016, c.K, { x: 0.08, y: 0.25, z: 0.005 }); b.cyl(0.003, 0.016, c.K, { x: 0.08, y: 0.25, z: -0.005 });
      for (let i = 0; i < 4; i++) b.box(0.012, 0.012, 0.038, [ROW.earth, 6], { x: -0.02 + i * 0.016, y: 0.09 + (i % 2) * 0.012, lod: 1 });
      b.pop();
      // elephant: spheres
      b.push(-0.07, 0.008, 0.09, -0.7);
      for (const [x, z] of [[-0.03, -0.02], [-0.03, 0.02], [0.03, -0.02], [0.03, 0.02]]) b.cyl(0.013, 0.04, [ROW.rock, 5.4], { x, z });
      b.ball(0.055, [ROW.rock, 4.6], { y: 0.03, sx: 1.25 }); b.ball(0.036, [ROW.rock, 4.6], { x: 0.075, y: 0.06 });
      b.cyl(0.01, 0.07, [ROW.rock, 4.6], { x: 0.105, y: 0.075, rz: PI + 0.25 });
      b.ball(0.026, [ROW.rock, 5.6], { x: 0.06, y: 0.068, z: 0.036, sz: 0.3 }); b.ball(0.026, [ROW.rock, 5.6], { x: 0.06, y: 0.068, z: -0.036, sz: 0.3 });
      b.pop();
      b.box(0.08, 0.06, 0.07, c.s(0.25), { x: 0.13, z: 0.13 }); b.cone(0.065, 0.05, c.a(0.6), { x: 0.13, y: 0.06, z: 0.13 });
      b.cyl(0.008, 0.05, c.trunk, { x: -0.16, z: 0.02 }); b.ball(0.035, c.leaf(0.75), { x: -0.16, y: 0.04, z: 0.02 });
    },
  },
  coffee: {
    label: 'Coffee house', r: 0.2, h: 0.32,
    build(b, c) {
      b.box(0.3, 0.012, 0.3, c.W, { z: 0.04 });
      b.box(0.26, 0.16, 0.2, c.s(0.2), { y: 0.012 }); b.box(0.28, 0.02, 0.22, c.W, { y: 0.172 });
      awning(b, c, -0.1, 6, 0.115, 0.13);
      b.box(0.115, 0.065, 0.012, c.win(true), { x: -0.055, y: 0.04, z: 0.1 }); b.box(0.05, 0.095, 0.012, c.K, { x: 0.075, y: 0.012, z: 0.1 });
      b.cyl(0.078, 0.01, c.W, { y: 0.192 });
      b.cyl(0.06, 0.085, c.a(0.5), { y: 0.287, rx: PI, t: 0.3 }); b.cyl(0.052, 0.004, c.a(1), { y: 0.285 });
      b.arch(0.05, 0.045, 0.014, c.a(0.5), { x: 0.052, y: 0.245, rz: -PI / 2 });
      for (const x of [-0.09, 0.02]) { b.cyl(0.022, 0.004, c.W, { x, y: 0.04, z: 0.2, lod: 1 }); b.cyl(0.004, 0.03, c.K, { x, y: 0.012, z: 0.2, lod: 1 }); b.cyl(0.01, 0.018, c.a(0.6), { x: x + 0.035, y: 0.012, z: 0.2, lod: 1 }); }
      b.ball(0.012, c.lamp, { x: 0.118, y: 0.12, z: 0.105, lod: 1 });
    },
    anim(b, fb, t, env, c) { puffs(b, t, 0, 0.29, 0, 3, 0.15, c.W, 0.022, 0.3); },
  },
  pottery: {
    label: 'Pottery studio', r: 0.26, h: 0.32,
    build(b, c) {
      b.cyl(0.14, 0.02, c.s(0.8), { x: -0.09 }); b.dome(0.13, 0.17, c.s(0.5), { x: -0.09, y: 0.02 });
      b.arch(0.075, 0.075, 0.03, c.K, { x: -0.09, y: 0.02, z: 0.115 }); b.box(0.036, 0.04, 0.012, c.glow(0.2), { x: -0.09, y: 0.02, z: 0.118 });
      b.cyl(0.026, 0.15, c.s(0.8), { x: -0.09, y: 0.15, z: -0.03 }); b.cyl(0.032, 0.014, c.a(0.6), { x: -0.09, y: 0.3, z: -0.03 });
      b.box(0.16, 0.1, 0.14, c.s(0.2), { x: 0.12, z: -0.05 }); b.box(0.19, 0.014, 0.17, c.a(0.6), { x: 0.12, y: 0.105, z: -0.05, rz: 0.14 });
      win(b, c, 0.05, 0.04, { x: 0.12, y: 0.035, z: 0.022 });
      b.box(0.28, 0.012, 0.055, c.W, { x: 0.07, y: 0.035, z: 0.16 });
      for (const x of [-0.06, 0.2]) b.box(0.012, 0.035, 0.05, c.K, { x, z: 0.16 });
      for (let i = 0; i < 5; i++) { const s = [0.022, 0.028, 0.02, 0.03, 0.024][i]; b.lathe('v' + (i % 3), VASES[i % 3], s, s * [2.6, 2.2, 3, 1.8, 2.5][i], [c.a(0.45), c.W, c.s(0.7), c.a(0.7), c.W][i], { x: -0.04 + i * 0.055, y: 0.047, z: 0.16 }); }
      b.cyl(0.03, 0.012, c.K, { x: 0.0, y: 0.03, z: 0.04 }); b.cyl(0.006, 0.03, c.K, { x: 0.0, z: 0.04 }); b.lathe('v0', VASES[0], 0.018, 0.04, c.a(0.3), { x: 0.0, y: 0.042, z: 0.04 });
    },
    anim(b, fb, t, env, c) { puffs(b, t, -0.09, 0.32, -0.03, 4, 0.24, c.W, 0.03, 0.2); },
  },
  gym: {
    label: 'Gym', r: 0.3, h: 0.32,
    build(b, c) {
      b.cyl(0.24, 0.005, c.g(0.45));
      b.ring(0.3, 0.238, 0.008, c.soil(0.3)); b.ring(0.272, 0.266, 0.01, c.W);
      b.box(0.3, 0.09, 0.2, c.s(0.2), { y: 0.005 }); b.half(0.3, 0.065, 0.2, c.a(0.6), { y: 0.095 });
      b.box(0.31, 0.012, 0.21, c.W, { y: 0.09 });
      for (let i = 0; i < 5; i++) win(b, c, 0.03, 0.05, { x: -0.12 + i * 0.06, y: 0.025, z: 0.1 });
      b.box(0.05, 0.065, 0.014, c.K, { x: 0.0, y: 0.005, z: 0.101 });
      b.cyl(0.012, 0.11, c.K, { y: 0.15 });
      for (let i = 0; i < 4; i++) b.box(0.012, 0.012, 0.06, c.W, { x: 0.22 + i * 0.0, z: -0.02 + i * 0.0, y: 0.008, ry: i * 0.4, lod: 1 });
    },
    anim(b, fb, t, env, c) {
      b.push(0, 0.3, 0, t * 0.5);
      b.cyl(0.012, 0.17, c.K, { rz: PI / 2, x: 0.085 });
      for (const s of [-1, 1]) { b.ball(0.04, c.a(0.7), { x: s * 0.095, y: -0.04 }); b.cyl(0.03, 0.012, c.W, { x: s * 0.05 + 0.006 * s, rz: PI / 2 }); }
      b.pop();
    },
  },
  dock: {
    label: 'Dock', r: 0.22, h: 0.3, water: 'bay',
    build(b, c) {
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) b.cyl(0.012, 0.12, c.trunk, { x: s * 0.055, y: -0.08, z: 0.06 + i * 0.075 });
      b.box(0.15, 0.014, 0.5, [ROW.earth, 3.4], { y: 0.035, z: 0.22, pat: 3 });
      for (let i = 0; i < 9; i++) b.box(0.15, 0.003, 0.006, c.s(0.8), { y: 0.049, z: 0.0 + i * 0.055, lod: 1 });
      b.box(0.13, 0.09, 0.1, c.s(0.25), { x: -0.03, z: -0.1 }); b.gable(0.15, 0.05, 0.12, c.a(0.65), { x: -0.03, y: 0.09, z: -0.1 });
      win(b, c, 0.035, 0.03, { x: -0.03, y: 0.035, z: -0.048 });
      b.cyl(0.013, 0.2, c.K, { x: 0.11, z: 0.0 }); b.box(0.014, 0.21, 0.014, c.a(0.5), { x: 0.11, y: 0.19, rx: 1.15 });
      b.box(0.003, 0.09, 0.003, c.K, { x: 0.11, y: 0.185, z: 0.19, lod: 1 }); b.box(0.02, 0.02, 0.02, c.a(0.8), { x: 0.11, y: 0.165, z: 0.19, lod: 1 });
      b.box(0.04, 0.04, 0.04, c.p(0.8), { x: 0.035, y: 0.049, z: 0.06 }); b.box(0.035, 0.03, 0.035, c.a(0.4), { x: -0.02, y: 0.049, z: 0.1 }); b.box(0.03, 0.03, 0.03, c.s(0.6), { x: 0.035, y: 0.089, z: 0.06, lod: 1 });
      for (const z of [0.2, 0.44]) for (const s of [-1, 1]) b.cyl(0.008, 0.02, c.K, { x: s * 0.065, y: 0.049, z, lod: 1 });
      b.ball(0.012, c.lamp, { x: -0.065, y: 0.07, z: 0.46, lod: 1 });
    },
    anim(b, fb, t, env, c) {
      b.push(0.16, Math.sin(t * 1.2) * 0.006, 0.3, 0.2, 1, 0, Math.sin(t * 0.9) * 0.05);
      b.gable(0.07, 0.035, 0.17, c.a(0.55), { y: 0.03, rx: PI }); b.box(0.072, 0.008, 0.172, c.W, { y: 0.03 });
      b.box(0.04, 0.03, 0.05, c.W, { y: 0.038, z: -0.03 }); b.cyl(0.004, 0.09, c.K, { y: 0.038, z: 0.03 }); b.box(0.004, 0.025, 0.035, c.a(0.5), { y: 0.1, z: 0.012 });
      b.pop();
    },
  },
  bridge: {
    label: 'Bridge', r: 0.14, h: 0.42, water: 'span',
    build(b, c) {
      const L = 0.6, mid = L / 2;
      for (const x of [0, L]) b.box(0.13, 0.05, 0.17, c.W, { x, y: 0 });
      // A ramp of steps at each end takes the road down to the land.
      for (const e of [-1, 1]) for (let q = 0; q < 6; q++) {
        const x = (e < 0 ? -0.05 : L + 0.05) + e * (0.014 + q * 0.028), hh = 0.118 - q * 0.02;
        b.box(0.028, hh + 0.05, 0.13, q % 2 ? c.W : c.p(0.25), { x, y: -0.05 });
        if (q < 5) for (const sd of [-1, 1]) b.box(0.028, 0.012, 0.008, c.a(0.5), { x, y: hh, z: sd * 0.061, lod: 1 });
      }
      for (const e of [-1, 1]) for (const sd of [-1, 1]) { const x = (e < 0 ? -0.05 : L + 0.05) + e * 0.175; b.box(0.014, 0.05, 0.014, c.W, { x, y: 0, z: sd * 0.066 }); b.ball(0.008, c.lamp, { x, y: 0.05, z: sd * 0.066, lod: 1 }); }
      b.arch(0.46, 0.135, 0.11, c.s(0.25), { x: mid, y: -0.035 });
      b.box(L + 0.1, 0.018, 0.13, c.W, { x: mid, y: 0.1 });
      for (const s of [-1, 1]) b.box(L + 0.1, 0.018, 0.008, c.a(0.5), { x: mid, y: 0.118, z: s * 0.061 });
      for (const tx of [0.13, L - 0.13]) {
        b.arch(0.16, 0.3, 0.04, c.a(0.55), { x: tx, y: 0.1, ry: PI / 2 }); b.box(0.05, 0.02, 0.18, c.W, { x: tx, y: 0.4 });
        for (const s of [-1, 1]) for (const dir of [-1, 1]) for (let k = 1; k <= 3; k++) {
          const reach = 0.045 * k, ph = Math.atan(reach / 0.27);
          b.box(0.004, 0.27 / Math.cos(ph), 0.004, c.K, { x: tx, y: 0.39, z: s * 0.064, rz: PI + dir * ph, lod: 1 });
        }
        b.ball(0.011, c.lamp, { x: tx, y: 0.42, lod: 1 });
      }
    },
  },
  store: {
    label: 'Store', r: 0.2, h: 0.26,
    build(b, c) {
      b.box(0.3, 0.012, 0.28, c.W, { z: 0.03 });
      b.box(0.26, 0.15, 0.18, c.s(0.2), { y: 0.012 }); b.box(0.28, 0.022, 0.2, c.s(0.65), { y: 0.162 });
      b.box(0.2, 0.062, 0.016, c.a(0.55), { y: 0.184, z: 0.07 });
      for (let i = 0; i < 4; i++) b.box(0.024, 0.03, 0.006, c.W, { x: -0.06 + i * 0.04, y: 0.2, z: 0.08, lod: 1 });
      awning(b, c, -0.1, 6, 0.112, 0.12);
      b.box(0.135, 0.068, 0.012, c.win(true), { x: -0.045, y: 0.035, z: 0.09 }); b.box(0.05, 0.09, 0.012, c.K, { x: 0.085, y: 0.012, z: 0.09 });
      b.box(0.045, 0.045, 0.045, c.p(0.8), { x: -0.17, y: 0.012, z: 0.07 }); b.box(0.035, 0.035, 0.035, c.a(0.4), { x: -0.165, y: 0.057, z: 0.07, ry: 0.3 }); b.box(0.04, 0.03, 0.04, c.s(0.6), { x: -0.17, y: 0.012, z: 0.125, ry: 0.2 });
      b.ball(0.012, c.lamp, { x: 0.13, y: 0.11, z: 0.095, lod: 1 }); win(b, c, 0.03, 0.03, { x: 0.132, y: 0.08, z: 0.0, ry: PI / 2 });
    },
  },
  bakery: {
    label: 'Bakery', r: 0.2, h: 0.3,
    build(b, c) {
      b.box(0.2, 0.12, 0.17, c.s(0.15)); b.gable(0.22, 0.09, 0.19, c.a(0.6), { y: 0.12 });
      b.box(0.036, 0.11, 0.036, c.s(0.7), { x: 0.05, y: 0.13, z: -0.04 }); b.box(0.046, 0.012, 0.046, c.W, { x: 0.05, y: 0.24, z: -0.04 });
      win(b, c, 0.04, 0.04, { x: -0.055, y: 0.045, z: 0.085 }, true); win(b, c, 0.03, 0.03, { y: 0.14, z: 0.094 }, true);
      b.box(0.042, 0.08, 0.012, c.K, { x: 0.045, z: 0.085 }); b.half(0.042, 0.02, 0.012, c.K, { x: 0.045, y: 0.08, z: 0.085, lod: 1 });
      // The sign: a big golden loaf of bread on a post, with three cuts on top.
      b.box(0.012, 0.13, 0.012, c.K, { x: -0.16, z: 0.07 }); b.box(0.05, 0.008, 0.03, c.K, { x: -0.16, y: 0.13, z: 0.07 });
      b.box(0.12, 0.04, 0.05, LOAF, { x: -0.16, y: 0.138, z: 0.07 }); b.box(0.104, 0.016, 0.044, LOAF2, { x: -0.16, y: 0.178, z: 0.07 }); b.box(0.08, 0.008, 0.036, LOAF2, { x: -0.16, y: 0.194, z: 0.07 });
      for (let i = 0; i < 3; i++) b.box(0.007, 0.004, 0.04, CRUMB, { x: -0.186 + i * 0.026, y: 0.202, z: 0.07, ry: 0.5, lod: 1 });
      // A basket of long loaves by the door, and a board above the window with small loaves.
      b.box(0.03, 0.022, 0.03, [ROW.earth, 5], { x: 0.085, z: 0.105, lod: 1 }); for (let i = 0; i < 4; i++) b.box(0.006, 0.04, 0.006, i % 2 ? LOAF : LOAF2, { x: 0.076 + (i % 2) * 0.016, y: 0.016, z: 0.098 + (i >> 1) * 0.014, rz: (i % 2 ? -1 : 1) * 0.14, lod: 1 });
      for (let i = 0; i < 4; i++) b.box(0.04, 0.006, 0.06, i % 2 ? c.W : c.a(0.5), { x: -0.075 + i * 0.04, y: 0.1, z: 0.1, rx: 0.5, lod: 1 });
      b.box(0.07, 0.02, 0.035, c.W, { x: 0.15, z: 0.06 }); for (let i = 0; i < 3; i++) b.box(0.016, 0.01, 0.012, i % 2 ? LOAF : LOAF2, { x: 0.13 + i * 0.02, y: 0.02, z: 0.06, lod: 1 });
    },
    anim(b, fb, t, env, c) { puffs(b, t, 0.05, 0.26, -0.04, 4, 0.2, c.W, 0.024, 0.24); },
  },
  square: {
    label: 'Public square', r: 0.3, h: 0.34,
    build(b, c) {
      const cols = [c.W, c.s(0.35), c.W, c.a(0.4), c.W, c.s(0.35)];
      for (let i = 0; i < 6; i++) b.cyl(0.3 - i * 0.05, 0.012 + i * 0.004, cols[i]);
      if (c.r() < 0.5) { b.cyl(0.006, 0.3, c.K, { y: 0.03 }); b.box(0.07, 0.045, 0.004, c.a(0.5), { x: 0.038, y: 0.275 }); b.ball(0.01, c.K, { y: 0.33 }); }
      else { b.cyl(0.012, 0.09, c.trunk, { y: 0.03 }); b.ball(0.07, c.leaf(0.75), { y: 0.1 }); ring8(6, 0.055, (x, z) => b.ball(0.014, [ROW.coral, 1.6], { x, z, y: 0.2, k: 4, lod: 1 })); }
      ring8(4, 0.2, (x, z, a) => b.box(0.07, 0.016, 0.024, c.K, { x, z, y: 0.02, ry: -a + PI / 2, lod: 1 }));
      ring8(6, 0.275, (x, z) => { b.cyl(0.005, 0.085, c.K, { x, z, y: 0.012, lod: 1 }); b.ball(0.013, c.lamp, { x, z, y: 0.097, lod: 1 }); });
      ring8(12, 0.125, (x, z, a) => b.box(0.05, 0.003, 0.005, c.s(0.8), { x, z, y: 0.024, ry: -a, lod: 2 }));
      ring8(3, 0.235, (x, z) => { b.box(0.04, 0.025, 0.04, c.s(0.7), { x, z, y: 0.016, lod: 1 }); b.ball(0.02, c.a(0.4), { x, z, y: 0.036, lod: 1 }); });
    },
  },
  castle: {
    label: 'Castle', r: 0.31, h: 0.56,
    build(b, c) {
      const ST = c.stone(0.34), ST2 = c.stone(0.5), ST3 = c.stone(0.22), R0 = 0.21;
      b.box(0.56, 0.02, 0.56, c.stone(0.62));
      // Four walls with a walk on top and battlements.
      for (let k = 0; k < 4; k++) {
        b.push(0, 0.02, 0, k * PI / 2);
        b.box(0.42, 0.13, 0.04, ST, { z: R0 }); b.box(0.42, 0.008, 0.06, ST2, { y: 0.13, z: R0 });
        for (let i = -4; i <= 4; i++) if (i % 2 === 0) b.box(0.03, 0.022, 0.014, ST3, { x: i * 0.045, y: 0.138, z: R0 + 0.022 });
        b.pop();
      }
      // A round tower at each corner, with a pointed roof in the first accent color.
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = sx * R0, z = sz * R0;
        b.cyl(0.058, 0.24, ST3, { x, y: 0.02, z }); b.cyl(0.068, 0.02, ST2, { x, y: 0.26, z });
        for (let i = 0; i < 4; i++) b.box(0.02, 0.022, 0.02, ST3, { x: x + Math.cos(i * PI / 2) * 0.052, y: 0.28, z: z + Math.sin(i * PI / 2) * 0.052 });
        b.cone(0.058, 0.11, c.a(0.6), { x, y: 0.28, z, pat: 1 });
        b.box(0.008, 0.03, 0.006, c.win(), { x: x + sx * 0.0, y: 0.15, z: z + sz * 0.058, lod: 1 });
      }
      // The gatehouse, with a dark gate, a portcullis, and a drawbridge.
      b.box(0.15, 0.2, 0.08, ST3, { y: 0.02, z: R0 }); b.box(0.17, 0.014, 0.1, ST2, { y: 0.22, z: R0 });
      for (const i of [-1, 0, 1]) b.box(0.03, 0.024, 0.02, ST3, { x: i * 0.06, y: 0.234, z: R0 + 0.036 });
      b.box(0.07, 0.1, 0.012, N('neutral', 9.4), { y: 0.02, z: R0 + 0.036 });
      for (let i = -1; i <= 1; i++) b.box(0.004, 0.1, 0.004, c.K, { x: i * 0.02, y: 0.02, z: R0 + 0.043, lod: 1 });
      b.box(0.08, 0.008, 0.13, c.wood, { y: 0.012, z: R0 + 0.11, pat: 3 });
      for (const sx of [-1, 1]) { b.box(0.014, 0.03, 0.006, c.a(0.5), { x: sx * 0.055, y: 0.15, z: R0 + 0.042, lod: 1 }); b.ball(0.011, c.lamp, { x: sx * 0.05, y: 0.11, z: R0 + 0.05, lod: 1 }); }
      // The keep: the tall tower in the middle.
      b.box(0.17, 0.34, 0.17, ST, { y: 0.02, x: -0.02, z: -0.04 }); b.box(0.19, 0.016, 0.19, ST2, { y: 0.36, x: -0.02, z: -0.04 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) b.box(0.03, 0.026, 0.03, ST3, { x: -0.02 + sx * 0.08, y: 0.376, z: -0.04 + sz * 0.08 });
      for (const y of [0.14, 0.24]) for (const sx of [-1, 1]) win(b, c, 0.016, 0.034, { x: -0.02 + sx * 0.04, y, z: 0.046 });
      b.box(0.006, 0.12, 0.006, c.K, { x: -0.02, y: 0.376, z: -0.04 });
      // The yard: a well and a small stable.
      b.cyl(0.022, 0.02, ST2, { x: 0.11, y: 0.02, z: 0.09 }); b.box(0.08, 0.05, 0.06, c.wood, { x: 0.11, y: 0.02, z: -0.1 }); b.gable(0.09, 0.03, 0.07, c.a(0.5), { x: 0.11, y: 0.07, z: -0.1 });
    },
    anim(b, fb, t, env, c) { const w = Math.sin(t * 3) * 0.25; b.box(0.06, 0.034, 0.004, c.a(0.5), { x: 0.012, y: 0.455, z: -0.04, ry: w }); },   // the flag on the keep
  },
  // ---- Natural landmarks. A region can use these and have no building at all.
  // land = the landmark is part of the land itself (region.js makes the cone, the peak, or the pond). build() adds the small parts.
  // build(b, c, ctx): ctx.h(x, z) = the height of the land at that place, over the base of the landmark. ctx.water = the water plane.
  volcano: {
    label: 'Volcano', r: 0.34, h: 0.5, nature: true, land: { type: 'crater', r: 0.34, h: 0.46 },
    build(b, c, ctx) {
      b.cyl(0.07, 0.014, [ROW.yellow, 3.4, 2, 0.2], { y: 0.006 }); b.cyl(0.045, 0.02, [ROW.orange, 5, 2, 0.6], { y: 0.006 });
      for (let k = 0; k < 3; k++) lavaBed(b, k * 2.1 + 0.4, 0.07, 0.31, ctx.h);
    },
    anim(b, fb, t, env, c, ctx) {
      puffs(b, t, 0, 0.06, 0, 5, 0.34, N('rock', 3.2), 0.04, 0.14);
      for (let k = 0; k < 3; k++) lavaFlow(b, t, k * 2.1 + 0.4, 0.05, 0.31, ctx.h, k * 0.37);   // magma flows down three channels
      b.cyl(0.04 + Math.sin(t * 1.7) * 0.006, 0.012, [ROW.yellow, 2.6, 2, 0], { y: 0.02 + Math.sin(t * 2.3) * 0.003 });   // the pool in the crater moves
    },
  },
  lake: {
    label: 'Lake', r: 0.3, h: 0.12, nature: true, land: { type: 'pond', r: 0.27 },
    build(b, c, ctx) {
      const w = ctx.water, r = ctx.r;
      for (let i = 0; i < 30; i++) {
        const a = r() * TAU, d = 0.17 + r() * 0.13, x = Math.cos(a) * d, z = Math.sin(a) * d, y = ctx.h(x, z);
        if (y < w - 0.04 || y > w + 0.03) continue;   // reeds stand in the shallow rim only
        const hh = 0.03 + r() * 0.03; b.box(0.006, hh, 0.006, N('grass', 5.4, 11), { x, z, y: Math.min(y, w) }); if (i % 3 === 0) b.box(0.008, 0.012, 0.008, N('earth', 7.4), { x, z, y: Math.min(y, w) + hh });
      }
      for (let i = 0; i < 7; i++) { const a = i * 2.4 + 0.5, d = 0.04 + (i % 3) * 0.045, x = Math.cos(a) * d, z = Math.sin(a) * d; b.cyl(0.016 + (i % 2) * 0.008, 0.004, N('grass', 4.2), { x, z, y: w + 0.002, lod: 1 }); if (i % 3 === 0) b.ball(0.006, N('coral', 1.8), { x, z, y: w + 0.005, lod: 1 }); }
      for (const [x, z, s] of [[0.22, 0.14, 1], [-0.25, 0.06, 0.7], [0.05, -0.27, 0.85]]) b.ball(0.03 * s, RK(c, 4.6), { x, z, y: Math.max(ctx.h(x, z), w) - 0.012, sy: 0.7 });
      // On hot land the lake is an oasis: trees of the biome stand at the water.
      if (c.hot && c.tree) for (const a of [0.6, 2.3, 4.1, 5.2]) { const x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3; c.tree(b, x, Math.max(ctx.h(x, z), w), z, 1.1); }
    },
    anim(b, fb, t, env, c, ctx) {
      for (let i = 0; i < 2; i++) { const a = t * 0.25 + i * 2.6; b.push(Math.cos(a) * 0.09, ctx.water + 0.002, Math.sin(a) * 0.07, -a); b.box(0.014, 0.01, 0.024, N('plaster', 0.6)); b.box(0.008, 0.01, 0.008, N('plaster', 0.6), { y: 0.008, z: 0.012 }); b.box(0.004, 0.003, 0.006, N('orange', 5), { y: 0.012, z: 0.019 }); b.pop(); }
    },
  },
  mountain: {
    label: 'Mountain', r: 0.34, h: 0.62, nature: true, land: { type: 'peak', r: 0.34, h: 0.58 },
    build(b, c, ctx) {
      const r = ctx.r;   // the base of this landmark is its top, so the land around it is under 0
      for (let i = 0; i < 16; i++) { const a = r() * TAU, d = 0.2 + r() * 0.14, x = Math.cos(a) * d, z = Math.sin(a) * d, y = ctx.h(x, z), s = 0.7 + r() * 0.5; if (c.tree && (c.hot || c.biome === 'crystal')) { if (i % 2) c.tree(b, x, y, z, s * 0.8); continue; }   // the trees of the biome, fewer of them
        b.cyl(0.006 * s, 0.022 * s, c.trunk, { x, z, y }); b.cone(0.028 * s, 0.07 * s, N('forest', 6.6, 11), { x, z, y: y + 0.016 * s }); b.cone(0.018 * s, 0.05 * s, N('forest', 5.8, 11), { x, z, y: y + 0.055 * s, lod: 1 }); }
      for (let i = 0; i < 4; i++) { const a = i * 1.7, d = 0.12 + i * 0.03, x = Math.cos(a) * d, z = Math.sin(a) * d; b.box(0.03, 0.022, 0.026, RK(c, 5 + i * 0.5), { x, z, y: ctx.h(x, z) - 0.004, ry: i }); }
    },
    anim(b, fb, t) { for (let i = 0; i < 2; i++) { const a = t * 0.3 + i * PI, R = 0.2 + i * 0.05, f = Math.sin(t * 3 + i) * 0.35; b.push(Math.cos(a) * R, 0.07 + i * 0.04, Math.sin(a) * R, -a); for (const s of [-1, 1]) b.box(0.03, 0.004, 0.012, N('earth', 8.4), { x: s * 0.014, rz: s * f }); b.pop(); } },
  },
  bigtree: {
    label: 'Large tree', r: 0.2, h: 0.66, nature: true,
    build(b, c) {
      for (let i = 0; i < 5; i++) { const a = i * 1.257 + 0.3; b.box(0.09, 0.03, 0.03, c.trunk, { x: Math.cos(a) * 0.06, z: Math.sin(a) * 0.06, ry: -a, rz: -0.35 }); }
      b.cyl(0.055, 0.12, c.trunk, { t: 0.25 }); b.cyl(0.042, 0.2, c.wood, { y: 0.12, t: 0.2 });
      b.box(0.012, 0.016, 0.004, N('neutral', 9), { y: 0.16, z: 0.04 });
      for (const [x, z, a] of [[0.07, 0.02, -0.7], [-0.06, 0.04, 0.75], [0.0, -0.07, 0]]) b.box(0.022, 0.16, 0.022, c.wood, { x: x * 0.4, y: 0.27, z: z * 0.4, rz: a, rx: z < 0 ? -0.7 : 0.2 });
      if (c.cold || c.biome === 'forest') {
        // Cold land and forest: a giant evergreen, in four tiers.
        for (let i = 0; i < 4; i++) b.cone(0.2 - i * 0.04, 0.17, c.f(0.9 - i * 0.1), { y: 0.2 + i * 0.1, k: 11 });
      } else if (c.hot) {
        // Hot, dry land: a wide flat crown, like a great acacia.
        for (const [x, y, z, rr] of [[0, 0.4, 0, 0.24], [0.14, 0.44, 0.05, 0.15], [-0.15, 0.43, -0.04, 0.16], [0.02, 0.47, -0.1, 0.13]]) b.ball(rr, c.f(0.8), { x, y, z, sy: 0.32, k: 11 });
      } else {
        const L = [[0, 0.36, 0, 0.17], [0.13, 0.33, 0.04, 0.12], [-0.13, 0.34, 0.06, 0.12], [0.02, 0.33, -0.14, 0.12], [0.05, 0.47, 0.02, 0.12], [-0.06, 0.45, -0.05, 0.1], [0.1, 0.42, -0.1, 0.09]];
        L.forEach(([x, y, z, rr], i) => b.ball(rr, c.leaf(0.86 - (i % 3) * 0.12), { x, y, z }));
        for (let i = 0; i < 6; i++) b.ball(0.022, [ROW.pink, i % 2 ? 2.4 : 1.2, 4, 0], { x: Math.cos(i * 1.1) * 0.15, y: 0.44 + (i % 3) * 0.04, z: Math.sin(i * 1.1) * 0.15, lod: 1 });   // spring blossoms
        for (let i = 0; i < 9; i++) b.box(0.02, 0.003, 0.02, [ROW.autumn, 3 + (i % 3) * 0.8, 15, 0], { x: Math.cos(i * 0.7) * (0.1 + (i % 3) * 0.05), y: 0.008, z: Math.sin(i * 0.7) * (0.1 + (i % 3) * 0.05), ry: i });   // autumn: leaves on the ground
        for (let i = 0; i < 5; i++) b.box(0.014, 0.003, 0.014, [ROW.autumn, 3.4, 15, 0.9], { x: Math.cos(i * 1.3) * 0.13, y: 0.34, z: Math.sin(i * 1.3) * 0.13 });   // and in the air
      }
      for (let i = 0; i < 5; i++) b.ball(0.02, c.f(0.8), { x: Math.cos(i * 1.3) * 0.17, z: Math.sin(i * 1.3) * 0.17, sy: 0.6, k: 11, lod: 1 });
    },
  },
  campground: {
    label: 'Campground', r: 0.26, h: 0.2, nature: true,
    build(b, c) {
      for (const [x, z, ry, col] of [[-0.13, -0.08, 0.5, c.a(0.5)], [0.14, -0.06, -0.6, c.s(0.5)], [0.02, -0.17, 0, c.a(0.3)]]) { b.push(x, 0, z, ry); b.gable(0.09, 0.07, 0.12, col); b.box(0.03, 0.045, 0.004, N('neutral', 8.8), { z: 0.059 }); b.pop(); }
      ring8(7, 0.036, (x, z) => b.box(0.014, 0.01, 0.014, N('rock', 5.2), { x, z: z + 0.06 }));
      for (let i = 0; i < 3; i++) b.box(0.036, 0.008, 0.008, c.trunk, { z: 0.06, y: 0.004, ry: i * 1.05 });
      for (const [x, z, ry] of [[-0.09, 0.09, 0.5], [0.1, 0.1, -0.5], [0, 0.15, 0]]) b.box(0.07, 0.016, 0.018, c.wood, { x, z, ry });
      b.box(0.003, 0.09, 0.003, c.K, { x: 0.2, z: 0.02 }); b.ball(0.01, c.lamp, { x: 0.2, y: 0.09, z: 0.02, lod: 1 });
      b.box(0.02, 0.03, 0.014, c.s(0.6), { x: -0.2, z: 0.04, lod: 1 }); b.box(0.03, 0.02, 0.02, N('sea', 6), { x: 0.18, z: -0.16, lod: 1 });
    },
    anim(b, fb, t, env, c) { const f = 1 + Math.sin(t * 11) * 0.2; b.pyr(0.03, 0.045 * f, 0.03, [ROW.orange, 5, 6, 0], { z: 0.06, y: 0.008 }); b.pyr(0.016, 0.028 * f, 0.016, [ROW.yellow, 3, 6, 0], { z: 0.06, y: 0.008 }); puffs(b, t, 0, 0.06, 0.06, 3, 0.16, c.W, 0.016, 0.3); },
  },
  waterfall: {
    label: 'Waterfall', r: 0.27, h: 0.52, nature: true,
    build(b, c) {
      const K = (t) => RK(c, t);
      b.box(0.36, 0.2, 0.2, K(5.8), { z: -0.12 }); b.box(0.3, 0.14, 0.18, K(5.2), { y: 0.2, z: -0.13 }); b.box(0.22, 0.1, 0.16, K(4.6), { y: 0.34, z: -0.14 });
      for (const s of [-1, 1]) { b.box(0.1, 0.3, 0.16, K(6.4), { x: s * 0.2, z: -0.05 }); b.box(0.08, 0.12, 0.12, K(5.6), { x: s * 0.22, y: 0.3, z: -0.07 }); b.box(0.07, 0.07, 0.1, K(6.2), { x: s * 0.13, z: 0.1 }); }
      b.box(0.09, 0.42, 0.012, WATER, { y: 0.02, z: -0.018 }); b.box(0.1, 0.012, 0.1, WATER, { y: 0.44, z: -0.07 });
      b.cyl(0.13, 0.012, WATER, { z: 0.07 }); b.cyl(0.09, 0.014, WATER_D, { z: 0.06 });
      b.ball(0.05, N('forest', 6, 11), { x: -0.16, y: 0.42, z: -0.12, sy: 0.6 }); b.ball(0.04, N('forest', 5.2, 11), { x: 0.14, y: 0.42, z: -0.16, sy: 0.6 });
      for (const [x, z] of [[-0.14, 0.17], [0.16, 0.16], [0.02, 0.2]]) b.ball(0.022, K(4.4), { x, z, y: -0.006, sy: 0.7, lod: 1 });
    },
    anim(b, fb, t) {
      for (let i = 0; i < 6; i++) { const f = (t * 0.9 + i / 6) % 1; b.box(0.012, 0.05, 0.004, FOAM, { x: -0.03 + (i % 3) * 0.03, y: 0.4 - f * 0.4, z: -0.01 }); }
      for (let i = 0; i < 4; i++) { const f = (t * 0.5 + i / 4) % 1; b.ball(0.014 + f * 0.016, FOAM, { x: Math.sin(i * 2.2) * 0.05, y: 0.012 + f * 0.05, z: 0.02 + f * 0.03 }); }
    },
  },
  rockarch: {
    label: 'Rock arch', r: 0.28, h: 0.44, nature: true,
    build(b, c) {
      b.arch(0.46, 0.36, 0.13, RK(c, 4.8)); b.box(0.5, 0.05, 0.15, RK(c, 5.6), { y: 0.34 }); b.box(0.3, 0.04, 0.12, RK(c, 3.8), { y: 0.39 });
      for (const s of [-1, 1]) { b.box(0.11, 0.2, 0.17, RK(c, 5.8), { x: s * 0.23, t: 0.3 }); b.ball(0.05, RK(c, 6.4), { x: s * 0.31, z: 0.05, y: -0.016, sy: 0.7 }); }
      b.ball(0.035, RK(c, 4), { x: 0.06, z: 0.16, y: -0.012, sy: 0.7, lod: 1 }); b.ball(0.03, c.f(0.8), { x: -0.2, z: 0.14, sy: 0.6, k: 11, lod: 1 }); b.ball(0.026, c.f(0.7), { x: 0.2, y: 0.43, sy: 0.6, k: 11, lod: 1 });
    },
  },
  geyser: {
    label: 'Geyser', r: 0.22, h: 0.56, nature: true,
    build(b, c) {
      const cols = [N('sand', 2.4), N('plaster', 1.2), N('sand', 1.6), N('plaster', 0.6)];
      for (let i = 0; i < 4; i++) b.cyl(0.2 - i * 0.04, 0.014 + i * 0.006, cols[i], { y: i * 0.012 });
      b.cyl(0.07, 0.01, [ROW.sea, 2.4], { y: 0.058 }); b.cyl(0.03, 0.012, [ROW.sea, 5], { y: 0.058 });
      ring8(5, 0.15, (x, z, a, i) => b.cyl(0.02 + (i % 2) * 0.012, 0.006, [ROW.sea, 2.2 + i * 0.4], { x, z, y: 0.016, lod: 1 }));
      b.ball(0.03, RK(c, 4.6), { x: 0.19, z: 0.06, y: -0.012, sy: 0.7, lod: 1 });
    },
    anim(b, fb, t) {
      // It erupts for a short time, then it rests.
      const ph = t % 9, up = ph < 3 ? Math.sin((ph / 3) * PI) : 0;
      if (up > 0.02) for (let i = 0; i < 7; i++) { const f = (t * 1.6 + i / 7) % 1; b.box(0.03 - f * 0.012, 0.05, 0.03 - f * 0.012, FOAM, { x: Math.sin(i * 2.4 + t * 5) * 0.012 * f, y: 0.07 + f * 0.42 * up, z: Math.cos(i * 1.9) * 0.012 * f }); }
      puffs(b, t, 0, 0.08 + up * 0.38, 0, 3, 0.14, N('plaster', 0.4), 0.03 + up * 0.03, 0.2);
    },
  },
  cave: {
    label: 'Cave', r: 0.28, h: 0.32, nature: true,
    build(b, c) {
      b.dome(0.26, 0.26, RK(c, 5.6)); b.dome(0.17, 0.2, RK(c, 5), { x: -0.14, z: -0.06 }); b.dome(0.14, 0.15, RK(c, 6.2), { x: 0.17, z: -0.04 });
      b.arch(0.2, 0.17, 0.08, RK(c, 4.4), { z: 0.22 }); b.box(0.13, 0.13, 0.06, N('neutral', 9.6), { z: 0.2 });
      for (const [x, s] of [[-0.03, 1], [0.025, 0.7], [0.0, 0.5]]) b.pyr(0.014 * s, 0.03 * s, 0.014 * s, N('rock', 3.6), { x, y: 0.13, z: 0.235, rx: PI });
      for (const [x, z, hh] of [[-0.025, 0.235, 0.05], [0.03, 0.24, 0.035]]) b.pyr(0.016, hh, 0.016, [ROW.amethyst, 4, 2, 0.4], { x, z });
      b.ball(0.04, c.f(0.8), { x: -0.2, z: 0.16, sy: 0.6, k: 11 }); b.ball(0.03, c.f(0.68), { x: 0.2, y: 0.12, z: 0.02, sy: 0.6, k: 11, lod: 1 }); b.ball(0.03, N('rock', 4.8), { x: 0.16, z: 0.22, y: -0.012, sy: 0.7, lod: 1 });
    },
    anim(b, fb, t) { for (let i = 0; i < 3; i++) { const a = t * 1.1 + i * 2.1, f = Math.sin(t * 14 + i) * 0.6; b.push(Math.cos(a) * 0.09, 0.2 + Math.sin(t * 0.8 + i) * 0.03 + i * 0.02, 0.26 + Math.sin(a) * 0.06, -a); for (const s of [-1, 1]) b.box(0.012, 0.002, 0.008, N('neutral', 9), { x: s * 0.006, rz: s * f }); b.pop(); } },
  },
  flowerfield: {
    label: 'Flower field', r: 0.3, h: 0.1, nature: true,
    build(b, c) {
      const cols = [c.a(0.45), c.s(0.5), [ROW.yellow, 3, 0, 0], c.W, c.a(0.25)];
      b.cyl(0.29, 0.008, c.g ? c.g(0.45) : c.f(0.86));   // the ground of the biome (grass, sand, snow), not always green
      for (let i = -7; i <= 7; i++) for (let j = -8; j <= 8; j++) {
        const x = (i + (j & 1) * 0.5) * 0.042, z = j * 0.036, d = Math.hypot(x, z); if (d > 0.27) continue;
        const band = Math.floor((d / 0.27) * 5 + (Math.atan2(z, x) + PI) * 0.8) % cols.length;
        b.box(0.004, 0.014, 0.004, c.f(0.7), { x, z, y: 0.008, k: 11, lod: 2 }); b.box(0.016, 0.011, 0.016, cols[band], { x, z, y: 0.02 });
      }
    },
    anim(b, fb, t, env, c) { for (let i = 0; i < 4; i++) { const a = t * (0.5 + i * 0.13) + i * 1.7, R = 0.08 + i * 0.04, f = Math.sin(t * 13 + i * 2) * 0.9; b.push(Math.cos(a) * R, 0.06 + Math.sin(t * 1.3 + i) * 0.015, Math.sin(a) * R, -a); for (const s of [-1, 1]) b.box(0.008, 0.001, 0.009, i % 2 ? c.W : c.a(0.35), { x: s * 0.004, rz: s * f }); b.pop(); } },
  },
};
const HL = {
  lighthouse: [[0, 0.62, 0, 0.6, 'o'], [0, 0.62, 0, 3.4, 'spin', 0], [0, 0.62, 0, 3.4, 'spin', PI]],
  square: [[0, 0.16, 0, 0.55, 'o']], store: [[-0.04, 0.08, 0.2, 0.36, 'o']], coffee: [[-0.05, 0.08, 0.2, 0.36, 'o']], bakery: [[0, 0.08, 0.17, 0.32, 'o']],
  opera: [[0, 0.1, 0.27, 0.55, 'o']], clocktower: [[0, 0.64, 0.1, 0.45, 'o'], [0, 0.1, 0.14, 0.26, 'o']], monument: [[0, 0.12, 0.16, 0.42, 'o']],
  dock: [[-0.06, 0.1, 0.46, 0.32, 'o']], bridge: [[0.3, 0.3, 0, 0.5, 'o']], museum: [[0, 0.12, 0.22, 0.48, 'o']], fountain: [[0, 0.14, 0.12, 0.4, 'o']],
  observatory: [[0, 0.1, 0.24, 0.32, 'o']], gym: [[0, 0.08, 0.2, 0.36, 'o']], pottery: [[-0.09, 0.06, 0.17, 0.34, 'f']], windmill: [[0, 0.08, 0.16, 0.28, 'o']],
  farm: [[-0.1, 0.08, -0.02, 0.3, 'o']], zoo: [[0, 0.1, 0.28, 0.3, 'o']], arch: [[0, 0.16, 0.12, 0.48, 'o']],
  volcano: [[0, 0.12, 0, 0.9, 'f']], campground: [[0, 0.06, 0.06, 0.42, 'f']], castle: [[0, 0.12, 0.3, 0.42, 'o'], [-0.02, 0.2, -0.04, 0.5, 'o']],
};
for (const k in HL) HEROES[k].lights = HL[k];
export const LAND_HERO_IDS = Object.keys(HEROES);   // the landmarks for a region with land (the samples use these)
Object.assign(HEROES, OPEN_HEROES);                  // and the landmarks of the ocean and of the sky
export const HERO_IDS = Object.keys(HEROES);
export const SIZES = { small: 0.78, medium: 1.0, large: 1.28 };
