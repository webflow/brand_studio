// Hidden details: 3 to 5 small surprises in each region. They show only at close zoom.
// A visitor finds one by hover or tap. A short animation plays. The found state stays in the browser.
import * as THREE from 'three';
import { ROW } from './palette.js';
import { edgeE } from './terrain.js';
import { rng, clamp, easeOut, TAU } from './util.js';
import { LIB_UNIVERSAL, LIB_BIOME, drawParts } from './details-lib.js';

const WARM = [ROW.yellow, 2, 6];
const K = (hue, tone, kind = 0) => [ROW[hue], tone, kind];
const WHITE = K('neutral', 0.3), DARK = K('neutral', 9), WOOD = K('earth', 7), FIRE = [ROW.orange, 5, 6], GLOW = [ROW.yellow, 3, 6];
const hop = (p) => Math.sin(p * Math.PI);
const TYPES = {
  cat: { label: 'a cat on a roof', pr: 0.05,
    draw(db, c, p, t) { const j = Math.sin(p * Math.PI) * 0.09; db.ball(0.016, c.K, { y: j, sx: 1.5 }); db.ball(0.011, c.K, { x: 0.021, y: 0.015 + j }); db.pyr(0.007, 0.009, 0.006, c.K, { x: 0.02, y: 0.034 + j, z: 0.006 }); db.pyr(0.007, 0.009, 0.006, c.K, { x: 0.02, y: 0.034 + j, z: -0.006 }); db.cyl(0.003, 0.028, c.K, { x: -0.022, y: 0.008 + j, rz: 0.5 + Math.sin(t * 2) * 0.25 }); } },
  door: { label: 'a tiny door that opens', pr: 0.05,
    draw(db, c, p) { const o = p > 0 ? easeOut(Math.min(1, p * 2)) : 0; db.half(0.06, 0.05, 0.03, c.p(0.8), { z: -0.012 }); db.box(0.026, 0.036, 0.004, WARM, { z: 0.004 }); db.push(-0.013, 0, 0.007, -o * 1.9, 1); db.box(0.026, 0.036, 0.004, c.a(0.6), { x: 0.013 }); db.ball(0.003, c.W, { x: 0.021, y: 0.014, z: 0.003 }); db.pop(); } },
  plane: { label: 'a paper plane', pr: 0.06, air: 0.32,
    pos(d, t, p) { const a = t * 0.35 + d.seed; return [d.x + Math.cos(a) * 0.1, d.y + Math.sin(p * Math.PI) * 0.14, d.z + Math.sin(a) * 0.1, -a]; },
    draw(db, c) { db.box(0.012, 0.003, 0.05, c.W); db.box(0.026, 0.002, 0.04, c.W, { x: 0.012, rz: 0.35 }); db.box(0.026, 0.002, 0.04, c.W, { x: -0.012, rz: -0.35 }); } },
  balloon: { label: 'a hot-air balloon', pr: 0.075, air: 0.62,
    pos(d, t, p) { return [d.x, d.y + Math.sin(t * 0.5 + d.seed) * 0.015 + Math.sin(p * Math.PI) * 0.16, d.z, 0]; },
    draw(db, c) { db.ball(0.05, c.a(0.5), { y: 0.03 }); db.cyl(0.05, 0.012, c.W, { y: 0.074 }); db.cyl(0.03, 0.02, c.a(0.5), { y: 0.036, t: 0.4, rx: Math.PI }); db.box(0.016, 0.014, 0.016, c.K, { y: -0.012 }); db.cyl(0.001, 0.026, c.K, { x: 0.007, y: 0 }); db.cyl(0.001, 0.026, c.K, { x: -0.007, y: 0 }); } },
  hat: { label: 'a lost hat', pr: 0.045,
    draw(db, c, p) { const j = Math.sin(p * Math.PI); db.push(0, j * 0.07, 0, 0, 1, 0, j * 0.7); db.cyl(0.018, 0.003, c.a(0.75)); db.cyl(0.01, 0.014, c.a(0.75), { y: 0.003 }); db.cyl(0.0105, 0.004, c.W, { y: 0.004 }); db.pop(); } },
  frog: { label: 'a frog on a lily pad', pr: 0.045, water: true,
    draw(db, c, p) { const j = Math.sin(p * Math.PI) * 0.06; db.cyl(0.03, 0.004, c.g ? c.g(0.45) : c.p(0.3)); db.ball(0.012, [ROW.grass, 5.4], { y: 0.004 + j, sy: 0.8 }); db.ball(0.004, c.W, { x: 0.006, y: 0.016 + j, z: 0.005 }); db.ball(0.004, c.W, { x: 0.006, y: 0.016 + j, z: -0.005 }); } },
};
// More details for the regions, so that one kind (the balloon) does not show too often.
Object.assign(TYPES, {
  mailbox: { label: 'a mailbox with a letter', pr: 0.045,
    draw(db, c, p) { const o = p > 0 ? easeOut(Math.min(1, p * 2)) : 0; db.box(0.003, 0.026, 0.003, WOOD, {}); db.box(0.014, 0.012, 0.022, c.a(0.6), { y: 0.026 }); db.box(0.002, 0.012, 0.002, K('red', 5), { x: 0.008, y: 0.03, rx: -o * 1.5 }); if (o > 0) db.box(0.01, 0.007, 0.001, WHITE, { y: 0.03 + o * 0.03, z: 0.012 + o * 0.01, rx: o * 0.6 }); } },
  scarecrow: { label: 'a scarecrow', pr: 0.05,
    draw(db, c, p) { const w = Math.sin(p * TAU * 2) * 0.4; db.box(0.003, 0.04, 0.003, WOOD, {}); db.push(0, 0.026, 0, 0, 1, 0, w); db.box(0.04, 0.003, 0.003, WOOD, { y: 0.008 }); db.box(0.016, 0.018, 0.008, c.a(0.6), {}); db.ball(0.007, K('sand', 3), { y: 0.018 }); db.cone(0.009, 0.008, K('earth', 7), { y: 0.03 }); db.pop(); } },
  bicycle: { label: 'a parked bicycle', pr: 0.05,
    draw(db, c, p) { const a = p * TAU * 2; for (const s of [-1, 1]) { db.cyl(0.011, 0.002, DARK, { x: s * 0.016, y: 0.011, rx: Math.PI / 2 }); db.cyl(0.007, 0.0025, WHITE, { x: s * 0.016, y: 0.011, rx: Math.PI / 2 }); } db.box(0.032, 0.002, 0.002, c.a(0.6), { y: 0.016 }); db.box(0.002, 0.012, 0.002, c.a(0.6), { x: -0.008, y: 0.014 }); db.box(0.008, 0.002, 0.004, DARK, { x: -0.008, y: 0.026 }); db.box(0.002, 0.016, 0.002, c.a(0.6), { x: 0.014, y: 0.012 }); db.box(0.002, 0.002, 0.014, DARK, { x: 0.014, y: 0.028 }); db.ball(0.003, GLOW, { x: 0.02, y: 0.03 + Math.sin(a) * 0.004 }); } },
});
// Details for the unique areas. Each kind is in one area only (see `details` in areas.js), and no region uses them.
Object.assign(TYPES, {
  sleigh: { label: 'the sleigh of Santa Claus', pr: 0.09, air: 0.42,
    pos(d, t, p) { const a = t * 0.3 + d.seed; return [d.x + Math.cos(a) * 0.15, d.y + Math.sin(a * 2) * 0.02 + hop(p) * 0.12, d.z + Math.sin(a) * 0.15, -a]; },
    draw(db, c, p, t) {
      const RED = K('red', 5), g = Math.sin(t * 9), SKIN = K('sand', 3), DEER = K('earth', 6);
      db.box(0.032, 0.014, 0.046, RED, { z: -0.04 }); db.box(0.032, 0.022, 0.006, RED, { y: 0.012, z: -0.062 }); db.box(0.034, 0.003, 0.048, K('yellow', 5), { y: 0.014, z: -0.04 });
      for (const s of [-1, 1]) { db.box(0.003, 0.003, 0.062, K('yellow', 5), { x: s * 0.013, y: -0.006, z: -0.038 }); db.box(0.002, 0.006, 0.002, K('yellow', 5), { x: s * 0.013, y: -0.004, z: -0.05 }); db.box(0.002, 0.006, 0.002, K('yellow', 5), { x: s * 0.013, y: -0.004, z: -0.026 }); }
      db.ball(0.013, K('earth', 7), { y: 0.016, z: -0.05 });                                                                                  // the sack
      db.box(0.013, 0.016, 0.012, RED, { y: 0.017, z: -0.028 }); db.ball(0.006, SKIN, { y: 0.032, z: -0.028 }); db.box(0.009, 0.005, 0.004, WHITE, { y: 0.031, z: -0.021 }); db.cone(0.0065, 0.011, RED, { y: 0.042, z: -0.028 }); db.ball(0.0022, WHITE, { y: 0.052, z: -0.028 });
      for (let i = 0; i < 2; i++) for (const s of [-1, 1]) {                                                                                    // four reindeer
        const z0 = 0.006 + i * 0.034, x = s * 0.009, y = 0.004 + g * 0.002 * (i ? 1 : -1);
        db.box(0.007, 0.008, 0.02, DEER, { x, y, z: z0 }); db.box(0.006, 0.007, 0.007, DEER, { x, y: y + 0.008, z: z0 + 0.012 });
        for (const e of [-1, 1]) { db.box(0.001, 0.007, 0.001, K('earth', 8.4), { x: x + e * 0.003, y: y + 0.015, z: z0 + 0.011 }); db.box(0.002, 0.006, 0.002, DEER, { x, y: y - 0.006, z: z0 + e * 0.007 + g * 0.003 * e }); }
        if (i && s > 0) db.ball(0.0024, [ROW.red, 5, 6], { x, y: y + 0.01, z: z0 + 0.016 });                                                    // one red nose
      }
      db.box(0.001, 0.001, 0.07, DARK, { x: 0.009, y: 0.013, z: 0.006 }); db.box(0.001, 0.001, 0.07, DARK, { x: -0.009, y: 0.013, z: 0.006 });
    } },
  snowman: { label: 'a snowman that waves', pr: 0.05,
    draw(db, c, p, t) { const w = hop(p); db.ball(0.018, WHITE, {}); db.ball(0.013, WHITE, { y: 0.026 }); db.ball(0.009, WHITE, { y: 0.046 }); db.box(0.004, 0.003, 0.008, K('orange', 5), { y: 0.053, z: 0.009 }); db.cyl(0.011, 0.002, DARK, { y: 0.062 }); db.cyl(0.008, 0.009, DARK, { y: 0.063 }); db.box(0.016, 0.004, 0.016, K('red', 5), { y: 0.045 }); db.box(0.002, 0.02, 0.002, WOOD, { x: 0.011, y: 0.036, rz: -0.9 - w * Math.sin(t * 10) * 0.6 }); db.box(0.002, 0.02, 0.002, WOOD, { x: -0.011, y: 0.036, rz: 1.1 }); } },
  igloo: { label: 'an igloo with a light on', pr: 0.06,
    draw(db, c, p) { const s = 1 + hop(p) * 0.3; db.dome(0.034, 0.03, K('snow', 1.5), {}); db.box(0.02, 0.016, 0.02, K('snow', 2.6), { z: 0.034 }); db.box(0.012 * s, 0.011 * s, 0.003, GLOW, { z: 0.0435 }); db.box(0.004, 0.01 + hop(p) * 0.02, 0.004, K('rock', 6), { x: 0.012, y: 0.026 }); } },
  icehole: { label: 'a fishing hole in the ice', pr: 0.05,
    draw(db, c, p) { const j = hop(p); db.cyl(0.02, 0.003, K('sea', 8), {}); db.box(0.012, 0.01, 0.012, WOOD, { x: -0.032 }); db.box(0.002, 0.04, 0.002, WOOD, { x: -0.024, y: 0.008, rz: -0.7 }); db.box(0.001, 0.028, 0.001, DARK, { x: 0.002, y: 0.004 }); if (p > 0) { db.push(0.002, 0.004 + j * 0.07, 0, 0, 1, 0, j * 3); db.box(0.018, 0.008, 0.005, K('blue', 4), {}); db.box(0.005, 0.012, 0.004, K('blue', 5), { x: -0.011, y: -0.002 }); db.pop(); } } },
  dragon: { label: 'a small dragon asleep', pr: 0.06,
    draw(db, c, p, t) { const G = K('green', 6), br = 1 + Math.sin(t * 1.5) * 0.06, w = hop(p); db.ball(0.02, G, { sx: 1.5, sy: 0.8 * br }); db.ball(0.011, G, { x: 0.03, y: 0.004 + w * 0.02 }); db.box(0.004, 0.004, 0.004, K('yellow', 4), { x: 0.036, y: 0.022 + w * 0.02 }); db.box(0.03, 0.006, 0.006, G, { x: -0.035, y: 0.002, ry: 0.5 }); for (const s of [-1, 1]) db.box(0.014, 0.002, 0.02, K('orange', 5), { y: 0.026, z: s * 0.012, rx: s * (0.3 + w * Math.sin(t * 12) * 0.7) }); for (let i = 0; i < 3; i++) db.pyr(0.005, 0.006, 0.005, K('orange', 5), { x: -0.012 + i * 0.012, y: 0.03 }); if (p > 0) db.ball(0.006 + w * 0.01, FIRE, { x: 0.05 + w * 0.02, y: 0.008 + w * 0.02 }); } },
  campfire: { label: 'a marshmallow over a small fire', pr: 0.05,
    draw(db, c, p, t) { const f = 1 + Math.sin(t * 11) * 0.2 + hop(p) * 0.8; for (let i = 0; i < 3; i++) db.box(0.024, 0.004, 0.005, WOOD, { ry: i * 1.05 }); db.pyr(0.014, 0.02 * f, 0.014, FIRE, { y: 0.004 }); db.pyr(0.008, 0.012 * f, 0.008, GLOW, { y: 0.004 }); db.box(0.002, 0.05, 0.002, WOOD, { x: 0.03, rz: 0.6 }); db.box(0.008, 0.007, 0.008, WHITE, { x: 0.001, y: 0.038 }); } },
  chest: { label: 'a treasure chest', pr: 0.05,
    draw(db, c, p) { const o = p > 0 ? easeOut(Math.min(1, p * 2)) : 0; db.box(0.034, 0.016, 0.022, WOOD, {}); db.box(0.036, 0.003, 0.024, K('yellow', 5), { y: 0.007 }); if (o > 0) db.box(0.026, 0.006, 0.016, GLOW, { y: 0.013 }); db.push(0, 0.016, -0.011, 0, 1, -o * 1.3); db.box(0.034, 0.008, 0.022, K('earth', 8), { z: 0.011 }); db.box(0.006, 0.006, 0.002, K('yellow', 5), { z: 0.0225, y: -0.002 }); db.pop(); } },
  cactus: { label: 'a cactus in flower', pr: 0.05,
    draw(db, c, p) { const G = K('green', 6), s = p > 0 ? 1 + hop(p) * 1.4 : 1; db.cyl(0.008, 0.045, G, {}); db.cyl(0.005, 0.016, G, { x: 0.014, y: 0.018 }); db.box(0.01, 0.005, 0.005, G, { x: 0.008, y: 0.018 }); db.cyl(0.005, 0.014, G, { x: -0.014, y: 0.01 }); db.box(0.01, 0.005, 0.005, G, { x: -0.008, y: 0.01 }); db.ball(0.005 * s, K('pink', 4), { y: 0.045 }); db.ball(0.003 * s, K('pink', 4), { x: 0.014, y: 0.034 }); } },
  buoy: { label: 'a buoy with a bell', pr: 0.055, water: true,
    draw(db, c, p, t) { const k = Math.sin(t * 1.2) * 0.12 + Math.sin(p * TAU * 2) * 0.4; db.push(0, 0.004, 0, 0, 1, 0, k); db.cyl(0.02, 0.014, K('red', 5), {}); db.cyl(0.021, 0.004, WHITE, { y: 0.006 }); for (const s of [-1, 1]) db.box(0.003, 0.04, 0.003, K('red', 6), { x: s * 0.01, y: 0.014, rz: s * 0.22 }); db.box(0.012, 0.012, 0.012, K('yellow', 4), { y: 0.036 }); db.ball(0.005, GLOW, { y: 0.056 }); db.pop(); } },
  diver: { label: 'a diver who waves', pr: 0.05, water: true,
    draw(db, c, p, t) { const w = hop(p), bob = Math.sin(t * 1.5) * 0.003; db.push(0, bob, 0, p * TAU); db.box(0.02, 0.012, 0.02, K('neutral', 8.6), { y: -0.004 }); db.box(0.016, 0.014, 0.016, K('sand', 3), { y: 0.008 }); db.box(0.018, 0.007, 0.006, K('sea', 3), { y: 0.012, z: 0.008 }); db.box(0.003, 0.022, 0.003, K('orange', 5), { x: 0.01, y: 0.012 }); db.box(0.005, 0.022, 0.005, K('neutral', 8.6), { x: -0.014, y: 0.006, rz: 0.5 + w * Math.sin(t * 10) * 0.6 }); db.pop(); } },
  kite: { label: 'a kite on a long string', pr: 0.07, air: 0.4,
    pos(d, t, p) { return [d.x + Math.sin(t * 0.6 + d.seed) * 0.05, d.y + Math.sin(t * 0.9 + d.seed) * 0.02 + hop(p) * 0.1, d.z, Math.sin(t * 0.5 + d.seed) * 0.4]; },
    draw(db, c, p, t) { db.box(0.001, 0.4, 0.001, WHITE, { y: -0.4 }); db.push(0, 0, 0, 0, 1, 0.3, Math.PI / 4 + Math.sin(p * TAU) * 1.5); db.box(0.04, 0.04, 0.003, K('red', 5), { x: 0.02 }); db.box(0.02, 0.02, 0.004, K('yellow', 4), { x: 0.02, y: 0.01 }); db.pop(); for (let i = 1; i <= 3; i++) db.box(0.008, 0.004, 0.002, K('yellow', 4), { x: Math.sin(t * 3 + i) * 0.004, y: -i * 0.014, rz: i }); } },
  picnic: { label: 'a picnic on a blanket', pr: 0.055,
    draw(db, c, p) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) db.box(0.012, 0.002, 0.012, (i + j) % 2 ? K('red', 5) : WHITE, { x: (i - 1.5) * 0.012, z: (j - 1.5) * 0.012 }); db.box(0.016, 0.01, 0.012, WOOD, { x: -0.008, y: 0.002 }); db.box(0.002, 0.006, 0.01, WOOD, { x: -0.008, y: 0.012 }); db.ball(0.005, K('red', 5), { x: 0.012, y: 0.002 + hop(p) * 0.05, z: 0.006 }); db.box(0.006, 0.004, 0.006, K('yellow', 4), { x: 0.01, y: 0.002, z: -0.012 }); } },
  duck: { label: 'a rubber duck', pr: 0.045, water: true,
    draw(db, c, p) { const j = hop(p), Y = K('yellow', 3); db.push(0, j * 0.05, 0, p * TAU); db.ball(0.014, Y, { sx: 1.3, sy: 0.8 - j * 0.2 }); db.ball(0.009, Y, { x: 0.012, y: 0.014 }); db.box(0.008, 0.003, 0.006, K('orange', 5), { x: 0.022, y: 0.02 }); db.ball(0.002, DARK, { x: 0.017, y: 0.026, z: 0.005 }); db.ball(0.002, DARK, { x: 0.017, y: 0.026, z: -0.005 }); db.pop(); } },
  coffee: { label: 'a cup of coffee, still warm', pr: 0.045,
    draw(db, c, p, t) { const j = hop(p) * 0.04; db.cyl(0.016, 0.002, WHITE, {}); db.cyl(0.01, 0.018, WHITE, { y: 0.002 + j }); db.cyl(0.0085, 0.002, K('earth', 9), { y: 0.0185 + j }); db.box(0.006, 0.01, 0.003, WHITE, { x: 0.012, y: 0.006 + j }); db.cyl(0.0103, 0.004, K('blue', 5), { y: 0.008 + j }); for (let i = 0; i < 2; i++) { const q = (t * 0.4 + i * 0.5) % 1; db.ball(0.002 + 0.003 * (1 - q), WHITE, { x: Math.sin(q * 6 + i) * 0.004, y: 0.024 + j + q * 0.03 }); } } },
  yeti: { label: 'a yeti that waves', pr: 0.055,
    draw(db, c, p, t) { const w = hop(p), F = K('snow', 1); db.box(0.022, 0.03, 0.016, F, { y: 0.004 }); db.box(0.016, 0.014, 0.014, F, { y: 0.034 }); db.box(0.01, 0.006, 0.002, K('sea', 8), { y: 0.038, z: 0.007 }); db.box(0.006, 0.022, 0.008, F, { x: -0.015, y: 0.032, rz: 3.0 }); db.box(0.006, 0.022, 0.008, F, { x: 0.013, y: 0.028, rz: -0.6 - w * Math.sin(t * 10) * 0.5 }); for (const s of [-1, 1]) db.box(0.009, 0.004, 0.012, F, { x: s * 0.006, z: 0.003 }); } },
  tent: { label: 'a small tent', pr: 0.055,
    draw(db, c, p) { const o = hop(p); db.gable(0.04, 0.028, 0.045, K('orange', 5), {}); db.box(0.012, 0.018, 0.002, K('earth', 9), { z: 0.0226 }); db.box(0.01, 0.006, 0.03, K('blue', 5), { y: 0.001, z: 0.008 + o * 0.03 }); db.ball(0.004, K('sand', 3), { y: 0.003, z: 0.02 + o * 0.03 }); db.box(0.001, 0.014, 0.001, DARK, { y: 0.028 }); db.box(0.008, 0.005, 0.001, K('red', 5), { x: 0.004, y: 0.037 }); } },
  bottle: { label: 'a message in a bottle', pr: 0.05, water: true,
    draw(db, c, p, t) { const j = hop(p) * 0.06 + Math.sin(t * 1.3) * 0.002; db.push(0, 0.006 + j, 0, t * 0.2, 1, 0, Math.PI / 2 - 0.25 + p * TAU); db.cyl(0.007, 0.026, K('sea', 4), { y: -0.013 }); db.cyl(0.0073, 0.01, WHITE, { y: -0.006 }); db.cyl(0.003, 0.008, K('sea', 4), { y: 0.013 }); db.cyl(0.0034, 0.004, WOOD, { y: 0.021 }); db.pop(); } },
  umbrella: { label: 'an umbrella in the wind', pr: 0.06, air: 0.3,
    pos(d, t, p) { const a = t * 0.5 + d.seed; return [d.x + Math.cos(a) * 0.09, d.y + Math.sin(a * 1.7) * 0.03 + hop(p) * 0.12, d.z + Math.sin(a) * 0.09, a * 2]; },
    draw(db, c, p) { db.push(0, 0, 0, 0, 1, 0.5 + p * TAU, 0); db.cone(0.03, 0.014, K('red', 5), {}); db.cyl(0.0012, 0.034, DARK, { y: -0.034 }); db.box(0.006, 0.002, 0.002, DARK, { x: 0.003, y: -0.034 }); db.pop(); } },
  sandcastle: { label: 'a sandcastle', pr: 0.055,
    draw(db, c, p, t) { const S = K('sand', 4), w = hop(p); db.box(0.036, 0.012, 0.036, S, {}); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { db.cyl(0.007, 0.022, S, { x: sx * 0.016, z: sz * 0.016 }); db.cone(0.008, 0.008, K('sand', 5.5), { x: sx * 0.016, y: 0.022, z: sz * 0.016 }); } db.cyl(0.008, 0.03 + w * 0.012, S, {}); db.box(0.001, 0.014, 0.001, DARK, { y: 0.03 + w * 0.012 }); db.box(0.01, 0.006, 0.001, K('red', 5), { x: 0.005, y: 0.038 + w * 0.012, ry: Math.sin(t * 6) * 0.4 }); } },
  surfboard: { label: 'a surfboard in the sand', pr: 0.05,
    draw(db, c, p) { db.push(0, 0, 0, 0, 1, 0, Math.sin(p * TAU * 2) * 0.35 + 0.12); db.ball(0.03, K('pink', 4), { sx: 0.4, sz: 0.12, sy: 1.1 }); db.box(0.004, 0.05, 0.009, WHITE, { y: 0.008 }); db.box(0.014, 0.004, 0.009, K('blue', 5), { y: 0.03 }); db.pop(); } },
  rowboat: { label: 'a small rowing boat', pr: 0.06, water: true,
    draw(db, c, p, t) { const r = Math.sin(t * 1.6) * 0.5, k = Math.sin(p * TAU * 2) * 0.25; db.push(0, 0.002, 0, 0, 1, k); db.box(0.05, 0.01, 0.022, WOOD, {}); db.box(0.01, 0.008, 0.016, WOOD, { x: 0.028 }); db.box(0.01, 0.008, 0.016, WOOD, { x: -0.028 }); db.box(0.006, 0.003, 0.02, K('earth', 5), { y: 0.01 }); for (const s of [-1, 1]) db.box(0.002, 0.002, 0.03, K('earth', 5), { y: 0.011, z: s * 0.022, ry: s * r }); db.box(0.008, 0.012, 0.008, K('red', 5), { y: 0.013 }); db.ball(0.004, K('sand', 3), { y: 0.025 }); db.pop(); } },
  easel: { label: 'an easel with a new painting', pr: 0.05,
    draw(db, c, p) { const w = Math.sin(p * TAU * 2) * 0.2; for (const s of [-1, 1]) db.box(0.002, 0.045, 0.002, WOOD, { x: s * 0.012, rz: s * 0.2 }); db.box(0.002, 0.045, 0.002, WOOD, { z: -0.014, rx: -0.3 }); db.push(0, 0.018, 0.003, 0, 1, 0, w); db.box(0.03, 0.024, 0.003, WHITE, {}); db.box(0.03, 0.008, 0.0035, K('sea', 5), {}); db.box(0.03, 0.006, 0.0035, K('grass', 5), { y: 0.008 }); db.ball(0.003, K('yellow', 4), { x: 0.008, y: 0.016, z: 0.001 }); db.pop(); } },
  beamcow: { label: 'a cow in a beam of light', pr: 0.08, air: 0.4,
    pos(d, t, p) { return [d.x + Math.sin(t * 0.4 + d.seed) * 0.03, d.y + Math.sin(t * 0.9 + d.seed) * 0.01, d.z, t * 0.3]; },
    draw(db, c, p, t) {
      const up = hop(p), M = K('neutral', 4.6), cy = -0.2 + up * 0.14 + Math.sin(t * 1.4) * 0.006;
      db.cyl(0.05, 0.01, M, {}); db.cyl(0.034, 0.012, K('neutral', 6), { y: 0.01 }); db.dome(0.022, 0.02, [ROW.sea, 2.6, 1, 0.1], { y: 0.02 }); db.cyl(0.02, 0.006, [ROW.green, 3, 2, 0], { y: -0.006 });
      for (let i = 0; i < 4; i++) { const q = (t * 0.6 + i / 4) % 1; db.cyl(0.014 + q * 0.02, 0.0015, [ROW.yellow, 2.4, 2, 0], { y: -0.02 - q * 0.16 }); }   // the beam: thin rings of light that go down
      db.push(0, cy, 0, t * 0.8, 1, 0, 0.3); db.box(0.03, 0.016, 0.016, WHITE, {}); db.box(0.012, 0.008, 0.0165, DARK, { x: -0.004, y: 0.006 }); db.box(0.012, 0.012, 0.012, WHITE, { x: 0.02, y: 0.006 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) db.box(0.004, 0.01, 0.004, DARK, { x: sx * 0.01, y: -0.01, z: sz * 0.005 }); db.pop();
    } },
  tinfoil: { label: 'a cactus with a tinfoil hat', pr: 0.05,
    draw(db, c, p) { const G = K('green', 6), j = hop(p) * 0.05; db.cyl(0.009, 0.05, G, {}); db.cyl(0.005, 0.018, G, { x: 0.015, y: 0.02 }); db.box(0.011, 0.005, 0.005, G, { x: 0.008, y: 0.02 }); db.cyl(0.005, 0.014, G, { x: -0.015, y: 0.012 }); db.box(0.011, 0.005, 0.005, G, { x: -0.008, y: 0.012 }); db.push(0, 0.05 + j, 0, p * TAU * 2); db.cone(0.014, 0.022, K('neutral', 2.2), {}); db.cyl(0.017, 0.003, K('neutral', 3.4), {}); db.pop(); } },
});
// Distance from a point to a footprint (a list of [x, z] corners). It is 0 inside the footprint.
export function polyDist(pts, x, z) {
  let inside = false, best = 1e9;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], zi = pts[i][1], xj = pts[j][0], zj = pts[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    const dx = xj - xi, dz = zj - zi, t = clamp(((x - xi) * dx + (z - zi) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - xi - dx * t, z - zi - dz * t));
  }
  return inside ? 0 : best;
}
// The details that any region can have: the 9 above and 31 from the library (40). Each biome has 10 more of its own (details-lib.js).
const ORDER = ['cat', 'balloon', 'door', 'frog', 'plane', 'hat', 'mailbox', 'scarecrow', 'bicycle', ...LIB_UNIVERSAL.map((q) => q.id)];
for (const item of [...LIB_UNIVERSAL, ...Object.values(LIB_BIOME).flat()]) {
  TYPES[item.id] = { label: item.label, pr: 0.05, water: item.where === 'w', air: item.where === 'a' ? 0.26 : undefined, draw: (db, c, p) => drawParts(db, item, c, p) };
  if (item.where === 'a') TYPES[item.id].pos = (d, t, p) => { const a = t * 0.3 + d.seed; return [d.x + Math.cos(a) * 0.06, d.y + Math.sin(t * 0.7 + d.seed) * 0.012 + hop(p) * 0.08, d.z + Math.sin(a) * 0.06, -a]; };
}
// The kinds for one region, in the order to try them: first two of its biome, then kinds that any region can have, then the other kinds of its biome.
// The order comes from the seed of the region, so each region has its own mix.
function kindsFor(biome, rr) {
  const mix = (list) => list.map((t) => [rr(), t]).sort((a, bb) => a[0] - bb[0]).map((x) => x[1]);
  const bio = mix((LIB_BIOME[biome] || []).map((q) => q.id)), uni = mix(ORDER);
  return [...bio.slice(0, 2), ...uni.slice(0, 6), ...bio.slice(2), ...uni.slice(6)];
}

