// Fills the planet: 12 unique areas, the sample regions, and the empty tiles.
import { CONFIG } from './config.js';
import { buildAreas, addAurora } from './areas.js';
import { generateRegion } from './region.js';
import { sampleConfigs } from './samples.js';
import { buildOrbiters, setFreeBorders } from './sky.js';
import { addSeaLife } from './sea.js';

export function buildContent(app) {
  const { world } = app;
  const addAnimator = (tile, fn, o) => world.addAnimator(tile, fn, o);
  const addLight = (L) => world.addLight(L);
  app.byTile = new Map();
  world.tileFree = (i) => !app.byTile.has(i) && !(app.practice && app.practice.cfg && app.practice.tile.index === i);   // open ocean: no area, no sample region, and not the visitor's region
  app.areas = buildAreas(world, { acc: world.acc, batch: (tile) => world.chunks[tile.chunk], water: (tile) => world.waterChunks[tile.chunk], addAnimator, addLight });
  for (const a of app.areas) app.byTile.set(a.tile.index, a);
  addAurora(world);

  // Spread the samples over the planet: always take the free hexagon farthest from the ones taken.
  // The five hexagons around the round Webflow cell stay open ocean: the circle takes a bite from each of them.
  const ring = new Set(world.roundTile ? world.roundTile.neighbors : []);
  const hexes = world.tiles.filter((t) => !t.isPent && !ring.has(t.index));
  const chosen = [];
  let first = hexes[0], bd = -2;
  for (const t of hexes) { const d = t.center.x * 0.55 + t.center.y * 0.3 + t.center.z * 0.78; if (d > bd) { bd = d; first = t; } }
  chosen.push(first);
  while (chosen.length < 10) {
    let best = null, bm = -2;
    for (const t of hexes) { if (chosen.includes(t)) continue; let m = 2; for (const c of chosen) m = Math.min(m, 1 - t.center.dot(c.center)); if (m > bm) { bm = m; best = t; } }
    chosen.push(best);
  }
  // The next 10 sit next to the first 10, so that samples have sample neighbors ("Adjacent regions").
  for (let i = 0; i < 10; i++) {
    let best = null, bm = -2;
    for (const ni of chosen[i].neighbors) { const t = world.tiles[ni]; if (t.isPent || ring.has(t.index) || chosen.includes(t)) continue; let m = 2; for (const c of chosen) if (c !== chosen[i]) m = Math.min(m, 1 - t.center.dot(c.center)); if (m > bm) { bm = m; best = t; } }
    if (!best) for (const t of hexes) if (!chosen.includes(t)) { best = t; break; }
    chosen.push(best);
  }
  // Mix the order so the hand-tuned samples are not all in one place.
  const order = [0, 10, 1, 11, 2, 12, 3, 13, 4, 14, 5, 15, 6, 16, 7, 17, 8, 18, 9, 19].map((k) => chosen[k]);
  chosen.length = 0; chosen.push(...order);
  app.samples = [];
  const cfgs = sampleConfigs(Math.min(CONFIG.sampleCount, 20));
  cfgs.forEach((cfg, i) => {
    const tile = chosen[i];
    const reg = generateRegion(cfg, tile, { acc: world.acc, batch: world.chunks[tile.chunk], water: world.waterChunks[tile.chunk], addAnimator, addLight });
    reg.kind = 'sample'; reg.name = cfg.name; reg.number = cfg.number;
    app.samples.push(reg); app.byTile.set(tile.index, reg);
  });
  // The practice tile for "Design your region": a free hexagon near the equator with neighbors to look at.
  let practice = null, score = -1;
  for (const t of hexes) {
    if (app.byTile.has(t.index) || Math.abs(t.lat) > 0.5) continue;
    const s = t.neighbors.filter((n) => app.byTile.has(n)).length + (chosen.slice(0, 20).includes(t) ? -10 : 0) - Math.abs(t.lat);
    if (s > score) { score = s; practice = t; }
  }
  app.practiceTile = practice;
  // Free tiles are open ocean. A region rises from the water when a person makes one.
  world.finishStatic(world.tiles.filter((t) => app.byTile.has(t.index)));
  buildOrbiters(world);
  app.refreshFree = () => setFreeBorders(world, world.tiles.filter((t) => !app.byTile.has(t.index) && !(app.practice && app.practice.reg && app.practice.tile === t)));
  app.refreshFree();
  addSeaLife(app);
}
