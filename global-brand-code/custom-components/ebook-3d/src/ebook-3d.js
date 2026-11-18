/*
  Ebook 3D: a thin soft-cover book with a floor shadow, drawn from a CMS cover image.
  Markup contract and Webflow setup: see ../SPEC.md

  Behavior in short:
  - The page ships a normal <img> (the static cover). This script only upgrades it.
  - It starts after the page has loaded and the browser is idle, so it never delays LCP.
  - If anything is unsupported or fails, the static cover stays. Nothing breaks.
*/
import {
  Scene, WebGLRenderer, PerspectiveCamera, Group, Mesh, BufferGeometry, Float32BufferAttribute,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, ShadowMaterial, PlaneGeometry,
  Color, DirectionalLight, SpotLight, PMREMGenerator, CanvasTexture, Texture,
  SRGBColorSpace, RepeatWrapping, FrontSide, DoubleSide, NeutralToneMapping, VSMShadowMap, MathUtils,
} from 'three';

const SELECTOR = '[data-ebook-3d]';

/* ---------- Settings (inches for size, radians for angles) ---------- */
const W = 8.5, T = 0.27;                       // book width and total thickness at the spine
let H = 11;                                    // book height: W / the cover's own ratio, set once the cover has loaded (one book per page)
const RATIO_MIN = 0.5, RATIO_MAX = 1.6;        // width/height range the book accepts; covers outside it are center-cropped to the nearest limit
const REST = { y: -0.06, x: -0.20 };           // resting pose: almost straight on; x is tilt (the camera adds 0.14 forward, so the book leans back about 0.06)
const CAM_TILT = 0.14;                         // camera looks slightly down so the floor shadow is visible
const RANGE = { y: 0.50, x: 0.14 };            // pointer range: the book turns toward the cursor, about 29 degrees at the window edge
const AMBIENT = { y: 0.10, x: 0.05 };          // idle sway
// Light levels are tuned so a head-on cover renders close to its source color.
const ENV_BASE = 0.45, SPOT_BASE = 2.45;
const LIGHT = [-13, 16, 18];                   // key light position: top left, in front
// Satin: a narrow glint, not a veil.
// Cover finishes, chosen by the data-finish attribute on the stage (bind it to a CMS option field). Unknown or empty values use paper.
//   paper: satin paper with a fine tooth (the default).  cloth: woven book cloth: fine, soft, uneven (about 320 threads across).  leather: fine pebbled leather grain (about 220 pebbles across).
// repeat: how often the bump tile repeats across the cover (x, y). bumpFloor: the share of relief kept on very dark covers.
const FINISHES = {
  paper:   { kind: 'grain', roughness: .28, clearcoat: 0,  clearcoatRoughness: .5,  sheen: .1,  sheenRoughness: .5,  bump: 1.3, tooth: .85, specular: .25, repeat: [.8, 1],     bumpFloor: .15, print: .4 },
  cloth:   { kind: 'weave', roughness: .62, clearcoat: 0,  clearcoatRoughness: .5,  sheen: .5,  sheenRoughness: .6,  bump: .9, tooth: .9,  specular: .1,  repeat: [2.5, 3.1], bumpFloor: .4, print: .2 },
  leather: { kind: 'cell',  roughness: .36, clearcoat: .12, clearcoatRoughness: .35, sheen: .08, sheenRoughness: .5,  bump: .8, tooth: 1,   specular: .45, repeat: [3.4, 4.25], bumpFloor: .4, print: .22 },
};
const FINISH_NAMES = { paper: 'paper', cloth: 'cloth', fabric: 'cloth', linen: 'cloth', buckram: 'cloth', leather: 'leather', pebble: 'leather', pebbled: 'leather', leatherette: 'leather' };
let FINISH = FINISHES.paper;                   // set in boot from the stage attribute (one book per page)
const pickFinish = v => FINISH_NAMES[String(v || '').trim().toLowerCase().replace(/[\s_]+/g, '-')] || 'paper';

