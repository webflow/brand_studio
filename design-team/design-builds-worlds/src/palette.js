// Webflow brand color library. Only these colors, plus black and white.
import * as THREE from 'three';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const toHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

export const BLACK = '#080808';
export const WHITE = '#FFFFFF';

// Tones 100..900. null = fill by mixing the two neighbor tones.
const RAMPS = {
  blue: ['#CEE2FF', null, null, '#3B89FF', '#146EF5', '#0055D4', null, null, '#001535'],
  red: ['#FFCFD5', '#FF9EAA', '#FF6D7E', '#FF3C53', '#EE1D36', '#D5001A', '#A00013', '#6B000D', '#360006'],
  orange: ['#FFE1CC', '#FFC499', '#FFA666', '#FF8933', '#FF6B00', '#CC5600', '#994000', '#662B00', '#331500'],
  yellow: ['#FFEFD0', '#FFDEA1', '#FFCE71', '#FFBE42', '#FFAE13', '#DB9000', '#A46B00', '#6E4800', '#372400'],
  green: ['#CAF9D1', '#95F3A3', '#60ED76', '#2BE747', '#00D722', '#00AC1B', '#008114', '#00560D', '#002B06'],
  purple: ['#E4D8FF', '#CAB1FF', '#AF8BFF', '#9564FF', '#7A3DFF', '#5919E4', '#4213AB', '#2D0D71', '#160639'],
  pink: ['#FFD8F7', '#FFB3EE', '#FF8CE6', '#FF67DD', '#ED52CB', '#CC34AA', '#992680', '#661A55', '#320D2B'],
};
export const DARK_BLUE = '#0F5CD6';

