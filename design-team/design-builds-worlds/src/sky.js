// Things above and around the planet: soft particle clouds, weather systems (wind, a storm with rain),
// small 3D objects on the orbit lines, and the outline that shows a free tile under the pointer.
import * as THREE from 'three';
import { CONFIG, REDUCED, DAY_GLSL } from './config.js';
import { PrimBatch, Builder } from './prims.js';
import { ROW, regionPalette } from './palette.js';
import { colors } from './heroes.js';
import { rng, TAU } from './util.js';

const V = THREE.Vector3;
// Value noise for the clouds, read from a small 3D texture (64 cells each way, it repeats). One read replaces eight hash sums for each sample.
const NOISE = /* glsl */`
precision highp sampler3D;
uniform sampler3D tNoise;
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return texture(tNoise, (i + f + 0.5) / 64.0).r; }`;
let noiseTex = null;
function noise3D() {
  if (noiseTex) return noiseTex;
  const N = 64, data = new Uint16Array(N * N * N), fr = (v) => v - Math.floor(v);
  // The same hash as before, so the clouds keep their look.
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let px = fr(x * 0.3183099 + 0.1) * 17, py = fr(y * 0.3183099 + 0.1) * 17, pz = fr(z * 0.3183099 + 0.1) * 17; data[(z * N + y) * N + x] = THREE.DataUtils.toHalfFloat(fr(px * py * pz * (px + py + pz))); }
  noiseTex = new THREE.Data3DTexture(data, N, N, N);
  noiseTex.format = THREE.RedFormat; noiseTex.type = THREE.HalfFloatType; noiseTex.minFilter = noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.wrapS = noiseTex.wrapT = noiseTex.wrapR = THREE.RepeatWrapping; noiseTex.unpackAlignment = 1; noiseTex.needsUpdate = true;
  return noiseTex;
}
// Clouds are see-through shells, one above the other. Every shell reads the same cloud field.
// A higher shell shows only the thicker parts, so a cloud has height (like the aurora bands, but for weather).
const CLOUD_V = /* glsl */`
varying vec3 vP; varying vec3 vW;
void main(){ vP = position; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const CLOUD_F = /* glsl */`
uniform float uT, uLayer, uLod, uStormOn, uCloudK; uniform vec3 uSunDir, uStormC, uStormX;
uniform vec4 uEgg[6]; uniform float uEggR[6];   // the electric storm of the storm eye area: thick, dark cloud over up to six tiles (xyz = the middle of a tile, w = how strong, 0 = none)
varying vec3 vP; varying vec3 vW;
${NOISE}
// A cyclone seen from above. r: 0 at the centre, 1 at the outer edge. e: the radius of the clear eye. The result is the cloud height.
// The bands are log spirals, so the turn also reads as flow to the centre. The cloud detail moves along the bands into the eyewall.
float cyclone(float r, float th, float t, float e){
  float lr = log(max(r, e * 0.6));
  float s = th + 3.1 * lr - t * 0.1;                                            // constant along one band
  float cs = cos(s), sn = sin(s), fl = lr + t * 0.022;                           // fl: the flow along the band, to the centre
  float big = vn(vec3(cs * 1.5, sn * 1.5, fl * 1.6));
  float fine = vn(vec3(cs * 4.3 + 7.0, sn * 4.3, fl * 4.6 + 2.0));
  float arm = 0.5 + 0.5 * sin(2.0 * s + 1.1 * sn + (big - 0.5) * 2.4);          // two bands that are not equal, with rough edges
  arm = arm * arm * (3.0 - 2.0 * arm);
  float eye = smoothstep(e * 0.8, e * 1.15, r);
  float wall = 1.0 - smoothstep(e * 1.3, e * 2.6, r);                           // the eyewall: the highest cloud
  float core = 1.0 - smoothstep(0.26, 0.62, r);                                 // the thick middle
  float edge = 1.0 - smoothstep(0.6, 1.0, r);
  float h = wall * 0.22 + core * 0.2 + arm * edge * (0.24 + 0.08 * core) + ((fine - 0.5) * 0.14 + (big - 0.5) * 0.1) * edge;
  return max(h, 0.0) * eye;
}
void main(){
  vec3 p = normalize(vP);
  float a = uT * 0.012, ca = cos(a), sa = sin(a);
  vec3 q = vec3(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);                 // the wind turns the whole field
  float n = vn(q * 3.1 + vec3(0.0, uT * 0.008, 0.0)) * 0.55 + vn(q * 6.7 + vec3(uT * 0.016, 0.0, 3.0)) * 0.3 + vn(q * 14.0 - vec3(0.0, 0.0, uT * 0.025)) * 0.15;
  n -= smoothstep(0.72, 0.95, abs(p.y)) * 0.12;                                 // fewer clouds at the poles: the auroras live there
  float stormK = 0.0;
  float d = acos(clamp(dot(p, uStormC), -1.0, 1.0));
  if (uStormOn > 0.5 && d < 0.34) {                                             // the storm: a cyclone (see cyclone())
    float th = atan(dot(p, cross(uStormC, uStormX)), dot(p, uStormX));
    float r = d / 0.34, hc = cyclone(r, -th, uT * 4.6, 0.1);   // it turns fast: one turn in about 14 seconds, like a hurricane in a weather film
    float env = 1.0 - smoothstep(0.72, 1.0, r);
    stormK = env;
    n = mix(n, 0.565 + hc * 0.62 + (n - 0.5) * 0.12, env);
  }
  float eggK = 0.0;
  for (int i = 0; i < 6; i++) {
    if (uEgg[i].w <= 0.0) continue;
    float dd = acos(clamp(dot(p, uEgg[i].xyz), -1.0, 1.0)) / uEggR[i];
    float e2 = (1.0 - smoothstep(0.72, 1.02, dd + (n - 0.5) * 0.7)) * uEgg[i].w;   // the edge follows the cloud field, so it is not a circle
    if (i == 5) e2 *= smoothstep(0.24, 0.46, dd);                                // the storm eye itself: its middle stays open, so the lighthouse shows
    eggK = max(eggK, e2);
  }
  n = mix(n, 0.655 + (n - 0.5) * 0.85, eggK);                                   // the same cloud field, with much more cloud: thick, with towers and a few gaps
  float th0 = 0.61 + uLayer * 0.045;
  float dens = smoothstep(th0, th0 + 0.035, n);
  if (dens < 0.01) discard;
  float day = smoothstep(-0.15, 0.25, dot(p, uSunDir) + ${DAY_GLSL});
  float h = uLayer / 3.0;
  vec3 lit = mix(vec3(0.78, 0.84, 0.92), vec3(1.0), h);                         // the base is in shade, the top is white
  lit = mix(lit, lit * vec3(0.56, 0.61, 0.7), stormK * (0.7 - h * 0.6));
  lit = mix(lit, lit * vec3(0.36, 0.4, 0.5), eggK * (0.95 - h * 0.4));           // storm cloud: dark, with a paler top
  vec3 col = mix(mix(vec3(0.14, 0.18, 0.3), vec3(0.3, 0.36, 0.5), h), lit, day);
  float al = dens * (0.26 + 0.26 * stormK + 0.34 * eggK) * mix(1.0 - smoothstep(0.5, 0.82, uLod), 1.0, eggK) * uCloudK;   // the clouds go away in a close view, but not the electric storm
  gl_FragColor = vec4(col, al);
}`;
// The storm eye area: flat see-through layers over the tile, with the same idea.
const EYE_V = /* glsl */`
varying vec2 vQ; varying vec3 vW;
void main(){ vQ = position.xz; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const EYE_F = /* glsl */`
uniform float uT, uLayer; uniform vec3 uSunDir;
varying vec2 vQ; varying vec3 vW;
${NOISE}
// A cyclone seen from above. r: 0 at the centre, 1 at the outer edge. e: the radius of the clear eye. The result is the cloud height.
// The bands are log spirals, so the turn also reads as flow to the centre. The cloud detail moves along the bands into the eyewall.
float cyclone(float r, float th, float t, float e){
  float lr = log(max(r, e * 0.6));
  float s = th + 3.1 * lr - t * 0.1;                                            // constant along one band
  float cs = cos(s), sn = sin(s), fl = lr + t * 0.022;                           // fl: the flow along the band, to the centre
  float big = vn(vec3(cs * 1.5, sn * 1.5, fl * 1.6));
  float fine = vn(vec3(cs * 4.3 + 7.0, sn * 4.3, fl * 4.6 + 2.0));
  float arm = 0.5 + 0.5 * sin(2.0 * s + 1.1 * sn + (big - 0.5) * 2.4);          // two bands that are not equal, with rough edges
  arm = arm * arm * (3.0 - 2.0 * arm);
  float eye = smoothstep(e * 0.8, e * 1.15, r);
  float wall = 1.0 - smoothstep(e * 1.3, e * 2.6, r);                           // the eyewall: the highest cloud
  float core = 1.0 - smoothstep(0.26, 0.62, r);                                 // the thick middle
  float edge = 1.0 - smoothstep(0.6, 1.0, r);
  float h = wall * 0.22 + core * 0.2 + arm * edge * (0.24 + 0.08 * core) + ((fine - 0.5) * 0.14 + (big - 0.5) * 0.1) * edge;
  return max(h, 0.0) * eye;
}
void main(){
  float r = length(vQ), th = atan(vQ.y, vQ.x);
  float n = 0.27 + cyclone(r / 0.98, -th, uT * 3.2, 0.26) * 0.95;
  float th0 = 0.36 + uLayer * 0.06;
  float dens = smoothstep(th0, th0 + 0.035, n);
  if (dens < 0.01) discard;
  float day = smoothstep(-0.15, 0.25, dot(normalize(vW), uSunDir) + ${DAY_GLSL});
  float h = uLayer / 4.0;
  vec3 lit = mix(vec3(0.5, 0.56, 0.68), vec3(0.97, 0.98, 1.0), h);
  vec3 col = mix(mix(vec3(0.13, 0.17, 0.28), vec3(0.32, 0.38, 0.52), h), lit, day);
  gl_FragColor = vec4(col, dens * 0.34);
}`;
// The cloud of a sky region: flat see-through layers over the tile, one above the other, with the cloud field and the colors of the clouds of the planet.
// It is thick, so it reads as a solid cloud from near and from far. The buildings of the region stand on its top (top, in tile units).
const BED_F = /* glsl */`
uniform float uT, uLayer, uTop; uniform vec3 uSunDir;
varying vec2 vQ; varying vec3 vW;
${NOISE}
void main(){
  float r = length(vQ), h = uLayer / uTop;
  float n = vn(vec3(vQ * 2.4 + vec2(uT * 0.02, 0.0), uLayer * 0.35)) * 0.6 + vn(vec3(vQ * 6.0 - vec2(0.0, uT * 0.03), uLayer * 0.5 + 4.0)) * 0.4;
  float wide = mix(0.7, 0.96, sin(h * 2.67)) + (n - 0.5) * 0.3;                   // the cloud is widest a little over the middle of its height. Its edge is not a circle.
  float dens = (1.0 - smoothstep(wide - 0.2, wide, r)) * smoothstep(0.16, 0.38, n + (1.0 - r) * 0.5);
  if (dens < 0.02) discard;
  float day = smoothstep(-0.15, 0.25, dot(normalize(vW), uSunDir) + ${DAY_GLSL});
  vec3 lit = mix(vec3(0.78, 0.84, 0.92), vec3(1.0), h);                         // the base is in shade, the top is white (as the clouds of the planet)
  vec3 col = mix(mix(vec3(0.14, 0.18, 0.3), vec3(0.3, 0.36, 0.5), h), lit, day);
  gl_FragColor = vec4(col, dens * 0.5);
}`;
// Shapes of cloud that stand on the cloud of a region (the body and the towers of the sky castle). Each shape is a pile of flat see-through discs, as the cloud is.
// All of them are one mesh. The discs are in order from low to high, so that they mix in the correct order when you look from above.
const PART_V = /* glsl */`
attribute vec3 aQ;
varying vec3 vQ; varying vec3 vW; varying vec3 vL;
void main(){ vQ = aQ; vL = position; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const PART_F = /* glsl */`
uniform float uT; uniform vec3 uSunDir;
varying vec3 vQ; varying vec3 vW; varying vec3 vL;
${NOISE}
void main(){
  float r = length(vQ.xy), h = vQ.z;
  float n = vn(vec3(vL.xz * 9.0 + vec2(uT * 0.03, 0.0), vL.y * 9.0)) * 0.6 + vn(vec3(vL.xz * 23.0, vL.y * 21.0 + 4.0 - uT * 0.04)) * 0.4;
  float wide = 0.84 + (n - 0.5) * 0.42;                                           // the edge is not a circle
  float dens = 1.0 - smoothstep(wide - 0.2, wide, r);
  if (dens < 0.02) discard;
  float day = smoothstep(-0.15, 0.25, dot(normalize(vW), uSunDir) + ${DAY_GLSL});
  vec3 lit = mix(vec3(0.8, 0.86, 0.94), vec3(1.0), 0.35 + 0.65 * h) * mix(1.0, 0.9, smoothstep(0.35, 0.9, r));   // white at the top, a little shade at the edge of each puff
  vec3 col = mix(mix(vec3(0.16, 0.2, 0.32), vec3(0.32, 0.38, 0.52), h), lit, day);
  gl_FragColor = vec4(col, dens * 0.46);
}`;
function partsGeometry(parts) {
  const discs = [], S = 18, pos = [], q = [], idx = [];
  parts.forEach(([x, z, R, y0, y1], pi) => {
    const n = Math.max(4, Math.round((y1 - y0) / 0.0065));
    for (let i = 0; i <= n; i++) discs.push({ x, z, y: y0 + (y1 - y0) * (i / n), R: R * (0.9 + 0.12 * Math.sin(i * 0.75 + pi * 2.1)) * Math.min(1, (n - i) / 5 + 0.5), h: i / n });   // each shape has soft bulges and a round top
  });
  discs.sort((a, b) => a.y - b.y);
  for (const d of discs) {
    const base = pos.length / 3; pos.push(d.x, d.y, d.z); q.push(0, 0, d.h);
    for (let k = 0; k < S; k++) { const a = (k / S) * Math.PI * 2; pos.push(d.x + Math.cos(a) * d.R, d.y, d.z + Math.sin(a) * d.R); q.push(Math.cos(a), Math.sin(a), d.h); }
    for (let k = 0; k < S; k++) idx.push(base, base + 1 + k, base + 1 + ((k + 1) % S));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aQ', new THREE.Float32BufferAttribute(q, 3)); g.setIndex(idx);
  return g;
}
export function makeCloudBed(world, tile, top, depth = 0.24, layers = 11) {
  const grp = new THREE.Group(); grp.matrixAutoUpdate = false; grp.matrix.copy(tile.matrix);
  const g = new THREE.CircleGeometry(1, 48); g.rotateX(-Math.PI / 2);
  const uT = { value: 0 }, mats = [];
  for (let i = 0; i < layers; i++) {
    const mat = new THREE.ShaderMaterial({ uniforms: { uT, uSunDir: world.U.uSunDir, uLayer: { value: i }, uTop: { value: layers - 1 }, tNoise: { value: noise3D() } }, vertexShader: EYE_V, fragmentShader: BED_F, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(g, mat); mats.push(mat);
    m.position.y = top - depth + (i / (layers - 1)) * (depth + 0.03); m.renderOrder = 4.3 + i * 0.05; m.frustumCulled = false; grp.add(m);
  }
  world.scene.add(grp);
  let pm = null, pkey = '';
  const pmat = new THREE.ShaderMaterial({ uniforms: { uT, uSunDir: world.U.uSunDir, tNoise: { value: noise3D() } }, vertexShader: PART_V, fragmentShader: PART_F, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  mats.push(pmat);
  return {
    grp, uT,
    // The shapes of cloud that stand on this cloud. They are made again only when the list changes.
    parts(list) {
      const key = list.map((p) => p.map((v) => v.toFixed(3)).join(',')).join(';');
      if (key === pkey) return; pkey = key;
      if (pm) { grp.remove(pm); pm.geometry.dispose(); pm = null; }
      if (list.length) { pm = new THREE.Mesh(partsGeometry(list), pmat); pm.renderOrder = 4.9; pm.frustumCulled = false; grp.add(pm); }
    },
    lift(v) { grp.matrix.copy(tile.matrix); const e = grp.matrix.elements; e[12] += v.x; e[13] += v.y; e[14] += v.z; },   // the region rises from the sea, or goes down into it
    dispose() { world.scene.remove(grp); g.dispose(); if (pm) pm.geometry.dispose(); for (const q of mats) q.dispose(); },
  };
}

export function addStormEye(world, tile) {
  const grp = new THREE.Group(); grp.matrixAutoUpdate = false; grp.matrix.copy(tile.matrix);
  const g = new THREE.CircleGeometry(1, 56); g.rotateX(-Math.PI / 2);
  const uT = { value: 0 };
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uT, uSunDir: world.U.uSunDir, uLayer: { value: i }, tNoise: { value: noise3D() } }, vertexShader: EYE_V, fragmentShader: EYE_F, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.position.y = 0.25 + i * 0.024; m.renderOrder = 5 + i * 0.1; m.frustumCulled = false; grp.add(m);
  }
  world.scene.add(grp); world.stormEye = { grp, uT };
}

function frame(dir) { const e1 = new V().crossVectors(new V(0, 1, 0), dir); if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); e1.normalize(); return [e1, new V().crossVectors(e1, dir).normalize()]; }
const sph = (lat, lon) => new V(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));

export class Weather {
  constructor(world) {
    this.world = world; this.group = new THREE.Group(); world.scene.add(this.group);
    const r = rng(2026);
    this.cloudU = { uT: { value: 0 }, uSunDir: world.U.uSunDir, uLod: world.U.uLod, uStormC: { value: new V(0, 1, 0) }, uStormX: { value: new V(1, 0, 0) }, uStormOn: { value: 1 }, uCloudK: { value: 1 }, tNoise: { value: noise3D() }, uEgg: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, 1, 0, 0)) }, uEggR: { value: [1, 1, 1, 1, 1, 1] } };
    this.shells = [];
    const sg = new THREE.SphereGeometry(1, 72, 44);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: { ...this.cloudU, uLayer: { value: i } }, vertexShader: CLOUD_V, fragmentShader: CLOUD_F, transparent: true, depthWrite: false }));
      m.scale.setScalar(1.13 + i * 0.016); m.renderOrder = 6 + i * 0.1; m.frustumCulled = false; this.group.add(m); this.shells.push(m);
    }
    // A storm: dark spiral arms in the cloud shells, with rain under it. It travels around the planet.
    {
      const c0 = sph(-0.32, 4.4), [e1, e3] = frame(c0), grp = new THREE.Group(); this.group.add(grp);
      this.storm = { grp, axis: new V(-0.2, 1, 0.1).normalize(), speed: 0.0065 }; this.stormX = e1;   // it moves slowly: one time around the planet in about 16 minutes
      // rain
      const N = 260, p = [], end = [], ph = [];
      for (let i = 0; i < N; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.2, dir = c0.clone().addScaledVector(e1, Math.cos(a) * d).addScaledVector(e3, Math.sin(a) * d).normalize(), q = r(); for (let k = 0; k < 2; k++) { p.push(dir.x, dir.y, dir.z); end.push(k); ph.push(q); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 1)); g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
      this.rain = new THREE.LineSegments(g, new THREE.ShaderMaterial({
        uniforms: { uTime: world.U.uTime, uSunDir: world.U.uSunDir },
        vertexShader: 'attribute float aEnd; attribute float aPhase; uniform float uTime; varying float vA; varying vec3 vW; void main(){ float f = fract(uTime * 1.25 + aPhase); float rr = mix(1.175, 1.0, f) + aEnd * 0.022; vec4 wp = modelMatrix * vec4(position * rr, 1.0); vW = wp.xyz; vA = (1.0 - smoothstep(0.85, 1.0, f)) * smoothstep(0.0, 0.1, f); gl_Position = projectionMatrix * viewMatrix * wp; }',
        fragmentShader: 'uniform vec3 uSunDir; varying float vA; varying vec3 vW; void main(){ float day = smoothstep(-0.15, 0.2, dot(normalize(vW), uSunDir) + ' + DAY_GLSL + '); gl_FragColor = vec4(mix(vec3(0.45, 0.55, 0.75), vec3(0.86, 0.91, 0.97), day), vA * 0.6); }',
        transparent: true, depthWrite: false,
      }));
      this.rain.frustumCulled = false; this.rain.renderOrder = 5; this.storm.grp.add(this.rain);
      this.stormDir = c0;
    }
    // Wind: thin streaks that flow along the wind bands.
    {
      const N = 150, lat = [], lon = [], seg = [], ph = [], dr = [], len = [], pp = [];
      for (let i = 0; i < N; i++) {
        const la = Math.asin(r.range(-0.93, 0.93)), lo = r() * TAU, q = r(), L = r.range(0.14, 0.34), d = Math.abs(la) < 0.36 ? -1 : Math.abs(la) < 0.95 ? 1 : -1;
        for (let k = 0; k < 7; k++) for (const e of [k, k + 1]) { lat.push(la); lon.push(lo); seg.push(e / 7); ph.push(q); dr.push(d); len.push(L); pp.push(0, 0, 0); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      for (const [k, a] of [['aLat', lat], ['aLon', lon], ['aSeg', seg], ['aPhase', ph], ['aDir', dr], ['aLen', len]]) g.setAttribute(k, new THREE.Float32BufferAttribute(a, 1));
      this.wind = new THREE.LineSegments(g, new THREE.ShaderMaterial({
        uniforms: { uTime: world.U.uTime, uSunDir: world.U.uSunDir, uLod: world.U.uLod, uK: { value: 1 } },
        vertexShader: `attribute float aLat, aLon, aSeg, aPhase, aDir, aLen; uniform float uTime, uLod, uK; varying float vA; varying vec3 vW;
          void main(){ float life = fract(uTime * 0.07 + aPhase); float lo = aLon + aDir * (life * 0.8 + aSeg * aLen); float la = aLat + 0.035 * sin(lo * 3.0 + aPhase * 20.0);
            vec3 p = vec3(cos(la) * cos(lo), sin(la), cos(la) * sin(lo)) * 1.062; vW = p;
            vA = sin(3.1416 * aSeg) * sin(3.1416 * life) * uK * (1.0 - smoothstep(0.4, 0.75, uLod));
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
        fragmentShader: 'uniform vec3 uSunDir; varying float vA; varying vec3 vW; void main(){ float day = smoothstep(-0.15, 0.2, dot(normalize(vW), uSunDir) + ' + DAY_GLSL + '); gl_FragColor = vec4(vec3(1.0), vA * (0.16 + 0.44 * day)); }',
        transparent: true, depthWrite: false,
      }));
      this.wind.frustumCulled = false; this.wind.renderOrder = 4; this.group.add(this.wind);
    }
  }
  update(t) {
    const on = CONFIG.dynamics.clouds, tt = REDUCED ? 30 : t, s = this.storm, tier = this.world.tier;
    s.grp.visible = on && CONFIG.dynamics.weather;
    s.grp.quaternion.setFromAxisAngle(s.axis, tt * s.speed + Math.sin(tt * 0.021) * 0.05);   // a slow path that is not a plain circle
    this.cloudU.uT.value = tt;
    this.cloudU.uStormC.value.copy(this.stormDir).applyQuaternion(s.grp.quaternion);
    this.cloudU.uStormX.value.copy(this.stormX).applyQuaternion(s.grp.quaternion);
    this.cloudU.uStormOn.value = s.grp.visible ? 1 : 0;
    this.shells.forEach((m, i) => { m.visible = on && i < (tier === 'low' ? 2 : tier === 'medium' ? 3 : 4); });
    this.wind.visible = CONFIG.dynamics.weather;
    if (this.world.stormEye) this.world.stormEye.uT.value = tt;
    for (const bed of this.world.cloudBeds.values()) bed.uT.value = tt;
  }
}