// Called by the region generator. Picks the details from the seed and adds one animator that draws them.
export function addDetails(reg, b, anim, r, only) {
  const tile = reg.tile, c = reg.c, H = reg.H, seed = (reg.cfg ? reg.cfg.seed : tile.index * 97) >>> 0;
  const rr = rng(seed + 991);
  const want = only ? only.length : 3 + (seed % 3);
  const types = only ? only.slice() : kindsFor(reg.cfg ? reg.cfg.biome : '', rr);
  const open = reg.open;   // 'ocean' or 'sky': a region with no land (see region.js)
  const free = (x, z, rad) => (reg.occ || []).every((o) => (x - o.x) ** 2 + (z - o.z) ** 2 > (rad + o.r) ** 2);
  const roofs = (reg.roofs || []).slice();
  for (const type of types) {
    if (reg.details.length >= want) break;
    const T = TYPES[type]; let spot = null;
    if (type === 'cat' && roofs.length) { const k = Math.floor(rr() * roofs.length); const f = roofs.splice(k, 1)[0]; spot = { x: f.x, y: f.y, z: f.z }; }
    else if (only && reg.blocks && !T.air) {
      // A unique area: take the spot that is farthest from the objects of the area, so that the detail is not inside one of them.
      let bs = -1;
      for (let pass = 0; pass < 2 && !spot; pass++) for (let i = 0; i < 300; i++) {
        const a = rr() * TAU, d = Math.sqrt(rr()) * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z);
        if (edgeE(tile, x, z) < 0.12 || (T.water ? y > -0.03 : y < 0.02) || !free(x, z, 0.05)) continue;
        if (!T.water && pass === 0 && Math.max(Math.abs(H(x + 0.04, z) - y), Math.abs(H(x - 0.04, z) - y), Math.abs(H(x, z + 0.04) - y), Math.abs(H(x, z - 0.04) - y)) > 0.016) continue;   // flat ground first
        let cl = 0.2; for (const pts of reg.blocks) { cl = Math.min(cl, polyDist(pts, x, z)); if (cl <= bs) break; }
        if (cl > bs) { bs = cl; spot = { x, y: T.water ? 0.002 : y, z }; }
      }
    }
    else for (let i = 0; i < 200 && !spot; i++) {   // many tries: land with much water or many objects has few free places
      const a = rr() * TAU, d = Math.sqrt(rr()) * 0.85, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z);
      if (edgeE(tile, x, z) < 0.12) continue;
      if (open === 'sky' && (T.water || y < 0)) continue;   // on a cloud: no water, and not over the edge of the cloud
      if (T.air) { spot = { x, y: Math.max(y, 0) + T.air, z }; break; }
      if (T.water ? y > -0.025 : y < 0.035) continue;
      if (!free(x, z, 0.05)) continue;
      spot = { x, y: T.water ? (open === 'ocean' ? y + 0.004 : 0.002) : y - 0.004, z };
    }
    if (!spot) continue;
    reg.details.push({ type, label: T.label, ...spot, ry: reg.az != null ? Math.PI / 2 - reg.az : 0, seed: rr() * 10, found: false, t0: -99 });
    if (reg.occ && !T.air) reg.occ.push({ x: spot.x, z: spot.z, r: 0.05 });
  }
  anim((db, fb, t) => {
    for (const d of reg.details) {
      const T = TYPES[d.type], p = clamp((t - d.t0) / 1.4);
      const q = p >= 1 ? 0 : p;
      let x = d.x, y = d.y, z = d.z, ry = d.ry;
      if (T.pos) [x, y, z, ry] = T.pos(d, t, q);
      d.wx = x; d.wy = y + 0.02; d.wz = z;
      db.lod = 2;
      db.push(x, y, z, ry, 1); T.draw(db, c, q, t); db.pop();
    }
  }, { minLod: 0.45 });
}