// Row order in the palette texture.
export const HUES = ['blue', 'darkblue', 'red', 'orange', 'yellow', 'green', 'purple', 'pink'];
// Natural colors for land, plants, and water. Each one is a mix of brand tokens: the brand hue at tones 100, 300, 500, 700, 900, plus a Neutral token (the mix is noted on each row). Stops are at tones 1, 3, 5, 7, 9.
// Buildings and objects use the brand hues (the two accent colors a person picks).
export const NATURAL = {
  grass: ['Grass', '#E2EBD7', '#ADC78C', '#80A64A', '#556A2E', '#2B321E'],   // Green 28% + Yellow 27% + Neutral
  forest: ['Forest', '#DAEDD7', '#93CD8C', '#57AE4A', '#3A6E30', '#21321D'],   // Green 45% + Yellow 12% + Neutral
  olive: ['Olive', '#E9EBD7', '#C1C689', '#A0A443', '#696828', '#30301A'],   // Yellow 42% + Green 18% + Neutral
  sand: ['Sand', '#F7F0E2', '#F7E1B7', '#F7D28D', '#C5AB7B', '#615848'],   // Yellow 45% + Neutral
  earth: ['Earth', '#EFE3D7', '#BD9B78', '#A86F34', '#6B4821', '#3A2E21'],   // Orange 27% + Yellow 20% + Neutral
  rock: ['Rock', '#EBEBEB', '#C5C5C5', '#909090', '#606060', '#2E2E2E'],   // Neutral only
  snow: ['Snow', '#ECF4FF', '#C7DDFF', '#92B5E8', '#6A82A6', '#38404C'],   // Blue 38% + Neutral
  sea: ['Sea', '#DDF1FB', '#8FCBF6', '#3B93F7', '#146EF5', '#062A6B'],   // pale shallows, then the hue of Webflow Blue (#146EF5 at tone 7)
  autumn: ['Autumn', '#F9E6D1', '#F0B676', '#E9881F', '#995C18', '#3C2710'],   // Orange 45% + Yellow 37% + Neutral
  coral: ['Coral', '#FADFDB', '#FAA79C', '#EE715D', '#A2493E', '#41231F'],   // Red 40% + Orange 28% + Neutral
  amethyst: ['Amethyst', '#E8E3F8', '#C1B2F1', '#8970D9', '#5B4799', '#26203B'],   // Purple 50% + Blue 6% + Neutral
  plaster: ['Plaster', '#F3F0EA', '#E6DCCA', '#BCAC8D', '#8A7E69', '#3D3932'],   // Yellow 20% + Neutral
};
export const NATURAL_IDS = Object.keys(NATURAL);
export const HUE_LABEL = { blue: 'Blue', darkblue: 'Dark Blue', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', purple: 'Purple', pink: 'Pink', neutral: 'Neutral' };
export const ROW = { blue: 0, darkblue: 1, red: 2, orange: 3, yellow: 4, green: 5, purple: 6, pink: 7, neutral: 8 };
NATURAL_IDS.forEach((k, i) => { ROW[k] = 9 + i; HUE_LABEL[k] = NATURAL[k][0]; });
export const ROWS = 9 + NATURAL_IDS.length;
export const COLS = 11; // tone coordinate 0..10: 0 = white, 1..9 = tones 100..900, 10 = deepest

function fillRamp(r) {
  const a = r.map((h) => (h ? hex(h) : null));
  for (let i = 0; i < a.length; i++) {
    if (a[i]) continue;
    let lo = i - 1; while (!a[lo]) lo--;
    let hi = i + 1; while (!a[hi]) hi++;
    a[i] = mix(a[lo], a[hi], (i - lo) / (hi - lo));
  }
  return a;
}

// rows[row][toneCoord] = [r,g,b]
export const TABLE = [];
export const MIXED = {}; // which tones are mixes (for labels)
const stops5 = (st) => { const a = st.map(hex), t = []; for (let i = 1; i <= 9; i++) { const k = Math.min(3, Math.floor((i - 1) / 2)), f = (i - 1 - k * 2) / 2; t.push(mix(a[k], a[k + 1], f)); } return t; };
for (const h of HUES) {
  let tones;
  if (h === 'darkblue') {
    // Dark Blue has no ramp. Tone 500 is the one flat brand tone.
    // The other entries only feed the shading bands (lighter and deeper steps).
    const db = hex(DARK_BLUE), l = hex('#CEE2FF'), d = hex('#001535');
    tones = [];
    for (let i = 0; i < 9; i++) tones.push(i < 4 ? mix(l, db, i / 4) : mix(db, d, (i - 4) / 4));
  } else {
    tones = fillRamp(RAMPS[h]);
    MIXED[h] = RAMPS[h].map((v) => !v);
  }
  const deepest = mix(tones[8], hex(BLACK), 0.5);
  TABLE.push([[255, 255, 255], ...tones, deepest]);
}
TABLE.push(['#FFFFFF', '#F0F0F0', '#E0E0E0', '#ABABAB', '#838383', '#5A5A5A', '#3E3E3E', '#222222', '#171717', '#0F0F0F', '#080808'].map(hex));
for (const k of NATURAL_IDS) {
  const tones = stops5(NATURAL[k].slice(1));   // stops at tones 1, 3, 5, 7, 9
  TABLE.push([[255, 255, 255], ...tones, mix(tones[8], hex(BLACK), 0.5)]);
}

export function toneHex(hue, toneCoord) {
  const row = TABLE[ROW[hue]];
  const t = Math.max(0, Math.min(10, toneCoord));
  const i = Math.floor(t), f = t - i;
  return toHex(f < 0.001 || i >= 10 ? row[i] : mix(row[i], row[i + 1], f));
}
export function toneLabel(hue, toneCoord) {
  if (hue === 'darkblue') return HUE_LABEL.darkblue;
  const n = Math.round(toneCoord);
  if (n <= 0) return 'White';
  if (n >= 10) return HUE_LABEL[hue] + ' 900+';
  return `${HUE_LABEL[hue]} ${n * 100}${MIXED[hue] && MIXED[hue][n - 1] ? ' (mix)' : ''}`;
}

export function makePaletteTexture() {
  const data = new Uint8Array(COLS * ROWS * 4);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const o = (r * COLS + c) * 4;
    data[o] = TABLE[r][c][0]; data[o + 1] = TABLE[r][c][1]; data[o + 2] = TABLE[r][c][2]; data[o + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, COLS, ROWS, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Tone sets: which part of the ramp a region uses. l is 0 (lightest) to 1 (deepest).
export const TONE_SETS = { pastel: [1, 3], mid: [3, 6], deep: [6, 9], mixed: [1, 9] };
export const TONE_SET_LABEL = { pastel: 'Pastel (100 to 300)', mid: 'Mid (300 to 600)', deep: 'Deep (600 to 900)', mixed: 'Mixed (all)' };

// A region palette. A person picks two accent hues. Accent 1 is for roofs and large shapes.
// Accent 2 is for walls and details. Land, plants, and water take natural colors from the biome.
export function regionPalette(cfg) {
  const [lo, hi] = TONE_SETS[cfg.toneSet] || TONE_SETS.mid;
  const shift = ((cfg.hueShift ?? 0.5) - 0.5) * 1.5;
  const mk = (hue) => (l) => {
    if (hue === 'darkblue') return [ROW.darkblue, 5];
    return [ROW[hue], Math.max(0.6, Math.min(9.4, lo + (hi - lo) * l + shift))];
  };
  const a1 = cfg.hues[0], a2 = cfg.hues[1] || cfg.hues[0];
  const m1 = mk(a1), m2 = mk(a2);
  return {
    a: m1,
    s: (l) => (l <= 0.3 ? [ROW.plaster, 0.9 + l * 2.2] : m2(l)),   // light walls are plaster, the rest is accent 2
    hues: [a1, a2], lo, hi, shift,
    W: [ROW.plaster, 0.25],
    K: [ROW.neutral, 8.4],
    tones(hue) { // tone numbers used, for the manual
      if (hue === 'darkblue') return [5];
      const out = [];
      for (let t = Math.round(lo); t <= Math.round(hi); t++) out.push(t);
      return out;
    },
  };
}