/* ---------- Small helpers ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

/* ---------- Procedural textures ---------- */
let grainCanvas, grainMul, grainScr;
// Builds a tileable height map from a function, plus a centred copy for the cover color and the multiply/screen layers.
function patternTexture(heightAt, centre, mulAmt, scrAmt) {
  const n = 512, hc = document.createElement('canvas'), pc = document.createElement('canvas');
  hc.width = hc.height = pc.width = pc.height = n;
  const hg = hc.getContext('2d'), pg = pc.getContext('2d'), hd = hg.createImageData(n, n), pd = pg.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const h = Math.min(1, Math.max(0, heightAt(x, y))), k = (y * n + x) * 4, v = h * 255, c = 128 + (h - centre) * 230;
    hd.data[k] = hd.data[k + 1] = hd.data[k + 2] = v; hd.data[k + 3] = 255;
    pd.data[k] = pd.data[k + 1] = pd.data[k + 2] = Math.min(255, Math.max(0, c)); pd.data[k + 3] = 255;
  }
  hg.putImageData(hd, 0, 0); pg.putImageData(pd, 0, 0);
  const mk = fn => { const o = document.createElement('canvas'); o.width = o.height = n; const og = o.getContext('2d'), od = og.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = fn(pd.data[i * 4] / 255); od.data[i * 4] = od.data[i * 4 + 1] = od.data[i * 4 + 2] = v; od.data[i * 4 + 3] = 255; }
    og.putImageData(od, 0, 0); return o; };
  grainMul = mk(v => 255 * (1 - mulAmt * Math.max(0, (.5 - v) * 2)));      // darker in the gaps
  grainScr = mk(v => 255 * scrAmt * Math.max(0, (v - .5) * 2));            // lighter on the tops
  grainCanvas = pc;
  const t = new CanvasTexture(hc);
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(...FINISH.repeat); t.anisotropy = 4;
  return t;
}
function weaveTexture() {            // book cloth: a tight plain weave of round threads, with a very slight wander so it is not a perfect grid
  const n = 512, cell = 4, TAU = Math.PI * 2, cnt = n / cell;
  const rnd = (k) => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // stable per-thread randomness
  const ph = Array.from({ length: cnt * 2 }, (_, i) => rnd(i + 1) * TAU), wd = Array.from({ length: cnt * 2 }, (_, i) => (rnd(i + 91) - .5) * .5);
  return patternTexture((x, y) => {
    // Threads wander a little: the sample position is nudged by slow waves (whole numbers of cycles per tile, so the tile still repeats).
    const wx = x + .35 * Math.sin(TAU * 3 * y / n + 1.1) + .2 * Math.sin(TAU * 7 * y / n + 2.3);
    const wy = y + .35 * Math.sin(TAU * 3 * x / n + 4.1) + .2 * Math.sin(TAU * 7 * x / n + .6);
    const ix = Math.floor(wx / cell), iy = Math.floor(wy / cell);
    const ixm = (ix % cnt + cnt) % cnt, iym = (iy % cnt + cnt) % cnt;
    const lx = (wx / cell) - ix, ly = (wy / cell) - iy;
    const warpOver = ((ixm + iym) & 1) === 0;                    // vertical thread on top, or horizontal thread on top
    const ti = warpOver ? ixm : cnt + iym, along = warpOver ? y : x;
    const across = Math.sin(Math.PI * (warpOver ? lx : ly)), end = .8 + .2 * Math.sin(Math.PI * (warpOver ? ly : lx));
    return .12 + .88 * across * end * (1 + wd[ti] + .12 * Math.sin(TAU * 2 * along / n + ph[ti])) * (1 + .1 * Math.sin(TAU * 2 * x / n + 1.7) * Math.sin(TAU * 3 * y / n + .4));
  }, .62, .2, .1);
}
function cellTexture() {             // pebbled leather: rounded cells separated by fine creases (a jittered-grid cell pattern, wrapped so it tiles)
  const n = 512, cs = 8, cnt = n / cs;
  const rnd = (i, j, k) => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  const pts = []; for (let j = 0; j < cnt; j++) for (let i = 0; i < cnt; i++) pts.push([(i + .15 + .7 * rnd(i, j, 1)) * cs, (j + .15 + .7 * rnd(i, j, 2)) * cs, .8 + .4 * rnd(i, j, 3)]);
  return patternTexture((x, y) => {
    const ci = Math.floor(x / cs), cj = Math.floor(y / cs);
    let d1 = 1e9, d2 = 1e9, sz = 1;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const gi = ((ci + di) % cnt + cnt) % cnt, gj = ((cj + dj) % cnt + cnt) % cnt, p = pts[gj * cnt + gi];
      const px = p[0] + (ci + di - gi) * cs, py = p[1] + (cj + dj - gj) * cs, d = Math.hypot(x - px, y - py) / p[2];
      if (d < d1) { d2 = d1; d1 = d; sz = p[2]; } else if (d < d2) d2 = d;
    }
    const crease = Math.min(1, (d2 - d1) / 2.2);                    // 0 in the creases between cells, 1 in the middle of a cell
    return .1 + .9 * Math.pow(crease, .7) * (.9 + .1 * Math.min(1, sz));
  }, .6, .3, .1);
}
function grainTexture() {            // paper surface: fine tooth + fibres; bump map and printed into the cover color
  if (FINISH.kind === 'weave') return weaveTexture();
  if (FINISH.kind === 'cell') return cellTexture();
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true }), d = g.createImageData(n, n);
  // Paper tooth: band-limited noise (a 3x3 average minus a 5x5 average). Its specks are about 1.5 to 3 pixels wide and soft, and it has no
  // per-pixel static and no large cloudy blobs. Per-pixel noise reads as screen noise; wide blurs read as blotches.
  const Nt = new Float32Array(n * n); for (let i = 0; i < n * n; i++) Nt[i] = Math.random() - .5;
  const mean = (r, N = Nt) => {                                    // wrapped box average, in two passes
    const T1 = new Float32Array(n * n), T2 = new Float32Array(n * n), k = 2 * r + 1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let a = 0; for (let d = -r; d <= r; d++) a += N[y * n + ((x + d + n) % n)]; T1[y * n + x] = a / k; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let a = 0; for (let d = -r; d <= r; d++) a += T1[((y + d + n) % n) * n + x]; T2[y * n + x] = a / k; }
    return T2;
  };
  const m1 = mean(1), m3 = mean(2);
  for (let i = 0; i < n * n; i++) { const v = 128 + (m1[i] - m3[i]) * 200, k = i * 4; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; }
  g.putImageData(d, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 4500; i++) {   // thin curved fibres in every direction, drawn wrapped so the tile repeats cleanly. They are what makes it read as paper.
    const x = Math.random() * n, y = Math.random() * n, a = Math.random() * 6.28, l = 4 + Math.random() * 11, bend = (Math.random() - .5) * l * .6;
    const cx = Math.cos(a), cy = Math.sin(a);
    g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; g.lineWidth = .5 + Math.random() * .3;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      g.beginPath(); g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + cx * l / 2 - cy * bend, y + oy + cy * l / 2 + cx * bend, x + ox + cx * l, y + oy + cy * l); g.stroke();
    }
  }
  // The cover color gets only a faint, soft "formation" (the cloudy look of paper fibres), not the tooth. The tooth lives in the bump map
  // only, so it is lit like real relief: it fades into smooth shade where the book is in shadow. Printing it into the color would
  // leave it visible in shadow, where it reads as noise.
  const Nf = new Float32Array(n * n); for (let i = 0; i < n * n; i++) Nf[i] = Math.random() - .5;
  const f1 = mean(1, Nf), f4 = mean(3, Nf);
  const fc = document.createElement('canvas'); fc.width = fc.height = n;
  const fg = fc.getContext('2d'), fd = fg.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 128 + (f1[i] - f4[i]) * 190, k = i * 4; fd.data[k] = fd.data[k + 1] = fd.data[k + 2] = v; fd.data[k + 3] = 255; }
  fg.putImageData(fd, 0, 0);
  // Two more versions for the cover color. A single `overlay` blend changes nothing on pure white or pure black,
  // so flat white and black areas would show no paper at all. `multiply` adds faint darker flecks on white, `screen` faint lighter flecks on black.
  // The raw grain sits near mid-gray with low contrast, so its contrast is stretched first.
  const grainPixels = fd.data;
  const mk = fn => { const o = document.createElement('canvas'); o.width = o.height = n; const og = o.getContext('2d'), od = og.createImageData(n, n), sd = grainPixels;
    for (let i = 0; i < n * n; i++) { const v = fn(Math.max(0, Math.min(1, (sd[i * 4] / 255 - .5) * 2 + .5))); od.data[i * 4] = od.data[i * 4 + 1] = od.data[i * 4 + 2] = v; od.data[i * 4 + 3] = 255; }
    og.putImageData(od, 0, 0); return o; };
  grainMul = mk(v => 255 * (1 - 0.12 * Math.max(0, (.5 - v) * 2)));     // darker where the grain is low, up to 12%
  grainScr = mk(v => 255 * 0.09 * Math.max(0, (v - .5) * 2));           // lighter where the grain is high, up to 9%
  grainCanvas = fc;                  // the soft layer baked into the cover color (see coverCanvas)
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(...FINISH.repeat); t.anisotropy = 4;   // about one texel per pixel or coarser: finer grain aliases into faint streaks on dark covers
  return t;
}
function pageEdgeTexture() {         // edge of a stack of sheets; dark gaps double as the bump map
  const w = 4, h = 512, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3731'; g.fillRect(0, 0, w, h);
  const sheets = 38, step = h / sheets;
  for (let i = 0; i < sheets; i++) {
    const l = 226 + Math.random() * 22;
    g.fillStyle = `rgb(${l},${l - 3},${l - 10})`; g.fillRect(0, i * step, w, step - 1.8);
  }
  const shade = g.createLinearGradient(0, 0, 0, h);          // darker next to the covers
  shade.addColorStop(0, 'rgba(0,0,0,.4)'); shade.addColorStop(.12, 'rgba(0,0,0,0)');
  shade.addColorStop(.88, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.4)');
  g.fillStyle = shade; g.fillRect(0, 0, w, h);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ---------- Studio lighting as an environment map (soft boxes) ---------- */
function buildEnv(renderer) {
  const s = new Scene();
  s.background = new Color(0.05, 0.05, 0.055);   // dark studio: reflections come from soft boxes, not a gray wall
  const box = (w, h, I, pos) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color().setScalar(I), side: DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  box(18, 8, 4.5, [-4, 10, 4]);     // large top key, shifted left
  box(3, 15, 9,   [-10, 1, 5]);     // tall left strip (the moving highlight)
  box(3, 14, 3,   [10, 1, 5]);      // right strip (dimmer: the light comes from the left)
  box(11, 11, 3.2, [-7, 7, 9]);     // soft upper-left fill
  box(9, 9, 1.6,  [8, -3, 8]);      // soft lower-right fill
  box(14, 4, 1.2, [0, -8, 5]);      // low bounce
  box(14, 5, 3.5, [0, 3, -10]);     // back rim
  const pm = new PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.03).texture; pm.dispose();
  return tex;
}

