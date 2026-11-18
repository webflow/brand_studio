// Small animals that match the biome. Each animal walks a short loop near its home and rests between walks.
// All animals are made of small cubes. They are drawn again every frame (see World.addAnimator).
import { ROW } from './palette.js';
import { REDUCED } from './config.js';
import { edgeE } from './terrain.js';
import { rng, TAU } from './util.js';

const N = (row, tone) => [ROW[row], tone, 0, 0];
const WHITE = N('plaster', 0.4), DARK = N('neutral', 8.5), PINK = N('coral', 3), BEAK = N('autumn', 5);
const F4 = [[-1, -1, 0], [-1, 1, 1], [1, -1, 1], [1, 1, 0]];
// Four legs. sw = -1..1 moves the feet forward and back.
const legs4 = (db, L, W, leg, col, sw, th = 0.28) => { for (const [fx, fz, ph] of F4) db.box(W * th, leg, W * th, col, { x: fx * L * 0.36 + (ph ? sw : -sw) * leg * 0.5, z: fz * W * 0.32 }); };

// draw(db, sw, nod, t, moving): sw = leg swing, nod = 0..1 head down while it rests, t = time.
// gait: walk, hop, swim (on water), side (moves sideways), waddle. w = how far it walks from home. v = speed.
const fox = (col, tip, leg) => ({ w: 0.07, v: 0.16, draw(db, sw, nod, t) {
  legs4(db, 0.034, 0.018, 0.01, leg, sw);
  db.box(0.038, 0.014, 0.016, col, { y: 0.01 }); db.box(0.014, 0.013, 0.014, col, { x: 0.026, y: 0.016 - nod * 0.008 }); db.box(0.008, 0.006, 0.008, WHITE, { x: 0.036, y: 0.016 - nod * 0.008 });
  for (const s of [-1, 1]) db.box(0.004, 0.008, 0.004, col, { x: 0.024, y: 0.029 - nod * 0.008, z: s * 0.005 });
  const wag = Math.sin(t * 3) * 0.004; db.box(0.02, 0.01, 0.01, col, { x: -0.029, y: 0.016, z: wag }); db.box(0.009, 0.01, 0.01, tip, { x: -0.043, y: 0.017, z: wag * 1.6 });
} });
const rabbit = (col) => ({ w: 0.05, v: 0.24, gait: 'hop', hop: 0.012, draw(db, sw, nod, t) {
  db.box(0.02, 0.014, 0.014, col, { y: 0.003 }); db.box(0.011, 0.011, 0.011, col, { x: 0.013, y: 0.011 - nod * 0.005 });
  for (const s of [-1, 1]) db.box(0.003, 0.014 - nod * 0.004, 0.003, col, { x: 0.011, y: 0.022 - nod * 0.005, z: s * 0.003 });
  db.box(0.005, 0.005, 0.005, WHITE, { x: -0.012, y: 0.009 });
} });
const lizard = (col, col2) => ({ w: 0.05, v: 0.2, draw(db, sw, nod, t, mv) {
  db.box(0.034, 0.006, 0.012, col, { y: 0.003 }); db.box(0.012, 0.007, 0.01, col2, { x: 0.022, y: 0.003 + nod * 0.004 }); db.box(0.02, 0.003, 0.004, col2, { y: 0.009 });
  for (let i = 0; i < 3; i++) db.box(0.011, 0.005 - i * 0.001, 0.007 - i * 0.002, col, { x: -0.021 - i * 0.01, y: 0.003, z: Math.sin(t * 5 + i * 1.2) * 0.004 * (0.3 + mv) * (i + 1) * 0.6 });
  for (const [fx, fz, ph] of F4) db.box(0.004, 0.003, 0.007, col2, { x: fx * 0.011 + (ph ? sw : -sw) * 0.004, y: 0.001, z: fz * 0.009 });
} });
const goat = (col, leg) => ({ w: 0.06, v: 0.14, graze: 1, draw(db, sw, nod) {
  legs4(db, 0.034, 0.018, 0.016, leg, sw);
  db.box(0.038, 0.018, 0.018, col, { y: 0.016 }); const hy = 0.03 - nod * 0.02, hx = 0.026 + nod * 0.004; db.box(0.013, 0.013, 0.013, col, { x: hx, y: hy });
  for (const s of [-1, 1]) db.box(0.003, 0.012, 0.003, N('sand', 4), { x: hx - 0.005, y: hy + 0.012, z: s * 0.004, rz: 0.5 });
  db.box(0.003, 0.006, 0.003, WHITE, { x: hx + 0.004, y: hy - 0.006 }); db.box(0.005, 0.005, 0.005, col, { x: -0.021, y: 0.03 });
} });
const duck = (body, head) => ({ w: 0.08, v: 0.12, gait: 'swim', draw(db, sw, nod, t) {
  const dip = nod * 0.006;
  db.box(0.022, 0.01, 0.014, body, { y: -0.003 }); db.box(0.006, 0.006, 0.008, body, { x: -0.013, y: 0.005 });
  db.box(0.009, 0.009, 0.009, head, { x: 0.01, y: 0.007 - dip }); db.box(0.006, 0.003, 0.005, BEAK, { x: 0.017, y: 0.009 - dip });
} });
const wader = (body, leg) => ({ w: 0.04, v: 0.1, graze: 1, draw(db, sw, nod) {
  db.box(0.002, 0.03, 0.002, leg, { x: sw * 0.004, z: 0.004 }); db.box(0.002, 0.03 - nod * 0.012, 0.002, leg, { x: -sw * 0.004, y: nod * 0.012, z: -0.004 });
  db.box(0.02, 0.012, 0.014, body, { y: 0.03 }); db.box(0.006, 0.005, 0.01, body, { x: -0.012, y: 0.034 });
  const hy = 0.058 - nod * 0.04, hx = 0.013 + nod * 0.012; db.box(0.004, Math.max(0.004, hy - 0.036), 0.004, body, { x: 0.01 + nod * 0.004, y: 0.038 });
  db.box(0.008, 0.008, 0.008, body, { x: hx, y: hy }); db.box(0.007, 0.003, 0.003, DARK, { x: hx + 0.007, y: hy + 0.001 });
} });
const parrot = (a, b2) => ({ w: 0.04, v: 0.26, gait: 'hop', hop: 0.008, draw(db, sw, nod, t) {
  db.box(0.012, 0.016, 0.012, a, { y: 0.004 }); db.box(0.006, 0.012, 0.015, b2, { x: -0.002, y: 0.006 }); db.box(0.014, 0.003, 0.006, b2, { x: -0.012, y: 0.004 });
  db.box(0.01, 0.01, 0.01, a, { x: 0.001, y: 0.02 - nod * 0.004 }); db.box(0.006, 0.005, 0.004, N('yellow', 4), { x: 0.008, y: 0.021 - nod * 0.004 });
  for (const s of [-1, 1]) db.box(0.002, 0.004, 0.002, DARK, { z: s * 0.003 });
} });
const SP = {
  sheep: { w: 0.05, v: 0.11, graze: 1, draw(db, sw, nod) {
    legs4(db, 0.034, 0.024, 0.012, DARK, sw);
    db.box(0.04, 0.024, 0.028, WHITE, { y: 0.011 }); db.box(0.03, 0.008, 0.022, N('plaster', 1.2), { y: 0.035 });
    db.box(0.014, 0.014, 0.014, DARK, { x: 0.026, y: 0.022 - nod * 0.014 }); db.box(0.004, 0.004, 0.02, DARK, { x: 0.024, y: 0.033 - nod * 0.014 });
  } },
  cow: { w: 0.05, v: 0.09, graze: 1, draw(db, sw, nod) {
    legs4(db, 0.044, 0.026, 0.014, WHITE, sw);
    db.box(0.05, 0.026, 0.03, WHITE, { y: 0.014 }); db.box(0.018, 0.02, 0.031, DARK, { x: -0.008, y: 0.018 }); db.box(0.012, 0.012, 0.031, DARK, { x: 0.014, y: 0.027 });
    const hy = 0.028 - nod * 0.018; db.box(0.016, 0.016, 0.016, WHITE, { x: 0.034, y: hy }); db.box(0.008, 0.008, 0.012, PINK, { x: 0.044, y: hy });
    for (const s of [-1, 1]) db.box(0.003, 0.006, 0.003, N('sand', 3), { x: 0.032, y: hy + 0.016, z: s * 0.006 });
    db.box(0.003, 0.014, 0.003, WHITE, { x: -0.026, y: 0.022 });
  } },
  deer: { w: 0.07, v: 0.13, graze: 1, draw(db, sw, nod) {
    const col = N('earth', 5), leg = N('earth', 7);
    legs4(db, 0.04, 0.02, 0.022, leg, sw, 0.22);
    db.box(0.044, 0.02, 0.02, col, { y: 0.022 }); db.box(0.006, 0.006, 0.006, WHITE, { x: -0.024, y: 0.036 });
    const hy = 0.052 - nod * 0.036, hx = 0.028 + nod * 0.008; db.box(0.01, Math.max(0.006, hy - 0.03), 0.01, col, { x: 0.02 + nod * 0.004, y: 0.034 - nod * 0.012 });
    db.box(0.016, 0.011, 0.011, col, { x: hx, y: hy });
    for (const s of [-1, 1]) { db.box(0.002, 0.014, 0.002, N('sand', 4), { x: hx - 0.004, y: hy + 0.011, z: s * 0.005 }); db.box(0.008, 0.002, 0.002, N('sand', 4), { x: hx - 0.002, y: hy + 0.019, z: s * 0.006 }); }
  } },
  fox: fox(N('autumn', 5), WHITE, DARK), arcticFox: fox(N('snow', 1.2), WHITE, N('snow', 4)), sandFox: fox(N('sand', 5), WHITE, N('earth', 7)),
  rabbit: rabbit(N('earth', 4)), hare: rabbit(N('snow', 0.8)), greyRabbit: rabbit(N('rock', 4)),
  camel: { w: 0.06, v: 0.09, graze: 1, draw(db, sw, nod) {
    const col = N('sand', 5), leg = N('sand', 6.4);
    legs4(db, 0.044, 0.022, 0.03, leg, sw, 0.22);
    db.box(0.05, 0.022, 0.024, col, { y: 0.03 }); db.box(0.02, 0.012, 0.02, col, { x: -0.004, y: 0.052 });
    const hy = 0.068 - nod * 0.05, hx = 0.034 + nod * 0.01; db.box(0.01, Math.max(0.006, hy - 0.036), 0.01, col, { x: 0.024 + nod * 0.004, y: 0.04 - nod * 0.012 });
    db.box(0.016, 0.01, 0.01, col, { x: hx, y: hy });
  } },
  lizard: lizard(N('olive', 5), N('olive', 6.4)), sandLizard: lizard(N('sand', 5.4), N('earth', 6)), fireLizard: lizard(N('autumn', 5), DARK), gecko: lizard(N('amethyst', 4), N('amethyst', 6)),
  bear: { w: 0.06, v: 0.08, draw(db, sw, nod) {
    const col = N('snow', 0.6);
    legs4(db, 0.05, 0.034, 0.014, N('snow', 1.6), sw, 0.3);
    db.box(0.058, 0.03, 0.036, col, { y: 0.014 }); const hy = 0.026 - nod * 0.012; db.box(0.022, 0.02, 0.022, col, { x: 0.04, y: hy });
    db.box(0.006, 0.006, 0.008, DARK, { x: 0.053, y: hy + 0.004 }); for (const s of [-1, 1]) db.box(0.006, 0.005, 0.005, col, { x: 0.036, y: hy + 0.02, z: s * 0.008 });
  } },
  penguin: { w: 0.04, v: 0.16, gait: 'waddle', draw(db, sw, nod) {
    db.box(0.016, 0.03, 0.016, DARK, { y: 0.003 }); db.box(0.004, 0.022, 0.012, WHITE, { x: 0.008, y: 0.005 });
    db.box(0.013, 0.012, 0.013, DARK, { y: 0.033 }); db.box(0.008, 0.004, 0.005, BEAK, { x: 0.01, y: 0.036 - nod * 0.003 });
    for (const s of [-1, 1]) { db.box(0.01, 0.003, 0.006, BEAK, { x: 0.004, z: s * 0.005 }); db.box(0.004, 0.016, 0.003, DARK, { y: 0.012, z: s * 0.0095, rx: s * (0.15 + Math.abs(sw) * 0.5) }); }
  } },
  frog: { w: 0.04, v: 0.2, gait: 'hop', hop: 0.014, draw(db) {
    const col = N('grass', 5);
    db.box(0.016, 0.008, 0.014, col, { y: 0.002 }); for (const s of [-1, 1]) { db.box(0.004, 0.004, 0.004, N('grass', 2.5), { x: 0.006, y: 0.01, z: s * 0.004 }); db.box(0.008, 0.004, 0.005, N('grass', 6.2), { x: -0.006, z: s * 0.009 }); }
  } },
  heron: wader(N('plaster', 0.5), DARK), flamingo: wader(N('coral', 3.4), N('coral', 6)),
  duck: duck(N('earth', 5), N('forest', 6)), gull: duck(WHITE, WHITE), swan: duck(N('plaster', 0.2), N('plaster', 0.2)),
  crab: { w: 0.05, v: 0.2, gait: 'side', draw(db, sw) {
    const col = N('coral', 5), c2 = N('coral', 6.4);
    db.box(0.018, 0.007, 0.014, col, { y: 0.005 });
    for (const s of [-1, 1]) { db.box(0.003, 0.005, 0.003, DARK, { x: 0.006, y: 0.012, z: s * 0.004 }); db.box(0.008, 0.007, 0.006, c2, { x: 0.012, y: 0.005 + Math.abs(sw) * 0.004, z: s * 0.012 }); for (let i = 0; i < 3; i++) db.box(0.003, 0.005, 0.003, c2, { x: -0.006 + i * 0.006, z: s * (0.009 + ((i + (sw > 0 ? 1 : 0)) % 2) * 0.002) }); }
  } },
  turtle: { w: 0.04, v: 0.05, draw(db, sw, nod) {
    db.box(0.028, 0.012, 0.024, N('forest', 6), { y: 0.004 }); db.box(0.018, 0.006, 0.016, N('forest', 4.6), { y: 0.016 });
    db.box(0.009, 0.008, 0.009, N('grass', 4), { x: 0.019 - nod * 0.004, y: 0.006 });
    for (const [fx, fz, ph] of F4) db.box(0.008, 0.003, 0.006, N('grass', 4), { x: fx * 0.012 + (ph ? sw : -sw) * 0.004, y: 0.001, z: fz * 0.013 });
  } },
  goat: goat(N('rock', 2), N('rock', 5)), ibex: goat(N('sand', 4.6), N('earth', 7)), darkGoat: goat(N('rock', 7.4), DARK),
  monkey: { w: 0.05, v: 0.22, gait: 'hop', hop: 0.012, draw(db, sw, nod, t) {
    const col = N('earth', 6.4);
    db.box(0.014, 0.02, 0.014, col, { y: 0.004 }); db.box(0.013, 0.013, 0.013, col, { x: 0.001, y: 0.026 }); db.box(0.004, 0.008, 0.008, N('sand', 4), { x: 0.007, y: 0.028 });
    for (const s of [-1, 1]) { db.box(0.004, 0.014, 0.004, col, { x: 0.002 + s * sw * 0.004, y: 0.008, z: s * 0.009 }); db.box(0.004, 0.004, 0.004, col, { x: -0.001, y: 0.036, z: s * 0.007 }); }
    db.box(0.003, 0.02, 0.003, col, { x: -0.009, y: 0.006 }); db.box(0.008, 0.003, 0.003, col, { x: -0.013 + Math.sin(t * 2) * 0.002, y: 0.026 });
  } },
  parrot: parrot(N('red', 5), N('blue', 5)), greenParrot: parrot(N('grass', 5), N('yellow', 4)),
  seal: { w: 0.04, v: 0.07, draw(db, sw, nod, t) {
    const col = N('rock', 6.4);
    db.box(0.04, 0.014, 0.02, col, {}); db.box(0.014, 0.012, 0.014, col, { x: 0.026, y: 0.006 + (1 - nod) * 0.008 }); db.box(0.004, 0.004, 0.006, DARK, { x: 0.034, y: 0.012 + (1 - nod) * 0.008 });
    for (const s of [-1, 1]) db.box(0.01, 0.003, 0.008, col, { x: 0.008 + sw * 0.003 * s, z: s * 0.013 }); db.box(0.01, 0.004, 0.016, col, { x: -0.024, y: 0.002 + Math.abs(Math.sin(t * 1.5)) * 0.004 });
  } },
};

