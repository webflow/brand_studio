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
const PI = Math.PI;
const _m = new THREE.Matrix4(), _up = new V(), _fw = new V(), _rt = new V(), _p = new V();

export const LEGENDS = [['whiteWhale', 'White whale'], ['kraken', 'Kraken'], ['charybdis', 'Charybdis'], ['titanic', 'Titanic'], ['nessie', 'Nessie'], ['queenAnne', "Queen Anne's Revenge"]];

// The model of each legend of the sea, in its own units (y = up, z = the way it looks). The ocean draws it, and the passport makes a picture of it.
// tt = the time (for the parts that move). ph = a number that is different for each one.
export const DRAW = {
  // Webflow CMS (Webflow lore): a server rack that is partly under the sand, at an angle. Its small lights go on and off. Not a legend of the sea: it is here so that the passport can make its picture in the same way.
  rack(b, tt = 0) {
    const FRAME = C('neutral', 8.8), UNIT = C('neutral', 6.2), UNIT2 = C('neutral', 7.4), SAND = C('sand', 3.6), SAND2 = C('sand', 4.6), LED = ['green', 'blue', 'yellow', 'green'];
    b.box(0.26, 0.03, 0.22, SAND, { y: -0.012 }); b.box(0.15, 0.03, 0.13, SAND2, { x: 0.035, y: 0.012, z: -0.02, ry: 0.5 }); b.box(0.08, 0.02, 0.07, SAND, { x: -0.07, y: 0.014, z: 0.05, ry: 0.3 });   // the sand around it
    for (let k = 0; k < 5; k++) b.box(0.014, 0.01, 0.03, FRAME, { x: -0.06 - k * 0.022, y: 0.012 - k * 0.002, z: 0.07 + Math.sin(k * 1.3) * 0.02, ry: 0.9 + Math.sin(k) * 0.5 });   // a cable that comes out of the sand
    b.push(0.01, -0.13, 0, 0.35, 1, -0.3, 0.36);                                                              // the rack: most of its lower part is under the sand
    b.box(0.12, 0.32, 0.11, FRAME, {}); b.box(0.124, 0.012, 0.114, UNIT2, { y: 0.318 }); b.box(0.004, 0.3, 0.09, [ROW.blue, 5, 0, 0], { x: 0.061, y: 0.01 });   // the cabinet, its top, and a blue line on its side
    for (let i = 0; i < 7; i++) {
      const y = 0.02 + i * 0.042;
      b.box(0.1, 0.032, 0.006, i % 3 === 1 ? UNIT2 : UNIT, { y, z: 0.055 }); b.box(0.03, 0.004, 0.004, FRAME, { x: 0.028, y: y + 0.008, z: 0.059 }); b.box(0.03, 0.004, 0.004, FRAME, { x: 0.028, y: y + 0.018, z: 0.059 });   // one server, with air slots
      for (let j = 0; j < 3; j++) { const on = Math.sin(tt * (2.2 + j * 1.3) + i * 1.9 + j * 2.4) > -0.2; b.box(0.008, 0.008, 0.004, on ? [ROW[LED[(i + j) % 4]], 3, 6, 0] : FRAME, { x: -0.036 + j * 0.014, y: y + 0.012, z: 0.059 }); }
    }
    b.pop();
  },
  // The flexbox game (Webflow lore): a man on the shore with a remote control, and the small boat that he steers. Not legends of the sea: they are here so that the passport can make their picture in the same way.
  // The man looks along +z. His thumbs move on the remote, and its light goes on and off. tt = the time.
  rcMan(b, tt = 0) {
    const SKIN = C('plaster', 2.4), SHIRT = [ROW.blue, 5, 0, 0], PANTS = [ROW.blue, 8.6, 0, 0], SHOE = C('neutral', 9), HAIR = C('earth', 8), BOX = C('neutral', 8.4);
    const lean = Math.sin(tt * 0.9) * 0.05, th = Math.sin(tt * 5) * 0.004;
    for (const sx of [-1, 1]) { b.box(0.04, 0.12, 0.045, PANTS, { x: sx * 0.028 }); b.box(0.044, 0.018, 0.065, SHOE, { x: sx * 0.028, z: 0.01 }); }
    b.push(0, 0.12, 0, 0, 1, lean, 0);
    b.box(0.11, 0.12, 0.06, SHIRT, {}); b.box(0.11, 0.014, 0.062, PANTS, {});                                         // body and belt
    b.box(0.07, 0.07, 0.065, SKIN, { y: 0.125 }); b.box(0.076, 0.026, 0.07, HAIR, { y: 0.19 }); b.box(0.076, 0.04, 0.02, HAIR, { y: 0.15, z: -0.028 });   // head and hair
    for (const sx of [-1, 1]) { b.box(0.03, 0.03, 0.09, SHIRT, { x: sx * 0.065, y: 0.07, z: 0.045, rx: 0.35 }); b.box(0.026, 0.026, 0.03, SKIN, { x: sx * 0.04, y: 0.045 + (sx > 0 ? th : -th), z: 0.1 }); }   // arms, and hands on the remote
    b.box(0.09, 0.022, 0.05, BOX, { y: 0.04, z: 0.1 }); b.box(0.004, 0.07, 0.004, C('neutral', 6), { x: 0.03, y: 0.062, z: 0.085, rx: -0.3 });   // the remote and its antenna
    b.box(0.012, 0.008, 0.012, [ROW[Math.sin(tt * 6) > 0 ? 'red' : 'neutral'], 4, 6, 0], { x: -0.025, y: 0.062, z: 0.105 });
    b.pop();
  },
  // The boat: a small white motor boat with a blue line. It looks along +z. wake = 0 to 1: the foam behind it when it moves.
  rcBoat(b, tt = 0, wake = 0) {
    const HULL = C('plaster', 0.3), BLUE = [ROW.blue, 5, 0, 0], DARK = C('neutral', 8.6);
    b.box(0.09, 0.03, 0.2, HULL, { y: -0.008 }); b.pyr(0.09, 0.07, 0.03, HULL, { y: 0.007, z: 0.1, rx: PI / 2 });           // the hull and its point
    b.box(0.094, 0.008, 0.204, BLUE, { y: 0.006 }); b.box(0.06, 0.03, 0.07, BLUE, { y: 0.022, z: -0.01 }); b.box(0.05, 0.016, 0.004, [ROW.sea, 2.6, 1, 0.1], { y: 0.03, z: 0.026 });   // the line, the cabin, the glass
    b.box(0.03, 0.03, 0.03, DARK, { y: 0.004, z: -0.105 }); b.box(0.003, 0.08, 0.003, DARK, { x: 0.02, y: 0.05, z: -0.03 }); b.box(0.01, 0.008, 0.01, [ROW.red, 4, 6, 0], { x: 0.02, y: 0.13, z: -0.03 });   // the motor, the antenna, its light
    if (wake > 0.05) for (let k = 0; k < 5; k++) { const f = (tt * 1.6 + k / 5) % 1, s = (0.03 + f * 0.05) * wake; for (const sx of [-1, 1]) b.box(s, 0.006, s, C('snow', 0.4), { x: sx * (0.02 + f * 0.06), y: -0.006, z: -0.13 - f * 0.2 }); }
  },
  // The picture for the passport: the man, and the boat next to him.
  flexgame(b, tt = 0) { b.push(-0.09, 0, 0, 0.4, 1); DRAW.rcMan(b, tt); b.pop(); b.push(0.12, 0.03, 0.04, -0.5, 1.1); DRAW.rcBoat(b, tt, 0); b.pop(); },
  // Three wizards with staffs, side by side on a flat rock (Webflow lore: the founders). Not a legend of the sea: it is here so that the passport can make its picture in the same way.
  // They move: each one lifts its staff in turn, the light on each staff gets bright and dim, their robes move a little, and small lights go up from the staffs. tt = the time.
  founders(b, tt = 2.2) {
    const SKIN = C('plaster', 2.2), BEARD = C('snow', 0.4), WOOD = C('earth', 7), ROCK = C('rock', 7.6), ROCK2 = C('rock', 8.6);
    b.cyl(0.2, 0.03, ROCK2, { y: -0.03 }); b.cyl(0.17, 0.02, ROCK, { y: 0 }); b.box(0.09, 0.03, 0.07, ROCK2, { x: -0.15, y: -0.01, z: 0.06, ry: 0.5 });   // the rock
    const W = [[-0.115, 0.015, 0.22, 'blue', 5, 'yellow'], [0, -0.02, 0, 'purple', 6, 'green'], [0.115, 0.015, -0.22, 'darkblue', 5, 'pink']];
    W.forEach(([x, z, ry, hue, tone, orb], i) => {
      const ph = tt * 0.9 - i * 2.094, lift = Math.max(0, Math.sin(ph)), sway = Math.sin(tt * 1.4 + i * 1.7) * 0.04, bob = Math.sin(tt * 1.1 + i) * 0.003;
      const R = [ROW[hue], tone, 0, 0], R2 = [ROW[hue], tone + 2, 0, 0], GL = [ROW[orb], 3, 6, 0];
      b.push(x, 0.02 + bob, z, ry, 1, 0, sway * 0.3);
      b.cone(0.05, 0.13, R, {}); b.cyl(0.052, 0.012, R2, {}); b.cyl(0.03, 0.05, R, { y: 0.085 });                    // the robe: wide at the feet
      b.box(0.062, 0.012, 0.04, R2, { y: 0.106 });                                                                  // a belt
      b.ball(0.027, SKIN, { y: 0.135 }); b.box(0.034, 0.045, 0.014, BEARD, { y: 0.1, z: 0.022, t: 0.5, rx: PI }); b.box(0.008, 0.008, 0.008, SKIN, { y: 0.158, z: 0.026 });   // head, a long white beard, nose
      b.cyl(0.042, 0.006, R2, { y: 0.176 }); b.cone(0.03, 0.085, R, { y: 0.18, rz: 0.12 + sway });                   // the hat: a brim and a point that bends
      b.box(0.014, 0.05, 0.014, R, { x: -0.034, y: 0.085, rz: 0.25 });                                              // the arm that hangs down
      // The arm with the staff. The staff goes up when it is the turn of this wizard.
      b.push(0.04, 0.12, 0.012, 0, 1, -lift * 0.5, -0.25 - lift * 0.35);
      b.box(0.014, 0.05, 0.014, R, { y: -0.012, x: 0.004 });
      b.box(0.008, 0.26, 0.008, WOOD, { x: 0.016, y: -0.1 }); b.box(0.02, 0.012, 0.02, WOOD, { x: 0.016, y: 0.155 });
      b.ball(0.016 + lift * 0.007, GL, { x: 0.016, y: 0.166 });
      for (let k = 0; k < 3; k++) { const f = (tt * 0.55 + k / 3 + i * 0.3) % 1; if (lift > 0.25) b.box(0.007 * (1 - f), 0.007 * (1 - f), 0.007 * (1 - f), GL, { x: 0.016 + Math.sin(f * 9 + k) * 0.016, y: 0.2 + f * 0.11, z: Math.cos(f * 7 + k) * 0.016 }); }
      b.pop();
      b.pop();
    });
  },
  // The white arctic wolf of the North ice crown (not a legend of the sea: it is here so that the passport can make its picture in the same way). Its coat is white with a blue tint.
  // It stands and breathes, and its tail moves. From time to time it lifts its head to howl, and its ears move. tt = the time.
  wolf(b, tt = 3) {
    const W = C('snow', 1.9), W2 = C('snow', 3.2), W3 = C('snow', 4.4), K = [ROW.neutral, 9, 0, 0], EYE = [ROW.blue, 4, 6, 0];   // a little more blue than the ice, so the wolf does not get lost on it
    const cyc = tt % 11, howl = Math.min(1, Math.max(0, (cyc - 6.5) / 0.8)) * Math.min(1, Math.max(0, (10 - cyc) / 0.8)), hk = howl * howl * (3 - 2 * howl);   // 0 = it looks ahead, 1 = it howls
    const br = Math.sin(tt * 1.6) * 0.004, tail = Math.sin(tt * 1.3) * 0.22 + Math.sin(tt * 3.1) * 0.06, ear = Math.max(0, Math.sin(tt * 0.9 + 1) - 0.92) * 6 * Math.sin(tt * 22);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.box(0.036, 0.12, 0.04, W2, { x: sx * 0.04, z: sz * 0.115 }); b.box(0.04, 0.016, 0.05, W3, { x: sx * 0.04, z: sz * 0.115 + 0.006 }); }   // legs and paws
    b.box(0.12, 0.11 + br, 0.3, W, { y: 0.11 }); b.box(0.1, 0.02, 0.26, W2, { y: 0.1 });            // body (it breathes), and its darker under side
    b.box(0.14, 0.15 + br, 0.13, W, { y: 0.1, z: 0.1 }); b.box(0.11, 0.05, 0.1, W2, { y: 0.075, z: 0.12 });   // the thick fur of the chest
    b.push(0, 0.2 + br, 0.13, Math.sin(tt * 0.45) * 0.25 * (1 - hk), 1, -hk * 0.95);                 // the neck and the head turn a little, and go up for a howl
    b.box(0.09, 0.1, 0.09, W, { y: 0.0, z: 0.01 });                                                 // neck
    b.box(0.105, 0.09, 0.1, W, { y: 0.07, z: 0.05 });                                               // head
    for (const sx of [-1, 1]) { b.box(0.03, 0.05, 0.022, W, { x: sx * 0.034, y: 0.155, z: 0.025, rz: -sx * ear * 0.3 }); b.box(0.014, 0.03, 0.006, W3, { x: sx * 0.034, y: 0.16, z: 0.037 }); b.box(0.014, 0.012, 0.006, EYE, { x: sx * 0.028, y: 0.118, z: 0.1 }); b.box(0.03, 0.03, 0.03, W2, { x: sx * 0.05, y: 0.075, z: 0.06 }); }   // ears, eyes, and the fur of the cheeks
    b.box(0.056, 0.03, 0.075, W2, { y: 0.084, z: 0.13 }); b.box(0.026, 0.02, 0.02, K, { y: 0.098, z: 0.162 });   // snout and nose
    b.box(0.044, 0.012, 0.06, W2, { y: 0.07 - hk * 0.014, z: 0.125 }); b.box(0.036, 0.004, 0.05, K, { y: 0.082 - hk * 0.007, z: 0.128 });   // the jaw (it opens for a howl) and the mouth
    b.pop();
    b.push(0, 0.2, -0.15, tail, 1, 0);                                                              // a thick tail that hangs down and moves from side to side
    b.box(0.055, 0.055, 0.1, W, { y: -0.05, z: -0.04 }); b.box(0.05, 0.05, 0.09, W, { y: -0.09, z: -0.11 }); b.box(0.036, 0.036, 0.05, W2, { y: -0.115, z: -0.16 });
    b.pop();
  },
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
const PICS = new Map(), POSE = { wolf: 3, founders: 2.2, flexgame: 0.2, rack: 0.4,  whiteWhale: 0.6, kraken: 4.4, charybdis: 0.4, titanic: 0.25, nessie: 0.9, queenAnne: 0.2 };   // POSE: a time at which the model has a good pose
export function legendPicture(world, id, px = 224) {
  if (PICS.has(id)) return PICS.get(id);
  let url = '';
  try {
    const r = world.renderer, U = world.U, S = px * 2;
    const batch = new PrimBatch(world.spaceMat, { shadow: false });
    const b = new Builder(batch, null, new THREE.Matrix4().makeScale(0.25, 0.25, 0.25).setPosition(0, 1, 0), 255); b.sens = 0;   // 255 = on no tile: the load-in does not move it
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
    const build0 = U.uBuild.value.w; U.uBuild.value.w = 99;   // the load-in has no effect on the picture. (Before, a picture that was made in the load-in was empty, and it stayed empty.)
    world.sunDir.set(0.35, 0.8, 0.5).normalize();
    r.setRenderTarget(rt); r.setClearColor(0xffffff, 0); r.clear(); r.render(scene, cam);
    r.readRenderTargetPixels(rt, 0, 0, S, S, buf);
    r.setRenderTarget(tgt0); r.setClearColor(col0, a0); world.sunDir.copy(sun0); for (const [k, val] of keep) U[k].value = val; U.uBuild.value.w = build0;
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
  // It goes to a tile next to this one if one is free. If not, it goes to the free tile that is nearest.
  app.clearSeaTile = (tile) => {
    const mine = app.practice && app.practice.cfg ? app.practice.tile : null;
    for (const th of things) {
      if (th.tile !== tile) continue;
      const used = new Set(things.map((q) => q.tile)), ok = (t) => t && t.index < 92 && t !== tile && t !== mine && !app.byTile.has(t.index) && !used.has(t);
      const near = tile.neighbors.map((ni) => world.tiles[ni]).filter(ok);
      const to = near.length ? near[Math.floor(th.ph * 7) % near.length] : world.tiles.filter(ok).sort((a, b) => b.center.dot(tile.center) - a.center.dot(tile.center))[0];
      if (to) { th.tile = to; th.rad = to.rin * (0.4 + ((th.ph * 3) % 1) * 0.22); th.pos = null; }
    }
  };

  // The ice around the two poles: on each empty ocean tile next to a pole there are many icebergs, and flat pieces of pack ice between them. There is more ice on the side of the pole.
  // They go away from a tile when a region is made there.
  // One iceberg: most of it is under the water (pale blue, you see it through the sea). At the water it has a blue line. Over the water it is white, with faces in shade.
  const ICE = C('snow', 0.45), ICE2 = C('snow', 1.5), ICE3 = C('snow', 2.5), UNDER = C('sea', 2.3), UNDER2 = C('sea', 3.4);
  const berg = (db, k) => {
    if (k === 0) {   // a tall iceberg with a sharp peak and a second, lower peak
      db.hex(0.105, 0.05, UNDER, { y: -0.058 }); db.hex(0.075, 0.05, UNDER2, { y: -0.105, t: -0.0 });
      db.hex(0.088, 0.012, ICE3, { y: -0.006 }); db.hex(0.08, 0.04, ICE2, { y: 0.006, t: 0.2 });
      db.pyr(0.1, 0.17, 0.08, ICE, { x: -0.014, y: 0.04, ry: 0.5, rz: 0.1, t: 0.86 }); db.pyr(0.06, 0.09, 0.05, ICE2, { x: 0.042, y: 0.036, z: 0.018, ry: -0.3, rz: -0.18, t: 0.8 });
      db.box(0.03, 0.03, 0.028, ICE, { x: -0.05, y: 0.04, z: -0.03, ry: 0.7 });
    } else if (k === 1) {   // a flat-topped iceberg, long and low, with steep sides
      db.box(0.25, 0.06, 0.17, UNDER, { y: -0.066 }); db.box(0.22, 0.012, 0.15, ICE3, { y: -0.006 });
      db.box(0.215, 0.045, 0.145, ICE, { y: 0.006 }); db.box(0.13, 0.02, 0.1, ICE, { x: -0.035, y: 0.051, z: 0.01, ry: 0.12 }); db.box(0.05, 0.014, 0.05, ICE2, { x: 0.07, y: 0.051, z: -0.03, ry: 0.5 });
      db.box(0.012, 0.04, 0.06, ICE2, { x: 0.109, y: 0.008, z: 0.02 });
    } else if (k === 2) {   // an iceberg that leans: one side is high, the other goes down into the sea
      db.hex(0.1, 0.055, UNDER, { y: -0.06 }); db.box(0.17, 0.012, 0.12, ICE3, { y: -0.006, ry: 0.2 });
      db.box(0.16, 0.07, 0.11, ICE, { y: -0.012, ry: 0.2, rz: 0.26 }); db.pyr(0.08, 0.09, 0.075, ICE2, { x: -0.045, y: 0.045, z: 0.01, ry: 0.7, rz: 0.2, t: 0.7 });
      db.box(0.05, 0.02, 0.05, ICE, { x: 0.06, y: 0.0, z: 0.05, ry: 0.4 });
    } else {   // small pieces that broke off
      db.box(0.07, 0.03, 0.06, UNDER, { y: -0.036 }); db.box(0.06, 0.028, 0.05, ICE, { y: -0.004, ry: 0.3 }); db.pyr(0.04, 0.04, 0.035, ICE2, { x: 0.004, y: 0.022, ry: 0.5, t: 0.7 });
      db.box(0.035, 0.016, 0.03, ICE, { x: 0.07, y: -0.004, z: 0.03, ry: 1.0 }); db.box(0.026, 0.012, 0.022, ICE2, { x: -0.05, y: -0.004, z: 0.05, ry: 0.2 });
    }
  };
  // The ice is only on the empty ocean tiles that are next to the North ice crown or the South aurora basin. The pieces are small and there are many: from far away it looks like the edge of a polar ice cap.
  // At the side of the pole the pack ice is almost closed, with large flat plates. It gets open, with small pieces, on the way out.
  const iced = new Set();
  const iceOn = (pole, ni, nB, nF) => {
    const tile = world.tiles[ni]; if (!tile || ni > 91 || app.byTile.has(ni) || iced.has(ni)) return; iced.add(ni);
    const ir = rng(ni * 13 + 5), bergs = [], floes = [];
    // The direction of the pole, in the units of this tile. A place on the side of the pole is more probable.
    const px = pole.tile.center.dot(tile.e1), pz = pole.tile.center.dot(tile.e3), pl = Math.hypot(px, pz) || 1;
    const side = (x, z) => (x * px + z * pz) / pl;   // 1 = at the pole, -1 = far from it
    const spot = (min, list) => { for (let q = 0; q < 60; q++) { const a = ir() * TAU, d = 0.06 + Math.sqrt(ir()) * 0.86, x = Math.cos(a) * d, z = Math.sin(a) * d, k = (side(x, z) + 1) / 2; if (ir() > 0.06 + 0.94 * k * k) continue; if (list.every((g) => Math.hypot(g.x - x, g.z - z) > min)) return [x, z]; } return null; };
    for (let i = 0; i < nB; i++) { const s = i < 3 ? 0.7 + ir() * 0.2 : i < 12 ? 0.42 + ir() * 0.2 : 0.26 + ir() * 0.16, at = spot(0.085 + s * 0.06, bergs); if (at) bergs.push({ x: at[0], z: at[1], s, ry: ir() * TAU, ph: ir() * 6, kind: i < 3 ? i : Math.floor(ir() * 4) }); }
    for (let i = 0; i < nF; i++) { const at = spot(0.05, floes); if (!at) continue; const k = (side(at[0], at[1]) + 1) / 2, w = 0.025 + k * k * 0.075 + ir() * 0.02; floes.push({ x: at[0], z: at[1], w, d: w * (0.6 + ir() * 0.4), ry: ir() * TAU, ph: ir() * 6, n: i % 4 }); }
    world.addAnimator(tile, (db, fb, t) => {
      if (app.practice && app.practice.cfg && app.practice.tile === tile) return;
      const tt = REDUCED ? 0 : t, ice = world.heat(t).ice;   // a click on the sun melts the ice: it gets small and goes down into the sea. It comes back after about 10 seconds.
      if (ice < 0.02) return;
      for (const g of bergs) {
        db.push(g.x + Math.sin(tt * 0.05 + g.ph) * 0.006, Math.sin(tt * 0.7 + g.ph) * 0.002 - (1 - ice) * 0.03 * g.s, g.z + Math.cos(tt * 0.04 + g.ph) * 0.006, g.ry + Math.sin(tt * 0.03 + g.ph) * 0.1, g.s * (0.25 + 0.75 * ice) * Math.min(1, ice * 4), Math.sin(tt * 0.5 + g.ph) * 0.022);
        berg(db, g.kind);
        db.pop();
      }
      // Pack ice: thin flat pieces, some with a second piece on top. They move up and down a little with the sea.
      for (const f of floes) {
        const y = -0.004 + Math.sin(tt * 0.9 + f.ph) * 0.0015;
        const fk = Math.max(0, Math.min(1, ice * 1.6 - ((f.ph * 0.1) % 0.6)));   // the thin pieces melt first, one after the other
        if (fk <= 0) continue;
        db.box(f.w * fk, 0.006, f.d * fk, f.n === 1 ? ICE2 : ICE, { x: f.x, y, z: f.z, ry: f.ry });
        if (fk > 0.9 && f.n === 0 && f.w > 0.05) db.box(f.w * 0.5, 0.005, f.d * 0.55, ICE, { x: f.x + 0.006, y: y + 0.006, z: f.z, ry: f.ry + 0.5, lod: 1 });
      }
    }, { minLod: 0 });
  };
  const poles = app.areas.filter((q) => q.def.ring === 'north' || q.def.ring === 'south');
  for (const pole of poles) for (const ni of pole.tile.neighbors) iceOn(pole, ni, 30, 80);

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
