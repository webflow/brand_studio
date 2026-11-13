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
const W = 8.5, H = 11, T = 0.21;               // US Letter cover; T = total thickness at the spine
const REST = { y: -0.68, x: 0.06 };            // resting pose: shows the page edge
const CAM_TILT = 0.14;                         // camera looks slightly down so the floor shadow is visible
const RANGE = { y: 0.20, x: 0.12 };            // small tilt range from the pointer
const AMBIENT = { y: 0.10, x: 0.05 };          // idle sway
// Light levels are tuned so a head-on cover renders close to its source color.
const ENV_BASE = 0.45, SPOT_BASE = 2.1, FLOOR_Y = -6.4;
// Satin: a narrow glint, not a veil.
const FINISH = { roughness: .28, clearcoat: 0, clearcoatRoughness: .5, sheen: .1, sheenRoughness: .5, bump: 1.3, tooth: .85, specular: .25 };

/* ---------- Small helpers ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

/* ---------- Procedural textures ---------- */
let grainCanvas;
function grainTexture() {            // paper surface: fine tooth + fibres + soft mottling; bump map and printed into the cover color
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), d = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 128 + (Math.random() - .5) * 90; d.data.set([v, v, v, 255], i * 4); }
  g.putImageData(d, 0, 0);
  // Soften by scaling down and back up (ctx.filter is not supported in Safari).
  const half = document.createElement('canvas'); half.width = half.height = n / 2;
  const hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high'; hg.drawImage(c, 0, 0, n / 2, n / 2);
  g.imageSmoothingQuality = 'high'; g.drawImage(half, 0, 0, n, n);
  g.lineCap = 'round';
  for (let i = 0; i < 1400; i++) {   // short fibres, drawn wrapped so the tile repeats cleanly
    const x = Math.random() * n, y = Math.random() * n, a = Math.random() * 6.28, l = 6 + Math.random() * 16;
    g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; g.lineWidth = .7 + Math.random() * .6;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
    }
  }
  const m = document.createElement('canvas'); m.width = m.height = 32;   // low-frequency mottling
  const mg = m.getContext('2d'), md = mg.createImageData(32, 32);
  for (let i = 0; i < 1024; i++) { const v = 128 + (Math.random() - .5) * 60; md.data.set([v, v, v, 255], i * 4); }
  mg.putImageData(md, 0, 0);
  g.globalAlpha = .35; g.globalCompositeOperation = 'overlay'; g.drawImage(m, 0, 0, n, n);
  grainCanvas = c;
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(0.7, 0.875); t.anisotropy = 4;   // about one texel per pixel or coarser: finer grain aliases into faint streaks on dark covers
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
  box(18, 8, 4.5, [0, 10, 4]);      // large top key
  box(3, 15, 9,   [-10, 1, 5]);     // tall left strip (the moving highlight)
  box(3, 14, 4.5, [10, 1, 5]);      // right strip
  box(11, 11, 2.4, [-7, 7, 9]);     // soft upper-left fill
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
const zF = (u, v) => pHalf(u) + TC + Math.max(GAP, lift(u) + wave(u, v) + hinge(u));
const zB = (u, v) => -(pHalf(u) + TC + Math.max(GAP, 0.4 * lift(u) + 0.6 * wave(u + .3, v)));
const ao = (u) => 1 - 0.05 * Math.exp(-Math.pow((u - 0.035) / 0.03, 2)) - 0.02 * (1 - sstep(0, 0.14, u));   // light baked shading at the hinge
const X = u => (u - .5) * W, Y = v => (v - .5) * H;