Object.assign(SP, {
  giraffe: { w: 0.07, v: 0.09, graze: 1, draw(db, sw, nod) {
    const col = N('autumn', 3.4), spot = N('earth', 6.4), leg = N('autumn', 4.4);
    legs4(db, 0.04, 0.018, 0.036, leg, sw, 0.2);
    db.box(0.046, 0.02, 0.02, col, { y: 0.036 }); db.box(0.012, 0.006, 0.021, spot, { x: -0.008, y: 0.044 }); db.box(0.01, 0.006, 0.021, spot, { x: 0.012, y: 0.04 });
    db.push(0.02, 0.05, 0, 0, 1, 0, -0.35 - nod * 0.9);   // the long neck goes down when it eats
    db.box(0.01, 0.06, 0.011, col, {}); db.box(0.004, 0.012, 0.0115, spot, { y: 0.02 }); db.box(0.022, 0.011, 0.012, col, { x: 0.006, y: 0.058 });
    for (const s of [-1, 1]) db.box(0.003, 0.008, 0.003, spot, { x: -0.002, y: 0.069, z: s * 0.003 });
    db.pop();
  } },
  zebra: { w: 0.07, v: 0.14, graze: 1, draw(db, sw, nod) {
    legs4(db, 0.04, 0.02, 0.022, DARK, sw, 0.22);
    db.box(0.046, 0.022, 0.021, WHITE, { y: 0.022 }); for (let i = 0; i < 4; i++) db.box(0.004, 0.023, 0.0215, DARK, { x: -0.016 + i * 0.011, y: 0.022 });
    const hy = 0.05 - nod * 0.034, hx = 0.03 + nod * 0.008;
    db.box(0.011, Math.max(0.006, hy - 0.03), 0.011, WHITE, { x: 0.022 + nod * 0.004, y: 0.034 - nod * 0.012 });
    db.box(0.018, 0.012, 0.012, WHITE, { x: hx, y: hy }); db.box(0.006, 0.0125, 0.0125, DARK, { x: hx + 0.006, y: hy });
  } },
  elephant: { w: 0.05, v: 0.06, draw(db, sw, nod) {
    const col = N('rock', 5.4);
    legs4(db, 0.04, 0.026, 0.022, col, sw, 0.14);
    db.box(0.06, 0.034, 0.036, col, { y: 0.02 }); db.box(0.028, 0.028, 0.03, col, { x: 0.04, y: 0.03 });
    for (const s of [-1, 1]) { db.box(0.004, 0.024, 0.02, N('rock', 6.2), { x: 0.034, y: 0.032, z: s * 0.022 }); db.box(0.012, 0.004, 0.004, WHITE, { x: 0.056, y: 0.03, z: s * 0.01 }); }
    db.box(0.008, 0.03, 0.008, col, { x: 0.058, y: 0.004 + nod * 0.006 });
  } },
});