// App side: storage, hover and tap tests, the hint button.
export function setupDetails(app) {
  const { world, cam, $ } = app;
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem('dbw-found') || '{}') || {}; } catch (e) { mem = {}; }
  const save = () => { try { localStorage.setItem('dbw-found', JSON.stringify(mem)); } catch (e) { /* keep it in memory only */ } };
  const key = (reg) => (reg.kind === 'sample' ? 's' + reg.number : reg.kind === 'area' ? reg.def.id : null);
  const load = (reg) => { const k = key(reg); if (k && Array.isArray(mem[k])) reg.details.forEach((d, i) => { if (mem[k].includes(d.type + i)) d.found = true; }); };
  [...app.samples, ...app.areas].forEach(load);
  app.detailLib = { universal: LIB_UNIVERSAL, biome: LIB_BIOME, draw: drawParts };   // for the tests and the picture tools
  app.isFound = (reg, i) => !!reg.details[i].found;
  app.foundCount = (reg) => reg.details.filter((d) => d.found).length;

  const tip = $('#tip'), _v = new THREE.Vector3();
  let tipTimer = 0;
  function find(reg, d) {
    if (d.found && (world.lastT || 0) - d.t0 < 1.5) return;
    const first = !d.found;
    d.found = true; d.t0 = world.lastT || 0;
    const k = key(reg);
    if (k && first) { if (!Array.isArray(mem[k])) mem[k] = []; mem[k].push(d.type + reg.details.indexOf(d)); save(); }
    const n = app.foundCount(reg), total = reg.details.length;
    const line = document.querySelector('#foundLine'); if (line) line.innerHTML = `<b>${n}</b> of ${total} found`;
    document.querySelectorAll('.dots i').forEach((el, i) => el.classList.toggle('on', !!reg.details[i] && reg.details[i].found));
    _v.set(d.wx ?? d.x, (d.wy ?? d.y) + 0.06, d.wz ?? d.z).applyMatrix4(reg.tile.matrix);
    const p = cam.project(_v);
    tip.innerHTML = `${first ? 'Found' : 'Again'}: ${d.label}<small>${n} of ${total} found</small>`; tip.style.left = p.x + 'px'; tip.style.top = p.y + 'px'; tip.hidden = false;
    clearTimeout(tipTimer); tipTimer = setTimeout(() => (tip.hidden = true), 1900);
    $('#live').textContent = `Found: ${d.label}. ${n} of ${total} found.`;
    if (app.holdHi) app.holdHi('d' + reg.tile.index + '-' + reg.details.indexOf(d), 1.9);   // the silhouette marks the find for a moment
    cam.changed();
  }
  function at(x, y, rad) {
    const reg = app.current; if (!reg || world.U.uLod.value < 0.5) return null;
    let best = null, bd = rad;
    for (const d of reg.details) { if (d.wx == null) continue; _v.set(d.wx, d.wy, d.wz).applyMatrix4(reg.tile.matrix); const p = cam.project(_v), dist = Math.hypot(p.x - x, p.y - y); if (dist < bd) { bd = dist; best = d; } }
    return best;
  }
  app.detailHover = (x, y) => { const d = at(x, y, 26); world.canvas.style.cursor = d ? 'pointer' : ''; if (d && !d.found) find(app.current, d); };
  app.detailTap = (x, y) => { const d = at(x, y, 40); if (!d) return false; find(app.current, d); return true; };
  // Keyboard path: find the next one without a pointer.
  app.hintDetail = (reg) => { const d = reg.details.find((x) => !x.found) || reg.details[0]; if (d) find(reg, d); };
}