function grid(A, B, fn, shade) {
  const pos = [], uv = [], col = [], idx = [], n = A.length;
  for (let j = 0; j < B.length; j++) for (let i = 0; i < n; i++) {
    pos.push(...fn(A[i], B[j])); uv.push(A[i], B[j]);
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
const US = [...range(0, 0.1, 20), ...range(0.1, 1, 36).slice(1)];   // dense near the spine crease
const VS = range(0, 1, 56), WS = range(0, 1, 6);
// The visible front cover gets a finer mesh: on dark covers a coarse mesh shows faint streaks where the lighting changes at mesh seams.
const USF = [...range(0, 0.1, 20), ...range(0.1, 1, 100).slice(1)], VSF = range(0, 1, 100);
const INSET = 0.012;                                // page block sits slightly inside the trimmed covers
const UP = US.map(u => Math.min(u, 1 - INSET / W));

function buildBook(mats) {
  const grp = new Group();
  const add = (geo, mat) => { const m = new Mesh(geo, mat); m.castShadow = true; grp.add(m); return m; };

  add(grid(USF, VSF, (u, v) => [X(u), Y(v), zF(u, v)], ao), mats.cover);               // front: the CMS image
  add(grid(US, VS, (u, v) => [X(u), Y(v), zF(u, v) - TC]), mats.core);                 // front, inside face
  add(grid(US, VS, (u, v) => [X(u), Y(v), zB(u, v)]), mats.spine);                     // back (never seen)
  const coverEdges = (zf, d) => {
    add(grid(US, [0, 1], (u, w) => [X(u),  H / 2, lerp(zf(u, 1), zf(u, 1) + d, w)]), mats.core);
    add(grid(US, [0, 1], (u, w) => [X(u), -H / 2, lerp(zf(u, 0), zf(u, 0) + d, w)]), mats.core);
    add(grid(VS, [0, 1], (v, w) => [W / 2, Y(v), lerp(zf(1, v), zf(1, v) + d, w)]), mats.core);
  };
  coverEdges(zF, -TC); coverEdges(zB, TC);

  const yP = v => lerp(-H / 2 + INSET, H / 2 - INSET, v);                               // page block
  add(grid(UP, WS, (u, w) => [X(u),  H / 2 - INSET, lerp(-pHalf(u), pHalf(u), w)]), mats.edge);
  add(grid(UP, WS, (u, w) => [X(u), -H / 2 + INSET, lerp(-pHalf(u), pHalf(u), w)]), mats.edge);
  add(grid(VS, WS, (v, w) => [W / 2 - INSET, yP(v), lerp(-pHalf(1), pHalf(1), w)]), mats.edge);
  add(grid(UP, VS, (u, v) => [X(u), yP(v),  pHalf(u)]), mats.core);
  add(grid(UP, VS, (u, v) => [X(u), yP(v), -pHalf(u)]), mats.core);

  const bulge = 0.03;                                                                   // spine: nearly flat, rounded corners
  const prof = w => -W / 2 - bulge * (1 - Math.pow(Math.abs(1 - 2 * w), 6));
  add(grid(VS, range(0, 1, 12), (v, w) => [prof(w), Y(v), lerp(zB(0, v), zF(0, v), w)]), mats.spine);
  for (const sgn of [1, -1]) {                                                          // spine end caps
    const v = sgn > 0 ? 1 : 0, pos = [-W / 2, sgn * H / 2, (zF(0, v) + zB(0, v)) / 2], idx = [];
    for (let i = 0; i <= 12; i++) { const w = i / 12; pos.push(prof(w), sgn * H / 2, lerp(zB(0, v), zF(0, v), w)); }
    for (let i = 1; i <= 12; i++) idx.push(0, i, i + 1);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    add(g, mats.spine);
  }
  return grp;
}

/* ---------- Cover image: load, crop to the book's aspect ratio, print the paper grain into it ---------- */
function loadImage(url) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('cover image failed to load (CORS or network)')); i.src = url; });
}
function coverCanvas(img, maxWidth) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, AR = W / H;
  let sx = 0, sy = 0, sw = iw, sh = ih;                 // center-crop to 8.5:11 so any upload keeps the book's shape
  if (iw / ih > AR) { sw = ih * AR; sx = (iw - sw) / 2; } else { sh = iw / AR; sy = (ih - sh) / 2; }
  const cw = Math.min(Math.round(sw), maxWidth), ch = Math.round(cw / AR);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'); g.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  const spine = averageColor(g, cw, ch);
  const lum = overallLuminance(g.canvas);
  if (grainCanvas) {                                    // overlay keeps the average color and brightness
    const pat = g.createPattern(grainCanvas, 'repeat');
    pat.setTransform(new DOMMatrix().scale(cw / 2048 * 6));   // coarse grain: fine grain vanishes when the cover is shrunk
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = FINISH.tooth * .6; g.fillStyle = pat; g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  return { canvas: c, spine, lum };
}
function overallLuminance(src) {                        // 0 (black) to 1 (white), from an 8×8 downsample
  try {
    const t = document.createElement('canvas'); t.width = t.height = 8;
    const tg = t.getContext('2d'); tg.drawImage(src, 0, 0, 8, 8);
    const d = tg.getImageData(0, 0, 8, 8).data; let s = 0;
    for (let i = 0; i < d.length; i += 4) s += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
    return s / 64 / 255;
  } catch { return .5; }
}
function averageColor(g, cw, ch) {                      // fallback spine color: average of the left 3% of the cover
  try {
    const t = document.createElement('canvas'); t.width = t.height = 1;
    const tg = t.getContext('2d'); tg.drawImage(g.canvas, 0, 0, Math.max(1, cw * .03), ch, 0, 0, 1, 1);
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
  spot.position.set(-9, 12, 20); scene.add(spot, spot.target);
  const camera = new PerspectiveCamera(28, 1, 1, 200);

  const grain = grainTexture();
  const shared = { roughness: FINISH.roughness, clearcoat: FINISH.clearcoat, clearcoatRoughness: FINISH.clearcoatRoughness, sheen: FINISH.sheen, sheenRoughness: FINISH.sheenRoughness, sheenColor: new Color(0xffffff), bumpMap: grain, bumpScale: FINISH.bump, specularIntensity: FINISH.specular };
  const edgeTex = pageEdgeTexture();
  const mats = {
    cover: new MeshPhysicalMaterial({ ...shared, side: FrontSide, vertexColors: true }),
    spine: new MeshPhysicalMaterial({ ...shared, side: DoubleSide }),
    edge:  new MeshStandardMaterial({ side: DoubleSide, roughness: .92, map: edgeTex, bumpMap: edgeTex, bumpScale: 3 }),
    core:  new MeshStandardMaterial({ side: DoubleSide, roughness: .85, color: 0xf2f0ea }),   // plain paper: cover stock edge, inside faces
  };
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
    shadowLight([-2.5, 13, -5], 32);   // main shadow: wide and very soft
    shadowLight([0.5, 14, -1.5], 12);  // tighter shadow right under the book
    const floor = new Mesh(new PlaneGeometry(80, 80), new ShadowMaterial({ opacity: .2 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; floor.receiveShadow = true; scene.add(floor);
  }

  await yieldMain();
  const img = await imgPromise;                                           // throws if the image cannot be used by WebGL; the poster stays
  const { canvas: coverSrc, spine, lum } = coverCanvas(img, coarse || lowEnd ? 1024 : 2048);
  await yieldMain();
  // Relief on a near-black cover shows up as faint streaks in the reflections, so scale it down as the cover gets darker.
  mats.cover.bumpScale = mats.spine.bumpScale = FINISH.bump * (0.35 + 0.65 * Math.min(1, lum * 2.5));
  const coverTex = new Texture(coverSrc); coverTex.colorSpace = SRGBColorSpace;
  coverTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); coverTex.needsUpdate = true;
  mats.cover.map = coverTex;
  const spineColor = new Color(); const want = (stage.dataset.spineColor || '').trim();
  spineColor.set(want && CSS.supports('color', want) ? want : spine);     // empty or unreadable value: use the cover edge color
  mats.spine.color.copy(spineColor).multiplyScalar(.85);                  // spine reads slightly darker than the cover

  /* ----- sizing ----- */
  const dprCap = lowEnd ? 1.25 : coarse ? 1.5 : 2;
  let dpr = 1, booted = false, readyMs = 0;
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    dpr = Math.min(devicePixelRatio, dprCap);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const visH = Math.max(H / .72, (W * 1.35) / camera.aspect);           // fit the book with margin for tilt
    const dist = visH / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, dist * Math.sin(CAM_TILT), dist * Math.cos(CAM_TILT));
    camera.lookAt(0, -1.2, 0);                                            // aim a bit low so the floor shadow stays in frame
    camera.updateProjectionMatrix();
    if (booted && !running) draw(performance.now());                      // paused or reduced motion: keep the still frame correct
  };

  /* ----- input ----- */
  const input = { x: 0, y: 0, t: -1e9 };
  const release = () => { input.x = input.y = 0; input.t = performance.now(); };
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    input.x = e.clientX / innerWidth * 2 - 1; input.y = e.clientY / innerHeight * 2 - 1; input.t = performance.now();
  });
  document.documentElement.addEventListener('mouseleave', release);
  const touch = e => {
    if (e.pointerType !== 'touch') return;
    const r = stage.getBoundingClientRect();
    input.x = ((e.clientX - r.left) / r.width) * 2 - 1; input.y = ((e.clientY - r.top) / r.height) * 2 - 1; input.t = performance.now();
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
      const idle = smooth((now - input.t) / 1000, 1.2, 2.6);
      const ty = REST.y + lerp(input.x * RANGE.y, Math.sin(time * .45) * AMBIENT.y, idle);
      const tx = REST.x + lerp(input.y * RANGE.x, Math.sin(time * .37 + 1) * AMBIENT.x, idle);
      const k = 1 - Math.exp(-dt * 6);                                    // damped follow
      cur.y += (ty - cur.y) * k; cur.x += (tx - cur.x) * k;
      // Safety net: if the pose ever leaves a sane range (or becomes NaN), snap back to rest instead of spinning.
      if (!(Math.abs(cur.y - REST.y) < 1 && Math.abs(cur.x - REST.x) < 1)) { cur.y = REST.y; cur.x = REST.x; }
      pivot.position.y = Math.sin(time * .9) * .16;                       // slow float; the shadow stays on the floor
    }
    pivot.rotation.set(cur.x, cur.y, 0, 'YXZ');
    scene.environmentRotation.set(-(cur.x - REST.x) * 1.8, -(cur.y - REST.y) * 2.2, 0);   // reflections sweep across the cover
    spot.position.set(-9 - (cur.y - REST.y) * 45, 12 + (cur.x - REST.x) * 45, 20);         // the soft light slides across the cover
    const r0 = performance.now();
    renderer.render(scene, camera);
    const rt = performance.now() - r0;                                    // CPU time to submit the frame (GPU time is not visible to JS)

    if (!firstDone) {
      firstDone = true; stage.classList.add('ebook3d-ready');
      readyMs = Math.round(performance.now() - t0);                       // time from the start of boot to the first drawn frame
      performance.mark('ebook3d-ready');
      setState(stage, 'ready', { ms: readyMs, lowEnd, coarse, reduce });
    }
    if (stats) {
      frames++; acc += dt; cpuAcc += rt; cpuMax = Math.max(cpuMax, rt); worst = Math.max(worst, dt * 1000);
      if (acc > .5) {
        stats.textContent = `ebook-3d ${lowEnd ? '(low-end tier)' : coarse ? '(touch tier)' : '(desktop tier)'}\nready in ${readyMs} ms · ${(frames / acc) | 0} fps\ncanvas ${canvas.width}×${canvas.height}px · DPR ${dpr.toFixed(2)}\ntexture ${coverSrc.width}×${coverSrc.height}\nrender CPU avg ${(cpuAcc / frames).toFixed(1)} / max ${cpuMax.toFixed(1)} ms\nworst frame ${worst | 0} ms\n${renderer.info.render.calls} draw calls · ${(renderer.info.render.triangles / 1000).toFixed(1)}k triangles`;
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
