// The 12 unique areas (pentagon tiles). Hand-designed recipes. Not claimable. Max 3 hues each.
import * as THREE from 'three';
import { CONFIG, REDUCED, DAY_GLSL } from './config.js';
import { Builder } from './prims.js';
import { rimmed, edgeE, voxelH, buildVoxelTerrain, VOX } from './terrain.js';
import { roundTile } from './goldberg.js';
import { ROW } from './palette.js';
import { HEROES, puffs, lavaBed, lavaFlow } from './heroes.js';
import { rng, fbm, clamp, lerp, smooth, TAU } from './util.js';
import { addDetails, polyDist } from './details.js';
import { addStormEye } from './sky.js';
import { addAnimals, AREA_ANIMALS } from './animals.js';
import { OCEAN_R, SEABED_R } from './world.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

// A real mirror for the lake: the scene is drawn a second time from under the water plane, and the lake shows that picture.
// It is only on when the viewer is near (and not on Low quality). From far away the lake is a plain calm surface.
function addMirror(world, tile, cz, rad) {
  const grp = new THREE.Group(); grp.matrixAutoUpdate = false; grp.matrix.copy(tile.matrix);
  const geo = new THREE.CircleGeometry(rad, 48);
  const vs = 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const fs = (refl) => `uniform sampler2D tDiffuse; uniform float uTime; uniform vec3 uSunDir; varying vec4 vUv; varying vec3 vW;
    void main(){ vec3 up = normalize(vW), Vd = normalize(cameraPosition - vW); float F = pow(1.0 - max(dot(Vd, up), 0.0), 3.0), day = smoothstep(-0.15, 0.25, dot(up, uSunDir) + ${DAY_GLSL});
      vec3 tint = mix(vec3(0.03, 0.07, 0.16), vec3(0.2, 0.46, 0.56), day);
      ${refl ? 'vec2 uv = vUv.xy / vUv.w + vec2(sin(vW.x * 700.0 + vW.z * 300.0 + uTime * 1.2), cos(vW.z * 650.0 - uTime)) * 0.0012; vec3 col = mix(tint, texture2D(tDiffuse, uv).rgb, 0.66 + 0.3 * F);' : 'vec3 col = mix(tint, mix(vec3(0.1, 0.14, 0.26), vec3(0.93, 0.96, 0.98), day), 0.5 + 0.3 * F);'}
      gl_FragColor = vec4(col, 1.0); }`;
  const uni = () => ({ color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3() } });
  const mirror = new Reflector(geo, { textureWidth: 768, textureHeight: 768, clipBias: 0.0004, shader: { name: 'LakeMirror', uniforms: uni(), vertexShader: vs, fragmentShader: fs(true) } });
  const flat = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: uni(), vertexShader: vs, fragmentShader: fs(false) }));
  for (const m of [mirror, flat]) { m.material.uniforms.uTime = world.U.uTime; m.material.uniforms.uSunDir = world.U.uSunDir; m.rotation.x = -PI / 2; m.position.set(0, 0.003, cz); m.frustumCulled = false; grp.add(m); }
  const draw = mirror.onBeforeRender;
  mirror.onBeforeRender = function (r, s, c) { if (world.scene.overrideMaterial) return; const rv = world.rings.visible; world.rings.visible = false; draw.call(this, r, s, c); world.rings.visible = rv; };
  world.scene.add(grp);
  world.tickers.push((t, lod) => { const on = world.tier !== 'low' && lod > 0.2; mirror.visible = on; flat.visible = !on; });
  return mirror;
}

const PI = Math.PI;
const C = (hue, tone, kind = 0, prm = 0) => [ROW[hue], tone, kind, prm];
const n = (x, z, f, seed) => fbm(x * f + 3.1, z * f + 9.7, seed, 3);
const ring = (k, rad, fn, a0 = 0) => { for (let i = 0; i < k; i++) { const a = a0 + (i / k) * TAU; fn(Math.cos(a) * rad, Math.sin(a) * rad, a, i); } };
const stepped = (p, s) => { const q = p / s, f = Math.floor(q); return (f + smooth(0.7, 1, q - f)) * s; };
const win = (hue, tone, r) => [ROW[hue], tone, 1, r];

function bird(db, x, y, z, a, flap, col, s = 1) {
  db.push(x, y, z, -a, s);
  db.box(0.04, 0.005, 0.016, col, { x: 0.018, rz: flap }); db.box(0.04, 0.005, 0.016, col, { x: -0.018, rz: -flap });
  db.pop();
}