// Three small objects ride the orbit lines: a moon, a satellite, a comet. (The sun is in world.js.)
// A meteor shower (a click on the comet starts it): for some seconds, many small lights fly past the planet, all in about the same direction.
// No meteor comes near the planet. Each one goes on a straight line that passes beside the planet, in the part of the view where there is the most room:
// the two opposite corners. So the lines go from corner to corner of the view, on the two sides of the planet. world.meteors() sets this frame when the shower starts.
const METEOR_S = 9, METEOR_N = 120, METEOR_MIN = 1.3;
function addMeteors(world) {
  const r = rng(77), list = [], _d = new V(), _x = new V(), _y = new V(), _p0 = new V(), _mm = new THREE.Matrix4();
  for (let i = 0; i < METEOR_N; i++) list.push({ at: r() * (METEOR_S - 2.6), q: r(), side: r() < 0.5 ? 1 : -1, dep: -0.2 + r() * 0.8, j: new V(r() - 0.5, r() - 0.5, r() - 0.5), v: 2.3 + r() * 1.4, w: 0.7 + r() * 0.8, warm: r() < 0.3 });
  // Where the line of one meteor is nearest to the planet (a point in world units). f = the frame of the shower.
  const mid = (m, f, out) => {
    if (!f.front) return out.set(0, 0, 0).addScaledVector(f.W, m.side * (METEOR_MIN + m.q * (f.max - METEOR_MIN))).addScaledVector(f.U, m.dep);
    // A narrow view (a phone): the planet is as wide as the view, so there is no room beside it. The meteors pass in front of it, well over the surface (1.5 to 2.5 from the center).
    const dep = 1.5 + (m.dep + 0.2) * 1.25;
    return out.set(0, 0, 0).addScaledVector(f.W, m.side * m.q * f.max * (1 - dep / CONFIG.camera.zoomMax)).addScaledVector(f.U, dep);
  };
  world.addAnimator(null, (b, fb, t) => {
    const f = world.meteorFrame; if (!f) return;
    const age = t - f.at; if (age < 0 || age > METEOR_S) { world.meteorFrame = null; return; }
    const cam = _x.copy(world.camera.position).normalize();
    for (const m of list) {
      const life = age - m.at, span = 6.4 / m.v; if (life < 0 || life > span) continue;
      _d.copy(f.D).addScaledVector(m.j, 0.05).normalize();
      mid(m, f, _p0).addScaledVector(_d, -3.2 + life * m.v);
      const k = Math.min(1, life * 4) * Math.min(1, (span - life) * 3), len = 0.34 * m.w * Math.min(1, life * 3) * (f.front ? 0.6 : 1);
      _y.crossVectors(_d, cam); if (_y.lengthSq() < 1e-6) _y.set(0, 1, 0); _y.normalize(); _x.crossVectors(_y, _d);
      _mm.makeBasis(_x, _y, _d); if (f.front) _mm.scale(_y.set(0.55, 0.55, 1)); _mm.setPosition(_p0); _x.copy(world.camera.position).normalize();   // nearer to the viewer: thinner, so it looks the same size
      fb.pushM(_mm);
      fb.box(0.018 * m.w, 0.018 * m.w, 0.036, [m.warm ? ROW.yellow : ROW.blue, m.warm ? 2 : 2.4, 0, k], { z: -0.018 });        // the bright head (it has a color, so it shows on the white backdrop too)
      fb.box(0.012 * m.w, 0.012 * m.w, len * 0.5, [m.warm ? ROW.yellow : ROW.blue, m.warm ? 4 : 4.4, 0, k * 0.8], { z: -0.036 - len * 0.25 });
      fb.box(0.007 * m.w, 0.007 * m.w, len * 0.5, [m.warm ? ROW.orange : ROW.blue, 5, 0, k * 0.45], { z: -0.036 - len * 0.75 });   // the tail gets thin and faint
      fb.pop();
    }
  });
  // Start a shower. away = the direction to the comet: the meteors fly away from that side.
  world.meteors = (away) => {
    const c = world.camera, Rv = new V().setFromMatrixColumn(c.matrixWorld, 0), Uv = new V().setFromMatrixColumn(c.matrixWorld, 1), U = new V().setFromMatrixColumn(c.matrixWorld, 2);
    // The size of the view at the planet when the camera is far out (the camera goes out for a shower: see discover.js).
    const hh = CONFIG.camera.zoomMax * Math.tan((CONFIG.camera.fov * Math.PI) / 360), hw = hh * Math.max(0.4, c.aspect), al = Math.atan2(hh, hw);
    // Two choices: the lines go across one pair of corners or the other. Take the one that goes more away from the comet.
    let best = null;
    for (const s of [1, -1]) { const W = Rv.clone().multiplyScalar(Math.cos(al)).addScaledVector(Uv, Math.sin(al) * s), D = Rv.clone().multiplyScalar(-Math.sin(al) * s).addScaledVector(Uv, Math.cos(al)); let k = -D.dot(away); if (k < 0) { D.negate(); k = -k; } if (!best || k > best.k) best = { W, D, k }; }
    const corner = Math.hypot(hw, hh), front = corner * 0.8 - METEOR_MIN < 0.35;   // front: too little room beside the planet
    world.meteorFrame = { at: world.lastT || 0, D: best.D, W: best.W, U, front, max: front ? corner * 0.85 : corner * 0.8 };
  };
  // For the tests: the point of each line that is nearest to the planet.
  world.meteorMids = () => { const f = world.meteorFrame; return f ? list.map((m) => mid(m, f, new V()).toArray()) : []; };
}

