// Shape system. Everything is made from a few unit primitives, drawn with instancing.
// A PrimBatch holds one InstancedMesh per primitive type. A Builder adds shapes with a matrix stack.
// A MeshAcc collects non-instanced geometry (rings and lathe shapes) into one mesh.
import * as THREE from 'three';

export const BOX = 0, CYL = 1, HEX = 2, SPH = 3, DOME = 4, ARCH = 5, HALF = 6, COL = 7, POST = 8;   // COL = one plain cube (land columns). POST = a cylinder with no taper, as one layer.

// Every unit shape is a stack of cubes. Each layer (slab) knows its base height, so a taper goes in steps.
function blockGeo(layers) {   // layers: [y0, y1, [[x0, x1, z0, z1], ...]]
  const pos = [], nor = [], slab = [], idx = [];
  for (const [y0, y1, rects] of layers) for (const [x0, x1, z0, z1] of rects) {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), base = pos.length / 3;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) slab.push(y0);
    for (const i of g.index.array) idx.push(base + i);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('aSlab', new THREE.Float32BufferAttribute(slab, 1)); out.setIndex(idx);
  // The 12 edges of each block, as line segments. The wireframe view draws them (see wireLines).
  const ep = [], es = [];
  for (const [y0, y1, rects] of layers) for (const [x0, x1, z0, z1] of rects) {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) { ep.push(...c[i], ...c[j]); es.push(y0, y0); }
  }
  out.userData.edges = { pos: new Float32Array(ep), slab: new Float32Array(es) };
  return out;
}
function blockGeos() {
  const F = [-0.5, 0.5, -0.5, 0.5], plus = [[-0.5, 0.5, -0.3, 0.3], [-0.3, 0.3, -0.5, 0.5]], mid = [[-0.3, 0.3, -0.3, 0.3]], sm = [[-0.18, 0.18, -0.18, 0.18]];
  const stack = (n, rects) => Array.from({ length: n }, (_, i) => [i / n, (i + 1) / n, rects]);
  return [
    blockGeo(stack(6, [F])),
    blockGeo(stack(5, plus)),
    blockGeo(stack(5, plus)),
    blockGeo([[0, 0.2, mid], [0.2, 0.4, plus], [0.4, 0.6, plus], [0.6, 0.8, plus], [0.8, 1, mid]]),
    blockGeo([[0, 0.3, plus], [0.3, 0.6, [[-0.42, 0.42, -0.42, 0.42]]], [0.6, 0.85, mid], [0.85, 1, sm]]),
    blockGeo([[0, 0.66, [[-0.5, -0.3, -0.5, 0.5], [0.3, 0.5, -0.5, 0.5]]], [0.66, 0.82, [[-0.5, -0.16, -0.5, 0.5], [0.16, 0.5, -0.5, 0.5]]], [0.82, 1, [F]]]),
    blockGeo([[0, 0.25, [F]], [0.25, 0.5, [[-0.44, 0.44, -0.5, 0.5]]], [0.5, 0.75, [[-0.34, 0.34, -0.5, 0.5]]], [0.75, 1, [[-0.2, 0.2, -0.5, 0.5]]]]),
    blockGeo([[0, 1, [F]]]),
    blockGeo([[0, 1, plus]]),
  ];
}
let GEOS = null;
export function unitGeos() {
  if (GEOS) return GEOS;
  return (GEOS = blockGeos());
}

// Line segments for the edges of every shape in one instanced mesh. They use the same per-shape data as the mesh (no copy), so they move with it.
export function wireLines(mesh, material, type) {
  const e = unitGeos()[type].userData.edges; if (!e) return null;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(e.pos, 3)); g.setAttribute('aSlab', new THREE.BufferAttribute(e.slab, 1));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(e.pos.length).fill(0), 3));
  g.setAttribute('aPal', mesh.geometry.attributes.aPal); g.setAttribute('aAux', mesh.geometry.attributes.aAux); g.setAttribute('aTile', mesh.geometry.attributes.aTile); g.setAttribute('instanceMatrix', mesh.instanceMatrix);
  g.instanceCount = mesh.count;
  const line = new THREE.LineSegments(g, material); line.frustumCulled = false; line.matrixAutoUpdate = false; line.matrix.copy(mesh.matrix); line.renderOrder = 2;
  return line;
}