// The Webflow mark, from the brand SVG (1080 x 674). The two curves are sampled into short lines.
const WF_MARK = (() => {
  const P = [[1080, 0], [735.386, 673.684], [411.695, 673.684], [555.916, 394.481], [549.445, 394.481]];
  const cb = (x1, y1, x2, y2, x, y) => { const [x0, y0] = P[P.length - 1]; for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; P.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y]); } };
  cb(430.464, 548.934, 252.942, 650.61, 0, 673.684); P.push([0, 398.344]);
  cb(0, 398.344, 161.813, 388.787, 256.938, 288.776);
  P.push([0, 288.776], [0, 0], [288.771, 0], [288.771, 237.515], [295.252, 237.489], [413.254, 0], [631.644, 0], [631.644, 236.009], [638.126, 235.999], [760.555, 0]);
  return P;
})();
// The mark as rows of boxes, nx cells wide: runs = [center x, width, row y]. All values are in units of the width of the mark. y is 0 at the top.
function markRuns(nx) {
  const ny = Math.round((nx * 674) / 1080), cw = 1 / nx, runs = [];
  const inside = (x, y) => { let c = false; for (let i = 0, j = WF_MARK.length - 1; i < WF_MARK.length; j = i++) { const [xi, yi] = WF_MARK[i], [xj, yj] = WF_MARK[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  for (let j = 0; j < ny; j++) { let s0 = -1; for (let i = 0; i <= nx; i++) { const on = i < nx && inside(((i + 0.5) * 1080) / nx, ((j + 0.5) * 674) / ny); if (on && s0 < 0) s0 = i; else if (!on && s0 >= 0) { runs.push([((s0 + i) / 2) * cw, (i - s0) * cw, (j + 0.5) * cw]); s0 = -1; } } }
  return { runs, cell: cw, h: ny * cw };
}

// Every unique area changes with the seasons. Small pieces sit on flat land: blossoms that show only in spring (kind 4)
// and snow piles that show only in winter (kind 7). Inland water gets ice floes in winter. The result says what was made.
function seasonProps(b, tile, H, o = {}) {
  const r = rng(tile.index * 7 + 5), fl = o.flowers || ['pink', 'yellow', 'purple'], out = { flowers: 0, snow: 0, floes: 0 };
  const keepSens = b.sens; b.sens = 0;
  const flat = (x, z, y) => Math.max(Math.abs(H(x + 0.035, z) - y), Math.abs(H(x - 0.035, z) - y), Math.abs(H(x, z + 0.035) - y), Math.abs(H(x, z - 0.035) - y)) < 0.012;
  for (let i = 0, k = 0; i < 1400 && k < (o.n ?? 34); i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.97, x = Math.cos(a) * d, z = Math.sin(a) * d, q = r(), q2 = r();
    if (edgeE(tile, x, z) < 0.1) continue;
    const y = H(x, z);
    if (y < 0.02 || !flat(x, z, y) || (o.keep && !o.keep(x, z, y)) || (o.blocks && o.blocks.some((pts) => polyDist(pts, x, z) < 0.025))) continue;   // not inside an object of the area
    k++;
    if (k % 2) {
      const w = 0.035 + q2 * 0.03; b.box(w * 2, w * 0.5, w * 1.6, C('plaster', 0.3, 7), { x, y, z, ry: q2 * 9 }); b.box(w * 1.1, w * 0.45, w * 0.9, C('plaster', 0.1, 7), { x, y: y + w * 0.5, z, ry: q2 * 9 }); out.snow++;
    } else {
      for (let j = 0; j < 5; j++) { const fx = x + (r() - 0.5) * 0.08, fz = z + (r() - 0.5) * 0.08, fy = H(fx, fz); if (Math.abs(fy - y) > 0.012) continue; b.box(0.005, 0.02, 0.005, C('grass', 6, 4), { x: fx, y: fy, z: fz }); b.box(0.018, 0.013, 0.018, C(fl[(k + j) % fl.length], fl[(k + j) % fl.length] === 'neutral' ? 0.3 : 4, 4), { x: fx, y: fy + 0.02, z: fz }); }
      out.flowers++;
    }
  }
  // Ice floes on the water inside the tile, in winter.
  if (o.floes !== false) for (let i = 0; i < 500 && out.floes < 8; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d, q2 = r();
    if (edgeE(tile, x, z) < 0.14 || H(x, z) > -0.04 || H(x + 0.06, z) > -0.04 || H(x - 0.06, z) > -0.04 || H(x, z + 0.06) > -0.04 || H(x, z - 0.06) > -0.04 || (o.keep && !o.keep(x, z, 0))) continue;
    const w = 0.05 + q2 * 0.05; b.box(w, 0.008, w * 0.7, C('plaster', 0.3, 7), { x, y: -0.002, z, ry: q2 * 9 }); out.floes++;
  }
  b.sens = keepSens;
  return out;
}
// The plan view of an area for the construction diagram: the land, and the footprint of each larger object. Units: 100 = the tile inradius.
function makePlan(rec, H, tile, marks) {
  const f = (v) => Math.round(v * 100);
  let land = '';
  if (H) for (let j = -24; j < 24; j++) { let s0 = null; for (let i = -24; i <= 24; i++) { const on = i < 24 && edgeE(tile, (i + 0.5) * 0.05, (j + 0.5) * 0.05) > 0 && H((i + 0.5) * 0.05, (j + 0.5) * 0.05) > 0.005; if (on && s0 == null) s0 = i; else if (!on && s0 != null) { land += `M${s0 * 5} ${j * 5}h${(i - s0) * 5}v5h${(s0 - i) * 5}z`; s0 = null; } } }
  const big = rec.filter((q) => q.size >= 0.04).sort((p, q) => q.size - p.size).slice(0, 200);
  const path = (list) => list.map((q) => 'M' + q.pts.map(([x, z]) => f(x) + ' ' + f(z)).join('L') + 'z').join('');
  return { land, solid: path(big.filter((q) => !q.leaf)), soft: path(big.filter((q) => q.leaf)), marks: marks || [] };
}
const NOBATCH = { add() {} }, ENV0 = { t: 0, dt: 0, dayPhase: 0.4, seasonW: [0, 1, 0, 0], lod: 1, extras: true, low: false, tide: 0 };

export const AREAS = [
  {
    id: 'north-ice-crown', name: 'North ice crown', ring: 'north', hues: ['snow', 'amethyst'], extra: 'white',
    details: ['sleigh', 'snowman'],   // hidden details that only this area has
    look: 'Stacked concentric ice terraces, lighter toward the top. Tall white spires. A ring of low arches.',
    motion: 'Aurora ribbons in the sky.', season: 'The ice stays all year.', seasonal: { flowers: ['purple', 'pink'] }, az: 1.2,
    animals: { rMin: 0.55, rMax: 0.8, yAt: (x, z) => { const d = Math.hypot(x, z); return d > 0.8 ? null : d > 0.68 ? 0.11 : d > 0.53 && d < 0.64 ? 0.18 : null; } },   // they stand on the two lowest ice terraces
    build({ b, terrain }) {
      terrain({ h: () => 0.05, top: { row: ROW.snow, tone: 1.8, step: 0 }, side: C('snow', 4.4), sens: 0 });
      [0.82, 0.66, 0.5, 0.36, 0.24].forEach((R, i) => b.cyl(R, 0.07, C('snow', 3.4 - i * 0.8), { y: 0.04 + i * 0.07 }));
      b.hex(0.055, 0.52, C('snow', 0.2), { y: 0.39, t: 0.92 });
      ring(5, 0.14, (x, z, a, i) => b.hex(0.036, 0.26 + (i % 2) * 0.1, C('snow', 0.2), { x, z, y: 0.39, t: 0.9 }));
      ring(5, 0.43, (x, z) => b.hex(0.03, 0.2, C('snow', 0.5), { x, z, y: 0.25, t: 0.9 }), 0.6);
      ring(10, 0.74, (x, z, a, i) => { if (i % 2) b.hex(0.024, 0.13, C('amethyst', 3, 2, i / 10), { x, z, y: 0.11, t: 0.85 }); });
      ring(10, 0.93, (x, z, a) => b.arch(0.22, 0.14, 0.05, C('amethyst', 2.6), { x, z, y: 0.045, ry: -a + PI / 2 }));
    },
  },
  {
    id: 'south-aurora-basin', name: 'South aurora basin', ring: 'south', hues: ['snow', 'sea', 'green'],
    details: ['igloo', 'icehole'],   // hidden details that only this area has
    look: 'A deep bowl of nested arcs, like a striped stadium.',
    motion: 'Aurora ribbons, mirrored with the north. Bands glow at night.', season: 'The ice stays all year.', seasonal: { flowers: ['pink', 'yellow'] }, az: 1.9,
    build({ b, terrain }) {
      const H = terrain({ h: (x, z) => stepped(lerp(0.03, 0.4, smooth(0.12, 0.82, Math.hypot(x, z))), 0.055), top: { row: ROW.snow, tone: 5.6, step: 0.5, altRow: ROW.sea, altEvery: 2, altTone: 0.5, bandH: 0.055 }, side: C('snow', 6.6), sens: 0 });
      b.cyl(0.12, 0.012, C('green', 3, 2, 0.1), { y: 0.03 });
      [0.26, 0.4, 0.54, 0.68].forEach((R, i) => b.ring(R, R - 0.022, 0.012, C('green', 2.4, 2, i * 0.16), { y: H(R - 0.01, 0) + 0.004 }));
      ring(5, 0.86, (x, z, a) => [[0.26, 0.2, 'snow', 2], [0.156, 0.16, 'amethyst', 4], [0.094, 0.128, 'snow', 0.4]].forEach(([w, h, hue, t], i) => b.arch(w, h, 0.07 - i * 0.02, C(hue, t), { x, z, y: H(x, z) - 0.01, ry: -a + PI / 2 })), 0.3);
    },
  },
  {
    id: 'volcano-ring', name: 'Volcano ring', ring: 'upper', hues: ['rock', 'orange', 'yellow'],
    details: ['dragon', 'campfire'],   // hidden details that only this area has
    marks: [['Crater', 0, 0], ['Ring of fire', 0.72, 0]],
    look: 'One very large volcano that stands in the sea: its lower part is under the water. It has a wide open crater, and you can look in and see its lake of magma. A ring of fire glows on the sea floor around it, with five small cones that come out of the water at the edge.',
    motion: 'From time to time the volcano erupts: a fountain of magma, glowing rocks that fly out, and a tall column of ash. Magma runs down to the sea, and steam rises where it meets the water. Select the volcano to make it erupt.', season: '', seasonal: { flowers: ['yellow', 'orange'], floes: false, keep: (x, z) => Math.hypot(x, z) > 0.8 }, az: 1.3, tilt: 0.6, lift: 0.4, dist: 1.25,
    lights: [[0, 0.9, 0, 1.3, [1, 0.55, 0.28]], [0.7, 0.12, 0, 0.5, [1, 0.5, 0.2]], [-0.35, 0.12, 0.6, 0.5, [1, 0.5, 0.2]], [-0.35, 0.12, -0.6, 0.5, [1, 0.5, 0.2]]],
    build({ b, terrain, tile, anim, area }) {
      const sat = []; for (let k = 0; k < 5; k++) { const a = tile.rot0 + k * 1.2566; sat.push([Math.cos(a) * 0.87, Math.sin(a) * 0.87]); }
      const MOAT = 0.72, RIM = 0.36, SHORE = 0.64, SUB = 0.22;   // the ring of fire on the sea floor, the rim of the wide crater, where the black beach ends, and how much of the cone is under the sea
      const H = terrain({
        h: (x, z) => {
          const d = Math.hypot(x, z); let h = 0.05 + Math.pow(Math.max(0, 1 - d / 0.66), 1.1) * 2.0 - SUB;
          if (d < RIM) h = lerp(0.42, h, smooth(RIM * 0.62, RIM, d));   // the crater: wide and deep, with a flat floor that holds a lake of magma
          h = d < SHORE ? Math.max(h, 0.04) : lerp(-0.02, -0.17, smooth(SHORE, 0.8, d));   // a narrow black beach, then the sea: the cone goes on down under the water
          for (const [sx, sz] of sat) { const dk = Math.hypot(x - sx, z - sz); let hk = -0.2 + Math.max(0, 1 - dk / 0.17) * 0.5; if (dk < 0.04) hk -= (1 - dk / 0.04) * 0.06; h = Math.max(h, hk); }   // five small cones come out of the water
          return h;
        }, top: { row: ROW.rock, tone: 8.2, step: 0.16, altRow: ROW.earth, altEvery: 3, altTone: -1, bandH: 0.05 }, side: C('rock', 8.8), water: C('sea', 5.2), sens: 0,
        waterK: 0.55, floorRow: ROW.sea, floorTone: 8.2,   // clear, deep blue water, so the ring of fire on the sea floor shows
      });
      const FL = (x, z) => Math.round(Math.max(H(x, z) * 1.6, -0.3) / 0.031) * 0.031;   // the height of the sea floor (see buildVoxelTerrain)
      b.sens = 0;
      const y0 = H(0, 0) + 0.03, HOT = [ROW.yellow, 2.8, 2, 0], WARM2 = [ROW.orange, 5, 2, 0], DIM = [ROW.orange, 6.6, 2, 0.4];
      // The lake of magma on the floor of the crater: one glowing block on each block of land.
      const LAKE = []; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const x = (i + 0.5) * VOX, z = (j + 0.5) * VOX; if (Math.hypot(x, z) < RIM * 0.66) LAKE.push([x, z]); }
      for (const [x, z] of LAKE) b.box(VOX, 0.012, VOX, DIM, { x, y: H(x, z) - 0.002, z });
      const flows = [0, 1, 2, 3, 4].map((k) => tile.rot0 + 0.628 + k * 1.2566);
      for (const a of flows) lavaBed(b, a, RIM + 0.02, SHORE, H, 0.05);
      // The ring of fire: a ring of magma on the sea floor around the volcano. It glows through the water. The dark crust stays; bright magma moves around it.
      const NR = 44, ringAt = (i) => { const a = (i / NR) * TAU; return [Math.cos(a) * MOAT, Math.sin(a) * MOAT, a]; };
      for (let i = 0; i < NR; i++) { const [x, z, a] = ringAt(i); if (H(x, z) > 0) continue; b.box(0.092, 0.012, 0.1, DIM, { x, y: FL(x, z), z, ry: -a }); if (i % 4 === 0) b.box(0.04, 0.008, 0.05, C('rock', 8.6), { x: x * 1.02, y: FL(x, z) + 0.01, z: z * 1.02, ry: i }); }
      sat.forEach(([x, z], k) => b.cyl(0.03, 0.012, C('orange', 5, 2, k * 0.2), { x, z, y: H(x, z) + 0.008 }));
      // Obsidian spires at the outer edge.
      for (let i = 0; i < 9; i++) { const a = tile.rot0 + 0.63 + i * 0.698, d = 0.88 + (i % 3) * 0.04, x = Math.cos(a) * d, z = Math.sin(a) * d; if (edgeE(tile, x, z) < 0.09 || sat.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 0.16)) continue; b.box(0.035, 0.08 + (i % 3) * 0.05, 0.035, C('neutral', 9.2), { x, y: H(x, z) - 0.006, z, t: 0.7, ry: i }); }
      // The eruptions. One comes by itself 48 seconds after the last one. A click on the volcano starts one, and the wait starts again.
      const PERIOD = 48, LEN = 8, st = { t0: 30 - PERIOD, now: 0, flow: 0, last: 0 };   // t0 = when the last eruption began. The first one comes 30 seconds after the start.
      const erupt = () => { if (st.now - st.t0 < LEN + 4) return false; st.t0 = st.now; return true; };
      area.taps = [{ key: 'volcano', label: 'Volcano', sub: () => (st.now - st.t0 < LEN + 4 ? 'It erupts now' : 'Select it to make it erupt'), at: [0, 0.55, 0], R: 0.42, a0: -0.25, a1: 0.5, tap: erupt }];
      anim((db, fb, t) => {
        st.now = t;
        if (t - st.t0 > PERIOD) st.t0 = t;                                                           // an eruption by itself, 48 seconds after the last one began (a click starts the wait again)
        const since = t - st.t0;
        const se = REDUCED ? -1 : since < LEN + 4 ? since : -1;                                      // seconds since the eruption began, or -1
        const pre = REDUCED || se >= 0 ? 0 : smooth(PERIOD - 6, PERIOD, since);                       // before it: more smoke, a brighter lake
        const k = se < 0 ? 0 : smooth(0, 0.7, se) * (1 - smooth(LEN - 1.5, LEN, se));                 // how strong the eruption is now
        st.flow += Math.min(0.1, Math.max(0, t - st.last)) * (1 + k * 3); st.last = t;               // the magma goes faster in an eruption
        flows.forEach((a, i) => lavaFlow(db, st.flow, a, RIM, SHORE, H, i * 0.21, 0.046 + k * 0.02));
        // Steam where each stream of magma meets the sea.
        if (CONFIG.dynamics.smoke && !REDUCED) flows.forEach((a, i) => puffs(db, t + i * 1.7, Math.cos(a) * (SHORE + 0.03), 0.01, Math.sin(a) * (SHORE + 0.03), 3, 0.24 + k * 0.1, C('plaster', 0.4), 0.034, 0.11));
        // The lake moves: bright patches come and go. Before and in an eruption all of it is bright, and it rises.
        LAKE.forEach(([x, z], i) => { const g = Math.sin(t * 0.9 + i * 2.1) + Math.sin(t * 0.37 + i * 0.7); if (g > 0.5 - pre * 1.5 - k * 3) db.box(VOX * 0.94, 0.008 + k * 0.05, VOX * 0.94, g > 1.3 || k > 0.3 ? HOT : WARM2, { x, y: H(x, z) + 0.008, z }); });
        for (let i = 0; i < 14; i++) { const q = (((st.flow * 0.5 + i * (NR / 14)) % NR) + NR) % NR, [x, z, a] = ringAt(q); if (H(x, z) > 0) continue; db.box(0.07, 0.016, 0.07 + k * 0.03, i % 2 ? HOT : WARM2, { x, y: FL(x, z) + 0.004, z, ry: -a }); }
        if (CONFIG.dynamics.smoke) puffs(db, t, 0, y0 + 0.3, 0, 6, 0.75 + pre * 0.3, C('neutral', 1.6 + pre * 4), 0.085 + pre * 0.04, 0.085 + pre * 0.05);
        if (k > 0.01) {
          // The fountain of magma, and glowing rocks that fly out and fall on the slopes.
          const f = 0.85 + 0.3 * Math.sin(t * 31);
          db.pyr(0.3, 1.15 * k * f, 0.3, WARM2, { y: y0 }); db.pyr(0.18, 0.85 * k * f, 0.18, HOT, { y: y0 });
          for (let i = 0; i < 30; i++) {
            const P = 1.5 + (i % 5) * 0.13, ta = (se + i * 0.37) % P, a = i * 2.4, vr = 0.2 + (i % 4) * 0.09, vy = 1.4 + (i % 3) * 0.3;
            const x = Math.cos(a) * vr * ta, z = Math.sin(a) * vr * ta, y = y0 + vy * ta - 0.8 * ta * ta;
            if (y < H(x, z)) continue;
            const s = (0.044 - (i % 3) * 0.008) * k;
            db.box(s, s, s, ta < P * 0.45 ? HOT : WARM2, { x, y, z, ry: ta * 5, rz: ta * 3 }); db.box(s * 0.6, s * 0.6, s * 0.6, WARM2, { x: x * 0.94, y: y - (vy - 1.6 * ta) * 0.03, z: z * 0.94 });
          }
          sat.forEach(([sx, sz], j) => { for (let i = 0; i < 4; i++) { const ta = (se * 1.3 + i * 0.3 + j * 0.2) % 1.1, a = i * 1.6 + j; db.box(0.016 * k, 0.016 * k, 0.016 * k, HOT, { x: sx + Math.cos(a) * 0.1 * ta, y: H(sx, sz) + 0.02 + 0.5 * ta - 0.5 * ta * ta, z: sz + Math.sin(a) * 0.1 * ta }); } });
        }
        if (se >= 0) {
          // The column of ash: large dark clouds that go up high and move with the wind. It stays some time after the eruption.
          const ka = smooth(0, 1.2, se) * (1 - smooth(LEN, LEN + 4, se));
          for (let i = 0; i < 14; i++) { const f = (se * 0.2 + i / 14) % 1, s = (0.13 + f * 0.22) * ka; db.ball(s, C('neutral', 7.6 - f * 2.4), { x: Math.sin(i * 2.3) * 0.09 + f * f * 0.34, y: y0 + 0.45 + f * 1.7, z: Math.cos(i * 1.9) * 0.05 + f * f * 0.1 }); }
        }
      });   // no distance limit: an eruption shows from far away too
    },
  },
  {
    id: 'great-canyon', name: 'Great canyon', ring: 'upper', hues: ['earth', 'sand', 'sea'],
    details: ['chest', 'cactus'],   // hidden details that only this area has
    look: 'Layered strata in bold repeating bands, split by one long cut.',
    motion: 'A thin river runs from the cut. Small hawks circle.', season: '', az: 0.5,
    build({ b, terrain, tile, anim, area }) {
      const ang = tile.rot0 + 0.3, ca = Math.cos(ang), sa = Math.sin(ang);
      area.az = ang + PI / 2 + 0.3;
      const cutD = (x, z) => Math.abs(x * ca + z * sa + Math.sin((-x * sa + z * ca) * 2.6) * 0.1);
      const H = terrain({ h: (x, z) => { let h = stepped(0.36 + n(x, z, 1.6, 4) * 0.1, 0.048); const d = cutD(x, z); if (d < 0.22) h = lerp(-0.07, h, smooth(0.04, 0.22, d)); return h; },
        top: { row: ROW.earth, tone: 6.2, step: 0.3, altRow: ROW.sand, altEvery: 2, altTone: -1, bandH: 0.048 }, side: C('earth', 7.8), water: C('sea', 5), sens: 0.2 });
      b.sens = 0.2;
      const r = rng(41);
      for (let i = 0; i < 7; i++) {
        const al = (i - 3) * 0.26, sd = (i % 2 ? 1 : -1) * r.range(0.33, 0.5), x = -sa * al + ca * sd, z = ca * al + sa * sd;
        if (edgeE(tile, x, z) < 0.2) continue;
        let y = H(x, z); const R = r.range(0.05, 0.09);
        for (let k = 0; k < 3; k++) { const h = r.range(0.04, 0.08); b.hex(R * (1 - k * 0.2), h, C(k % 2 ? 'sand' : 'earth', k % 2 ? 3.6 : 5.6), { x, z, y: y - 0.01, ry: i }); y += h; }
      }
      const px = ca * 0.24, pz = sa * 0.24, y = H(px, pz);
      b.box(0.5, 0.008, 0.03, C('neutral', 8.5), { y: y - 0.01, ry: -ang });
      for (const s of [-1, 1]) for (const q of [-1, 1]) b.cyl(0.006, 0.05, C('neutral', 8.5), { x: px * s - sa * 0.02 * q, z: pz * s + ca * 0.02 * q, y: y - 0.01 });
      anim((db, fb, t) => { for (let i = 0; i < 3; i++) { const a = t * (0.3 + i * 0.07) + i * 2; bird(db, Math.cos(a) * (0.3 + i * 0.12), 0.62 + i * 0.06, Math.sin(a) * (0.3 + i * 0.12), a, Math.sin(t * 5 + i) * 0.4, C('neutral', 8)); } });
    },
  },
  {
    id: 'mariana-trench', name: 'Mariana Trench', ring: 'upper', hues: ['sea', 'sand', 'yellow'],
    details: ['buoy', 'diver'],   // hidden details that only this area has
    marks: [['Trench', 0.1, -0.3], ['Research ship', -0.02, 0.1], ['Whale bones', -0.5, -0.32], ['Pirate ship', -0.56, 0.4]],
    look: 'Open sea with clear water. A long, wide, curved trench cuts deep into the sea bed, in dark steps. On its floor are black vents, tube worms, and animals that make their own light. A research ship sends a small yellow submarine down. The wreck of a pirate ship and the bones of a whale lie on the sea bed.',
    motion: 'The submarine goes down and comes up. The vents smoke. Jellyfish and an anglerfish glow in the dark water.', season: '', seasonal: { n: 10 }, az: 1.35, tilt: 0.78,
    lights: [[0, -0.3, 0.1, 0.8, [0.4, 0.9, 1.0]]],
    build({ b, terrain, tile, anim, world }) {
      // The trench is a long arc, like the real one. arc(f) = a point on its middle line. dist(x, z) = how far a point is from that line.
      const CX = 1.15, CZ = 0.1, CR = 1.2, arc = (f) => [CX - CR * Math.cos(f), CZ + CR * Math.sin(f)], dist = (x, z) => Math.abs(Math.hypot(x - CX, z - CZ) - CR);
      // The floor of the tile is as deep as the bed of the open sea around it, so the tile is not a raised block: only the trench shows.
      // The bed of the open sea is round and the tile is flat, so the floor of the tile goes down a little to its edge, just over that bed. The open sea bed has an opening here (uHole).
      const bedAt = (x, z) => -(OCEAN_R - Math.sqrt(Math.max(0.01, SEABED_R * SEABED_R - (x * x + z * z) * tile.rin * tile.rin))) / tile.rin + 0.02;
      const SH = bedAt(0, 0), DP = SH - 0.3;   // the sea bed in the middle, and the floor of the trench
      world.U.uHole.value.set(tile.center.x, tile.center.y, tile.center.z, 0).normalize().setW(Math.cos(Math.atan((0.9 * tile.rin) / SEABED_R)));
      const H = terrain({
        h: (x, z) => (lerp(DP, bedAt(x, z), smooth(0.1, 0.44, dist(x, z))) + (n(x, z, 2.4, 6) - 0.5) * 0.016) / 1.6,
        noRim: true, top: { row: ROW.sand, tone: 2.6, step: 0 }, side: C('sand', 5), water: C('sea', 3.2), sens: 0,
        deep: DP, waterK: 0.3, floorAt: (fl, x, z) => { const k = 1 - smooth(0.1, 0.44, dist(x, z)); return k < 0.1 ? [ROW.sand, 3.6] : [ROW.sea, 4.6 + k * 4.6]; },   // sand on the sea bed, like the open sea around it; the steps of the trench go from blue to very dark
      });
      b.sens = 0;
      const fy = (x, z) => Math.max(DP, Math.round((H(x, z) * 1.6) / 0.031) * 0.031);   // the height of the sea bed at a point
      const U = (row, tone) => [ROW[row], tone, 6, 0];   // a color with its own light: it is easy to see under water, by day and by night
      const WH = U('neutral', 0.4);
      // Three black vents on the floor of the trench, with tube worms around them.
      const vents = [-0.34, 0.06, 0.42].map((f) => arc(f));
      vents.forEach(([x, z], k) => {
        const y = fy(x, z);
        b.box(0.07, 0.1 + k * 0.03, 0.07, C('neutral', 8.8), { x, y, z, t: 0.5 }); b.box(0.04, 0.07, 0.04, C('neutral', 9.2), { x: x + 0.05, y, z: z + 0.02, t: 0.5 }); b.box(0.03, 0.01, 0.03, U('orange', 5), { x, y: y + 0.1 + k * 0.03, z });
        for (let i = 0; i < 7; i++) { const a = i * 0.9 + k, d = 0.07 + (i % 3) * 0.02, wx = x + Math.cos(a) * d, wz = z + Math.sin(a) * d, hh = 0.04 + (i % 3) * 0.02; b.box(0.012, hh, 0.012, WH, { x: wx, y, z: wz }); b.box(0.014, 0.012, 0.014, U('red', 5), { x: wx, y: y + hh, z: wz }); }
      });
      // A flag at the deepest point.
      { const [x, z] = arc(0.22), y = fy(x, z); b.box(0.006, 0.09, 0.006, WH, { x, y, z }); b.box(0.04, 0.026, 0.006, U('yellow', 4), { x: x + 0.022, y: y + 0.064, z }); }
      // On the shelf: the bones of a whale, a wreck, kelp, and corals.
      { const x = -0.5, z = -0.32, y = fy(x, z); b.push(x, y, z, 0.5); b.box(0.34, 0.012, 0.016, WH, { y: 0.03 }); for (let i = 0; i < 7; i++) b.arch(0.1 - i * 0.008, 0.07 - i * 0.006, 0.012, WH, { x: -0.1 + i * 0.04, ry: PI / 2 }); b.box(0.08, 0.04, 0.05, WH, { x: -0.19, y: 0.004 }); b.box(0.05, 0.012, 0.03, WH, { x: -0.25, y: 0.004 }); b.box(0.07, 0.006, 0.05, WH, { x: 0.2, y: 0.02, rz: 0.3 }); b.pop(); }
      // The wreck of a pirate ship: it lies on its side, with a broken mast, a black sail with a skull, cannons, and a chest of gold.
      { const x = -0.56, z = 0.4, y = fy(x, z), WOOD = U('earth', 6.4), WOOD2 = U('earth', 4.8), BLACK = U('neutral', 9.4), GOLD = [ROW.yellow, 3, 6, 0];
        b.push(x, y + 0.03, z, -0.5, 1.5, 0, 0.3);
        b.box(0.26, 0.045, 0.09, WOOD); b.box(0.2, 0.02, 0.07, U('earth', 7.6), { y: -0.02 }); b.box(0.06, 0.04, 0.07, WOOD, { x: 0.155, y: 0.012 }); b.box(0.04, 0.03, 0.04, WOOD, { x: 0.2, y: 0.03 });   // the hull and the bow
        b.box(0.11, 0.012, 0.006, WOOD2, { x: 0.27, y: 0.07, rz: 0.35 });                                                                       // the bowsprit
        b.box(0.08, 0.05, 0.094, WOOD, { x: -0.11, y: 0.045 }); b.box(0.09, 0.008, 0.1, WOOD2, { x: -0.11, y: 0.095 });                           // the high stern
        for (const sz of [-1, 1]) for (let i = 0; i < 2; i++) b.box(0.016, 0.016, 0.004, GOLD, { x: -0.13 + i * 0.035, y: 0.06, z: sz * 0.048 });   // lit windows
        b.box(0.24, 0.006, 0.08, WOOD2, { x: 0.02, y: 0.045 });                                                                                 // the deck
        b.box(0.05, 0.03, 0.004, BLACK, { x: 0.06, y: 0.005, z: 0.046 });                                                                       // a hole in the side
        b.box(0.014, 0.2, 0.014, WOOD2, { x: 0.05, y: 0.05 }); b.box(0.008, 0.008, 0.15, WOOD2, { x: 0.05, y: 0.19 });                            // the main mast and its yard
        b.box(0.006, 0.1, 0.13, BLACK, { x: 0.05, y: 0.085 });                                                                                  // the black sail, with a white skull and two bones
        b.box(0.008, 0.03, 0.036, WH, { x: 0.05, y: 0.135 }); b.box(0.009, 0.014, 0.024, WH, { x: 0.05, y: 0.122 }); for (const sz of [-1, 1]) b.box(0.01, 0.01, 0.01, BLACK, { x: 0.05, y: 0.146, z: sz * 0.009 });
        for (const sr of [-1, 1]) b.box(0.009, 0.008, 0.07, WH, { x: 0.05, y: 0.104, rx: sr * 0.5 });
        b.box(0.012, 0.09, 0.012, WOOD2, { x: -0.05, y: 0.05 }); b.box(0.012, 0.012, 0.13, WOOD2, { x: -0.06, y: 0.06, z: 0.09, rx: 0.5 });       // the second mast is broken; its top lies over the side
        b.box(0.004, 0.03, 0.045, BLACK, { x: 0.05, y: 0.25, z: 0.024 }); b.box(0.005, 0.012, 0.014, WH, { x: 0.05, y: 0.26, z: 0.024 });        // the flag
        for (const i of [0, 1, 2]) b.box(0.012, 0.012, 0.04, BLACK, { x: -0.04 + i * 0.06, y: 0.052, z: 0.05 });                                // cannons
        b.pop();
        b.box(0.06, 0.03, 0.045, WOOD2, { x: x + 0.2, y, z: z + 0.16, ry: 0.5 }); b.box(0.05, 0.016, 0.036, GOLD, { x: x + 0.2, y: y + 0.03, z: z + 0.16, ry: 0.5 });   // the chest, open, full of gold
        for (let i = 0; i < 9; i++) b.box(0.012, 0.006, 0.012, GOLD, { x: x + 0.2 + Math.cos(i * 1.9) * (0.05 + (i % 3) * 0.025), y, z: z + 0.16 + Math.sin(i * 1.9) * (0.05 + (i % 3) * 0.025) });
        b.box(0.018, 0.018, 0.06, BLACK, { x: x - 0.12, y, z: z + 0.22, ry: 1.1 }); }
      const rr = rng(19);
      for (let i = 0; i < 40; i++) {
        const a = rr() * TAU, d = 0.15 + Math.sqrt(rr()) * 0.72, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (edgeE(tile, x, z) < 0.06 || dist(x, z) < 0.42 || Math.hypot(x + 0.5, z + 0.32) < 0.22 || Math.hypot(x + 0.56, z - 0.4) < 0.3) continue;
        const y = fy(x, z);
        if (i % 3 === 0) { const col = U(['pink', 'orange', 'purple', 'red'][i % 4], 4); b.box(0.03, 0.03, 0.03, col, { x, y, z }); b.box(0.016, 0.05, 0.016, col, { x: x + 0.016, y, z: z + 0.01 }); b.box(0.014, 0.04, 0.014, col, { x: x - 0.014, y, z: z - 0.012 }); }
        else for (let k = 0; k < 3; k++) b.box(0.008, 0.035 + rr() * 0.03, 0.02, U('green', 5 + (k % 2)), { x: x + (k - 1) * 0.014, y, z: z + (rr() - 0.5) * 0.02, ry: rr() * 3 });
      }
      // The research ship on the surface, over the middle of the trench.
      const [SX, SZ] = arc(0.02);
      b.push(SX - 0.02, 0.004, SZ, 0.3);
      b.box(0.24, 0.035, 0.08, C('neutral', 0.4), { y: -0.012 }); b.box(0.05, 0.03, 0.06, C('neutral', 0.4), { x: 0.13, y: -0.008 }); b.box(0.25, 0.006, 0.085, C('blue', 5), { y: 0.022 });
      b.box(0.07, 0.045, 0.06, C('neutral', 1.2), { x: -0.06, y: 0.028 }); b.box(0.074, 0.012, 0.064, [ROW.sea, 6, 1, 0.1], { x: -0.06, y: 0.052 }); b.box(0.02, 0.03, 0.02, C('orange', 5), { x: -0.08, y: 0.073 });
      b.box(0.012, 0.1, 0.012, C('yellow', 4), { x: 0.07, y: 0.028 }); b.box(0.1, 0.01, 0.012, C('yellow', 4), { x: 0.03, y: 0.124 });   // the crane
      b.pop();
      anim((db, fb, t, env) => {
        const tt = REDUCED ? 4 : t;
        // The submarine goes down on its cable, waits, and comes up.
        const dn = 0.5 - 0.5 * Math.cos(tt * 0.22), sy = -0.06 + dn * (DP + 0.2), sx = SX + 0.0, sz = SZ + 0.0;
        db.box(0.003, 0.12 - sy, 0.003, U('neutral', 2), { x: sx, y: sy + 0.03, z: sz });
        db.push(sx, sy, sz, 0.3 + Math.sin(tt * 0.5) * 0.2);
        db.box(0.085, 0.05, 0.05, U('yellow', 4)); db.box(0.03, 0.03, 0.052, U('sea', 2), { x: 0.022, y: 0.012 }); db.box(0.02, 0.016, 0.03, U('yellow', 5), { y: 0.05 });
        db.box(0.012, 0.03, 0.006, U('neutral', 7), { x: -0.05, y: 0.01, rx: tt * 9 }); db.box(0.016, 0.016, 0.016, U('neutral', 0.2), { x: 0.05, y: 0.006 });
        db.box(0.09, 0.02, 0.02, [ROW.yellow, 2, 6, 0], { x: 0.1, y: 0.004, rz: -0.25 });   // its lamp
        db.pop();
        if (!REDUCED) for (let i = 0; i < 4; i++) { const f = (tt * 0.5 + i / 4) % 1; db.box(0.008 + f * 0.006, 0.008 + f * 0.006, 0.008 + f * 0.006, WH, { x: sx - 0.05 + Math.sin(i * 2 + tt) * 0.01, y: sy + 0.05 + f * 0.1, z: sz }); }
        // Smoke from the vents.
        if (!REDUCED) vents.forEach(([x, z], k) => { const y = fy(x, z) + 0.11 + k * 0.03; for (let i = 0; i < 4; i++) { const f = (tt * 0.22 + i / 4 + k * 0.3) % 1, s = 0.022 + f * 0.03; db.box(s, s, s, C('neutral', 9 - f * 3), { x: x + Math.sin(f * 5 + i) * 0.02, y: y + f * 0.2, z: z + f * 0.03 }); } });
        // The anglerfish: dark, with large teeth and a light on a stalk. It swims along the trench.
        { const f = Math.sin(tt * 0.12) * 0.45, [x, z] = arc(f), dir = Math.cos(tt * 0.12) > 0 ? 1 : -1, y = DP + 0.12 + Math.sin(tt * 0.5) * 0.02;
          db.push(x - 0.05, y, z, dir > 0 ? -PI / 2 + f : PI / 2 + f);
          db.box(0.07, 0.055, 0.045, U('purple', 8)); db.box(0.03, 0.02 + Math.abs(Math.sin(tt * 1.3)) * 0.012, 0.04, U('purple', 9), { x: 0.045, y: 0.004 }); for (const s of [-1, 0, 1]) db.box(0.005, 0.012, 0.005, WH, { x: 0.05, y: 0.026, z: s * 0.012 });
          db.box(0.012, 0.012, 0.047, U('yellow', 2), { x: 0.02, y: 0.036 }); db.box(0.03, 0.03, 0.008, U('purple', 7), { x: -0.05, y: 0.012, ry: Math.sin(tt * 4) * 0.5 });
          db.box(0.004, 0.04, 0.004, U('purple', 6), { x: 0.03, y: 0.055, rz: -0.6 }); db.box(0.02, 0.02, 0.02, [ROW.yellow, 2, 6, 0], { x: 0.058, y: 0.086 });
          db.pop(); }
        // Jellyfish: they open and close as they go up and down.
        [[-0.3, 0.38, 'pink'], [-0.25, -0.05, 'purple'], [0.1, 0.3, 'pink'], [0.32, -0.42, 'sea'], [0.45, 0.2, 'purple'], [0.0, -0.3, 'pink']].forEach(([f0, ph, hue], i) => {
          const [x, z] = arc(f0), p = Math.sin(tt * 1.4 + i * 1.3), y = SH - 0.02 - (i % 3) * 0.07 + Math.sin(tt * 0.3 + i) * 0.04, w = 0.045 + p * 0.008;
          db.box(w, 0.022 - p * 0.004, w, U(hue, 2.6), { x: x + ph * 0.3, y, z }); db.box(w * 0.6, 0.012, w * 0.6, U(hue, 1.4), { x: x + ph * 0.3, y: y + 0.02, z });
          for (let k = 0; k < 4; k++) db.box(0.004, 0.035 + p * 0.008, 0.004, U(hue, 4), { x: x + ph * 0.3 + ((k % 2) - 0.5) * 0.02, y: y - 0.036 - p * 0.008, z: z + ((k >> 1) - 0.5) * 0.02 });
        });
        // A school of small fish that glow.
        for (let i = 0; i < 9; i++) { const f = Math.sin(tt * 0.2 + i * 0.12) * 0.5 + 0.05, [x, z] = arc(f); db.box(0.022, 0.01, 0.008, U('sea', 1.6), { x: x + 0.12 + Math.sin(i * 2.1) * 0.05, y: SH - 0.1 + Math.sin(i * 1.3 + tt) * 0.05, z: z + Math.cos(i * 1.7) * 0.05, ry: f }); }
      }, { minLod: 0.1 });
    },
  },
  {
    id: 'floating-islands', name: 'Floating islands', ring: 'upper', hues: ['grass', 'rock', 'orange'],
    details: ['kite', 'picnic'],   // hidden details that only this area has
    look: 'Stacked cut-paper discs that hover above the tile. Each has a ground shadow.',
    motion: 'Islands drift slowly. Shadows slide on the ground.', season: 'In winter, snow covers the ground.', az: 1.0,
    build({ b, terrain, anim }) {
      // Low hills and a pond. A waterfall drops from one island into the pond.
      const H = terrain({ h: (x, z) => (Math.hypot(x + 0.02, z - 0.415) < 0.19 ? -0.07 : 0.035 + n(x, z, 2.6, 5) * 0.1), top: { row: ROW.grass, tone: 4.8, step: 0.35 }, side: C('earth', 6.6), sens: 0.4 });
      const isl = [[-0.35, 0.2, 0.42, 0.26, 0], [0.38, -0.25, 0.56, 0.2, 1.7], [0.1, 0.42, 0.3, 0.15, 3.1], [-0.2, -0.45, 0.68, 0.13, 4.4]];
      const r = rng(77);
      for (let i = 0; i < 20; i++) {
        const a = r() * TAU, d = 0.18 + r() * 0.66, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z), s = 0.8 + r() * 0.7;
        if (y < 0.02) continue;
        b.box(0.012 * s, 0.05 * s, 0.012 * s, C('earth', 7.6), { x, y, z }); b.ball(0.04 * s, C('forest', 5 + r() * 1.4, 11), { x, y: y + 0.035 * s, z }); b.ball(0.028 * s, C('forest', 4.4, 11), { x: x + 0.018 * s, y: y + 0.07 * s, z: z - 0.01 * s });
      }
      for (let i = 0; i < 16; i++) { const x = (r() - 0.5) * 1.5, z = (r() - 0.5) * 1.5, y = H(x, z); if (y > 0.02 && Math.hypot(x, z) < 0.86) { b.box(0.02 + r() * 0.03, 0.012 + r() * 0.02, 0.02 + r() * 0.03, C('rock', 3.4 + r() * 2), { x, y, z, ry: r() * 3, lod: 1 }); b.box(0.012, 0.008, 0.012, C('rock', 5), { x: x + 0.025, y, z: z + 0.01, lod: 2 }); } }
      for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * 1.6, z = (r() - 0.5) * 1.6, y = H(x, z); if (y > 0.02 && Math.hypot(x, z) < 0.88) { b.box(0.003, 0.012, 0.003, C('forest', 6), { x, y, z, lod: 2 }); b.box(0.008, 0.006, 0.008, C(i % 3 ? 'orange' : 'plaster', i % 3 ? 4.5 : 0.6), { x, y: y + 0.012, z, lod: 2 }); } }
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; b.box(0.03, 0.004, 0.03, C('forest', 3.6), { x: -0.02 + Math.cos(a) * 0.11, y: 0.001, z: 0.415 + Math.sin(a) * 0.1, lod: 1 }); }
      anim((db, fb, t, env) => {
        isl.forEach(([x, z, y, R, ph], i) => {
          const tt = REDUCED ? 0 : t;
          db.push(x + Math.sin(tt * 0.13 + ph) * 0.1, y + Math.sin(tt * 0.4 + ph) * 0.02, z + Math.cos(tt * 0.11 + ph * 2) * 0.08, ph, 1);
          db.cyl(R, 0.03, C('grass', 5.2)); db.cyl(R * 0.92, 0.008, C('grass', 4.2), { y: 0.03 });
          db.cyl(R * 0.78, 0.03, C('rock', 4.6), { y: -0.03 }); db.cyl(R * 0.52, 0.03, C('rock', 5.6), { y: -0.06 }); db.cyl(R * 0.26, 0.04, C('rock', 6.6), { y: -0.1 });
          db.cyl(0.008, 0.06, C('earth', 7.6), { x: R * 0.4, y: 0.038 }); db.ball(0.045, C('forest', 5.6, 11), { x: R * 0.4, y: 0.08 }); db.ball(0.03, C('forest', 4.6, 11), { x: R * 0.4 + 0.02, y: 0.115 });
          db.box(0.008, 0.04, 0.008, C('earth', 7.6), { x: -R * 0.1, y: 0.038, z: -R * 0.55 }); db.ball(0.032, C('forest', 6.2, 11), { x: -R * 0.1, y: 0.066, z: -R * 0.55 });
          db.box(0.03, 0.018, 0.026, C('rock', 4), { x: R * 0.1, y: 0.038, z: R * 0.6, lod: 1 }); db.box(0.02, 0.03, 0.02, C('rock', 6.2), { x: -R * 0.3, y: -0.13, z: R * 0.2, lod: 1 }); db.box(0.016, 0.022, 0.016, C('rock', 7), { x: R * 0.25, y: -0.11, z: -R * 0.2, lod: 1 });
          for (let k = 0; k < 5; k++) { const a = k * 1.9 + ph; db.box(0.006, 0.03 + (k % 3) * 0.02, 0.006, C('forest', 5.4 + (k % 2)), { x: Math.cos(a) * R * 0.93, y: -(0.03 + (k % 3) * 0.02) + 0.03, z: Math.sin(a) * R * 0.93, lod: 2 }); }
          if (i < 2) {
            db.box(0.07, 0.05, 0.06, C('plaster', 1), { x: -R * 0.3, y: 0.038 }); db.cone(0.055, 0.05, C('orange', 5), { x: -R * 0.3, y: 0.088 }); db.box(0.02, 0.022, 0.01, win('blue', 7, 0.1 * i), { x: -R * 0.3, y: 0.05, z: 0.03, lod: 1 });
            db.box(0.014, 0.026, 0.008, C('earth', 7), { x: -R * 0.3 + 0.02, y: 0.038, z: 0.03, lod: 1 }); db.box(0.012, 0.03, 0.012, C('rock', 4.6), { x: -R * 0.3 - 0.02, y: 0.1, z: -0.012, lod: 1 });
            for (let k = 0; k < 5; k++) db.box(0.003, 0.014, 0.003, C('plaster', 0.6), { x: -R * 0.3 - 0.05 + k * 0.025, y: 0.038, z: 0.06, lod: 2 });
            db.box(0.11, 0.003, 0.003, C('plaster', 0.6), { x: -R * 0.3, y: 0.048, z: 0.06, lod: 2 });
          }
          if (i === 0) { const L = y + Math.sin(tt * 0.4 + ph) * 0.02 - 0.06; for (const sz of [-1, 1]) db.box(0.002, L, 0.002, C('earth', 8), { x: -R * 0.9, y: -L + 0.02, z: sz * 0.012, lod: 1 }); for (let k = 0; k < 12; k++) db.box(0.002, 0.002, 0.026, C('earth', 7), { x: -R * 0.9, y: 0.01 - (k / 12) * L, z: 0, lod: 2 }); }
          if (i === 2) { const L = y + Math.sin(tt * 0.4 + ph) * 0.02; db.box(0.026, L + 0.03, 0.012, C('sea', 1.6, 6), { x: R * 0.82, y: -L }); db.box(0.014, L + 0.03, 0.014, C('snow', 0.4, 6), { x: R * 0.82 + Math.sin(tt * 3) * 0.004, y: -L }); for (let k = 0; k < 4; k++) db.box(0.018, 0.01, 0.018, C('snow', 0.4, 6), { x: R * 0.82 + Math.cos(k * 1.7 + tt * 2) * 0.03, y: -L, z: Math.sin(k * 1.7 + tt * 2) * 0.03, lod: 1 }); }
          else db.box(0.012, 0.16, 0.012, C('sea', 2.4), { x: R * 0.82, y: -0.14, lod: 1 });
          db.cyl(0.002, 0.04, C('neutral', 8.5), { y: -0.14, lod: 1 }); db.ball(0.016, win('yellow', 1, 0.02), { y: -0.17, lod: 1 });
          if (env.low) db.cyl(R * 0.9, 0.003, C('grass', 6.4), { y: 0.052 - y });
          db.pop();
        });
      });
    },
  },
  {
    id: 'webflow-island', name: 'Webflow island', ring: 'upper', hues: ['blue', 'neutral', 'purple'], center: true, round: true,
    details: ['duck', 'coffee'],   // hidden details that only this area has
    marks: [['Designer screen', 0, 0.13], ['Pond', -0.66, 0.6], ['Launch pad', 0.92, -0.3]],
    look: 'The only round cell on the planet. The land is Webflow blue: stepped hills that get lighter as they rise, a pond, and pale trees. Above it floats a screen with the Webflow mark on a white page, inside the Webflow Designer: the top bar with the Publish button, the left toolbar, the Navigator, the Style panel, and a selected element with its blue outline and handles.',
    motion: 'A cursor moves between the selected element and the Publish button. Select the Publish button to launch the rocket. The mark glows at night, and the screen lights the land under it.', season: '', seasonal: { flowers: ['purple', 'pink', 'neutral'], n: 40 }, az: PI / 2, tilt: 0.78, lift: 0.36,
    lights: [[0.03, 0.72, -0.17, 1.1, [0.62, 0.78, 1.0]], [0, 0.2, 0.1, 1.1, [0.5, 0.7, 1.0]]],
    animals: { rMin: 0.2, rMax: 1.1 },
    build({ b, terrain, anim, area, tile, light }) {
      // The land fills the round cell. It is Webflow blue, in stepped hills that get lighter as they rise, with a pond.
      const H = terrain({
        h: (x, z) => (Math.hypot(x + 0.66, z - 0.6) < 0.2 ? -0.08 : Math.hypot(x - 0.92, z + 0.3) < 0.21 ? 0.085 : 0.04 + stepped(Math.max(0, n(x, z, 1.9, 11) - 0.3) * (0.1 + 0.3 * smooth(0.1, 0.9, Math.hypot(x, z))), 0.045)),
        noRim: true, plain: true, top: { row: ROW.blue, tone: 5.3, step: 0.42, bandH: 0.045 }, side: C('blue', 6), sens: 0, floorRow: ROW.blue, floorTone: 6.6,
      });
      b.sens = 0;
      // Pale trees and dark rocks.
      const rr = rng(21);
      for (let i = 0; i < 26; i++) {
        const a = rr() * TAU, d = 0.2 + Math.sqrt(rr()) * 0.95, x = Math.cos(a) * d, z = Math.sin(a) * d, y = H(x, z), s = 0.8 + rr() * 0.7;
        if (y < 0.02 || d > 1.16) continue;
        if (i % 3) { b.box(0.014 * s, 0.05 * s, 0.014 * s, C('blue', 8.6), { x, y, z }); b.ball(0.045 * s, C('blue', [1.2, 2.2, 3.2][i % 3]), { x, y: y + 0.035 * s, z }); b.ball(0.03 * s, C('neutral', 0.4), { x: x + 0.02 * s, y: y + 0.075 * s, z: z - 0.01 }); }
        else { b.box(0.03 + rr() * 0.04, 0.015 + rr() * 0.025, 0.03 + rr() * 0.04, C('blue', 7.2 + rr()), { x, y, z, ry: rr() * 3 }); b.box(0.016, 0.01, 0.016, C('blue', 8), { x: x + 0.035, y, z: z + 0.012, lod: 1 }); }
      }
      // ---- The Designer floats above the land, on a dark plate, over the middle of the island.
      const FY = 0.44, K = 1.0, Z0 = 0.13;
      b.push(0, FY, Z0, 0, K);
      b.box(1.36, 0.05, 1.36, C('neutral', 8), { x: 0.005, y: -0.05, z: -0.13 }); b.box(1.3, 0.012, 1.3, C('blue', 5, 2, 0.4), { x: 0.005, y: -0.062, z: -0.13 });   // the plate, and a blue glow under it
      const g = 0, BL = C('blue', 5), GLOW = C('blue', 5, 2, 0.5), W = C('neutral', 0.3), UI = C('neutral', 7.5), UI2 = C('neutral', 6.2), TX = C('neutral', 3), INK = C('neutral', 8.8);
      const slab = (w, h, d, col, x, z) => b.box(w, h, d, col, { x, y: g, z });   // a panel on the plate
      const mark = (W0, col, at, nx = 40) => { const M = markRuns(nx); for (const [mx, mw, my] of M.runs) at(mx * W0 - W0 / 2, mw * W0, my * W0, M.cell * W0, M.h * W0, col); };

      // ---- The canvas: a grey work area with a white page on it.
      slab(0.66, 0.008, 1.08, C('neutral', 1.6), 0.03, -0.04);
      b.box(0.58, 0.014, 0.98, W, { x: 0.03, y: g + 0.008, z: -0.04 });
      const yp = g + 0.022;
      // The page: a small nav, the mark, a heading, a button, and three cards.
      b.box(0.034, 0.012, 0.034, BL, { x: -0.22, y: yp, z: -0.485 }); for (let i = 0; i < 3; i++) b.box(0.05, 0.005, 0.012, TX, { x: -0.04 + i * 0.07, y: yp, z: -0.485 });
      b.box(0.08, 0.014, 0.03, BL, { x: 0.26, y: yp, z: -0.485 });
      mark(0.46, GLOW, (x, w, z, cell, h, col) => b.box(w, 0.045, cell, col, { x: 0.03 + x, y: yp, z: -0.27 - h / 2 + z }));
      b.box(0.3, 0.008, 0.03, INK, { x: 0.03, y: yp, z: -0.07 }); b.box(0.22, 0.005, 0.016, TX, { x: 0.03, y: yp, z: -0.025 });
      b.box(0.12, 0.016, 0.04, BL, { x: 0.03, y: yp, z: 0.035 }); b.box(0.06, 0.004, 0.01, W, { x: 0.03, y: yp + 0.016, z: 0.035 });
      const pics = [C('purple', 5), C('green', 5), C('orange', 5)];
      for (let i = 0; i < 3; i++) {
        const x = -0.16 + i * 0.19;
        b.box(0.16, 0.01, 0.24, C('neutral', 1.1), { x, y: yp, z: 0.27 }); b.box(0.13, 0.03, 0.1, pics[i], { x, y: yp + 0.01, z: 0.215 });
        b.box(0.11, 0.005, 0.014, INK, { x: x - 0.01, y: yp + 0.01, z: 0.31 }); b.box(0.08, 0.005, 0.01, TX, { x: x - 0.025, y: yp + 0.01, z: 0.34 });
      }
      // The selected element: a blue outline, handles, and a label tag.
      { const x = 0.22, z = 0.27, w = 0.19, d = 0.27;
        for (const s of [-1, 1]) { b.box(w, 0.03, 0.008, BL, { x, y: yp, z: z + s * d / 2 }); b.box(0.008, 0.03, d, BL, { x: x + s * w / 2, y: yp, z }); }
        for (const sx of [-1, 0, 1]) for (const sz of [-1, 0, 1]) if (sx || sz) { b.box(0.026, 0.036, 0.026, BL, { x: x + sx * w / 2, y: yp, z: z + sz * d / 2 }); b.box(0.014, 0.004, 0.014, W, { x: x + sx * w / 2, y: yp + 0.036, z: z + sz * d / 2 }); }
        b.box(0.1, 0.034, 0.036, BL, { x: x - w / 2 + 0.05, y: yp, z: z - d / 2 - 0.024 }); b.box(0.06, 0.004, 0.01, W, { x: x - w / 2 + 0.045, y: yp + 0.034, z: z - d / 2 - 0.024 });
      }

      // ---- The top bar: a small mark, the breakpoints, and the Publish button.
      slab(1.2, 0.06, 0.1, UI, 0, -0.66);
      mark(0.07, W, (x, w, z, cell, h, col) => b.box(w, 0.006, cell, col, { x: -0.54 + x, y: g + 0.06, z: -0.66 - h / 2 + z }), 14);
      [[0.05, 0.034], [0.032, 0.04], [0.02, 0.036]].forEach(([w, d], i) => b.box(w, 0.006, d, i ? TX : W, { x: -0.06 + i * 0.06, y: g + 0.06, z: -0.66 }));
      b.box(0.15, 0.022, 0.056, BL, { x: 0.49, y: g + 0.06, z: -0.66 }); b.box(0.08, 0.004, 0.012, W, { x: 0.49, y: g + 0.082, z: -0.66 });

      // ---- The left toolbar: a column of icons. The first one (Add) is on.
      slab(0.09, 0.08, 1.04, UI, -0.575, -0.08);
      for (let i = 0; i < 7; i++) { const z = -0.53 + i * 0.13; b.box(0.052, 0.008, 0.052, i ? UI2 : BL, { x: -0.575, y: g + 0.08, z }); if (i) b.box(0.024, 0.004, 0.024, TX, { x: -0.575, y: g + 0.088, z }); else { b.box(0.032, 0.004, 0.008, W, { x: -0.575, y: g + 0.088, z }); b.box(0.008, 0.004, 0.032, W, { x: -0.575, y: g + 0.088, z }); } }

      // ---- The Navigator: a tree of elements. One row is selected.
      slab(0.2, 0.05, 1.04, C('neutral', 7), -0.42, -0.08);
      [0, 1, 2, 2, 1, 2, 3, 3, 1, 2, 2].forEach((ind, i) => {
        const z = -0.54 + i * 0.09, w = 0.1 - ind * 0.012, x0 = -0.5 + ind * 0.022, on = i === 5;
        if (on) b.box(0.19, 0.004, 0.044, BL, { x: -0.42, y: g + 0.05, z });
        b.box(0.014, 0.008, 0.014, on ? W : UI2, { x: x0, y: g + 0.05, z }); b.box(w, 0.008, 0.016, on ? W : TX, { x: x0 + 0.016 + w / 2, y: g + 0.05, z });
      });

      // ---- The Style panel: tabs, layout buttons, the spacing box, inputs, color swatches, a slider.
      slab(0.26, 0.07, 1.04, UI, 0.5, -0.08);
      const ys = g + 0.07;
      for (let k = 0; k < 3; k++) b.box(0.06, 0.006, 0.02, k ? UI2 : W, { x: 0.42 + k * 0.08, y: ys, z: -0.555 });
      b.box(0.08, 0.005, 0.012, TX, { x: 0.43, y: ys, z: -0.49 });
      for (let k = 0; k < 5; k++) b.box(0.036, 0.01, 0.036, k === 1 ? BL : UI2, { x: 0.4 + k * 0.05, y: ys, z: -0.43 });
      b.box(0.21, 0.008, 0.17, UI2, { x: 0.5, y: ys, z: -0.27 }); b.box(0.14, 0.008, 0.1, C('neutral', 5), { x: 0.5, y: ys + 0.008, z: -0.27 }); b.box(0.07, 0.008, 0.04, TX, { x: 0.5, y: ys + 0.016, z: -0.27 });
      for (let r = 0; r < 2; r++) for (let k = 0; k < 2; k++) b.box(0.095, 0.006, 0.032, UI2, { x: 0.445 + k * 0.11, y: ys, z: -0.115 + r * 0.05 });
      b.box(0.08, 0.005, 0.012, TX, { x: 0.43, y: ys, z: 0.01 }); b.box(0.21, 0.006, 0.032, UI2, { x: 0.5, y: ys, z: 0.06 });
      [['blue', 5], ['purple', 5], ['pink', 5], ['red', 5], ['orange', 5], ['yellow', 5], ['green', 5], ['neutral', 0.3]].forEach(([h, t], k) => b.box(0.04, 0.02, 0.04, C(h, t), { x: 0.42 + (k % 4) * 0.054, y: ys, z: 0.17 + (k >> 2) * 0.06 }));
      b.box(0.2, 0.004, 0.008, UI2, { x: 0.5, y: ys, z: 0.34 }); b.box(0.022, 0.014, 0.022, W, { x: 0.54, y: ys, z: 0.34 });
      b.box(0.21, 0.014, 0.04, BL, { x: 0.5, y: ys, z: 0.41 });

      b.pop();

      // ---- The cursor: it goes from the selected element to the Publish button and back, and it clicks at each end.
      const SHAPE = []; for (let k = 0; k < 8; k++) SHAPE.push([0, (k + 1) * 0.72, k]); SHAPE.push([0, 2.6, 8], [2.4, 4.2, 8], [2.9, 4.7, 9], [3.4, 5.2, 10]);
      anim((db, fb, t) => {
        const tt = REDUCED ? 0 : t, s = 0.5 - 0.5 * Math.cos(tt * 0.4), e = s * s * (3 - 2 * s), u = 0.017;
        const click = e < 0.02 || e > 0.98 ? 0.035 : 0;
        db.push(0, FY, Z0, 0, K); db.push(lerp(0.33, 0.5, e), g + 0.19 + Math.sin(tt * 2.2) * 0.006 - click + Math.sin(e * PI) * 0.08, lerp(0.42, -0.63, e), 0, 1);
        for (const [x0, x1, k] of SHAPE) { db.box((x1 - x0 + 0.9) * u, 0.012, u * 1.9, INK, { x: ((x0 + x1) / 2) * u, y: -0.004, z: k * u }); db.box((x1 - x0) * u, 0.012, u, W, { x: ((x0 + x1) / 2) * u, z: k * u }); }
        db.pop(); db.pop();
      });

      // ---- The rocket. A click on the Publish button launches it: fire, smoke, and up into space. After some time a lift brings up a new rocket.
      const PX = 0.92, PZ = -0.3, PY = H(PX, PZ), RH = 0.36;   // the pad, and the height of the rocket
      b.cyl(0.17, 0.012, C('neutral', 7.6), { x: PX, y: PY, z: PZ }); b.cyl(0.15, 0.004, C('neutral', 6.4), { x: PX, y: PY + 0.012, z: PZ });
      ring(12, 0.16, (x, z, a, i) => b.box(0.03, 0.005, 0.016, i % 2 ? C('yellow', 4) : INK, { x: PX + x, y: PY + 0.012, z: PZ + z, ry: -a + PI / 2 }));
      b.cyl(0.075, 0.003, C('neutral', 9.6), { x: PX, y: PY + 0.016, z: PZ });   // the dark shaft under the lift
      // The tower next to the pad, with an arm and a light.
      b.push(PX + 0.14, PY + 0.012, PZ - 0.06);
      for (let i = 0; i < 7; i++) { b.box(0.03, 0.006, 0.03, C('neutral', 6), { y: i * 0.045 }); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(0.005, 0.045, 0.005, C('neutral', 7.4), { x: sx * 0.012, y: i * 0.045, z: sz * 0.012 }); }
      b.box(0.07, 0.008, 0.012, C('neutral', 6), { x: -0.045, y: 0.2, z: 0.02 }); b.box(0.012, 0.012, 0.012, [ROW.blue, 4, 2, 0.2], { y: 0.318 });
      b.pop();
      light(PX, PY + 0.2, PZ, 0.5, [0.62, 0.78, 1.0]);
      const st = { t0: -99, now: 0 };
      area.rocket = st;
      // The parts of one launch, in seconds: 0 fire starts, 1.3 it lifts off, 7.6 it is gone, 9 the lift goes down, 10.4 a new rocket comes up, 12.8 it is ready.
      // The rocket stays in view for a long way: it starts to get small only when it is about two planet radii up, far past the orbit lines.
      const T_UP = 1.3, T_GONE = 7.6, T_DOWN = 9, T_NEW = 10.4, T_READY = 12.8;
      area.launch = () => { if (st.now - st.t0 < T_READY) return false; st.t0 = st.now; return true; };
      // What the pointer can find here (see discover.js): the Publish button launches the rocket; the rocket shows what to do.
      const ready = () => st.now - st.t0 > T_READY;
      area.taps = [{ key: 'pub', label: 'Publish', sub: () => (ready() ? 'Select it to launch the rocket' : 'The next rocket is on its way'), at: [0.49, FY + 0.06, Z0 - 0.66], R: 0.1, a0: 0.002, a1: 0.05, tap: () => area.launch(), toast: 'Published!<small>The rocket is on its way</small>' },
        { key: 'rocket', label: 'Rocket', sub: () => 'Select Publish in the Designer to launch it', at: [PX, PY, PZ], R: 0.09, a0: 0.02, a1: RH + 0.04, show: ready }];
      area.publishAt = [0.49, FY + 0.06, Z0 - 0.66];
      const alt = (tt) => (tt < T_UP ? 0 : 0.42 * (tt - T_UP) * (tt - T_UP));   // how high the rocket is
      const SM = C('neutral', 1.4), SM2 = C('neutral', 3);
      const draw = (db, y, sc, flame, shake) => {
        const WH = C('neutral', 0.3), FIRE1 = [ROW.orange, 5, 6, 0], FIRE2 = [ROW.yellow, 3, 6, 0];
        db.push(PX + shake, PY + 0.02 + y, PZ, 0.6, sc);
        for (let i = 0; i < 3; i++) { const a = i * 2.094; db.box(0.07, 0.09, 0.012, BL, { x: Math.cos(a) * 0.05, y: 0.012, z: Math.sin(a) * 0.05, ry: -a, t: 0.5 }); }   // three fins
        db.cyl(0.034, 0.03, INK, { y: 0.0 }); db.cyl(0.045, 0.2, WH, { y: 0.03 }); db.cyl(0.0455, 0.02, BL, { y: 0.075 }); db.cyl(0.0455, 0.012, BL, { y: 0.2 });
        db.cyl(0.016, 0.006, [ROW.sea, 3, 1, 0.1], { y: 0.15, z: 0.042, rx: PI / 2 }); db.cyl(0.02, 0.004, INK, { y: 0.15, z: 0.04, rx: PI / 2 });   // a round window
        db.cone(0.045, 0.1, BL, { y: 0.23 }); db.box(0.004, 0.03, 0.004, INK, { y: 0.325 });
        if (flame > 0) { const f = flame * (0.85 + 0.3 * Math.sin(st.now * 47)); db.pyr(0.1, 0.62 * f, 0.1, FIRE1, { y: 0.0, rx: PI }); db.pyr(0.066, 0.42 * f, 0.066, FIRE2, { y: 0.0, rx: PI }); db.pyr(0.034, 0.2 * f, 0.034, WH, { y: 0.0, rx: PI }); }
        db.pop();
      };
      anim((db, fb, t) => {
        st.now = t;
        const tt = t - st.t0, live = tt < T_READY;
        // The lift: a disc in the pad. It goes down empty, then it comes up with the new rocket.
        const liftY = !live || tt < T_DOWN ? 0 : tt < T_NEW ? -smooth(T_DOWN, T_NEW - 0.3, tt) * (RH + 0.08) : -(1 - smooth(T_NEW, T_READY - 0.3, tt)) * (RH + 0.08);
        db.cyl(0.072, 0.008, C('neutral', live && tt > T_UP && tt < T_NEW ? 8.6 : 5.4), { x: PX, y: PY + 0.014 + liftY, z: PZ });
        if (!live) { draw(db, 0, 1, 0, 0); if (!REDUCED) for (let i = 0; i < 2; i++) { const f = (t * 0.25 + i * 0.5) % 1; db.ball(0.012 + f * 0.012, SM, { x: PX + 0.06, y: PY + 0.03 + f * 0.07, z: PZ + 0.05 }); } return; }   // ready: a little steam at the base
        if (REDUCED) { if (tt > T_NEW) draw(db, 0, 1, 0, 0); return; }   // reduced motion: no flight. The rocket is gone, then a new one is there.
        if (tt < T_GONE) {
          const y = alt(tt), gone = 1 - smooth(T_GONE - 1.2, T_GONE, tt);
          draw(db, y, gone, tt < T_UP ? 0.25 + 0.5 * (tt / T_UP) : 1, tt < T_UP ? Math.sin(t * 70) * 0.003 : 0);
        } else if (tt > T_NEW) draw(db, liftY, 1, 0, 0);
        // Smoke on the ground: it rolls out from the pad in a ring, then it gets thin.
        const g = tt - 0.15;
        if (g > 0 && tt < T_DOWN + 1) for (let i = 0; i < 18; i++) {
          const a = i * 0.349 + (i % 3) * 0.2, out2 = 0.07 + (0.3 + (i % 4) * 0.06) * (1 - Math.exp(-g * 1.1)), s = (0.05 + 0.03 * (i % 3) + g * 0.014) * Math.min(1, g * 3) * (1 - smooth(4.2, T_DOWN + 1, tt));
          db.ball(s, i % 2 ? SM : SM2, { x: PX + Math.cos(a) * out2, y: PY + 0.03 + s * 0.5 + (i % 3) * 0.02 * g, z: PZ + Math.sin(a) * out2, sy: 0.8 });
        }
        // Fire on the pad: it bursts out under the rocket, and it burns for a moment after the rocket is up.
        if (tt < T_UP + 1.6) for (let i = 0; i < 12; i++) {
          const f = (t * 1.7 + i / 12) % 1, a = i * 0.524 + (i % 2) * 0.3, k = Math.min(1, tt * 2) * (1 - smooth(T_UP + 0.6, T_UP + 1.6, tt)), s = (0.07 - f * 0.045) * k;
          db.ball(s, i % 3 ? [ROW.orange, 5, 6, 0] : [ROW.yellow, 3, 6, 0], { x: PX + Math.cos(a) * f * 0.2, y: PY + 0.03 + f * 0.05, z: PZ + Math.sin(a) * f * 0.2 });
        }
        // The trail: a column of smoke where the rocket was. Each puff grows, moves a little with the wind, and goes away.
        for (let i = 0; i < 30; i++) {
          const born = T_UP + i * 0.13, age = tt - born; if (age < 0 || age > 3.6) continue;
          const s = (0.035 + age * 0.045) * (1 - age / 3.6);
          db.ball(s, i % 3 ? SM : SM2, { x: PX + Math.sin(i * 1.7) * 0.02 + age * 0.03, y: PY + alt(born) - 0.02, z: PZ + Math.cos(i * 2.3) * 0.02 });
        }
        // Sparks under the rocket in the first seconds.
        if (tt < T_UP + 0.8) for (let i = 0; i < 6; i++) { const f = (t * 2.2 + i / 6) % 1, a = i * 1.05 + t; db.box(0.012, 0.012, 0.012, [ROW.yellow, 3, 6, 0], { x: PX + Math.cos(a) * f * 0.14, y: PY + 0.03 + Math.sin(f * PI) * 0.05, z: PZ + Math.sin(a) * f * 0.14 }); }
      });
    },
  },
  {
    id: 'high-peak', name: 'High peak', ring: 'lower', hues: ['rock', 'snow', 'forest'], extra: 'white',
    details: ['yeti', 'tent'],   // hidden details that only this area has
    look: 'The highest mountain on the planet: grass at the foot, bare rock on the steep steps, and a long white top. Pine trees on the low slopes. A hut, a small lake, and a cable car to the top.',
    motion: 'Two cable car cabins go up and down. Two eagles circle the top. Smoke comes from the hut.', season: 'In winter, snow covers the full mountain and the pines.', az: 1.15, tilt: 1.0, lift: 0.62, dist: 1.5,
    animals: { rMin: 0.5, rMax: 0.95 }, lights: [[0.5, 0.14, 0.46, 0.5], [0.22, 0.16, 0.66, 0.4]],
    marks: [['Summit', -0.1, -0.12], ['Hut', 0.5, 0.42], ['Lake', 0.58, -0.36], ['Cable car', 0.02, 0.3]],
    build({ b, terrain, tile, anim }) {
      const PX = -0.1, PZ = -0.12, HX = 0.5, HZ = 0.42, LX = 0.58, LZ = -0.36, SX = 0.22, SZ = 0.66;
      const H = terrain({
        h: (x, z) => {
          const dx = x - PX, dz = z - PZ, a = Math.atan2(dz, dx), d = Math.hypot(dx, dz) * (1 + 0.15 * Math.sin(a * 3 + 1) + 0.09 * Math.sin(a * 5 + 2.3));   // ridges and gullies
          let h = 0.045 + Math.pow(Math.max(0, 1 - d / 0.72), 1.55) * 1.72 + (n(x, z, 2.6, 5) - 0.5) * 0.07 * smooth(0.08, 0.5, d);   // very tall and steep: the highest point on the planet
          const dl = Math.hypot(x - LX, z - LZ); if (dl < 0.18) h = lerp(-0.07, h, smooth(0.1, 0.18, dl));                     // the lake
          for (const [fx, fz, fr] of [[HX, HZ, 0.13], [SX, SZ, 0.11]]) { const df = Math.hypot(x - fx, z - fz); if (df < fr) h = lerp(0.06, h, smooth(fr * 0.55, fr, df)); }   // flat ground for the hut and the station
          return Math.max(h, -0.07);
        }, top: { row: ROW.grass, tone: 5.2, step: 0.1, altRow: ROW.snow, altEvery: 114, altTone: -4.4, bandH: 0.05 }, side: C('rock', 8), water: C('sea', 5.6), sens: 0.5, snowSides: true,   // grass low, bare rock on the steep steps, snow from level 11 up
      });
      b.sens = 0.6;
      // Pine trees on the low slopes, and some boulders.
      const r = rng(31), far = (x, z, qx, qz, rad) => Math.hypot(x - qx, z - qz) > rad;
      for (let i = 0, k = 0; i < 400 && k < 46; i++) {
        const a = r() * TAU, d = 0.36 + Math.sqrt(r()) * 0.62, x = PX + Math.cos(a) * d, z = PZ + Math.sin(a) * d, sc = 0.8 + r() * 0.6;
        if (edgeE(tile, x, z) < 0.08) continue;
        const y = H(x, z); if (y < 0.03 || y > 0.34 || !far(x, z, HX, HZ, 0.14) || !far(x, z, SX, SZ, 0.13) || !far(x, z, LX, LZ, 0.2)) continue;
        k++;
        if (k % 6 === 0) { b.box(0.04 * sc, 0.03 * sc, 0.035 * sc, C('rock', 5 + r() * 2), { x, y: y - 0.004, z, ry: r() * 3, sens: 0.5 }); continue; }
        b.box(0.011 * sc, 0.024 * sc, 0.011 * sc, C('earth', 8), { x, y, z });
        b.cone(0.042 * sc, 0.07 * sc, C('forest', 6.8, 11), { x, y: y + 0.018 * sc, z }); b.cone(0.031 * sc, 0.06 * sc, C('forest', 6.2, 11), { x, y: y + 0.055 * sc, z }); b.cone(0.02 * sc, 0.05 * sc, C('forest', 5.6, 11), { x, y: y + 0.09 * sc, z, lod: 1 });
      }
      // The hut.
      const hy = H(HX, HZ);
      b.push(HX, hy, HZ, 0.5);
      b.box(0.12, 0.012, 0.1, C('rock', 5.4)); b.box(0.1, 0.055, 0.08, C('earth', 6.4), { y: 0.012 }); b.gable(0.12, 0.05, 0.1, C('red', 6), { y: 0.067, ry: PI / 2 });
      b.box(0.018, 0.03, 0.006, C('earth', 8.4), { y: 0.012, z: 0.041 }); b.box(0.02, 0.018, 0.006, win('yellow', 3, 0.3), { x: 0.028, y: 0.03, z: 0.041 }); b.box(0.02, 0.018, 0.006, win('yellow', 3, 0.6), { x: -0.028, y: 0.03, z: 0.041 });
      b.box(0.016, 0.045, 0.016, C('rock', 6.4), { x: -0.03, y: 0.075, z: -0.02 });
      for (let i = 0; i < 4; i++) b.box(0.03, 0.012, 0.012, C('earth', 7.4), { x: 0.075, y: 0.012 + i * 0.012, z: -0.02 + (i % 2) * 0.004 });   // a wood pile
      const hutBase = b.top.clone(); b.pop();
      // The cable car: a station at the foot, a station near the top, two pylons, one cable.
      const y0 = H(SX, SZ) + 0.085, TX = PX + 0.03, TZ = PZ + 0.1, y1 = H(TX, TZ) + 0.05;
      const cdx = TX - SX, cdz = TZ - SZ, ch = Math.hypot(cdx, cdz), L = Math.hypot(ch, y1 - y0), ry = Math.atan2(-cdz, cdx), rz = Math.atan2(y1 - y0, ch);
      const cab = (u) => [SX + cdx * u, y0 + (y1 - y0) * u, SZ + cdz * u];
      b.push(SX, H(SX, SZ), SZ, ry);
      b.box(0.11, 0.06, 0.09, C('plaster', 1.4)); b.box(0.13, 0.014, 0.11, C('red', 6), { y: 0.06 }); b.box(0.03, 0.03, 0.006, win('yellow', 3, 0.2), { x: -0.02, y: 0.016, z: 0.046 }); b.box(0.014, 0.03, 0.014, C('neutral', 7.6), { x: 0.03, y: 0.07 });
      b.pop();
      b.push(TX, H(TX, TZ), TZ, ry); b.box(0.07, 0.04, 0.06, C('plaster', 1.4)); b.box(0.085, 0.012, 0.075, C('red', 6), { y: 0.04 }); b.pop();
      b.box(L, 0.004, 0.004, C('neutral', 8.6), { x: (SX + TX) / 2, y: (y0 + y1) / 2, z: (SZ + TZ) / 2, ry, rz, sens: 0 });
      for (const u of [0.3, 0.62]) { const [x, y, z] = cab(u), g = H(x, z); b.box(0.014, y - g + 0.012, 0.014, C('neutral', 7.4), { x, y: g, z, sens: 0 }); b.box(0.012, 0.008, 0.05, C('neutral', 7.4), { x, y: y + 0.006, z, ry, sens: 0 }); }
      // The flag on the top.
      const py = H(PX, PZ); b.box(0.005, 0.07, 0.005, C('neutral', 8.6), { x: PX, y: py, z: PZ, sens: 0 }); b.box(0.035, 0.02, 0.004, C('red', 5), { x: PX + 0.02, y: py + 0.05, z: PZ, sens: 0 });
      anim((db, fb, t, env) => {
        const tt = REDUCED ? 3 : t, u = 0.5 - 0.5 * Math.cos(tt * 0.22);
        [u, 1 - u].forEach((q, i) => {
          const [x, y, z] = cab(0.04 + q * 0.92);
          db.push(x, y, z, ry); const side = i ? 0.012 : -0.012;
          db.box(0.003, 0.03, 0.003, C('neutral', 8.6), { y: -0.03, z: side }); db.box(0.04, 0.026, 0.024, C(i ? 'yellow' : 'red', 5), { y: -0.056, z: side }); db.box(0.042, 0.009, 0.026, win('sea', 2.4, 0.2 + i * 0.4), { y: -0.044, z: side });
          db.pop();
        });
        for (let i = 0; i < 2; i++) { const a = tt * 0.3 + i * PI, R = 0.26 + i * 0.07; bird(db, PX + Math.cos(a) * R, py + 0.1 + i * 0.05 + Math.sin(tt * 0.5 + i) * 0.02, PZ + Math.sin(a) * R, a + PI / 2, Math.sin(tt * 3 + i) * 0.35, C('earth', 8.4), 1.5); }
      }, { minLod: 0.15 });
      anim((db, fb, t) => puffs(db, REDUCED ? 3 : t, -0.03, 0.125, -0.02, 3, 0.16, C('plaster', 0.6), 0.02, 0.2), { base: hutBase, minLod: 0.3 });
    },
  },
  {
    id: 'storm-eye', name: 'Storm eye', ring: 'lower', hues: ['sea', 'snow', 'yellow'],
    details: ['bottle', 'umbrella'],   // hidden details that only this area has
    marks: [['Lighthouse', 0, 0]],
    look: 'Spiral storm arms seen from above. A calm round center with a small lighthouse.',
    motion: 'Soft cloud layers turn in spiral arms. Soft lightning now and then. Select the lighthouse for an electric storm: it grows over the open ocean next to this area.', season: '', seasonal: { n: 14, keep: (x, z) => Math.hypot(x, z) > 0.06 }, az: 1.1, tilt: 0.7,
    build({ b, terrain, anim, light, world, tile, area }) {
      const H = terrain({ h: (x, z) => lerp(0.07, -0.13, smooth(0.11, 0.22, Math.hypot(x, z))), top: { row: ROW.sand, tone: 2.8, step: 0 }, side: C('sea', 8.4), water: C('sea', 7), sens: 0 });
      b.sens = 0;
      const col = { p: () => C('rock', 5), s: () => C('plaster', 1), a: () => C('yellow', 5), W: C('plaster', 0.3), K: C('neutral', 8.5), win: () => win('rock', 7.6, 0.1), lamp: win('plaster', 0.4, 0.02), r: rng(3) };
      b.push(0, H(0, 0) - 0.01, 0, 0, 0.5); HEROES.lighthouse.build(b, col); const base = b.top.clone(); b.pop();
      anim((db, fb, t, env) => HEROES.lighthouse.anim(db, fb, t, env), { base });
      for (const ph of [0, PI]) light(0, 0.38, 0, 3.4, [1, 0.86, 0.6], { base, phase: ph });
      light(0, 0.38, 0, 0.6);
      // The storm: see-through cloud layers with spiral arms. They turn around the calm eye (see addStormEye).
      addStormEye(world, tile);
      // Lightning: a glow inside the cloud and a bolt that goes down to the sea in a zigzag. It flashes two or three times, then it is gone.
      // One small strike comes by itself every 7.3 seconds. A click on the lighthouse starts the electric storm: for 7 seconds, large bolts with branches,
      // and the storm grows over each tile next to this one that is open ocean: dark clouds come over it, and lightning hits the sea there too.
      const DUR = 7, ls = { t0: -99, now: 0 };
      area.storm = ls;
      area.taps = [{ key: 'tower', label: 'Lighthouse', sub: () => (ls.now - ls.t0 < DUR ? 'An electric storm' : 'Select it for an electric storm'), at: [0, H(0, 0), 0], R: 0.11, a0: 0.0, a1: 0.5, tap: () => { if (ls.now - ls.t0 < DUR) return false; ls.t0 = ls.now; return true; } }];
      // One piece of a bolt: a thin box from the lower point (b) up to the upper point (a). A large bolt has a wide, faint glow around its white core.
      const piece = (fb, ax, ay, az, bx, by, bz, w, al, big) => {
        const vx = ax - bx, vy = ay - by, vz = az - bz, L = Math.hypot(vx, vy, vz), o = { x: bx, y: by, z: bz, rz: -Math.asin(vx / L), rx: Math.atan2(vz, vy) };
        fb.box(w, L, w, [ROW.plaster, 0.1, 0, al], o);
        if (big) { fb.box(w * 2.6, L, w * 2.6, [ROW.yellow, 1.4, 0, al * 0.4], o); fb.box(w * 5.5, L, w * 5.5, [ROW.sea, 1.6, 0, al * 0.16], o); }
      };
      // n = which strike (it sets the place and the shape). ph = seconds since it began. top = the height of the cloud. R0..R1 = how far from the middle of the tile.
      const strike = (fb, n, ph, big, top = 0.3, R0 = big ? 0.2 : 0.42, R1 = big ? 0.8 : 0.82) => {
        const hs = (k) => { const x = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
        const e = Math.exp(-ph * 7) + (ph > 0.2 ? 0.6 * Math.exp(-(ph - 0.2) * 11) : 0) + (big && ph > 0.36 ? 0.4 * Math.exp(-(ph - 0.36) * 14) : 0);
        const a = hs(1) * TAU, R = R0 + hs(2) * (R1 - R0), x = Math.cos(a) * R, z = Math.sin(a) * R, w = big ? 0.02 : 0.005;
        for (let k = 0; k < 9; k++) { const q = (0.05 + (k % 3) * 0.03) * (big ? 1.5 : 1); fb.box(q, 0.02, q, [ROW.plaster, 0.3, 0, Math.min(1, e) * (big ? 0.42 : 0.14)], { x: x + (hs(k + 3) - 0.5) * (big ? 0.26 : 0.16), y: top + (k % 3) * 0.015, z: z + (hs(k + 12) - 0.5) * (big ? 0.26 : 0.16) }); }   // the cloud lights up
        if (!(ph < 0.11 || (ph > 0.2 && ph < 0.27) || (big && ph > 0.36 && ph < 0.4))) return;
        const N = big ? 9 : 7, seg = top / N, jit = big ? 0.13 : 0.05; let px = x, pz = z;
        for (let k = 0; k < N; k++) {
          const nx = px + (hs(k + 30) - 0.5) * jit, nz = pz + (hs(k + 40) - 0.5) * jit, y1 = top - k * seg, y2 = y1 - seg;
          piece(fb, px, y1, pz, nx, y2, nz, w * (1 - k * 0.04), big ? 1 : 0.6, big);
          if (big && (k === 2 || k === 4 || k === 6)) {   // a branch that goes out and down, and ends in the air
            let bx = px, bz = pz, by = y1; const da = hs(k + 50) * TAU;
            for (let j = 0; j < 3; j++) { const ex = bx + Math.cos(da) * 0.06 + (hs(k * 7 + j) - 0.5) * 0.05, ez = bz + Math.sin(da) * 0.06 + (hs(k * 9 + j) - 0.5) * 0.05, ey = by - seg * 0.8; piece(fb, bx, by, bz, ex, ey, ez, w * (0.6 - j * 0.12), 0.8, false); bx = ex; bz = ez; by = ey; }
          }
          px = nx; pz = nz;
        }
        if (big) { fb.box(0.08, 0.006, 0.08, [ROW.plaster, 0.1, 0, 0.9], { x: px, y: 0.003, z: pz, ry: 0.6 }); fb.box(0.17, 0.004, 0.17, [ROW.yellow, 1.4, 0, 0.35], { x: px, y: 0.002, z: pz, ry: 0.2 }); for (let k = 0; k < 6; k++) { const sa = hs(k + 60) * TAU, sd = 0.05 + hs(k + 70) * 0.09; fb.box(0.014, 0.03 + hs(k + 80) * 0.05, 0.014, [ROW.plaster, 0.1, 0, 0.8], { x: px + Math.cos(sa) * sd, y: 0.004, z: pz + Math.sin(sa) * sd }); } }   // the flash where it hits the sea
      };
      // How strong the electric storm is now (0..1): it grows in the first second, and it goes away in the last one.
      const power = (t) => { const tb = t - ls.t0; return tb < 0 || tb > DUR ? 0 : smooth(0, 0.9, tb) * (1 - smooth(DUR - 1.2, DUR, tb)); };
      anim((db, fb, t) => {
        ls.now = t;
        if (REDUCED) return;
        const T = 7.3, n = Math.floor(t / T), ph = t - n * T, tb = t - ls.t0;
        if (ph < 0.8 && !(tb >= 0 && tb < DUR)) strike(fb, n, ph, false);
        if (tb >= 0 && tb < DUR - 0.6) for (let j = 0; j < 4; j++) { const u = tb + j * 0.14, n2 = Math.floor(u / 0.5); strike(fb, 500 + n2 * 7 + j, u - n2 * 0.5, true, 0.72); }   // the bolts come from high over the storm, down through its clouds
      });
      // The tiles next to this one. On each one that is open ocean, the storm makes dark clouds and lightning.
      // The clouds are the clouds of the planet (the cloud shells in sky.js), made thick and dark over these tiles. Over this tile they are a ring: the eye stays open.
      const CL = 0.78, egg = world.weather.cloudU, cells = [...tile.neighbors.slice(0, 5).map((ni) => world.tiles[ni]), tile];
      cells.forEach((ct, i) => { egg.uEgg.value[i].set(ct.center.x, ct.center.y, ct.center.z, 0); egg.uEggR.value[i] = Math.asin(Math.min(1, ct.rin)) * (ct === tile ? 1.02 : 1.1); });
      anim((db, fb, t) => {
        const k = REDUCED ? 0 : power(t);
        cells.forEach((ct, i) => { egg.uEgg.value[i].w = ct === tile || (world.tileFree && world.tileFree(ct.index)) ? k : 0; });
      });
      for (const ni of tile.neighbors) {
        anim((db, fb, t) => {
          if (REDUCED || power(t) <= 0 || !world.tileFree || !world.tileFree(ni)) return;
          const tb = t - ls.t0;
          if (tb > 0.7 && tb < DUR - 0.9) for (let j = 0; j < 2; j++) { const u = tb + j * 0.27 + ni * 0.13, n2 = Math.floor(u / 0.6); strike(fb, ni * 100 + n2 * 7 + j, u - n2 * 0.6, true, CL, 0.08, 0.7); }
        }, { base: world.tiles[ni].matrix });
      }
    },
  },
  {
    id: 'tidal-atoll', name: 'Tidal atoll', ring: 'lower', hues: ['sand', 'sea', 'coral'],
    details: ['sandcastle', 'surfboard'],   // hidden details that only this area has
    look: 'A ring of small islands around a lagoon. A pier and small boats.',
    motion: 'Tides: the water rises and falls once in each day.', season: '', seasonal: { floes: false }, az: 0.9,
    build({ b, terrain, tile, anim }) {
      const H = terrain({ h: (x, z) => { const d = Math.hypot(x, z), a = Math.atan2(z, x); return -0.1 + Math.exp(-Math.pow((d - 0.6) / 0.115, 2)) * 0.27 * (0.34 + 0.66 * Math.max(0, Math.sin(a * 3 + 0.5))); },
        top: { row: ROW.sand, tone: 3, step: 0.4, bandH: 0.04 }, side: C('sand', 5.4), water: C('sea', 4.4), sens: 0.1 });
      b.sens = 0.1;
      const r = rng(23), tideU = 0.012 / tile.rin;
      for (let i = 0; i < 18; i++) { const a = r() * TAU, d = r.range(0.3, 0.46), x = Math.cos(a) * d, z = Math.sin(a) * d, y = Math.max(H(x, z), -0.07), t = i % 3, col = C('coral', r.range(3, 5.4)); b.push(x, y, z, r() * 3, 1);
        if (t === 0) { b.cyl(0.008, 0.07, col); b.cyl(0.006, 0.045, col, { y: 0.03, rz: 0.7 }); b.cyl(0.006, 0.04, col, { y: 0.045, rz: -0.7 }); } else if (t === 1) b.half(0.08, 0.07, 0.012, col); else { b.ball(0.03, col, { sy: 0.8 }); b.ball(0.018, C('coral', 1.6), { x: 0.03 }); }
        b.pop(); }
      for (let k = 0; k < 3; k++) { const a0 = (PI / 2 - 0.5 + k * TAU) / 3; for (let j = -1; j <= 1; j++) { const a = a0 + j * 0.2, x = Math.cos(a) * 0.61, z = Math.sin(a) * 0.61, y = H(x, z); if (y < 0.1) continue; b.push(x, y - 0.01, z, a, 1, 0, (j) * 0.25); b.cyl(0.008, 0.14, C('earth', 7.6), { t: 0.3 }); for (let i = 0; i < 5; i++) b.ball(0.032, C('forest', 5.4), { y: 0.128, x: Math.cos(i * 1.257) * 0.03, z: Math.sin(i * 1.257) * 0.03, sy: 0.3 }); b.pop(); } }
      const a0 = (PI / 2 - 0.5) / 3, px = Math.cos(a0), pz = Math.sin(a0);
      b.push(px * 0.6, 0, pz * 0.6, PI / 2 - a0 + PI, 1);
      b.box(0.07, 0.05, 0.06, C('plaster', 1), { x: 0.09, y: H(px * 0.6, pz * 0.6) - 0.01, z: -0.04 }); b.cone(0.055, 0.05, C('coral', 5), { x: 0.09, y: H(px * 0.6, pz * 0.6) + 0.04, z: -0.04 });
      b.box(0.06, 0.01, 0.34, C('earth', 3.4), { y: 0.11, z: 0.2, pat: 3 }); for (let i = 0; i < 5; i++) for (const s of [-1, 1]) b.cyl(0.007, 0.2, C('neutral', 8.5), { x: s * 0.024, y: -0.08, z: 0.06 + i * 0.07 });
      b.pop();
      anim((db, fb, t, env) => {
        const wy = env.tide * tideU, tt = REDUCED ? 0 : t;
        for (let i = 0; i < 3; i++) { const a = tt * 0.08 * (i % 2 ? 1 : -1) + i * 2.1, rad = 0.14 + i * 0.07;
          db.push(Math.cos(a) * rad, wy + Math.sin(t * 1.3 + i) * 0.004, Math.sin(a) * rad, -a + (i % 2 ? 0 : PI), 1);
          db.gable(0.045, 0.024, 0.11, C('coral', 5.4), { y: 0.02, rx: PI }); db.box(0.046, 0.006, 0.112, C('plaster', 0.5), { y: 0.02 }); db.cyl(0.003, 0.07, C('neutral', 8.5), { y: 0.026 }); db.box(0.003, 0.045, 0.04, C('plaster', 0.8), { y: 0.045, z: 0.022 });
          db.pop(); }
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4, rad = 0.2 + (i % 3) * 0.06; db.ball(0.012, win('yellow', 2, 0.02 * i), { x: Math.cos(a) * rad + Math.sin(tt * 0.3 + i) * 0.02, y: wy - 0.003, z: Math.sin(a) * rad, lod: 1 }); }
      });
    },
  },
  {
    id: 'mirror-lake', name: 'Mirror lake', ring: 'lower', hues: ['grass', 'sea', 'yellow'],
    details: ['rowboat', 'easel'],   // hidden details that only this area has
    look: 'A perfectly flat round lake. A symmetric tower on the shore. The lake is a real mirror: it shows the tower, the trees, and the sky.',
    motion: 'Fog rises at dawn. Ripples answer a nearby click.', season: 'In winter, snow covers the grass.', seasonal: { floes: false }, az: PI / 2, tilt: 0.98, lights: [[0, 0.2, -0.4, 0.6]],
    build({ b, terrain, anim, area, world, tile }) {
      const cz = 0.14, R = 0.62;
      const H = terrain({ h: (x, z) => lerp(-0.17, 0.055, smooth(R - 0.36, R + 0.03, Math.hypot(x, z - cz))), top: { row: ROW.grass, tone: 5, step: 0.3, bandH: 0.05 }, side: C('earth', 7), water: C('sea', 6.6), sens: 0.45 });
      b.sens = 0.45;
      // The tower. flat = the reflection: same shapes, deeper tones, no shading.
      const tower = (flat) => {
        const k = flat ? 6 : 0, d = flat ? 1.5 : 0, S = (t) => C('plaster', t + d, k), Y = (t) => C('yellow', t + d * 0.8, k);
        b.box(0.34, 0.03, 0.14, S(0.6)); b.box(0.09, 0.5, 0.09, S(1), { y: 0.03, t: 0.2 }); b.pyr(0.1, 0.12, 0.1, Y(4.5), { y: 0.53 });
        for (const s of [-1, 1]) { b.box(0.065, 0.3, 0.07, S(1.6), { x: s * 0.11, y: 0.03, t: 0.15 }); b.pyr(0.075, 0.08, 0.08, Y(4.5), { x: s * 0.11, y: 0.33 }); b.box(0.04, 0.012, 0.06, S(0.6), { x: s * 0.055, y: 0.22 }); }
        if (!flat) { for (let i = 0; i < 4; i++) b.box(0.02, 0.035, 0.012, win('rock', 7.6, 0.05 + i * 0.15), { y: 0.1 + i * 0.1, z: 0.046 - i * 0.002, lod: 1 }); for (const s of [-1, 1]) for (let i = 0; i < 2; i++) b.box(0.016, 0.028, 0.012, win('rock', 7.6, 0.3 + i * 0.2), { x: s * 0.11, y: 0.1 + i * 0.1, z: 0.036, lod: 1 }); b.arch(0.045, 0.06, 0.014, C('neutral', 8.5), { y: 0.03, z: 0.045 }); }
      };
      const tz = cz - R - 0.09;
      b.push(0, H(0, tz) - 0.01, tz, 0, 1); tower(false); b.pop();
      area.mirror = addMirror(world, tile, cz, R - 0.02);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x = s * (0.26 + i * 0.13), z = tz + 0.02 + i * i * 0.035, y = H(x, z); b.cyl(0.01, 0.04, C('earth', 7.6), { x, z, y: y - 0.01 }); b.cone(0.05, 0.1 + (3 - i) * 0.02, C('forest', 6.4), { x, z, y: y + 0.02, pat: 1 }); b.cone(0.036, 0.08, C('forest', 5.4), { x, z, y: y + 0.075 + (3 - i) * 0.012 }); }
      const st = area.state = { ripple: -99 };
      area.onTap = () => { st.ripple = st.now || 0; };
      anim((db, fb, t, env) => {
        st.now = t;
        if (CONFIG.dynamics.fog) {
          const k = clamp(env.day * (1 - env.day) * 4) * (env.rising ? 1 : 0.22);
          if (k > 0.02) for (let i = 0; i < 7; i++) fb.cyl(0.2 + (i % 3) * 0.07, 0.016, [ROW.snow, 0.4, 0, 0.5 * k], { x: Math.sin(i * 2.4 + t * 0.05) * 0.3, y: 0.05 + i * 0.03 + k * 0.05, z: cz + Math.cos(i * 1.9) * 0.3 });
        }
        const dt = t - st.ripple;
        if (dt > 0 && dt < 3) for (let q = 0; q < 3; q++) { const rad = 0.06 + (dt - q * 0.35) * 0.17; if (rad < 0.06 || rad > 0.52) continue; const al = 0.8 * (1 - rad / 0.52); for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; fb.box(rad * 0.3, 0.003, 0.012, [ROW.snow, 0.4, 0, al], { x: Math.cos(a) * rad, y: 0.006, z: cz + Math.sin(a) * rad, ry: -a + PI / 2 }); } }
      });
    },
  },
  {
    id: 'ufo-crash', name: 'UFO crash site', ring: 'lower', hues: ['sand', 'earth', 'green'],
    details: ['beamcow', 'tinfoil'],   // hidden details that only this area has
    marks: [['Saucer', 0.24, -0.12], ['Skid mark', -0.3, 0.26]],
    look: 'Dry desert land. A flying saucer lies in a crater at the end of a long skid mark, with parts of it all over the sand. Small green aliens try to repair it.',
    motion: 'The saucer smokes, and its lights go on and off. The aliens work, carry parts, and wave.', season: '', seasonal: { flowers: ['yellow', 'orange'], n: 22, keep: (x, z) => Math.hypot(x - 0.24, z + 0.12) > 0.5 }, az: 1.25, tilt: 0.95,
    lights: [[0.24, 0.26, -0.12, 0.9, [0.5, 1.0, 0.62]], [-0.42, 0.14, 0.4, 0.4, [0.5, 1.0, 0.62]]],
    animals: { rMin: 0.55, rMax: 0.9 },
    build({ b, terrain, tile, anim }) {
      const SX = 0.24, SZ = -0.12, TX0 = -0.78, TZ0 = 0.62;   // the saucer, and where the skid mark starts
      const tdx = SX - TX0, tdz = SZ - TZ0, tl = Math.hypot(tdx, tdz), ux = tdx / tl, uz = tdz / tl;
      const H = terrain({
        h: (x, z) => {
          let h = 0.06 + n(x, z, 1.3, 14) * 0.09 + Math.sin(x * 5 + z * 3 + n(x, z, 1.1, 3) * 5) * 0.012;
          const d = Math.hypot(x - SX, z - SZ);
          if (d < 0.46) h = lerp(lerp(0.03, 0.1, smooth(0.0, 0.32, d)), Math.max(h, 0.1 + 0.04 * (1 - smooth(0.32, 0.46, d))), smooth(0.3, 0.36, d));   // the crater, with a raised rim
          const al = (x - TX0) * ux + (z - TZ0) * uz, off = Math.abs((x - TX0) * uz - (z - TZ0) * ux);
          if (al > 0 && al < tl - 0.2 && off < 0.09) h = Math.min(h, lerp(0.05, h, smooth(0.04, 0.09, off)) - 0.0 * al);   // the skid mark: a shallow trench
          return Math.max(h, 0.031);
        }, top: { row: ROW.sand, tone: 3.6, step: 0.34, altRow: ROW.earth, altEvery: 3, altTone: -1, bandH: 0.045 }, side: C('earth', 6.4), sens: 0.1,
      });
      b.sens = 0;
      const METAL = C('neutral', 2.8), METAL2 = C('neutral', 4.6), DARK = C('neutral', 9), GREEN = C('green', 5), GLASS = [ROW.sea, 2.6, 1, 0.1];
      // Scorched ground in the crater and along the skid mark.
      for (let i = 1; i < 9; i++) { const x = TX0 + ux * i * 0.1, z = TZ0 + uz * i * 0.1; b.box(0.09, 0.004, 0.07, C('earth', 7.4 + (i % 2) * 0.6), { x, y: H(x, z) - 0.001, z, ry: Math.atan2(ux, uz) }); }
      // The saucer: a wide round disc with a glass dome. It stands at an angle in the crater, with one edge in the sand.
      // disc = a round plate made of rows of blocks (a plain cylinder in this style is a cross, which does not read as a saucer).
      const disc = (R, h, col, y) => { const N = 9; for (let i = -N; i <= N; i++) { const z = (i / (N + 0.5)) * R, w = 2 * Math.sqrt(Math.max(0, R * R - z * z)); if (w > 0.01) b.box(w, h, R / (N + 0.5), col, { y, z }); } };
      const sy = H(SX, SZ) + 0.12;
      b.push(SX, sy, SZ, 0.6, 1.15, 0.1, 0.36);
      disc(0.15, 0.03, METAL2, -0.055); disc(0.24, 0.022, METAL2, -0.03);
      disc(0.32, 0.02, METAL, -0.01); disc(0.3, 0.008, C('neutral', 2.6), 0.01);
      disc(0.22, 0.022, METAL2, 0.018); disc(0.15, 0.018, METAL, 0.04);
      disc(0.11, 0.03, GLASS, 0.056); disc(0.09, 0.026, GLASS, 0.086); disc(0.055, 0.02, GLASS, 0.112);   // the dome
      b.box(0.004, 0.05, 0.004, DARK, { y: 0.13 }); b.ball(0.01, [ROW.green, 3, 2, 0], { y: 0.18 });       // the antenna
      for (const a of [0.5, 2.6, 4.7]) b.box(0.012, 0.07, 0.012, METAL2, { x: Math.cos(a) * 0.17, y: -0.1, z: Math.sin(a) * 0.17, rz: Math.cos(a) * 0.4, rx: -Math.sin(a) * 0.4 });   // three legs
      b.box(0.1, 0.012, 0.09, DARK, { x: -0.2, y: 0.012, z: 0.05, ry: 0.4 }); b.box(0.05, 0.014, 0.04, C('neutral', 8), { x: -0.15, y: 0.024, z: 0.1, ry: 0.9 });   // the hole where a panel came off
      const saucer = b.top.clone(); b.pop();
      // Parts of the saucer on the sand, and three warning cones that the aliens put out.
      const rr = rng(77);
      for (let i = 0; i < 9; i++) { const f = 0.15 + rr() * 0.75, off = (rr() - 0.5) * 0.3, x = TX0 + ux * f * tl + uz * off, z = TZ0 + uz * f * tl - ux * off, y = H(x, z); b.box(0.03 + rr() * 0.04, 0.008 + rr() * 0.02, 0.02 + rr() * 0.03, i % 3 ? METAL : METAL2, { x, y: y - 0.003, z, ry: rr() * 3, rz: (rr() - 0.5) * 0.7 }); }
      b.push(-0.2, H(-0.2, -0.36), -0.36, 0.5, 1, 0.5, 0.2); b.cyl(0.07, 0.014, METAL, {}); b.cyl(0.03, 0.012, [ROW.green, 4, 2, 0.4], { y: 0.014 }); b.pop();   // a part of the rim, with one light that still works
      for (const a of [0.4, 2.5, 4.4]) { const x = SX + Math.cos(a) * 0.45, z = SZ + Math.sin(a) * 0.45, y = H(x, z); b.cone(0.018, 0.045, C('orange', 5), { x, y, z }); b.box(0.042, 0.005, 0.042, C('orange', 5), { x, y, z }); b.cyl(0.011, 0.008, C('neutral', 0.3), { x, y: y + 0.018, z }); }
      // Cacti and rocks.
      for (let i = 0; i < 16; i++) {
        const a = rr() * TAU, d = 0.3 + rr() * 0.62, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.8 + rr() * 0.6;
        if (edgeE(tile, x, z) < 0.1 || Math.hypot(x - SX, z - SZ) < 0.5 || Math.abs((x - TX0) * uz - (z - TZ0) * ux) < 0.14) continue;
        const y = H(x, z);
        if (i % 3) { b.cyl(0.012 * s, 0.07 * s, C('forest', 6, 11), { x, y, z }); b.cyl(0.008 * s, 0.03 * s, C('forest', 5.4, 11), { x: x + 0.024 * s, y: y + 0.028 * s, z }); b.box(0.02 * s, 0.008 * s, 0.008 * s, C('forest', 6, 11), { x: x + 0.012 * s, y: y + 0.026 * s, z }); b.cyl(0.008 * s, 0.024 * s, C('forest', 5.4, 11), { x: x - 0.022 * s, y: y + 0.018 * s, z }); b.box(0.02 * s, 0.008 * s, 0.008 * s, C('forest', 6, 11), { x: x - 0.011 * s, y: y + 0.016 * s, z }); }
        else { b.ball(0.035 * s, C('earth', 5 + rr()), { x, y: y - 0.012 * s, z, sy: 0.7, sx: 1.2 }); b.ball(0.02 * s, C('earth', 6.2), { x: x + 0.04 * s, y: y - 0.008, z: z + 0.01, sy: 0.7 }); }
      }
      // One small green alien. arm = how high the right arm is (0 to 1). carry = it holds a part over its head.
      const alien = (db, x, z, ry, t, arm = 0, carry = 0, nod = 0) => {
        const y = H(x, z), bob = Math.sin(t * 3 + x * 9) * 0.002;
        db.push(x, y + bob, z, ry);
        for (const s of [-1, 1]) db.box(0.007, 0.014, 0.007, C('green', 6), { z: s * 0.006 });
        db.box(0.016, 0.022, 0.02, GREEN, { y: 0.014 });
        db.push(0, 0.036, 0, 0, 1, 0, nod);
        db.box(0.03, 0.026, 0.032, C('green', 4), {}); for (const s of [-1, 1]) { db.box(0.004, 0.012, 0.011, DARK, { x: 0.015, y: 0.008, z: s * 0.008 }); db.box(0.002, 0.014, 0.002, C('green', 6), { y: 0.026, z: s * 0.008 }); db.ball(0.004, [ROW.yellow, 3, 2, 0], { y: 0.04, z: s * 0.008 }); }
        db.pop();
        db.box(0.005, 0.02, 0.005, GREEN, { y: 0.03, z: -0.013, rx: carry ? 3.0 : 0.3 });
        db.box(0.005, 0.02, 0.005, GREEN, { y: 0.03, z: 0.013, rx: carry ? -3.0 : -0.3 - arm * 2.4 });
        if (carry) db.box(0.03, 0.008, 0.05, METAL, { y: 0.07 });
        db.pop();
      };
      anim((db, fb, t, env) => {
        const tt = REDUCED ? 2 : t;
        // The lights on the rim of the saucer go on and off, one after the other. Smoke and sparks come from the hole.
        db.pushM(new THREE.Matrix4().copy(tile.matrix).invert().multiply(saucer));
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, on = (Math.floor(tt * 3) + i) % 5 === 0; db.box(0.03, 0.014, 0.03, on ? [ROW.green, 3, 2, 0] : [ROW.yellow, 4, 2, 0], { x: Math.cos(a) * 0.29, y: 0.014, z: Math.sin(a) * 0.29 }); }
        if (Math.sin(tt * 2.3) > 0.2) db.box(0.05, 0.02, 0.05, [ROW.green, 3, 2, 0], { y: 0.07 });   // the lamp in the dome
        db.pop();
        const hx = SX - 0.2, hz = SZ + 0.12, hy = H(SX, SZ) + 0.16;
        if (!REDUCED) puffs(db, t, hx, hy, hz, 5, 0.3, C('neutral', 6.4), 0.036, 0.16);
        if (!REDUCED && (tt % 2.2) < 0.5) for (let i = 0; i < 4; i++) { const f = ((tt * 3 + i / 4) % 1); db.box(0.008, 0.008, 0.008, [ROW.yellow, 3, 6, 0], { x: hx + Math.sin(i * 2.1) * f * 0.07, y: hy - 0.02 + Math.sin(f * PI) * 0.05, z: hz + Math.cos(i * 1.7) * f * 0.07 }); }
        // The aliens. One repairs the saucer, one looks at the damage, one carries a part along the skid mark, one waves, one reads the manual.
        alien(db, SX - 0.4, SZ + 0.24, -0.7, tt, 0.5 + 0.5 * Math.sin(tt * 9));
        alien(db, SX + 0.42, SZ + 0.14, 2.6, tt, 0, 0, Math.sin(tt * 0.8) * 0.35);
        const w = 0.5 - 0.5 * Math.cos(tt * 0.25), cx = TX0 + ux * (0.2 + w * 0.5) * tl + uz * 0.13, cz = TZ0 + uz * (0.2 + w * 0.5) * tl - ux * 0.13;
        alien(db, cx, cz, Math.atan2(-uz, ux) + (Math.sin(tt * 0.25) < 0 ? PI : 0), tt * 3, 0, 1);
        alien(db, 0.52, 0.5, -1.2, tt, 0.55 + 0.45 * Math.sin(tt * 6));
        alien(db, -0.5, -0.3, 0.5, tt, 0.15, 0, 0.3 + Math.sin(tt * 0.6) * 0.1); db.box(0.03, 0.002, 0.04, C('neutral', 0.4), { x: -0.5 + 0.022, y: H(-0.5, -0.3) + 0.03, z: -0.3 + 0.012, ry: 0.5, rz: 0.5 });
      }, { minLod: 0.12 });
    },
  },
];