export function buildOrbiters(world) {
  const P = regionPalette({ hues: ['orange', 'blue'], toneSet: 'mid', hueShift: 0.5 }), c = colors(P, rng(5), {});
  // The moon: a real crescent shape made of small cubes (a ball with a round hole cut through it, front to back), with craters.
  // It always shows the same face to the viewer (world.render turns it), so it always reads as a crescent.
  const moon = (b) => {
    const R = 9, cut = new V(-3.5, -0.8, 0), R2 = 8.5, jr = rng(11), n = new V();
    const craters = [[0.74, 0.42, 0.52, 0.16], [0.84, -0.08, 0.54, 0.13], [0.7, -0.52, 0.5, 0.15], [0.56, 0.76, 0.34, 0.1], [0.92, 0.2, 0.34, 0.08], [0.54, -0.78, 0.32, 0.1], [0.78, 0.14, 0.61, 0.07]].map(([x, y, z, a]) => [new V(x, y, z).normalize(), a]);
    const mark = (x, y, z) => { const d = Math.hypot(x, y, z) || 1; n.set(x, y, z).divideScalar(d); let pit = 0, rim = 0; for (const [c, a] of craters) { const g = Math.acos(Math.min(1, n.dot(c))); if (g < a * 0.5) pit = 2; else if (g < a) pit = Math.max(pit, 1); else if (g < a * 1.4) rim = 1; } return [pit, rim, d]; };
    // Inside the crescent, and not in the carved top layer of a crater.
    const solid = (x, y, z) => { const d = Math.hypot(x, y, z); if (d > R || Math.hypot(x - cut.x, y - cut.y) <= R2) return false; return !(d > R - 1.05 && mark(x, y, z)[0] === 2); };   // only the middle of a crater is carved; the rest of it is a darker floor
    for (let x = -9; x <= 9; x++) for (let y = -9; y <= 9; y++) for (let z = -5; z <= 9; z++) {
      if (!solid(x, y, z)) continue;
      if (solid(x + 1, y, z) && solid(x - 1, y, z) && solid(x, y + 1, z) && solid(x, y - 1, z) && solid(x, y, z + 1)) continue;   // hidden inside
      const [pit, rim, d] = mark(x, y, z), nz = z / d;
      const inner = Math.hypot(x - cut.x, y - cut.y) < R2 + 1 ? 1 : 0;   // the hollow side is a little darker
      b.box(1, 1, 1, [ROW.sand, 2.2 + jr() * 0.7 + (pit ? 1.5 + pit * 1.0 : 0) - (pit ? 0 : rim * 1.2) + inner * 1.6 + (1 - Math.max(0, nz)) * 1.3, 6], { x: x - 4.5, y: y - 0.5, z });
    }
  };
  // The satellite is drawn again every frame. It rolls slowly, its solar wings turn, a red light blinks, and the dish sends rings of signal down to the planet.
  const GOLD = [ROW.yellow, 3.4], CELL = [ROW.darkblue, 6.5], LINE = [ROW.sea, 3.2, 6], SIG = [ROW.sea, 1.4, 6], DK = [ROW.neutral, 8.6];
  const satellite = () => {};
  const satAnim = (b, t) => {
    b.push(0, 0, 0, t * 0.12, 1.15);
    b.box(0.1, 0.12, 0.1, GOLD); b.box(0.108, 0.016, 0.108, c.W, { y: -0.004 }); b.box(0.108, 0.016, 0.108, c.W, { y: 0.108 }); b.box(0.05, 0.05, 0.004, DK, { y: 0.035, z: 0.05 }); b.box(0.03, 0.02, 0.004, LINE, { y: 0.05, z: 0.052 });
    for (const sx of [-1, 1]) {
      b.box(0.07, 0.008, 0.008, DK, { x: sx * 0.085, y: 0.056 });
      b.push(sx * 0.12, 0.06, 0, 0, 1, Math.sin(t * 0.25) * 0.6);   // the wings turn to follow the sun
      for (let i = 0; i < 3; i++) { const x = sx * (0.05 + i * 0.094); b.box(0.088, 0.004, 0.12, CELL, { x }); for (const z of [-0.03, 0.03]) b.box(0.088, 0.0046, 0.004, LINE, { x, z }); b.box(0.004, 0.0046, 0.12, LINE, { x }); b.box(0.004, 0.008, 0.124, c.W, { x: x + sx * 0.046 }); }
      b.pop();
    }
    b.dome(0.055, 0.032, c.W, { y: -0.006, rx: Math.PI }); b.box(0.004, 0.05, 0.004, DK, { y: -0.085 }); b.box(0.012, 0.012, 0.012, GOLD, { y: -0.092 });   // the dish points at the planet
    for (const sx of [-1, 1]) b.box(0.003, 0.08, 0.003, DK, { x: sx * 0.03, y: 0.12, rz: -sx * 0.5 });
    const on = (t * 0.9) % 1 < 0.18; b.box(on ? 0.03 : 0.018, on ? 0.03 : 0.018, on ? 0.03 : 0.018, on ? [ROW.red, 3.6, 6] : [ROW.red, 7], { y: 0.124 });
    for (const sx of [-1, 1]) b.cyl(0.012, 0.02, DK, { x: sx * 0.025, y: 0.05, z: -0.06, rx: -Math.PI / 2 });
    for (let k = 0; k < 3; k++) {   // signal rings: they grow and get thin as they go down
      const ph = ((t * 0.35 + k / 3) % 1), sz = 0.03 + ph * 0.13, th = 0.006 * (1 - ph), y = -0.11 - ph * 0.42;
      if (th > 0.0008) for (const [dx, dz, w, d] of [[0, 1, sz, th], [0, -1, sz, th], [1, 0, th, sz], [-1, 0, th, sz]]) b.box(w, th, d, SIG, { x: dx * sz / 2, y, z: dz * sz / 2 });
    }
    b.pop();
  };
  // A comet in Webflow blue: a bright head and a tail of shrinking cubes behind it, from blue to pale blue.
  const comet = (b) => { b.box(0.1, 0.1, 0.1, [ROW.blue, 5, 6]); b.box(0.05, 0.05, 0.05, [ROW.blue, 6.4, 6], { x: 0.04, y: 0.07, z: 0.02 }); b.box(0.14, 0.14, 0.05, [ROW.blue, 2.4, 6], { y: -0.02, z: -0.07 }); };   // Webflow blue
  // The tail trails behind the head. A slow wave runs down it.
  const cometTail = (b, t) => { for (let i = 1; i < 16; i++) { const s = 0.1 * (1 - i / 17) * (0.9 + 0.1 * Math.sin(t * 2.3 + i)), w = 0.035 * (1 + i * 0.06); for (const k of [0, 1]) b.box(s, s, s, [ROW.blue, Math.max(1.2, 4.6 - i * 0.24), 6], { z: -0.08 - i * 0.085 - k * 0.04, x: Math.sin(i * 2.1 + k * 3 + t * 1.2 - i * 0.4) * w, y: 0.02 + Math.cos(i * 1.7 + k * 2 + t * 0.9 - i * 0.3) * w }); } };
  const things = [[moon], [satellite, comet]];
  world.orbiters = []; addMeteors(world);
  world.orbits.children.forEach((grp, oi) => {
    const rad = grp.userData.rad, batch = new PrimBatch(world.spaceMat, { shadow: false }), spin = new THREE.Group(); const pts = [], tails = []; let moonGrp = null;
    things[oi].forEach((fn, i) => {
      // up = away from the planet. z = the direction of travel.
      const a = (i / things[oi].length) * TAU + oi * 1.3 + i * 0.6, dir = oi ? 1 : -1, up = new V(Math.cos(a), 0, Math.sin(a)), fwd = new V(-Math.sin(a) * dir, 0, Math.cos(a) * dir), e1 = new V().crossVectors(up, fwd);
      const b = new Builder(batch, null, new THREE.Matrix4().makeBasis(e1, up, fwd).scale(new V(0.22, 0.22, 0.22)).setPosition(up.clone().multiplyScalar(rad)));
      b.sens = 0; pts.push(up.clone().multiplyScalar(rad));
      if (fn === moon) { const mb = new PrimBatch(world.spaceMat, { shadow: false }), bb = new Builder(mb, null, new THREE.Matrix4().makeScale(0.0078, 0.0078, 0.0078)); bb.sens = 0; moon(bb); mb.commit(); moonGrp = new THREE.Group(); moonGrp.position.copy(pts[pts.length - 1]); moonGrp.add(mb.group); spin.add(moonGrp); }
      else fn(b);
      if (fn === comet) { const tb = new PrimBatch(world.spaceMat, { dynamic: true, shadow: false }), tbd = new Builder(tb, null, b.mats[0]); tbd.sens = 0; spin.add(tb.group); tails.push((t) => { tb.reset(); tbd.d = 0; tbd.top = tbd.mats[0]; cometTail(tbd, t); tb.commit(); }); }
      if (fn === satellite) { const tb = new PrimBatch(world.spaceMat, { dynamic: true, shadow: false }), tbd = new Builder(tb, null, b.mats[0]); tbd.sens = 0; spin.add(tb.group); tails.push((t) => { tb.reset(); tbd.d = 0; tbd.top = tbd.mats[0]; satAnim(tbd, t); tb.commit(); }); }
    });
    batch.commit(); spin.add(batch.group); grp.add(spin);
    world.orbiters.push({ spin, pts, tail: tails.length ? (t) => tails.forEach((f) => f(t)) : null, moonGrp, speed: oi ? -0.02 : 0.016 });
  });
}