export class PrimBatch {
  constructor(material, { dynamic = false, shadow = true, order = 0 } = {}) {
    this.material = material; this.dynamic = dynamic; this.shadow = shadow; this.order = order;
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = true;
    this.sets = unitGeos().map(() => ({ n: 0, cap: 0, m: null, pal: null, aux: null, til: null, mesh: null, meshCap: 0 }));
    this.total = 0;
  }
  reset() { for (const s of this.sets) s.n = 0; this.total = 0; }
  add(type, e, row, tone, kind, prm, tx, tz, sens, lod, tile = 255) {   // tile = the index of the tile that the shape is on (255 = none). The load-in uses it: all the shapes of one tile rise as one.
    const s = this.sets[type];
    if (s.n >= s.cap) {
      const cap = Math.max(32, s.cap * 2);
      const m = new Float32Array(cap * 16), pal = new Uint8Array(cap * 4), aux = new Uint8Array(cap * 4), til = new Uint8Array(cap);
      if (s.m) { m.set(s.m); pal.set(s.pal); aux.set(s.aux); til.set(s.til); }
      s.m = m; s.pal = pal; s.aux = aux; s.til = til; s.cap = cap;
    }
    const i = s.n++;
    s.m.set(e, i * 16);
    const o = i * 4;
    s.pal[o] = row; s.pal[o + 1] = Math.max(0, Math.min(200, Math.round(tone * 20))); s.pal[o + 2] = kind; s.pal[o + 3] = prm;
    s.aux[o] = tx; s.aux[o + 1] = tz; s.aux[o + 2] = sens; s.aux[o + 3] = lod; s.til[i] = tile;
    this.total++;
  }
  commit() {
    const geos = unitGeos();
    this.sets.forEach((s, t) => {
      if (s.n === 0) { if (s.mesh) s.mesh.visible = false; return; }
      if (!s.mesh || s.meshCap !== s.cap) {
        if (s.mesh) { this.group.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.dispose(); }
        // Each mesh owns a copy of the unit geometry, so that disposing one never frees buffers another one uses.
        const base = geos[t], g = new THREE.BufferGeometry();
        if (base.index) g.setIndex(base.index.clone());
        g.setAttribute('position', base.attributes.position.clone());
        g.setAttribute('normal', base.attributes.normal.clone());
        if (base.attributes.aSlab) g.setAttribute('aSlab', base.attributes.aSlab.clone());
        g.setAttribute('aPal', new THREE.InstancedBufferAttribute(s.pal, 4, false));
        g.setAttribute('aAux', new THREE.InstancedBufferAttribute(s.aux, 4, false));
        g.setAttribute('aTile', new THREE.InstancedBufferAttribute(s.til, 1, false));
        const mesh = new THREE.InstancedMesh(g, this.material, 1);
        mesh.instanceMatrix = new THREE.InstancedBufferAttribute(s.m, 16);
        if (this.dynamic) {
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          g.attributes.aPal.setUsage(THREE.DynamicDrawUsage); g.attributes.aAux.setUsage(THREE.DynamicDrawUsage); g.attributes.aTile.setUsage(THREE.DynamicDrawUsage);
        }
        mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.renderOrder = this.order;
        if (this.shadow) mesh.layers.enable(1);   // layer 1: things that cast a shadow
        if (!this.order) mesh.layers.enable(3);   // layer 3: things that can get the highlight line (not water, not glow effects)
        mesh.userData.type = t;
        s.mesh = mesh; s.meshCap = s.cap; this.group.add(mesh);
      } else {
        s.mesh.instanceMatrix.needsUpdate = true;
        s.mesh.geometry.attributes.aPal.needsUpdate = true;
        s.mesh.geometry.attributes.aAux.needsUpdate = true;
        s.mesh.geometry.attributes.aTile.needsUpdate = true;
      }
      s.mesh.count = s.n; s.mesh.visible = true;
    });
  }
  dispose() { for (const s of this.sets) if (s.mesh) { s.mesh.geometry.dispose(); s.mesh.dispose(); this.group.remove(s.mesh); s.mesh = null; } }
}