// Map each area to one pentagon. Related areas sit near each other.
export function buildAreas(world, out) {
  const pents = world.pents.slice();
  const north = pents.reduce((a, b) => (b.center.y > a.center.y ? b : a)), south = pents.reduce((a, b) => (b.center.y < a.center.y ? b : a));
  const lonSort = (a, b) => a.lon - b.lon;
  const upper = pents.filter((p) => p !== north && p.center.y > 0).sort(lonSort), lower = pents.filter((p) => p !== south && p.center.y < 0).sort(lonSort);
  const pick = { north: [north], south: [south], upper, lower }, used = { north: 0, south: 0, upper: 0, lower: 0 };
  const list = [];
  for (const def of AREAS) {
    const tile = pick[def.ring][used[def.ring]++];
    if (def.round) world.roundTile = roundTile(tile, world.tiles);   // this cell is a circle
    const area = { kind: 'area', def, tile, name: def.name, az: def.az ?? 1.2, tilt: def.tilt, lift: def.lift, camDist: def.dist, animators: [], details: [], desc: `${def.name}. Unique area. ${def.look} ${def.motion}` };
    const b = new Builder(out.batch(tile), out.acc, tile.matrix, tile.index);
    b.water = out.water ? out.water(tile) : null;
    const rec = []; let recOn = true; b.rec = rec;
    const anim = (fn, o) => {
      const a = out.addAnimator(tile, fn, o); area.animators.push(a);
      // Moving parts go in the plan view too: draw one frame into a builder that only records.
      if (recOn) { try { const rb = new Builder(NOBATCH, null, (o && o.base) || tile.matrix, tile.index); rb.rec = rec; rb.recBase = tile.matrix; fn(rb, new Builder(NOBATCH, null, tile.matrix, tile.index), 0, ENV0); } catch (e) { /* this part is not in the plan */ } }
      return a;
    };
    const terrain = (spec) => {
      const raw = spec.noRim ? spec.h : rimmed(tile, spec.h);   // noRim: the land does not reach the edge of the tile
      const H = voxelH(raw);
      const side = spec.side ? [spec.side[0], spec.side[1]] : undefined, water = spec.water ? [spec.water[0], spec.water[1]] : undefined;
      b.rec = null;   // the land is drawn from H in the plan view, not from its blocks
      buildVoxelTerrain(b, tile, { ...spec, H, side, water, top: { altTone: 0, ...spec.top } });
      b.rec = rec;
      area.H = H; return H;
    };
    const _lv = new THREE.Vector3();
    const light = (x, y, z, rad, col = [1, 0.86, 0.6], spin) => { if (out.addLight) out.addLight({ pos: _lv.set(x, y, z).applyMatrix4(tile.matrix).clone(), r: rad * tile.rin * 1.25, col, dir: tile.center, spin: spin || null }); };
    for (const [x, y, z, rad, col] of def.lights || []) light(x, y, z, rad, col);
    def.build({ b, tile, anim, terrain, area, world, light });
    b.rec = null; recOn = false;
    area.plan = makePlan(rec, area.H, tile, def.marks);
    area.blocks = rec.filter((q) => q.size >= 0.03).map((q) => q.pts);   // footprints of the objects: details and seasonal pieces stay clear of them
    const sp = area.H ? seasonProps(b, tile, area.H, { ...def.seasonal, blocks: area.blocks }) : null;
    area.season = [def.season, sp && sp.flowers ? 'Spring: small flowers come up.' : '', sp && sp.snow ? `Winter: snow piles${sp.floes ? ', and ice floats on the water' : ''}.` : ''].filter(Boolean).join(' ');
    if (AREA_ANIMALS[def.id] && area.H) area.animals = addAnimals({ anim, H: area.H, tile, list: AREA_ANIMALS[def.id], n: 5, seed: tile.index + 3, ...(def.animals || {}) });
    // Each unique area hides two details that no other tile has.
    area.c = { p: () => C('rock', 5), s: () => C('plaster', 1.2), a: () => C(def.accent || 'orange', 5), W: C('plaster', 0.3), K: C('neutral', 8.5), g: () => C('grass', 4.6) };
    area.occ = [{ x: 0, z: 0, r: 0.3 }];
    addDetails(area, b, anim, rng(tile.index), def.details);
    list.push(area);
  }
  return list;
}