// The sun: a bright core inside a see-through shell, so it has depth. The core has moving grain and dark sun spots.
// Flares are arcs of small cubes that rise from the surface and fall back. A soft glow sits behind it.
export function makeSun(world) {
  const g = new THREE.Group(), uT = { value: 0 };
  const quadV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const boxV = 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { uT }, vertexShader: quadV, transparent: true, depthWrite: false,
    fragmentShader: 'uniform float uT; varying vec2 vUv; void main(){ vec2 c = vUv - 0.5; float d = length(c) * 2.0, th = atan(c.y, c.x); float rays = 0.5 + 0.5 * sin(th * 12.0 + uT * 0.2) * sin(th * 5.0 - uT * 0.13); float a = pow(1.0 - clamp(d, 0.0, 1.0), 2.4) * (0.5 + 0.25 * rays); gl_FragColor = vec4(1.0, 0.8, 0.34, a); }' }));
  halo.scale.setScalar(0.72); halo.renderOrder = 3;
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.115), new THREE.ShaderMaterial({ uniforms: { uT }, vertexShader: boxV, fragmentShader: `uniform float uT; varying vec2 vUv; varying vec3 vN; ${NOISE}
    void main(){ vec2 g = floor(vUv * 12.0); float f = dot(abs(vN), vec3(1.0, 2.0, 3.0)) + step(0.0, vN.x + vN.y + vN.z) * 5.0;
      float gr = vn(vec3(g * 0.6 + f * 7.0, uT * 0.35)), sp = vn(vec3(g * 0.21 + f * 3.0, uT * 0.03 + 5.0));
      vec3 col = mix(vec3(1.0, 0.66, 0.16), vec3(1.0, 0.94, 0.6), gr);
      col = mix(col, vec3(0.9, 0.42, 0.08), smoothstep(0.6, 0.66, sp));       // the lighter ring around a spot
      col = mix(col, vec3(0.42, 0.17, 0.05), smoothstep(0.68, 0.72, sp));     // the dark middle of a spot
      gl_FragColor = vec4(col, 1.0); }` }));
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.17), new THREE.ShaderMaterial({ uniforms: { uT }, vertexShader: boxV, transparent: true, depthWrite: false, side: THREE.DoubleSide, fragmentShader: `uniform float uT; varying vec2 vUv; varying vec3 vN; ${NOISE}
    void main(){ vec2 c = abs(vUv - 0.5); float edge = smoothstep(0.38, 0.5, max(c.x, c.y)); vec2 g = floor(vUv * 7.0); float f = dot(abs(vN), vec3(1.0, 2.0, 3.0));
      float hot = step(0.62, vn(vec3(g * 0.7 + f * 9.0, uT * 0.22)));
      gl_FragColor = vec4(mix(vec3(1.0, 0.84, 0.36), vec3(1.0, 0.95, 0.7), hot), 0.14 + edge * 0.34 + hot * 0.12); }` }));
  shell.renderOrder = 4;
  const fb = new PrimBatch(world.spaceMat, { dynamic: true, shadow: false }), bd = new Builder(fb, null, null); bd.sens = 0;
  core.layers.enable(3);
  // The wireframe view: the sun is the outline of its cube, in the same blue as the other lines. Its glow is hidden.
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.17, 0.17, 0.17)), new THREE.LineBasicMaterial({ color: 0x146ef5 })); edge.visible = false;
  const edge2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.115, 0.115, 0.115)), edge.material); edge.add(edge2);
  g.setWire = (on) => { halo.visible = shell.visible = !on; core.material.colorWrite = !on; edge.visible = on; };   // the core stays in the scene (the pointer finds the sun by it), but it draws no color
  g.add(halo, core, shell, fb.group, edge);
  g.flare = () => { if ((g.lastT || 0) - (g.flareAt ?? -99) > 6) { g.flareAt = g.lastT || 0; g.flareN = (g.flareN || 0) + 1; } };
  g.tick = (t, cam) => {
    g.lastT = t;
    // Solar flares show only after a click on the sun: five small arcs of fire come out, bend, and fall back. Then the sun is calm again.
    const fa = t - (g.flareAt ?? -99), DUR = 6, on = fa < DUR, kf = on ? Math.sin(Math.PI * fa / DUR) : 0;
    uT.value = t; halo.quaternion.copy(cam.quaternion); halo.scale.setScalar(0.72 * (1 + 0.45 * (g.hi || 0) + 0.25 * kf)); core.rotation.set(t * 0.07, t * 0.1, 0); edge.rotation.copy(core.rotation);
    fb.reset(); bd.d = 0; bd.top = bd.mats[0];
    if (on) for (let f = 0; f < 5; f++) {
      const k = Math.min(1, Math.max(0, (fa - f * 0.45) / 3.6)); if (k <= 0 || k >= 1) continue;
      const grow = Math.sin(Math.PI * Math.min(1, k * 1.25)), rho = 0.03 + 0.05 * grow, m = 9;
      bd.push(0, 0, 0, f * 1.26 + (g.flareN || 0) * 2.4, 1, (f % 2 ? 1 : -1) * (0.5 + (f % 3) * 0.5));
      for (let i = 0; i <= m; i++) { const u = i / m; if (u > k * 1.6) break; const a = u * Math.PI, sz = 0.012 * (0.55 + 0.45 * Math.sin(a)) * (1 - Math.max(0, k - 0.75) * 3); bd.box(sz, sz, sz, [u < 0.5 ? ROW.yellow : ROW.orange, 3 + u * 1.5, 6], { x: -Math.cos(a) * rho, y: 0.08 + Math.sin(a) * rho * 1.5 - sz / 2 }); }
      bd.pop();
    }
    fb.commit();
  };
  return g;
}