// Non-instanced geometry collector.
export class MeshAcc {
  constructor() { this.pos = []; this.nor = []; this.pal = []; this.aux = []; this.h = []; this.idx = []; this.n = 0; }
  vert(x, y, z, nx, ny, nz, pal, aux, h = 0) {
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz);
    this.pal.push(pal[0], Math.round(pal[1] * 20), pal[2] || 0, pal[3] || 0);
    this.aux.push(aux[0], aux[1], aux[2], aux[3]); this.h.push(h);
    return this.n++;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  // Add a geometry, transformed by a matrix.
  addGeometry(geo, m, pal, aux) {
    const p = geo.attributes.position, nn = geo.attributes.normal, base = this.n;
    const nm = _n3.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(m);
      _w.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize();
      this.vert(_v.x, _v.y, _v.z, _w.x, _w.y, _w.z, pal, aux);
    }
    if (geo.index) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) this.tri(base + ix[i], base + ix[i + 1], base + ix[i + 2]); }
    else for (let i = 0; i < p.count; i += 3) this.tri(base + i, base + i + 1, base + i + 2);
  }
  toGeometry(old) {
    const g = old || new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('aPal', new THREE.BufferAttribute(new Uint8Array(this.pal), 4, false));
    g.setAttribute('aAux', new THREE.BufferAttribute(new Uint8Array(this.aux), 4, false));
    g.setAttribute('aH', new THREE.BufferAttribute(new Float32Array(this.h), 1));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.idx), 1));
    return g;
  }
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n3 = new THREE.Matrix3();

const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
const NO = {};
const _gcache = new Map();
function cached(key, make) { let g = _gcache.get(key); if (!g) { g = make(); _gcache.set(key, g); } return g; }