/* ---------- Book geometry: thin flexible covers over a straight page block ---------- */
const TC = 0.014;                                   // cover stock thickness
const TP = T - 2 * TC;                              // page block thickness at the spine
const pHalf = u => TP * (1 + 0.5 * Math.pow(u, 3)) / 2;   // pages fan open a little toward the fore-edge
const hinge = u => -0.022 * Math.exp(-Math.pow((u - 0.035) / 0.011, 2));   // score line near the spine
const lift  = u => 0.004 + 0.11 * u * u;            // covers peel away from the pages toward the fore-edge
const wave  = (u, v) => 0.008 * Math.sin(u * 5.2 + v * 2.1) + 0.005 * Math.sin(u * 11 - v * 3.7 + 1.3)
  + 0.07 * Math.pow(sstep(.7, 1, u), 2) * Math.pow(Math.abs(v - .5) * 2, 3);           // waviness + lifted outer corners
const GAP = 0.003;                                  // covers never sink into the page block
// Edge bevel: the front cover rolls down a little along its three trimmed edges (fore-edge, top, bottom), so each edge catches a thin line of light.
const BEVEL_W = 0.07, BEVEL_D = 0.025;               // how far in the roll starts, and how far the edge drops, in inches
const bevel = (u, v) => { const d = Math.min((1 - u) * (W / 2 - XL), v * H, (1 - v) * H), t = 1 - sstep(0, BEVEL_W, d); return BEVEL_D * t * t; };
const zF = (u, v) => pHalf(u) + TC + Math.max(GAP, lift(u) + wave(u, v) + hinge(u) - bevel(u, v));
const zB = (u, v) => -(pHalf(u) + TC + Math.max(GAP, 0.4 * lift(u) + 0.6 * wave(u + .3, v)));
const ao = (u) => 1 - 0.05 * Math.exp(-Math.pow((u - 0.035) / 0.03, 2)) - 0.02 * (1 - sstep(0, 0.14, u));   // light baked shading at the hinge
const SR = 0.12;                                    // how far the rounded spine bulges out to the left
const XL = -W / 2 + SR;                             // where the flat covers start; the spine wraps around from here
const X = u => lerp(XL, W / 2, u), Y = v => (v - .5) * H;