// Geometry of one tile outline on the sea: a thin line with a soft band inside it.
function outlineArrays(tile, pos, al, idx) {
  const R = 0.9925, S = 7, base = pos.length / 3;
  const P = (x, z, s) => new V(x * s, 0, z * s).applyMatrix4(tile.matrix).normalize().multiplyScalar(R);
  const poly = tile.shape || tile.poly, n = poly.length;   // shape = the true outline of a cell that is not a plain hexagon or pentagon
  for (let i = 0; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n];
    for (let k = 0; k < S; k++) {
      const f = k / S, x = A.x + (B.x - A.x) * f, z = A.z + (B.z - A.z) * f;
      for (const [s, a] of [[1.02, 0.95], [0.975, 0.95], [0.86, 0.0]]) { const p = P(x, z, s); pos.push(p.x, p.y, p.z); al.push(a); }
    }
  }
  const m = n * S;
  for (let j = 0; j < m; j++) { const a = base + j * 3, b = base + ((j + 1) % m) * 3; idx.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2); }
}
const outlineMat = (k) => new THREE.ShaderMaterial({
  uniforms: { uK: { value: k }, uCol: { value: new THREE.Vector3(1, 1, 1) }, uHard: { value: 0 } },
  vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform float uK, uHard; uniform vec3 uCol; varying float vA; void main(){ float a = uHard > 0.5 ? step(0.62, vA) : vA * uK; if (a < 0.004) discard; gl_FragColor = vec4(uCol, a); }',   // uHard: a thin plain line with no soft band (the wireframe view)
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
function outlineGeo(tiles) {
  const pos = [], al = [], idx = [];
  for (const t of tiles) outlineArrays(t, pos, al, idx);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.Float32BufferAttribute(al, 1)); g.setIndex(idx);
  return g;
}
// A very faint border on every free tile. It always shows.
export function setFreeBorders(world, tiles) {
  if (!world.freeBorders) { world.freeBorders = new THREE.Mesh(new THREE.BufferGeometry(), outlineMat(0.1)); world.freeBorders.frustumCulled = false; world.freeBorders.renderOrder = 2; world.scene.add(world.freeBorders); }
  world.freeBorders.geometry.dispose(); world.freeBorders.geometry = outlineGeo(tiles);
}

// The outline of a free tile on the ocean. It grows strong under the pointer. It shows where a new region rises.
export class TileOutline {
  constructor(world) {
    this.world = world; this.tile = null; this.k = 0; this.goal = 0;
    this.mat = outlineMat(0);
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; this.mesh.visible = false;
    world.scene.add(this.mesh);
  }
  set(tile) {
    if (tile === this.tile) return;
    this.tile = tile; this.goal = tile ? 1 : 0;
    if (!tile) return;
    this.mesh.geometry.dispose(); this.mesh.geometry = outlineGeo([tile]);
  }
  update(dt) {
    this.k += (this.goal - this.k) * (1 - Math.exp(-dt * 12));
    this.mat.uniforms.uK.value = this.k; this.mesh.visible = this.k > 0.01;
  }
}
