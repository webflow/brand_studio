// Terrain. Inside a tile, a height field shapes the land. The land is made of cube columns.
// Local units: 1 = tile inradius. y = 0 is the water plane. Land at the tile edge sits at RIM.
import { TILE_DEPTH } from './goldberg.js';
import { ROW } from './palette.js';
import { clamp, smooth } from './util.js';

export const RIM = 0.035;

// 1 at the tile center, 0 at the tile edge.
export function edgeE(tile, x, z) {
  if (tile.round) return tile.round - Math.hypot(x, z);   // the round cell
  if (!tile._edges) {
    const p = tile.poly;
    tile._edges = p.map((a, i) => {
      const b = p[(i + 1) % p.length];
      let nx = b.z - a.z, nz = -(b.x - a.x);
      const l = Math.hypot(nx, nz); nx /= l; nz /= l;
      let d = a.x * nx + a.z * nz;
      if (d < 0) { nx = -nx; nz = -nz; d = -d; }
      return { nx, nz, d };
    });
  }
  let m = 0;
  for (const e of tile._edges) { const v = (x * e.nx + z * e.nz) / e.d; if (v > m) m = v; }
  let e = 1 - m;
  // A neighbor of the round cell: the circle takes a bite from this cell.
  if (tile.bites) for (const bt of tile.bites) {
    const wx = tile.center.x + (tile.e1.x * x + tile.e3.x * z) * tile.rin, wy = tile.center.y + (tile.e1.y * x + tile.e3.y * z) * tile.rin, wz = tile.center.z + (tile.e1.z * x + tile.e3.z * z) * tile.rin;
    const k = 1 / (wx * bt.c.x + wy * bt.c.y + wz * bt.c.z), qx = wx * k - bt.c.x, qy = wy * k - bt.c.y, qz = wz * k - bt.c.z;
    const rho = Math.hypot(qx * bt.e1.x + qy * bt.e1.y + qz * bt.e1.z, qx * bt.e3.x + qy * bt.e3.y + qz * bt.e3.z) / bt.rin;
    e = Math.min(e, ((rho - bt.R) * bt.rin) / tile.rin);
  }
  return e;
}

// Wrap a raw height function so land meets the flat rim and water can reach the edge.
export function rimmed(tile, raw) {
  return (x, z) => {
    const e = edgeE(tile, x, z);
    const h = raw(x, z);
    if (h <= 0) return h * smooth(-0.02, 0.2, e) - 0.012;
    return RIM + (h - RIM) * smooth(0.02, 0.26, e);
  };
}

// The land is a grid of cube columns with stepped heights.
export const VOX = 0.062, VOX_H = 0.031;
const vh = (x, z, s) => { let h = Math.imul(Math.round(x * 997) + 31, 374761393) ^ Math.imul(Math.round(z * 991) + s, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function voxelH(H) {
  return (x, z) => { const h = H((Math.floor(x / VOX) + 0.5) * VOX, (Math.floor(z / VOX) + 0.5) * VOX); return h < 0 ? Math.min(h, -0.03) : Math.max(VOX_H, Math.round(h / VOX_H) * VOX_H); };
}
// b = a Builder on the tile. Each column is one cube: kind 13 (colored top, earth and stone below) or kind 5 (water).
// Tops vary a little from column to column. Steep steps show bare rock. The floor of a pond is sand.
export function buildVoxelTerrain(b, tile, spec) {
  const top = spec.top, water = spec.water || [ROW.sea, 6], side = spec.side || [ROW.earth, 6], D = TILE_DEPTH / tile.rin, bandH = top.bandH || 0.1;
  const keepLod = b.lod, keepSens = b.sens; b.lod = 0; b.sens = spec.sens ?? 0.5;
  const R = Math.ceil(1.3 / VOX), H = spec.H;
  for (let i = -R; i < R; i++) for (let j = -R; j < R; j++) {
    const x = (i + 0.5) * VOX, z = (j + 0.5) * VOX;
    if (edgeE(tile, x, z) < 0.012) continue;
    const h = H(x, z);
    if (h < 0) {
      // A pond or sea inside the tile: a sand floor and a block of water over it.
      const fl = Math.max(-D + 0.05, Math.round(Math.max(h * 1.6, spec.deep ?? -0.3) / VOX_H) * VOX_H);   // deep: how far down the floor can go
      const fa = spec.floorAt ? spec.floorAt(fl, x, z) : null;   // floorAt(depth, x, z) = [row, tone]: a floor that changes from place to place
      b.col(VOX, fl + D, VOX, [fa ? fa[0] : spec.floorRow ?? ROW.sand, (fa ? fa[1] : spec.floorTone ?? 3.4) + vh(x, z, 3) * (fa ? 0.5 : 1.2), 13, (fa ? fa[0] : spec.floorRow ?? ROW.rock) / 255], { x, y: -D, z, pat: 0 });   // floorRow: the color of the pond floor
      b.wcol(VOX, -fl, VOX, [water[0], water[1], 5, clamp(-h / 0.2) * (spec.waterK ?? 1)], { x, y: fl, z, pat: 0 });   // waterK < 1: clearer water, so the floor shows
      continue;
    }
    const lvl = Math.floor(Math.max(0, (h - RIM) / bandH + 0.02)), am = top.altEvery || 0;
    let row = top.row, tone = top.tone - lvl * (top.step || 0);
    if (am >= 100) { if (lvl >= am - 100) { row = top.altRow; tone += top.altTone || 0; } }
    else if (am > 0 && lvl > 0 && lvl % am === am - 1) { row = top.altRow; tone += top.altTone || 0; }
    tone += (vh(x, z, 1) - 0.5) * 0.7;
    if (!spec.plain) {
      const drop = h - Math.min(H(x + VOX, z), H(x - VOX, z), H(x, z + VOX), H(x, z - VOX));
      if (drop > VOX_H * 2.5 && row !== ROW.snow) { row = ROW.rock; tone = 4.2 + vh(x, z, 2) * 1.4; }   // a steep step: bare rock
      else if (vh(Math.floor(x / (VOX * 3)), Math.floor(z / (VOX * 3)), 7) > 0.8) tone += 0.7;             // a darker patch
    }
    if (spec.over) { const o = spec.over(x, z, h); if (o) { row = o[0]; tone = o[1] + (vh(x, z, 1) - 0.5) * 0.4; } }   // a land feature of a landmark (snow on a mountain, dark rock on a volcano)
    b.col(VOX, h + D, VOX, [row, clamp(tone, 0, 10), 13, (spec.snowSides && row === ROW.snow ? ROW.snow : side[0]) / 255], { x, y: -D, z, pat: 0 });   // snowSides: a snow block is white on its sides too
  }
  b.lod = keepLod; b.sens = keepSens;
}