const CORNER_R = 0.2;                               // radius of the two outer (fore-edge) corners, in inches
// Rounds the two outer corners: vertices near them are pulled onto an arc. `ins` is how far the outline sits inside the cover edge.
function roundCorner(x, y, ins) {
  if (x <= 0) return [x, y];                        // the spine side stays square
  const r = Math.max(0.02, CORNER_R - ins), ix = W / 2 - ins - r, iy = H / 2 - ins - r;
  const px = Math.min(x, ix), py = Math.max(-iy, Math.min(iy, y)), vx = x - px, vy = y - py, d = Math.hypot(vx, vy);
  return d > r ? [px + vx * r / d, py + vy * r / d] : [x, y];
}
function grid(A, B, fn, shade, ins) {
  const pos = [], uv = [], col = [], idx = [], n = A.length;
  for (let j = 0; j < B.length; j++) for (let i = 0; i < n; i++) {
    const p = fn(A[i], B[j]);
    if (ins !== undefined) { const q = roundCorner(p[0], p[1], ins); p[0] = q[0]; p[1] = q[1]; }
    pos.push(...p); uv.push(A[i], B[j]);
    if (shade) { const s = shade(A[i], B[j]); col.push(s, s, s); }
  }
  for (let j = 0; j < B.length - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, b, d, a, d, c);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  if (shade) g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const WS = range(0, 1, 6);
const INSET = 0.07;                                 // the covers overhang the page block a little, like a trimmed softcover
let US, VS, USF, VSF, UP;
function setupAxes() {                              // mesh lines: dense near the spine crease, and near the outer corners so the rounding is smooth
  const du = 1.5 * CORNER_R / W, dv = 1.5 * CORNER_R / H;
  US  = [...range(0, 0.1, 20), ...range(0.1, 1 - du, 36).slice(1), ...range(1 - du, 1, 10).slice(1)];
  // The visible front cover gets a finer mesh: on dark covers a coarse mesh shows faint streaks where the lighting changes at mesh seams.
  USF = [...range(0, 0.1, 20), ...range(0.1, 1 - du, 100).slice(1), ...range(1 - du, 1, 10).slice(1)];
  VS  = [...range(0, dv, 8), ...range(dv, 1 - dv, 48).slice(1), ...range(1 - dv, 1, 8).slice(1)];
  VSF = [...range(0, dv, 8), ...range(dv, 1 - dv, 92).slice(1), ...range(1 - dv, 1, 8).slice(1)];
  UP  = US.map(u => Math.min(u, 1 - INSET / W));
}

function buildBook(mats) {
  const grp = new Group();
  const add = (geo, mat) => { const m = new Mesh(geo, mat); m.castShadow = true; grp.add(m); return m; };

  add(grid(USF, VSF, (u, v) => [X(u), Y(v), zF(u, v)], (u, v) => ao(u) * (1 + .16 * bevel(u, v) / BEVEL_D), 0), mats.cover);   // the rolled edge also reads a little lighter, like worn ink               // front: the CMS image
  add(grid(US, VS, (u, v) => [X(u), Y(v), zF(u, v) - TC], undefined, 0), mats.core);                 // front, inside face
  add(grid(US, VS, (u, v) => [X(u), Y(v), zB(u, v)], () => 1, 0), mats.spine);                       // back cover (seen only as a thin edge behind the pages)
  const coverEdges = (zf, d) => {
    add(grid(US, [0, 1], (u, w) => [X(u),  H / 2, lerp(zf(u, 1), zf(u, 1) + d, w)], undefined, 0), mats.core);
    add(grid(US, [0, 1], (u, w) => [X(u), -H / 2, lerp(zf(u, 0), zf(u, 0) + d, w)], undefined, 0), mats.core);
    add(grid(VS, [0, 1], (v, w) => [W / 2, Y(v), lerp(zf(1, v), zf(1, v) + d, w)], undefined, 0), mats.core);
  };
  coverEdges(zF, -TC); coverEdges(zB, TC);

  const yP = v => lerp(-H / 2 + INSET, H / 2 - INSET, v);                               // page block
  add(grid(UP, WS, (u, w) => [X(u),  H / 2 - INSET, lerp(-pHalf(u), pHalf(u), w)], undefined, INSET), mats.edge);
  add(grid(UP, WS, (u, w) => [X(u), -H / 2 + INSET, lerp(-pHalf(u), pHalf(u), w)], undefined, INSET), mats.edge);
  add(grid(VS, WS, (v, w) => [W / 2 - INSET, yP(v), lerp(-pHalf(1), pHalf(1), w)], undefined, INSET), mats.edge);
  add(grid(UP, VS, (u, v) => [X(u), yP(v),  pHalf(u)], undefined, INSET), mats.core);
  add(grid(UP, VS, (u, v) => [X(u), yP(v), -pHalf(u)], undefined, INSET), mats.core);

  // Rounded spine: the covers wrap around it. It is a squashed circle (superellipse) that meets both covers
  // flat, so the wrap has no hard edge. `t` runs from the back cover (0) to the front cover (1).
  const SN = 2.4, WP = range(0, 1, 28);
  const spinePt = (v, t) => {
    const s = Math.sin((t - .5) * Math.PI);                                             // dense near both covers, where the curve is tightest
    return [XL - SR * Math.pow(1 - Math.pow(Math.abs(s), SN), 1 / SN), Y(v), lerp(zB(0, v), zF(0, v), (s + 1) / 2)];
  };
  const crease = (v, t) => 1 - 0.2 * sstep(.72, 1, Math.abs(2 * t - 1));                // slightly darker where the spine meets each cover, so it reads as a curve
  add(grid(VS, WP, spinePt, crease), mats.spine);
  for (const sgn of [1, -1]) {                                                          // spine end caps
    const v = sgn > 0 ? 1 : 0, pos = [XL, sgn * H / 2, (zF(0, v) + zB(0, v)) / 2], idx = [];
    for (let i = 0; i < WP.length; i++) pos.push(...spinePt(v, WP[i]));
    for (let i = 1; i < WP.length; i++) idx.push(0, i, i + 1);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('color', new Float32BufferAttribute(pos.map(() => .85), 3)); g.setIndex(idx); g.computeVertexNormals();
    add(g, mats.spine);
  }
  return grp;
}

/* ---------- Cover image: load, crop to the book's aspect ratio, print the paper grain into it ---------- */
function loadImage(url) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('cover image failed to load (CORS or network)')); i.src = url; });
}
function coverRatio(img) {                              // the book's width/height: the cover's own ratio, within limits
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, iw / ih));
}
const GRAIN_PX = 2.2;                                     // size of one printed-grain speck, in device pixels, when the cover is GRAIN_REF device pixels wide
const GRAIN_REF = 1100;                                   // cover width (device pixels) the grain size was tuned at: it looked right at about 900 CSS px on a 2x screen
const GRAIN_MIN = 1.2;                                    // never finer than this: finer grain is averaged away and aliases into streaks
function coverCanvas(img, maxWidth, shownPx) {          // shownPx: about how many device pixels wide the cover will be on screen
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, AR = coverRatio(img);
  let sx = 0, sy = 0, sw = iw, sh = ih;                 // no crop unless the cover is outside the allowed ratio range
  if (iw / ih > AR) { sw = ih * AR; sx = (iw - sw) / 2; } else { sh = iw / AR; sy = (ih - sh) / 2; }
  // A vector (SVG) cover has no fixed pixel size: its natural size is only a drawing unit, so draw it at the full texture size.
  const vector = /\.svg(\?|#|$)/i.test(img.currentSrc || img.src || '');
  const cw = vector ? maxWidth : Math.min(Math.round(sw), maxWidth), ch = Math.round(cw / AR);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'); g.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  const spine = averageColor(g, cw, ch);
  const stats = coverStats(g.canvas);                   // measured before the grain is added
  if (grainCanvas) {
    // A speck is about 2 pixels of the grain image, so it is sized from the cover's on-screen size, not its texture size.
    // The grain grows and shrinks with the cover, so it stays the same size relative to the book (paper does not change size). Floor and cap keep it visible and stable.
    const px = Math.max(120, shownPx || 400), gp = Math.min(GRAIN_PX * 1.4, Math.max(GRAIN_MIN, GRAIN_PX * px / GRAIN_REF));
    const scale = FINISH.kind !== 'grain' ? cw / (512 * FINISH.repeat[0]) : (gp / 2) * cw / px;   // cloth: the printed weave lines up with the bump weave
    const paint = (src, op, alpha) => { const pat = g.createPattern(src, 'repeat'); pat.setTransform(new DOMMatrix().scale(scale)); g.globalCompositeOperation = op; g.globalAlpha = alpha; g.fillStyle = pat; g.fillRect(0, 0, cw, ch); };
    paint(grainCanvas, 'overlay', FINISH.tooth * FINISH.print);   // mid-tones: keeps the average color and brightness
    paint(grainMul, 'multiply', FINISH.tooth * .5);    // white areas: faint darker flecks
    paint(grainScr, 'screen', FINISH.tooth * .5);      // black areas: faint lighter flecks
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  return { canvas: c, spine, ...stats };
}
function coverStats(src) {                              // from a 32×32 downsample: mean brightness and the share of near-white and near-black
  try {
    const t = document.createElement('canvas'); t.width = t.height = 32;
    const tg = t.getContext('2d', { willReadFrequently: true }); tg.drawImage(src, 0, 0, 32, 32);
    const d = tg.getImageData(0, 0, 32, 32).data; let s = 0, w = 0, k = 0;
    for (let i = 0; i < d.length; i += 4) { const L = (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; s += L; if (L > .85) w++; else if (L < .1) k++; }
    return { lum: s / 1024, whiteShare: w / 1024, darkShare: k / 1024 };
  } catch { return { lum: .5, whiteShare: 0, darkShare: 0 }; }
}
function averageColor(g, cw, ch) {                      // fallback spine color: average of the left 3% of the cover
  try {
    const t = document.createElement('canvas'); t.width = t.height = 1;
    const tg = t.getContext('2d', { willReadFrequently: true }); tg.drawImage(g.canvas, 0, 0, Math.max(1, cw * .03), ch, 0, 0, 1, 1);
    const [r, gg, b] = tg.getImageData(0, 0, 1, 1).data; return `rgb(${r},${gg},${b})`;
  } catch { return '#444'; }
}

/* ---------- Page-level plumbing ---------- */
// The edge mask only fades the sides and the bottom, where the soft shadow ends. It never fades the top: the book can reach the top of the canvas.
const STYLE = `
[data-ebook-3d] canvas.ebook3d-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .5s;
-webkit-mask-image:linear-gradient(to right,transparent,#000 8%,#000 92%,transparent),linear-gradient(to bottom,#000 88%,transparent);-webkit-mask-composite:source-in;
mask-image:linear-gradient(to right,transparent,#000 8%,#000 92%,transparent),linear-gradient(to bottom,#000 88%,transparent);mask-composite:intersect}
[data-ebook-3d].ebook3d-ready canvas.ebook3d-canvas{opacity:1}
[data-ebook-3d] img{transition:opacity .5s}
[data-ebook-3d].ebook3d-ready img{opacity:0}
.ebook3d-shadow{position:absolute;left:50%;bottom:8%;width:46%;height:5%;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(0,0,0,.22),rgba(0,0,0,0));filter:blur(6px);pointer-events:none}
.ebook3d-stats{position:fixed;top:8px;right:8px;z-index:99999;padding:6px 8px;border-radius:6px;white-space:pre;background:rgba(0,0,0,.78);color:#8f8;font:10px/1.4 ui-monospace,Menlo,monospace;pointer-events:none}`;

function setState(stage, state, detail) {
  stage.setAttribute('data-ebook-3d-state', state);                      // loading | ready | fallback-<reason>
  stage.dispatchEvent(new CustomEvent(state === 'ready' ? 'ebook3d:ready' : 'ebook3d:fallback', { detail }));
}
function fallback(stage, reason, err) {
  stage.querySelector('canvas.ebook3d-canvas')?.remove();
  stage.classList.remove('ebook3d-ready');
  if (err) console.warn('[ebook-3d] showing the static cover:', reason, err);
  setState(stage, 'fallback-' + reason, { reason });
}
function skipReason() {                                                  // cases where the static cover is the better experience
  const c = navigator.connection;
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return 'save-data';
  return null;
}

/* ---------- Boot ---------- */
const yieldMain = () => new Promise(r => setTimeout(r, 0));             // let the browser handle input and paint between the heavy steps

function pickCoverUrl(poster, stage, wantWidth) {                        // the smallest srcset image that is wide enough for a sharp texture
  const entries = (poster?.srcset || '').split(',').map(s => s.trim().split(/\s+/))
    .map(([u, d]) => ({ u, w: parseInt(d, 10) })).filter(e => e.u && e.w > 0).sort((a, b) => a.w - b.w);
  if (entries.length) { try { return new URL((entries.find(e => e.w >= wantWidth) || entries[entries.length - 1]).u, location.href).href; } catch { /* fall through */ } }
  return poster?.currentSrc || poster?.src || stage.dataset.cover;
}

async function boot(stage, poster) {
  const t0 = performance.now();
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowEnd = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
  const wantStats = new URLSearchParams(location.search).get('ebook3d') === 'stats';

  const url = pickCoverUrl(poster, stage, coarse || lowEnd ? 900 : 1400);
  if (!url) throw new Error('no cover image found: add an <img> inside [data-ebook-3d]');
  const imgPromise = loadImage(url);                                      // loads in parallel with the scene setup below

  const canvas = document.createElement('canvas');
  canvas.className = 'ebook3d-canvas'; canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, antialias: !lowEnd, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;                              // keeps brand colors true
  const scene = new Scene();
  scene.environment = buildEnv(renderer); scene.environmentIntensity = ENV_BASE;
  await yieldMain();
  const spot = new SpotLight(0xffffff, SPOT_BASE, 0, 0.55, 1, 0);        // soft key light: its wide penumbra puts a gradient across the cover
  spot.position.set(...LIGHT); scene.add(spot, spot.target);
  const camera = new PerspectiveCamera(28, 1, 1, 200);

  FINISH = FINISHES[pickFinish(stage.dataset.finish)];
  const grain = grainTexture();
  const shared = { roughness: FINISH.roughness, clearcoat: FINISH.clearcoat, clearcoatRoughness: FINISH.clearcoatRoughness, sheen: FINISH.sheen, sheenRoughness: FINISH.sheenRoughness, sheenColor: new Color(0xffffff), bumpMap: grain, bumpScale: FINISH.bump, specularIntensity: FINISH.specular };
  const edgeTex = pageEdgeTexture();
  const mats = {
    cover: new MeshPhysicalMaterial({ ...shared, side: FrontSide, vertexColors: true }),
    spine: new MeshPhysicalMaterial({ ...shared, side: DoubleSide, vertexColors: true }),
    edge:  new MeshStandardMaterial({ side: DoubleSide, roughness: .92, map: edgeTex, bumpMap: edgeTex, bumpScale: 3 }),
    core:  new MeshStandardMaterial({ side: DoubleSide, roughness: .85, color: 0xf2f0ea }),   // plain paper: cover stock edge, inside faces
  };
  await yieldMain();
  const img = await imgPromise;                                           // throws if the image cannot be used by WebGL; the poster stays
  H = W / coverRatio(img);                                                // the book takes the cover's own shape
  setupAxes();
  const pivot = new Group(); pivot.add(buildBook(mats)); scene.add(pivot);

  if (lowEnd) {                                                           // weak device: skip shadow maps, use a flat CSS shadow
    const sh = document.createElement('div'); sh.className = 'ebook3d-shadow'; stage.insertBefore(sh, canvas);
  } else {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = VSMShadowMap;      // very soft shadows
    const SM = coarse ? 256 : 512;
    const shadowLight = (pos, radius) => {                                // zero-intensity lights: they only cast shadows, from above and behind
      const l = new DirectionalLight(0xffffff, 0); l.position.set(...pos); l.castShadow = true;
      l.shadow.mapSize.set(SM, SM); l.shadow.radius = radius * SM / 512; l.shadow.blurSamples = 20; l.shadow.bias = -0.0005;
      Object.assign(l.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
      scene.add(l, l.target);
    };
    shadowLight([-5.5, 13, -4.5], 32);   // main shadow: wide and very soft
    shadowLight([-1, 14, -1.5], 12);  // tighter shadow right under the book
    const floor = new Mesh(new PlaneGeometry(80, 80), new ShadowMaterial({ opacity: .2 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -(H / 2 + 0.9); floor.receiveShadow = true; scene.add(floor);   // the floor sits about 0.9 in below the book
  }

  await yieldMain();
  const dprCap = lowEnd ? 1.25 : coarse ? 1.5 : 2;
  const shownPx = (stage.clientWidth || 360) * Math.min(devicePixelRatio, dprCap) * 0.62;   // the book is about 62% of the stage width
  const { canvas: coverSrc, spine, lum, whiteShare, darkShare } = coverCanvas(img, coarse || lowEnd ? 1024 : 2048, shownPx);
  await yieldMain();
  // Light balance follows the cover (a mid-tone cover keeps all three at 1, the values the look was tuned on).
  // White areas look gray under strong directional light, so white-heavy covers get more even light: more environment, less spotlight.
  // Black areas get lifted by reflections, so black-heavy covers get less reflection.
  const envK = Math.min(2.2, (1 + 2.2 * whiteShare) * (1 - 0.1 * darkShare)), spotK = Math.max(.25, 1 - 1.5 * whiteShare), specK = Math.max(.25, 1 - 1.2 * darkShare);
  scene.environmentIntensity = ENV_BASE * envK; spot.intensity = SPOT_BASE * spotK;
  mats.cover.specularIntensity = mats.spine.specularIntensity = FINISH.specular * specK;
  const baseLight = { env: ENV_BASE * envK, spot: SPOT_BASE * spotK, spec: FINISH.specular * specK };   // draw() dims these as the book turns toward the light
  // Relief on a near-black cover shows up as faint streaks in the reflections, so scale it down as the cover gets darker.
  mats.cover.bumpScale = mats.spine.bumpScale = FINISH.bump * (FINISH.bumpFloor + (1 - FINISH.bumpFloor) * Math.min(1, lum * 2.5));
  const coverTex = new Texture(coverSrc); coverTex.colorSpace = SRGBColorSpace;
  coverTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); coverTex.needsUpdate = true;
  mats.cover.map = coverTex;
  const spineColor = new Color(); const want = (stage.dataset.spineColor || '').trim();
  spineColor.set(want && CSS.supports('color', want) ? want : spine);     // empty or unreadable value: use the cover edge color
  mats.spine.color.copy(spineColor).multiplyScalar(.85);                  // spine reads slightly darker than the cover

  /* ----- sizing ----- */
  let dpr = 1, booted = false, readyMs = 0;
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    dpr = Math.min(devicePixelRatio, dprCap);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const visH = Math.max(H / .72, (W * 1.35) / camera.aspect);           // fit the book with margin for tilt
    const dist = visH / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, dist * Math.sin(CAM_TILT), dist * Math.cos(CAM_TILT));
    camera.lookAt(0, -H * 0.109, 0);                                      // aim a bit low so the floor shadow stays in frame
    camera.updateProjectionMatrix();
    if (booted && !running) draw(performance.now());                      // paused or reduced motion: keep the still frame correct
  };

  /* ----- input ----- */
  const input = { x: 0, y: 0, t: -1e9, held: false };   // held: a mouse is over the page, so the book keeps facing it
  const release = () => { input.x = input.y = 0; input.held = false; input.t = performance.now(); };
  const clamp1 = v => Math.max(-1, Math.min(1, v));
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    // Measured from the middle of the book, so the book turns toward the cursor wherever it sits in the layout.
    const r = stage.getBoundingClientRect();
    input.x = clamp1((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2));
    input.y = clamp1((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2));
    input.held = true; input.t = performance.now();
  });
  document.documentElement.addEventListener('mouseleave', release);
  const touch = e => {
    if (e.pointerType !== 'touch') return;
    const r = stage.getBoundingClientRect();
    input.x = ((e.clientX - r.left) / r.width) * 2 - 1; input.y = ((e.clientY - r.top) / r.height) * 2 - 1; input.held = true; input.t = performance.now();
  };
  stage.addEventListener('pointerdown', touch); stage.addEventListener('pointermove', touch);
  stage.addEventListener('pointerup', e => { if (e.pointerType === 'touch') release(); });
  stage.addEventListener('pointercancel', release);

  /* ----- render loop (paused when hidden or off screen; a single still frame for reduced motion) ----- */
  const cur = { y: REST.y, x: REST.x };
  let last = performance.now(), visible = true, running = false, firstDone = false;
  let frames = 0, acc = 0, cpuAcc = 0, cpuMax = 0, worst = 0;
  const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const stats = wantStats ? Object.assign(document.createElement('div'), { className: 'ebook3d-stats' }) : null;
  if (stats) { document.body.appendChild(stats); window.__ebook3dPose = () => ({ y: +cur.y.toFixed(3), x: +cur.x.toFixed(3) }); }   // QA only: stats mode

  function draw(now) {
    // dt must never be negative. After a long task (a slow first load) a frame's timestamp can be earlier than `last`.
    // A negative dt makes the damping factor below hugely negative, and the book spins far away from its target.
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const time = now / 1000;
    if (!reduce) {
      const idle = input.held ? 0 : smooth((now - input.t) / 1000, 1.2, 2.6);   // the idle sway starts only after the cursor or finger leaves
      const ty = REST.y + lerp(input.x * RANGE.y, Math.sin(time * .45) * AMBIENT.y, idle);
      const tx = REST.x + lerp(input.y * RANGE.x, Math.sin(time * .37 + 1) * AMBIENT.x, idle);
      const k = 1 - Math.exp(-dt * 6);                                    // damped follow
      cur.y += (ty - cur.y) * k; cur.x += (tx - cur.x) * k;
      // Safety net: if the pose ever leaves a sane range (or becomes NaN), snap back to rest instead of spinning.
      if (!(Math.abs(cur.y - REST.y) < 1 && Math.abs(cur.x - REST.x) < 1)) { cur.y = REST.y; cur.x = REST.x; }
      pivot.position.y = Math.sin(time * .9) * .16;                       // slow float; the shadow stays on the floor
    }
    pivot.rotation.set(cur.x, cur.y, 0, 'YXZ');
    // Turned left, the cover faces the key light and its reflection, and washes out. Dim the light and the shine as it turns.
    const toLight = Math.min(1, Math.max(0, (REST.y - cur.y) / RANGE.y));
    spot.intensity = baseLight.spot * (1 - .45 * toLight);
    scene.environmentIntensity = baseLight.env * (1 - .2 * toLight);
    mats.cover.specularIntensity = mats.spine.specularIntensity = baseLight.spec * (1 - .6 * toLight);
    scene.environmentRotation.set(-(cur.x - REST.x) * 1.8, -(cur.y - REST.y) * .8, 0);   // reflections sweep across the cover
    spot.position.set(LIGHT[0] - (cur.y - REST.y) * 12, LIGHT[1] + (cur.x - REST.x) * 45, LIGHT[2]);         // the soft light slides across the cover
    const r0 = performance.now();
    renderer.render(scene, camera);
    const rt = performance.now() - r0;                                    // CPU time to submit the frame (GPU time is not visible to JS)

    if (!firstDone) {
      firstDone = true; stage.classList.add('ebook3d-ready');
      readyMs = Math.round(performance.now() - t0);                       // time from the start of boot to the first drawn frame
      performance.mark('ebook3d-ready');
      setState(stage, 'ready', { ms: readyMs, lowEnd, coarse, reduce, finish: pickFinish(stage.dataset.finish) });
    }
    if (stats) {
      frames++; acc += dt; cpuAcc += rt; cpuMax = Math.max(cpuMax, rt); worst = Math.max(worst, dt * 1000);
      if (acc > .5) {
        stats.textContent = `ebook-3d ${lowEnd ? '(low-end tier)' : coarse ? '(touch tier)' : '(desktop tier)'}\nready in ${readyMs} ms · ${(frames / acc) | 0} fps\nbook ${(W / H).toFixed(3)} w/h · light env×${envK.toFixed(2)} spot×${spotK.toFixed(2)} spec×${specK.toFixed(2)}\ncanvas ${canvas.width}×${canvas.height}px · DPR ${dpr.toFixed(2)}\ntexture ${coverSrc.width}×${coverSrc.height}\nrender CPU avg ${(cpuAcc / frames).toFixed(1)} / max ${cpuMax.toFixed(1)} ms\nworst frame ${worst | 0} ms\n${renderer.info.render.calls} draw calls · ${(renderer.info.render.triangles / 1000).toFixed(1)}k triangles`;
        frames = 0; acc = 0; cpuAcc = 0; cpuMax = 0; worst = 0;
      }
    }
  }
  const start = () => { if (reduce || running || !visible || document.hidden) return; running = true; last = performance.now(); renderer.setAnimationLoop(draw); };
  const stop  = () => { running = false; renderer.setAnimationLoop(null); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(stage);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); fallback(stage, 'context-lost'); });

  resize();                                                               // size the canvas and camera; nothing is drawn yet
  try { await renderer.compileAsync(scene, camera); } catch { /* compile on the first draw instead */ }   // shader compile off the main thread where supported
  booted = true; new ResizeObserver(resize).observe(stage);
  draw(performance.now());                                                // first frame now, even in a background tab
  if (!reduce) start();
}

function run() {
  const stage = document.querySelector(SELECTOR);
  if (!stage) return;
  const poster = stage.querySelector('img');
  const skip = skipReason();
  if (skip) return fallback(stage, skip);
  const style = document.createElement('style'); style.textContent = STYLE; document.head.appendChild(style);
  setState(stage, 'loading');
  const reasonOf = e => /webgl/i.test(e?.message) ? 'no-webgl' : /image/i.test(e?.message) ? 'image' : 'error';   // shows up in data-ebook-3d-state
  const go = () => boot(stage, poster).catch(err => fallback(stage, reasonOf(err), err));
  // Wait for the page to finish loading and the browser to go idle, so the 3D view never competes with LCP.
  const afterLoad = () => ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200);
  document.readyState === 'complete' ? afterLoad() : addEventListener('load', afterLoad, { once: true });
}
run();