// Polar aurora: wavy ribbons of flat color bands, drawn by a shader.
export function addAurora(world) {
  const mat = () => new THREE.ShaderMaterial({
    uniforms: { uTime: world.U.uTime, uSunDir: world.U.uSunDir, uPhase: { value: 0 }, uA: { value: new THREE.Vector3(0.584, 0.392, 1.0) }, uB: { value: new THREE.Vector3(0.169, 0.906, 0.278) }, uOn: { value: 1 } },
    vertexShader: `uniform float uTime; uniform float uPhase; varying vec2 vUv; varying vec3 vW;
      void main(){ vUv = uv; vec3 p = position; float a = uv.x * 6.2832;
        float w = sin(a * 3.0 + uTime * 0.25 + uPhase) * 0.05 + sin(a * 7.0 - uTime * 0.17 + uPhase * 2.0) * 0.025;
        p.xz *= 1.0 + w * (0.4 + uv.y); p.y += sin(a * 5.0 + uTime * 0.3 + uPhase) * 0.012;
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime; uniform float uPhase; uniform vec3 uSunDir; uniform vec3 uA; uniform vec3 uB; uniform float uOn; varying vec2 vUv; varying vec3 vW;
      void main(){ float a = vUv.x * 6.2832;
        float top = 0.55 + 0.3 * sin(a * 4.0 + uTime * 0.35 + uPhase) + 0.14 * sin(a * 11.0 - uTime * 0.5);
        float body = step(vUv.y, top);
        float band = floor(vUv.y / max(top, 0.05) * 3.0);
        vec3 col = band < 0.5 ? uA : (band < 1.5 ? mix(uA, uB, 0.5) : uB);
        float fold = 0.8 + 0.2 * step(0.5, fract(vUv.x * 18.0 + sin(vUv.y * 3.0 + uTime * 0.3 + uPhase) * 0.3));
        float night = 1.0 - smoothstep(-0.25, 0.3, dot(normalize(vW), uSunDir) + ${DAY_GLSL});
        float alpha = body * fold * (0.9 - band * 0.2) * (0.16 + 0.74 * night) * uOn;
        if (alpha < 0.01) discard; gl_FragColor = vec4(col, alpha); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const meshes = [];
  for (const pole of [1, -1]) for (let i = 0; i < 2; i++) {
    const rad = 0.2 + i * 0.13, g = new THREE.CylinderGeometry(rad * 1.1, rad, 0.13 + i * 0.02, 96, 4, true);
    const m = new THREE.Mesh(g, mat());
    m.position.y = pole * (1.2 - i * 0.05); if (pole < 0) m.rotation.x = PI;
    m.material.uniforms.uPhase.value = i * 2.3 + (pole < 0 ? 1.1 : 0);
    m.renderOrder = 4; m.frustumCulled = false; world.scene.add(m); meshes.push(m);
  }
  world.aurora = meshes;
}
