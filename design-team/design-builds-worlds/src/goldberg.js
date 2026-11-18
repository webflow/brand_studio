// Goldberg polyhedron with 92 tiles: 80 hexagons and 12 pentagons.
// Icosahedron, frequency 3, projected to a sphere. Each vertex becomes one tile.
import * as THREE from 'three';

export const TILE_GAP = 0.013;   // world units cut from each tile edge. The ocean shows in the gap.
export const TILE_DEPTH = 0.115;  // world depth of the tile prism below its top

export function buildTiles() {
  const V = THREE.Vector3;
  // Icosahedron with two vertices at the poles.
  const lat = Math.atan(0.5);
  const iv = [new V(0, 1, 0)];
  for (let i = 0; i < 5; i++) { const a = (i * 72) * Math.PI / 180; iv.push(new V(Math.cos(lat) * Math.cos(a), Math.sin(lat), Math.cos(lat) * Math.sin(a))); }
  for (let i = 0; i < 5; i++) { const a = (i * 72 + 36) * Math.PI / 180; iv.push(new V(Math.cos(lat) * Math.cos(a), -Math.sin(lat), Math.cos(lat) * Math.sin(a))); }
  iv.push(new V(0, -1, 0));
  const faces = [];
  for (let i = 0; i < 5; i++) {
    const u0 = 1 + i, u1 = 1 + (i + 1) % 5, l0 = 6 + i, l1 = 6 + (i + 1) % 5;
    faces.push([0, u0, u1], [u0, l0, u1], [l0, l1, u1], [11, l1, l0]);
  }
  // Subdivide each face (frequency 3). Merge shared points.
  const F = 3, verts = [], key = new Map(), tris = [];
  const add = (p) => {
    const k = `${Math.round(p.x * 1e5)},${Math.round(p.y * 1e5)},${Math.round(p.z * 1e5)}`;
    if (key.has(k)) return key.get(k);
    key.set(k, verts.length); verts.push(p); return verts.length - 1;
  };
  for (const [a, b, c] of faces) {
    const A = iv[a], B = iv[b], C = iv[c], idx = [];
    for (let i = 0; i <= F; i++) {
      idx.push([]);
      for (let j = 0; j <= F - i; j++) {
        const k = F - i - j;
        const p = new V().addScaledVector(A, k / F).addScaledVector(B, i / F).addScaledVector(C, j / F);
        idx[i].push(add(p));
      }
    }
    for (let i = 0; i < F; i++) for (let j = 0; j < F - i; j++) {
      tris.push([idx[i][j], idx[i + 1][j], idx[i][j + 1]]);
      if (j < F - i - 1) tris.push([idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]]);
    }
  }
  verts.forEach((v) => v.normalize());
  const cent = tris.map(([a, b, c]) => new V().add(verts[a]).add(verts[b]).add(verts[c]).normalize());
  const vt = verts.map(() => []), nb = verts.map(() => new Set());
  tris.forEach((t, ti) => t.forEach((v, k) => { vt[v].push(ti); nb[v].add(t[(k + 1) % 3]); nb[v].add(t[(k + 2) % 3]); }));

  const Y = new V(0, 1, 0);
  const tiles = verts.map((c, index) => {
    const n = c.clone();
    let e1 = new V().crossVectors(Y, n);
    if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); else e1.normalize();   // east
    const e3 = new V().crossVectors(e1, n).normalize();               // local +z = south
    // Corners: triangle centers, projected radially onto the tile plane (dot(p, n) = 1), in local 2D.
    let poly = vt[index].map((ti) => {
      const p = cent[ti].clone().multiplyScalar(1 / cent[ti].dot(n)).sub(n);
      return { x: p.dot(e1), z: p.dot(e3) };
    });
    poly.sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
    // inradius, then pull corners in to leave the gap
    let rin = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const d = Math.abs(a.x * b.z - a.z * b.x) / Math.hypot(b.x - a.x, b.z - a.z);
      rin = Math.min(rin, d);
    }
    const k = (rin - TILE_GAP) / rin;
    poly = poly.map((p) => ({ x: p.x * k, z: p.z * k }));
    rin -= TILE_GAP;
    // Local units: 1 = inradius. Local space: x east, y up, z south.
    const polyU = poly.map((p) => ({ x: p.x / rin, z: p.z / rin }));
    const rcirc = Math.max(...poly.map((p) => Math.hypot(p.x, p.z)));
    const matrix = new THREE.Matrix4().makeBasis(e1, n, e3).scale(new V(rin, rin, rin)).setPosition(n);
    return {
      index, center: n, e1, e3, isPent: poly.length === 5, poly: polyU, rin, rcirc, matrix,
      neighbors: [...nb[index]], lat: Math.asin(n.y), lon: Math.atan2(n.z, n.x),
      rot0: Math.atan2(polyU[0].z, polyU[0].x),
    };
  });
  return tiles;
}

// 7 snapped anchor points per tile: the center and 6 around it (5 on a pentagon).
export function tileAnchors(tile) {
  const out = [{ x: 0, z: 0 }];
  const n = tile.poly.length;
  for (let i = 0; i < 6; i++) {
    const c = tile.poly[i % n];
    const a = n === 6 ? Math.atan2(c.z, c.x) : tile.rot0 + (i * Math.PI) / 3;
    out.push({ x: Math.cos(a) * 0.6, z: Math.sin(a) * 0.6 });
  }
  return out;
}

// Make one pentagon cell round. The circle goes through the five corners of the pentagon, so it takes a curved bite
// from each of the five hexagons around it. No corner of the grid moves, so the globe still closes.
// tile.shape = the true outline of a cell (for the border lines). tile.round / tile.bites = how edgeE finds the edge.
export function roundTile(tile, tiles, N = 40) {
  const V3 = tile.center.constructor, R = Math.max(...tile.poly.map((p) => Math.hypot(p.x, p.z)));
  tile.round = R; tile.alpha = Math.atan(R * tile.rin);
  tile.shape = Array.from({ length: N }, (_, i) => ({ x: Math.cos((i / N) * Math.PI * 2) * R, z: Math.sin((i / N) * Math.PI * 2) * R }));
  const toWorld = (t, p) => new V3().copy(t.center).addScaledVector(t.e1, p.x * t.rin).addScaledVector(t.e3, p.z * t.rin);
  const toLocal = (t, w) => { const q = w.clone().multiplyScalar(1 / w.dot(t.center)).sub(t.center); return { x: q.dot(t.e1) / t.rin, z: q.dot(t.e3) / t.rin }; };
  const corners = tile.poly.map((p) => toWorld(tile, p).normalize());
  for (const ni of tile.neighbors) {
    const h = tiles[ni], n = h.poly.length, shared = h.poly.map((p) => { const d = toWorld(h, p).normalize(); return corners.some((c) => c.dot(d) > 0.9995); });
    (h.bites || (h.bites = [])).push({ c: tile.center, e1: tile.e1, e3: tile.e3, rin: tile.rin, R });
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(h.poly[i]);
      const j = (i + 1) % n; if (!(shared[i] && shared[j])) continue;
      // The edge that the two cells share becomes an arc of the circle.
      const A = toLocal(tile, toWorld(h, h.poly[i])), B = toLocal(tile, toWorld(h, h.poly[j])), aA = Math.atan2(A.z, A.x);
      let da = Math.atan2(B.z, B.x) - aA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      for (let k = 1; k < 8; k++) { const a = aA + (da * k) / 8; out.push(toLocal(h, toWorld(tile, { x: Math.cos(a) * R, z: Math.sin(a) * R }))); }
    }
    h.shape = out;
  }
  return tile;
}