// Builder: add shapes in local tile units. All positions are the BASE center of the shape (y = bottom).
// Options: x y z, rx ry rz (radians), t (taper 0..1) or tx tz, lod (0 far, 1 mid, 2 close), k (kind), p (param 0..1)
// Record the footprint of one prim in tile-local units (x east, z south). The construction diagram of a unique area uses it.
const _ri = new THREE.Matrix4();
function recPrim(b, type, m, kind) {
  if (!(kind === 0 || kind === 1 || kind === 3 || kind === 11)) return;   // no glow, water, blossom, or snow pieces
  const e = _ri.copy(b.recBase || b.mats[0]).invert().multiply(m).elements;
  if (Math.abs(e[12]) > 1.3 || Math.abs(e[14]) > 1.3) return;
  const round = !(type === BOX || type === COL || type === HALF || type === ARCH), n = round ? 10 : 4, pts = [];
  let x0 = 9, x1 = -9, z0 = 9, z1 = -9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ux = round ? Math.cos(a) * 0.5 : [-0.5, 0.5, 0.5, -0.5][i], uz = round ? Math.sin(a) * 0.5 : [-0.5, -0.5, 0.5, 0.5][i];
    const x = e[0] * ux + e[8] * uz + e[12], z = e[2] * ux + e[10] * uz + e[14];
    pts.push([x, z]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  b.rec.push({ pts, size: Math.max(x1 - x0, z1 - z0), leaf: kind === 3 || kind === 11 });
}

export class Builder {
  constructor(batch, acc, base, tileIndex = 255) {
    this.batch = batch; this.acc = acc; this.tile = tileIndex;
    this.mats = [base ? base.clone() : new THREE.Matrix4()];
    this.d = 0; this.top = this.mats[0];
    this.lod = 0; this.sens = 0.6; this.count = 0;
    this.auto = false; this.wall = 2;   // auto = pick a surface pattern (roof courses, bricks) from the shape
    this.water = null;                  // optional: two batches for see-through water (depth pass, color pass)
  }
  push(x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) {
    _p.set(x, y, z); _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _s.set(s, s, s);
    const m = this.mats[++this.d] || (this.mats[this.d] = new THREE.Matrix4());
    m.compose(_p, _q, _s).premultiply(this.top);
    this.top = m; return this;
  }
  // Push any matrix (for flattened or mirrored groups).
  pushM(mat) { const m = this.mats[++this.d] || (this.mats[this.d] = new THREE.Matrix4()); m.multiplyMatrices(this.top, mat); this.top = m; return this; }
  pop() { this.top = this.mats[--this.d]; return this; }
  at(x, y, z, ry, s, fn) { this.push(x, y, z, ry, s); fn(this); this.pop(); return this; }
  _mat(sx, sy, sz, o) {
    _p.set(o.x || 0, o.y || 0, o.z || 0);
    if (o.rx || o.ry || o.rz) { _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e); } else _q.identity();
    _s.set(sx, sy, sz);
    return _m.compose(_p, _q, _s).premultiply(this.top);
  }
  _prim(type, sx, sy, sz, col, o = NO) {
    const m = this._mat(sx, sy, sz, o);
    const t = o.t || 0, kind = o.k ?? col[2] ?? 0, tx = o.tx ?? t, tz = o.tz ?? t;
    let pat = o.pat || 0;
    if (kind === 1) pat = type === BOX ? 6 : 0;
    else if (o.pat == null && this.auto && kind === 0 && col[0] !== 8) {
      if (type === BOX) { if (tx > 0.85 || tz > 0.85) pat = 1; else if (sy > 0.045 && sx > 0.035 && sz > 0.02) pat = this.wall; }
      else if (type === CYL) { if (t > 0.85 && sy > 0.03) pat = 1; else if (sy > 0.09 && sx > 0.06) pat = 5; }
      else if (type === HALF && sy > 0.04 && sz > 0.06) pat = 1;
    }
    if (type === BOX && tx === 0 && tz === 0) type = COL;   // no taper: one plain cube
    else if ((type === CYL || type === HEX) && tx === 0 && tz === 0) type = POST;   // no taper: one layer is the same shape with a fifth of the triangles
    if (this.rec) recPrim(this, type, m, kind);
    this.batch.add(type, m.elements, col[0], col[1], kind, Math.round((o.p ?? col[3] ?? 0) * 255),
      Math.round(tx * 255), Math.round(tz * 255), Math.round((o.sens ?? this.sens) * 255), (o.lod ?? this.lod) + 4 * pat, this.tile);
    this.count++;
    return this;
  }
  box(w, h, d, col, o) { return this._prim(BOX, w, h, d, col, o); }
  col(w, h, d, col, o) { return this._prim(COL, w, h, d, col, o); }
  // A cube of water. It goes to the see-through water batches when the builder has them.
  wcol(w, h, d, col, o) {
    if (!this.water) return this._prim(COL, w, h, d, col, o);
    const keep = this.batch;
    for (const wb of this.water) { this.batch = wb; this._prim(COL, w, h, d, col, o); }
    this.batch = keep; this.count--; return this;
  }
  cyl(r, h, col, o) { return this._prim(CYL, r * 2, h, r * 2, col, o); }
  cone(r, h, col, o) { return this._prim(CYL, r * 2, h, r * 2, col, { ...o, t: 1 }); }
  hex(r, h, col, o) { return this._prim(HEX, r * 2, h, r * 2, col, o); }
  pyr(w, h, d, col, o) { return this._prim(BOX, w, h, d, col, { ...o, t: 1 }); }
  gable(w, h, d, col, o) { return this._prim(BOX, w, h, d, col, { ...o, tx: 1, tz: 0 }); } // ridge runs along z
  ball(r, col, o = NO) { return this._prim(SPH, r * 2 * (o.sx || 1), r * 2 * (o.sy || 1), r * 2 * (o.sz || 1), col, o); }
  dome(r, h, col, o) { return this._prim(DOME, r * 2, h, r * 2, col, o); }
  arch(w, h, d, col, o) { return this._prim(ARCH, w, h, d, col, o); }
  half(w, h, d, col, o) { return this._prim(HALF, w, h, d, col, o); }
  // Non-instanced custom geometry (static builders only).
  mesh(geo, col, o = NO, sx = 1, sy = 1, sz = 1) {
    if (!this.acc) return this;
    const m = this._mat(sx, sy, sz, o);
    this.acc.addGeometry(geo, m, [col[0], col[1], o.k ?? col[2] ?? 0, Math.round((o.p ?? col[3] ?? 0) * 255)], [0, 0, Math.round((o.sens ?? this.sens) * 255), this.tile]);
    return this;
  }
  // Flat ring (annulus slab): outer radius R, inner radius r, height h.
  ring(R, r, h, col, o) {
    const k = Math.round((r / R) * 20) / 20;
    const g = cached('ring' + k, () => {
      const s = new THREE.Shape(); s.absarc(0, 0, 1, 0, Math.PI * 2, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, k, 0, Math.PI * 2, true); s.holes.push(hole);
      return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 20 }).rotateX(-Math.PI / 2);
    });
    return this.mesh(g, col, o, R, h, R);
  }
  // Lathe shape from a profile [[radius, y], ...] in 0..1 units.
  lathe(key, profile, r, h, col, o) {
    const g = cached('lathe' + key, () => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12));
    return this.mesh(g, col, o, r, h, r);
  }
}