// Animals for each biome, and for each unique area.
export const BIOME_ANIMALS = {
  forest: ['deer', 'fox', 'rabbit', 'deer'], desert: ['camel', 'sandLizard', 'sandFox', 'camel'], tundra: ['bear', 'arcticFox', 'hare', 'penguin'],
  wetland: ['heron', 'duck', 'frog', 'duck', 'frog'], volcanic: ['fireLizard', 'darkGoat', 'fireLizard'], archipelago: ['crab', 'turtle', 'gull', 'crab'],
  meadow: ['sheep', 'cow', 'rabbit', 'sheep'], canyon: ['ibex', 'sandLizard', 'ibex', 'sandFox'], jungle: ['monkey', 'parrot', 'greenParrot', 'monkey'],
  alpine: ['goat', 'hare', 'goat', 'fox'], crystal: ['gecko', 'greyRabbit', 'gecko'], coral: ['crab', 'turtle', 'flamingo', 'gull'],
  beach: ['crab', 'turtle', 'gull', 'crab'], valley: ['sheep', 'deer', 'rabbit', 'cow'], savannah: ['giraffe', 'zebra', 'elephant', 'zebra', 'giraffe'], urban: ['gull', 'duck', 'fox', 'gull'], suburban: ['rabbit', 'duck', 'fox', 'rabbit', 'deer'],
};
export const AREA_ANIMALS = {
  'north-ice-crown': ['bear', 'arcticFox', 'hare', 'bear'], 'south-aurora-basin': ['penguin', 'penguin', 'seal', 'penguin', 'penguin'],
  'volcano-ring': ['fireLizard', 'darkGoat', 'fireLizard'], 'great-canyon': ['ibex', 'sandLizard', 'ibex', 'sandFox'], 'mariana-trench': ['gull', 'gull', 'gull'],
  'floating-islands': ['sheep', 'rabbit', 'sheep', 'rabbit', 'cow'], 'webflow-island': ['hare', 'sheep', 'hare', 'hare', 'sheep'], 'high-peak': ['goat', 'ibex', 'goat', 'hare', 'ibex'],
  'storm-eye': ['gull', 'gull', 'gull', 'gull'], 'tidal-atoll': ['crab', 'turtle', 'gull', 'crab', 'turtle'], 'mirror-lake': ['swan', 'deer', 'swan', 'duck', 'deer'], 'ufo-crash': ['sandLizard', 'sandFox', 'camel', 'sandLizard'],
};

