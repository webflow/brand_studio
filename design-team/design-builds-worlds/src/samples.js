// Demo regions for the prototype. They are samples, not real people. Five are hand-tuned.
import { randomConfig, LAND_IDS } from './region.js';
import { LAND_STYLE_IDS } from './buildings.js';
import { LAND_HERO_IDS } from './heroes.js';

const TUNED = [
  { name: 'Mora Bay', motto: 'Small place. Big shapes.', biome: 'archipelago', rough: 0.45, water: 0.42, veg: 0.75,
    hues: ['red', 'blue'], toneSet: 'mid', hueShift: 0.55, arch: 'village', bld: 0.5, whimsy: 0.3, seed: 1107,
    heroes: [{ type: 'lighthouse', anchor: 0, rot: 1, size: 'large' }, { type: 'dock', anchor: 2, rot: 2, size: 'medium' }, { type: 'bridge', anchor: 4, rot: 4, size: 'medium' }, { type: 'store', anchor: 6, rot: 1, size: 'small' }] },
  { name: 'Brindle Heights', motto: 'One hill at a time.', biome: 'alpine', rough: 0.7, water: 0.25, veg: 0.6,
    hues: ['purple', 'orange'], toneSet: 'mid', hueShift: 0.5, arch: 'tower', bld: 0.45, whimsy: 0.35, seed: 2203,
    heroes: [{ type: 'observatory', anchor: 0, rot: 1, size: 'large' }, { type: 'clocktower', anchor: 3, rot: 1, size: 'medium' }, { type: 'monument', anchor: 5, rot: 1, size: 'small' }] },
  { name: 'Farro Commons', motto: 'Every roof a triangle.', biome: 'meadow', rough: 0.35, water: 0.3, veg: 0.8,
    hues: ['red', 'yellow'], toneSet: 'mid', hueShift: 0.45, arch: 'village', bld: 0.65, whimsy: 0.25, seed: 3301,
    heroes: [{ type: 'windmill', anchor: 4, rot: 1, size: 'large' }, { type: 'farm', anchor: 6, rot: 1, size: 'medium' }, { type: 'bakery', anchor: 0, rot: 1, size: 'medium' }, { type: 'square', anchor: 2, rot: 1, size: 'small' }, { type: 'fountain', anchor: 1, rot: 1, size: 'small' }] },
  { name: 'Sunda Flats', motto: 'A good arch helps.', biome: 'desert', rough: 0.55, water: 0.1, veg: 0.5,
    hues: ['orange', 'blue'], toneSet: 'mid', hueShift: 0.4, arch: 'ruins', bld: 0.5, whimsy: 0.5, seed: 4409,
    heroes: [{ type: 'arch', anchor: 0, rot: 1, size: 'large' }, { type: 'museum', anchor: 4, rot: 1, size: 'medium' }, { type: 'monument', anchor: 2, rot: 1, size: 'medium' }] },
  { name: 'Cobalt Quarter', motto: 'The grid is our friend.', biome: 'crystal', rough: 0.3, water: 0.3, veg: 0.5,
    hues: ['darkblue', 'yellow'], toneSet: 'mixed', hueShift: 0.4, arch: 'city', bld: 0.8, whimsy: 0.12, seed: 5507,
    heroes: [{ type: 'opera', anchor: 0, rot: 1, size: 'large' }, { type: 'clocktower', anchor: 4, rot: 1, size: 'large' }, { type: 'coffee', anchor: 2, rot: 1, size: 'medium' }, { type: 'store', anchor: 6, rot: 1, size: 'medium' }, { type: 'fountain', anchor: 1, rot: 1, size: 'small' }] },
];
const A = ['Tesse', 'Quill', 'Ombra', 'Pilo', 'Vanta', 'Kesh', 'Lumo', 'Nori', 'Zephyr', 'Halo', 'Wren', 'Juno', 'Peri', 'Sable', 'Tango', 'Echo', 'Mica', 'Opal'];
const B = ['Hollow', 'Reach', 'Point', 'Ridge', 'Works', 'Gardens', 'Landing', 'Cove', 'Terrace', 'Yard', 'Steps', 'Shoals', 'Rise', 'Quarter', 'Flats'];

export function sampleConfigs(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    let cfg;
    if (i < TUNED.length) cfg = { ...TUNED[i] };
    else {
      cfg = randomConfig(900 + i * 31);
      cfg.biome = LAND_IDS[(i * 5 + 2) % LAND_IDS.length];
      cfg.arch = LAND_STYLE_IDS[(i * 3 + 1) % LAND_STYLE_IDS.length];
      // Make sure every hero object shows somewhere on the planet.
      cfg.heroes.forEach((h, k) => { h.type = LAND_HERO_IDS[(i * 4 + k * 5 + 3) % LAND_HERO_IDS.length]; h.rot = 1; });
      cfg.name = A[(i * 7) % A.length] + ' ' + B[(i * 4 + 1) % B.length];
      // Spread the accent hues so the planet shows every brand color.
      const HU = ['red', 'pink', 'green', 'blue', 'orange', 'purple', 'yellow', 'darkblue'];
      cfg.hues = [HU[i % 8], HU[(i * 3 + 2) % 8] === HU[i % 8] ? HU[(i + 4) % 8] : HU[(i * 3 + 2) % 8]];
    }
    cfg.number = i + 1;
    cfg.founded = '2026-11-' + String(2 + (i * 5) % 14).padStart(2, '0');
    cfg.visitors = 40 + ((i * 97 + 31) % 260);
    out.push(cfg);
  }
  return out;
}