// Place n animals on a tile and make them move. H(x, z) = land height (below 0 = water). free(x, z, r) = no building there.
// yAt(x, z) overrides the height (for areas with built terraces). Returns the list of animals (for tests).
export function addAnimals({ anim, H, tile, list, n = 5, seed = 1, free, occ, yAt, rMin = 0.12, rMax = 0.84 }) {
  const r = rng(seed * 7 + 13), made = [];
  const land = (x, z) => edgeE(tile, x, z) > 0.07 && (yAt ? yAt(x, z) != null : H(x, z) > 0.03) && (!free || free(x, z, 0.035));
  const water = (x, z) => edgeE(tile, x, z) > 0.1 && H(x, z) < -0.03 && (!free || free(x, z, 0.02));
  const at = (A, u) => [A.x + Math.sin(u) * A.w, A.z + Math.sin(u * 1.7 + A.ph) * A.w * 0.7];
  for (let i = 0; i < n; i++) {
    let name = list[i % list.length], sp = SP[name], ok = sp.gait === 'swim' ? water : land, A = null;
    for (let k = 0; k < 60 && !A; k++) {
      const a = r() * TAU, d = rMin + Math.sqrt(r()) * (rMax - rMin), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (k === 40 && sp.gait === 'swim') { name = list.find((q) => SP[q].gait !== 'swim') || name; sp = SP[name]; ok = sp.gait === 'swim' ? water : land; }   // no water here: use a land animal
      if (!ok(x, z)) continue;
      A = { name, sp, x, z, ph: r() * TAU, w: sp.w * (0.7 + r() * 0.6), v: sp.v * (0.8 + r() * 0.4), s: 0.9 + r() * 0.25 };
      // Keep the whole walk on good ground. Make the walk shorter if it is not.
      for (let q = 0; q < 4; q++) { let good = true; for (let j = 0; j < 12 && good; j++) { const [px, pz] = at(A, (j / 12) * TAU * 3); good = ok(px, pz); } if (good) break; A.w = q === 3 ? 0 : A.w * 0.55; }
    }
    if (!A) continue;
    made.push(A); if (occ) occ.push({ x: A.x, z: A.z, r: 0.03 });
  }
  if (made.length) anim((db, fb, t) => {
    for (const A of made) {
      const sp = A.sp, tt = REDUCED ? A.ph * 3 : t, tau = tt * A.v + A.ph, k = Math.floor(tau), f = tau - k;
      const mv = Math.min(1, f / 0.6), u = (k + mv * mv * (3 - 2 * mv)) * 1.15 + A.ph * 7;        // it walks for 60% of the time, then it rests
      const moving = f < 0.6 && A.w > 0 ? Math.sin(Math.PI * mv) : 0, rest = f < 0.6 ? 0 : Math.sin((Math.PI * (f - 0.6)) / 0.4);
      const [px, pz] = at(A, u), dx = Math.cos(u) * A.w, dz = Math.cos(u * 1.7 + A.ph) * 1.7 * A.w * 0.7;
      let ry = A.w > 0 ? Math.atan2(-dz, dx) : A.ph + Math.sin(tt * 0.3 + A.ph) * 0.8, y, rz = 0;
      const sw = Math.sin(tt * 9 + A.ph * 5) * moving;
      if (sp.gait === 'swim') y = Math.sin(tt * 1.8 + A.ph) * 0.0015; else y = (yAt ? yAt(px, pz) ?? yAt(A.x, A.z) ?? 0 : Math.max(0.03, H(px, pz))) - 0.002;
      if (sp.gait === 'hop') y += Math.abs(Math.sin(tt * 7 + A.ph)) * sp.hop * moving;
      else if (sp.gait === 'side') ry += Math.PI / 2;
      else if (sp.gait === 'waddle') rz = sw * 0.22;
      A.cx = px; A.cy = y; A.cz = pz; A.seen = t;   // where it is now (for the highlight line, see discover.js)
      db.push(px, y, pz, ry, A.s, rz, 0); db.lod = 1;
      sp.draw(db, sw, sp.graze || sp.gait === 'swim' || sp.gait === 'waddle' ? rest : rest * 0.4, tt + A.ph * 10, moving);
      db.pop();
    }
    db.lod = 0;
  }, { minLod: 0.1 });
  return made;
}
