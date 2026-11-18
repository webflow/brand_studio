// The scene: renderer, shared uniforms, materials, ocean, sky rings, orbit marks, clouds, sun, shadows.
import * as THREE from 'three';
import { CONFIG, REDUCED, CLEAR, HOST_BG, isDark } from './config.js';
import { makePaletteTexture, ROW, WHITE } from './palette.js';
import { VERT, FRAG, FRAG_DEPTH, FX_VERT, FX_FRAG, FRAG_HI } from './shaders.js';
import { wireLines, PrimBatch, MeshAcc, Builder } from './prims.js';
import { buildTiles } from './goldberg.js';
import { TAU, DEG, clamp, lerp, smooth } from './util.js';
import { edgeE } from './terrain.js';
import { Weather, TileOutline, makeSun } from './sky.js';

export const OCEAN_R = 0.988, SEABED_R = 0.925;
const rgb = (h) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const srgb = (h) => new THREE.Color().setStyle(h);

export const TIERS = {
  low: { pr: 1.0, shadow: 0, fps: 30, extras: false, label: 'Low' },
  medium: { pr: 1.5, shadow: 1536, fps: 60, extras: false, label: 'Medium' },
  high: { pr: 1.5, shadow: 2048, fps: 60, extras: true, label: 'High' },   // 1.5x pixels: about a quarter less GPU work than 2x on a sharp screen, a little softer
  max: { pr: 2.0, shadow: 2048, fps: 60, extras: true, label: 'Max' },     // 2x pixels. Auto never picks it: a person must select it.
};

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: CLEAR, powerPreference: 'high-performance' });   // alpha: the page can show behind the planet (an embed)
    r.setClearColor(srgb(WHITE), 1);   // the backdrop is white
    r.autoClear = false;
    r.info.autoReset = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.02, 40);
    this.tier = 'medium';
    this.time = { dayPhase: 0, yearPhase: 0, seasonW: [0, 1, 0, 0], season: 1 };
    this.timeOverride = null;
    this.sunDir = new THREE.Vector3(1, 0, 0);
    this.sunOverride = null;
    this.sunTan = new THREE.Vector3(0, 0, -1);
    this.animators = [];
    this.lights = [];
    this.tiles = buildTiles();
    const pents = this.tiles.filter((t) => t.isPent);
    this.pents = pents;
    for (const t of this.tiles) {
      let best = 0, bd = -2;
      pents.forEach((p, i) => { const d = p.center.dot(t.center); if (d > bd) { bd = d; best = i; } });
      t.chunk = best;
    }

    const U = this.U = {
      uPalTex: { value: makePaletteTexture() },
      uSunDir: { value: this.sunDir },
      uLightI: { value: 1 },
      uShadowOn: { value: 0 }, uShadowK: { value: 0.9 }, uShadowSoft: { value: 1.2 }, uShadowTexel: { value: 1 / 2048 },
      uShadowBiasN: { value: 0.002 }, uShadowBiasZ: { value: 0.001 },
      uShadowMap: { value: null }, uShadowMat: { value: new THREE.Matrix4() },
      uAmbient: { value: 0.3 },
      uGrain: { value: 0.03 },
      uSeasonW: { value: new THREE.Vector4(0, 1, 0, 0) },
      uWindowTone: { value: 2.4 },
      uFocusC: { value: new THREE.Vector3() }, uFocusR: { value: 0 }, uFocusK: { value: 0 }, uFocusTile: { value: -1 }, uDim: { value: 0.4 },
      uHoverC: { value: new THREE.Vector3() }, uHoverR: { value: 0 }, uHoverTile: { value: -1 },
      uTime: { value: 0 }, uLod: { value: 0 },
      uKeyDir: { value: new THREE.Vector3(0, 1, 0) }, uDetail: { value: 1 }, uBg: { value: rgb(WHITE) },
      uLitC: { value: new THREE.Vector3() }, uLitR: { value: 0 }, uLitTile: { value: -1 }, uLitK: { value: 0 }, uHole: { value: new THREE.Vector4(0, 1, 0, 2) }, uWave: { value: new THREE.Vector4(0, 1, 0, -1) }, uWire: { value: 0 }, uCut: { value: 0 }, uCutD: { value: 0.16 }, uCutR: { value: 1e9 }, uCutXR: { value: 0 }, uCutM: { value: new THREE.Matrix4() }, uCutE: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3(0, 0, 1)) }, uCutX1: { value: new THREE.Vector3() }, uCutX3: { value: new THREE.Vector3() }, uHiC: { value: new THREE.Vector3() }, uHiU: { value: new THREE.Vector3(0, 1, 0) }, uHiP: { value: new THREE.Vector3() }, uHiCol: { value: new THREE.Vector3(0.078, 0.431, 0.961) }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uLights: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uLightDir: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, -1)) },
      uLightCol: { value: Array.from({ length: 8 }, () => new THREE.Vector3(1, 0.86, 0.6)) },
      uLightN: { value: 0 },
      uAlpha: { value: 1 },
    };
    this.lit = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, defines: {} });
    // The sea is see-through. Clouds are faint, so the planet shows under them.
    this.seaMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, defines: {}, transparent: true });
    this.cloudMat = new THREE.ShaderMaterial({ uniforms: { ...U, uAlpha: { value: 0.55 } }, vertexShader: VERT, fragmentShader: FRAG, defines: { ALWAYS_DAY: 1 }, transparent: true, depthWrite: false });
    this.spaceMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, defines: { ALWAYS_DAY: 1, SPACE: 1 } });
    // Water inside a tile: first a pass that writes only depth, then the color where the depth is equal. So only the nearest water face shows.
    this.tileSeaDepth = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, colorWrite: false });
    this.tileSea = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, defines: {}, transparent: true, depthWrite: false, depthFunc: THREE.EqualDepth });
    this.waterChunks = pents.map(() => [new PrimBatch(this.tileSeaDepth, { shadow: false, order: 0.8 }), new PrimBatch(this.tileSea, { shadow: false, order: 0.9 })]);
    for (const w of this.waterChunks) this.scene.add(w[0].group, w[1].group);
    this.depthMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG_DEPTH, defines: { MODE_DEPTH: 1 } });
    // The highlight line. Step 1: draw the one object as a white shape (a mask). Step 2: draw a line where the mask ends.
    // So the whole object gets one outline, not each of its cubes.
    this.hiMaskMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG_HI, side: THREE.DoubleSide });
    this.hiK = 0; this.hiRT = null;
    this.hiScene = new THREE.Scene(); this.hiCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.hiEdge = new THREE.ShaderMaterial({
      uniforms: { tM: { value: null }, uPx: { value: new THREE.Vector2(1, 1) }, uR: { value: 2 }, uK: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tM; uniform vec2 uPx; uniform float uR, uK; varying vec2 vUv;
        void main(){ float c = texture2D(tM, vUv).r, m1 = 0.0, m2 = 0.0;
          for (int i = 0; i < 16; i++) { float a = float(i) * 0.3927; vec2 d = vec2(cos(a), sin(a)) * uPx; m1 = max(m1, texture2D(tM, vUv + d * uR).r); m2 = max(m2, texture2D(tM, vUv + d * uR * 1.9).r); }
          float line = m1 * (1.0 - c), halo = m2 * (1.0 - c);                       // a blue line just outside the shape, and a white line around that
          vec3 col = mix(vec3(1.0), vec3(0.078, 0.431, 0.961), max(smoothstep(0.15, 0.5, line), step(0.5, c)));
          gl_FragColor = vec4(col, max(max(line, halo * 0.95), c * 0.1) * uK); }`,   // inside the shape: a faint blue tint
      transparent: true, depthTest: false, depthWrite: false,
    });
    { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.hiEdge); q.frustumCulled = false; this.hiScene.add(q); }
    this.fxMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: FX_VERT, fragmentShader: FX_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });

    // Static shape batches, one per chunk (a pentagon and the tiles near it). Chunks on the far side are skipped.
    this.chunks = pents.map((p) => { const b = new PrimBatch(this.lit); b.center = p.center; this.scene.add(b.group); return b; });
    this.dyn = new PrimBatch(this.lit, { dynamic: true }); this.scene.add(this.dyn.group);
    this.fx = new PrimBatch(this.fxMat, { dynamic: true, shadow: false, order: 5 }); this.scene.add(this.fx.group);
    this.acc = new MeshAcc();         // world terrain and cut shapes
    this.staticMesh = null;

    this.tickers = [];   // small per-frame jobs (for example: turn the lake mirror on when the viewer is near)
    this._ocean(); this._sky(); this._post();   // a photo uses it for the depth of field blur (view.dof)
    this.weather = new Weather(this);
    this.outline = new TileOutline(this);
    this.shadowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 6);
    this.shadowCam.layers.set(1);
    this.shadowRT = null;
    this.setTier('medium');
    this.solid(false);
  }
  // The live backdrop is clear: the color of the page shows behind the planet (with the option bg=white it is a white backdrop).
  // A photo needs a backdrop of its own: solid(true, color) gives a solid backdrop of that color, and solid(false) gives the live backdrop again.
  // On a dark color the planet has no glow of air around it (there the glow is a bright halo).
  solid(on, hex = WHITE) {
    const col = on ? hex : HOST_BG, c = rgb(col), full = on || !CLEAR;   // full: a solid backdrop
    this.renderer.setClearColor(srgb(col), full ? 1 : 0);
    this.backdrop.visible = full; this.backdrop.material.uniforms.uC.value.copy(c);
    for (const m of this.rings.children) { m.material.uniforms.uSolid.value = full ? 1 : 0; m.material.uniforms.uBgc.value.copy(c); }
    this.rings.visible = !isDark(col);
    this.U.uBg.value.copy(c);
  }

  setTier(name) {
    this.tier = name;
    const t = this.T = TIERS[name];
    const pr = Math.min(window.devicePixelRatio || 1, 2, t.pr);
    this.renderer.setPixelRatio(pr);
    if (this.shadowRT) { this.shadowRT.dispose(); this.shadowRT.depthTexture.dispose(); this.shadowRT = null; }
    if (t.shadow) {
      const dt = new THREE.DepthTexture(t.shadow, t.shadow);
      this.shadowRT = new THREE.WebGLRenderTarget(t.shadow, t.shadow, { depthTexture: dt, depthBuffer: true });
      this.U.uShadowMap.value = dt;
      this.U.uShadowTexel.value = 1 / t.shadow;
    }
    const hq = name === 'high' || name === 'max';
    for (const m of [this.lit, this.seaMat, this.cloudMat, this.spaceMat, this.tileSea]) if (!!m.defines.HQ_SHADOW !== hq) { if (hq) m.defines.HQ_SHADOW = 1; else delete m.defines.HQ_SHADOW; m.needsUpdate = true; }
    this.resize();
  }

  resize(w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _ocean() {
    const g = new THREE.SphereGeometry(OCEAN_R, 176, 110);
    const n = g.attributes.position.count;
    const pal = new Uint8Array(n * 4), aux = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { pal[i * 4] = ROW.sea; pal[i * 4 + 1] = 7.3 * 20; pal[i * 4 + 2] = 9; aux[i * 4 + 3] = 255; }
    g.setAttribute('aPal', new THREE.BufferAttribute(pal, 4, false));
    g.setAttribute('aAux', new THREE.BufferAttribute(aux, 4, false));
    g.setAttribute('aH', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
    this.ocean = new THREE.Mesh(g, this.seaMat);
    this.ocean.frustumCulled = false; this.ocean.renderOrder = 1;
    this.scene.add(this.ocean);
    // The seabed: sand and rock under the water. Fish and whales swim between it and the surface.
    const sb = new THREE.SphereGeometry(SEABED_R, 176, 110), pal2 = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) { pal2[i * 4] = ROW.sand; pal2[i * 4 + 1] = 4.4 * 20; pal2[i * 4 + 2] = 14; }
    sb.setAttribute('aPal', new THREE.BufferAttribute(pal2, 4, false)); sb.setAttribute('aAux', new THREE.BufferAttribute(aux, 4, false)); sb.setAttribute('aH', g.attributes.aH);
    this.seabed = new THREE.Mesh(sb, this.lit); this.seabed.frustumCulled = false; this.scene.add(this.seabed);
  }
  // For each ocean point: the distance to the nearest raised tile. The water is pale and shallow near a tile.
  setShore(tiles) {
    const g = this.ocean.geometry, p = g.attributes.position, h = g.attributes.aH, v = new THREE.Vector3();
    const near = tiles.map((t) => ({ t, cos: Math.cos(Math.asin(Math.min(1, t.rcirc)) + 0.14) }));
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let best = 1;
      for (const { t, cos } of near) {
        const d = v.dot(t.center); if (d < cos) continue;
        const x = v.dot(t.e1) / d / t.rin, z = v.dot(t.e3) / d / t.rin;
        const dist = Math.max(0, -edgeE(t, x, z)) * t.rin;
        if (dist < best) best = dist;
      }
      h.setX(i, best);
    }
    h.needsUpdate = true;
  }

  _sky() {
    // Atmosphere: a soft glow of air behind the planet.
    const bg = rgb(WHITE);
    const ringMat = (hex, rad) => new THREE.ShaderMaterial({
      uniforms: { uColor: { value: rgb(hex) }, uBgc: { value: bg }, uSolid: { value: 1 }, uSunDir: this.U.uSunDir, uFade: { value: 1 }, uIn: { value: 1 / rad } },
      vertexShader: 'varying vec3 vW; varying vec2 vP; void main(){ vP = position.xy / ' + rad.toFixed(3) + '; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uColor, uBgc, uSunDir; uniform float uFade, uIn, uSolid; varying vec3 vW; varying vec2 vP; void main(){ float g = dot(normalize(vW), uSunDir) * 0.5 + 0.5; float t = clamp((length(vP) - uIn) / (1.0 - uIn), 0.0, 1.0); float k = pow(1.0 - t, 2.4) * (0.35 + 0.65 * smoothstep(0.0, 0.8, g)) * uFade; gl_FragColor = uSolid > 0.5 ? vec4(mix(uBgc, uColor, k), 1.0) : vec4(uColor * k, k); }',   // with a clear backdrop: only the glow, and the page shows through (the color is multiplied by its alpha, as the canvas needs)
      depthTest: false, depthWrite: false,
    });
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uC: { value: bg } }, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }', fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }', depthTest: false, depthWrite: false }));
    this.backdrop.renderOrder = -30; this.backdrop.frustumCulled = false; this.scene.add(this.backdrop);
    this.rings = new THREE.Group();
    { const rad = 1.32, m = new THREE.Mesh(new THREE.CircleGeometry(rad, 96), ringMat('#C4DCF7', rad)); m.renderOrder = -10; m.frustumCulled = false; this.rings.add(m); }
    this.scene.add(this.rings);

    // Thin orbit lines. Small 3D objects ride on them (see sky.js).
    this.orbits = new THREE.Group();
    const circle = (rad) => { const pts = []; for (let i = 0; i <= 160; i++) { const a = (i / 160) * TAU; pts.push(new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad)); } return new THREE.BufferGeometry().setFromPoints(pts); };
    for (const d of [{ rad: 1.72, rx: 0.3, rz: 0.12, col: '#146EF5' }, { rad: 2.25, rx: -0.2, rz: -0.26, col: '#146EF5' }]) {   // Webflow blue, see-through
      const grp = new THREE.Group(); grp.rotation.set(d.rx, 0, d.rz); grp.userData.rad = d.rad;
      const line = new THREE.Line(circle(d.rad), new THREE.LineDashedMaterial({ color: srgb(d.col), dashSize: 0.02, gapSize: 0.018, transparent: true, opacity: 0.4 }));
      line.computeLineDistances();   // the lines are dashed
      grp.add(line);
      this.orbits.add(grp);
    }
    // The sun: far out, on the side the light comes from (see makeSun in sky.js).
    this.sunMark = makeSun(this);
    this.scene.add(this.orbits, this.sunMark);
  }

  // A photo goes through one more pass: depth of field and a little more contrast.
  _post() {
    this.postScene = new THREE.Scene(); this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = new THREE.ShaderMaterial({
      uniforms: { tC: { value: null }, tD: { value: null }, uNear: { value: 0.02 }, uFar: { value: 40 }, uFocus: { value: 3 }, uAp: { value: 1 }, uDead: { value: 0 }, uMax: { value: 11 }, uSat: { value: 1 }, uClear: { value: 0 }, uPx: { value: new THREE.Vector2(1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tC, tD; uniform float uNear, uFar, uFocus, uAp, uDead, uMax, uSat, uClear; uniform vec2 uPx; varying vec2 vUv;
        float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
        float coc(float z){ return clamp(abs(z - uFocus) / uFocus * uAp - uDead, 0.0, 1.0); }   // uDead: a band around the focus that stays sharp
        void main(){
          float c0 = coc(lin(texture2D(tD, vUv).r));
          vec4 acc = texture2D(tC, vUv); float w = 1.0;   // with a clear backdrop the picture is premultiplied: the color is 0 where nothing is
          float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2832;   // turn each pixel's sample ring a little, so no dot pattern shows
          for (int i = 0; i < 64; i++) {
            float a = float(i) * 2.39996 + jit, rr = sqrt((float(i) + 0.5) / 64.0) * c0 * uMax;
            vec2 o = vec2(cos(a), sin(a)) * rr * uPx;
            float ww = 0.25 + coc(lin(texture2D(tD, vUv + o).r));
            acc += texture2D(tC, vUv + o) * ww; w += ww;
          }
          vec4 av = acc / w; float al = uClear > 0.5 ? av.a : 1.0;
          vec3 col = uClear > 0.5 ? (al > 0.002 ? av.rgb / al : vec3(0.0)) : av.rgb;
          col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, uSat);
          float mx = max(col.r, max(col.g, col.b)), wk = smoothstep(0.93, 1.0, min(col.r, min(col.g, col.b)));
          col = mix(mix(col, col * col * (3.0 - 2.0 * col), 0.22), col, wk);   // keep the white backdrop white
          gl_FragColor = vec4(col * al, al);
        }`,
      depthTest: false, depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat); quad.frustumCulled = false; this.postScene.add(quad);
    this.postRT = null;
  }

  // Easter eggs. One wave on the ocean, from the point under dir. The wireframe view of the planet.
  wave(dir) { this.waveAt = this.lastT || 0; this.U.uWave.value.set(dir.x, dir.y, dir.z, 0).normalize(); this.U.uWave.value.w = 0; }
  // The wireframe view: only outlines. Land, buildings, and objects show the edges of their blocks. An empty tile shows the outline of the tile.
  // The faces are still drawn, in the color of the backdrop, so they hide the lines that are behind them.
  // The change is not instant: wireK goes from 0 to 1 in about 0.7 seconds (see stepWire). The colors fade out as the lines fade in.
  setWire(on) {
    this.wire = !!on;
    const wb = document.querySelector('#wireBtn'); if (wb) { wb.hidden = !this.wire; wb.onclick = () => this.setWire(false); }   // a button to leave the view
    if (!this.wireMat) this.wireMat = new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: VERT, fragmentShader: 'uniform float uWire; void main(){ gl_FragColor = vec4(0.078, 0.431, 0.961, uWire); }', defines: { USE_INSTANCING: '' }, transparent: true });   // Webflow blue lines
    if (this.wire) for (const m of [this.lit, this.spaceMat]) { m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; m.needsUpdate = true; }
    if (REDUCED) { this.wireK = this.wire ? 1 : 0; this.stepWire(0); }   // reduced motion: no fade
  }
  stepWire(dt) {
    const goal = this.wire ? 1 : 0; if (this.wireK === undefined) this.wireK = 0;
    if (this.wireK !== goal) this.wireK += Math.sign(goal - this.wireK) * Math.min(Math.abs(goal - this.wireK), dt / 0.7);
    const k = this.wireK; this.U.uWire.value = k * k * (3 - 2 * k);
    const half = k > 0.5;
    if (half !== !!this.wireHalf) { this.wireHalf = half; this.swapWire(half); }   // the things that can not fade change at the middle of the fade
    if (k > 0) this.syncWire();
    else if (this.wireSet) { for (const l of this.wireSet) { l.parent && l.parent.remove(l); l.geometry.dispose(); } this.wireSet = null; for (const m of [this.lit, this.spaceMat]) { m.polygonOffset = false; m.needsUpdate = true; } }
  }
  swapWire(on) {
    // Things that are not made of blocks (clouds, rain, the glow of the air, the mirror) are hidden in this view.
    const own = (o) => { let ok = false; o.traverse((q) => { if (q.material && (q.material.uniforms === this.U || q.material === this.wireMat)) ok = true; }); return ok; };
    if (on) { this.wireHid = []; for (const o of this.scene.children) if (o.visible && !own(o) && o !== this.freeBorders && o !== this.outline.mesh && o !== this.orbits && o !== this.sunMark && !(this.aurora || []).includes(o)) { o.visible = false; this.wireHid.push(o); } }
    else { for (const o of this.wireHid || []) o.visible = true; this.wireHid = null; }
    if (this.sunMark && this.sunMark.setWire) this.sunMark.setWire(on);
    // The auroras: in the wireframe view they are the lines of their ribbons, in the same blue.
    for (const m of this.aurora || []) {
      const u = m.material.uniforms; if (!m.userData.cols) m.userData.cols = [u.uA.value.clone(), u.uB.value.clone()];
      m.material.wireframe = on;
      if (on) { u.uA.value.set(0.078, 0.431, 0.961); u.uB.value.set(0.078, 0.431, 0.961); } else { u.uA.value.copy(m.userData.cols[0]); u.uB.value.copy(m.userData.cols[1]); }
    }
    if (this.freeBorders) { const u = this.freeBorders.material.uniforms; u.uK.value = on ? 1 : 0.1; u.uHard.value = on ? 1 : 0; u.uCol.value.set(...(on ? [0.078, 0.431, 0.961] : [1, 1, 1])); }
  }
  // Each frame in the wireframe view: every block mesh has its line object, with the same number of shapes.
  syncWire() {
    const set = this.wireSet || (this.wireSet = []), seen = new Set();
    this.scene.traverse((o) => {
      if (!o.isInstancedMesh || (o.material !== this.lit && o.material !== this.spaceMat)) return;
      let l = o.userData.wire;
      if (!l || !l.parent) { l = o.userData.wire = wireLines(o, this.wireMat, o.userData.type ?? 7); if (!l) return; o.parent.add(l); set.push(l); }
      l.geometry.instanceCount = o.count; l.visible = o.visible; seen.add(l);
    });
    for (let i = set.length - 1; i >= 0; i--) if (!seen.has(set[i])) { const l = set[i]; l.parent && l.parent.remove(l); l.geometry.dispose(); set.splice(i, 1); }   // its mesh is gone
  }

  // Build the mesh for all region land (called once the content is known).
  finishStatic(raised) {
    const g = this.acc.toGeometry();
    this.staticMesh = new THREE.Mesh(g, this.lit);
    this.staticMesh.frustumCulled = false; this.staticMesh.layers.enable(1);
    this.scene.add(this.staticMesh);
    for (const c of this.chunks) c.commit();
    for (const w of this.waterChunks) { w[0].commit(); w[1].commit(); }
    this.setShore(raised);
  }

  // Small lights (lamps, lighthouse beams). The 8 nearest ones on the night side reach the shader.
  addLight(L) { this.lights.push(L); return L; }
  removeLights(list) { const set = new Set(list); this.lights = this.lights.filter((l) => !set.has(l)); }
  updateLights(t, camPos, camDir, limb) {
    const U = this.U, max = this.tier === 'low' ? 4 : 8, cand = [];
    for (const L of this.lights) {
      if (L.dir.dot(camDir) < limb - 0.3 || this.dayAt(L.dir) > 0.94) continue;
      cand.push([L.pos.distanceToSquared(camPos) / (L.spin ? 3 : 1), L]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const n = Math.min(max, cand.length);
    for (let i = 0; i < n; i++) {
      const L = cand[i][1];
      U.uLights.value[i].set(L.pos.x, L.pos.y, L.pos.z, L.r);
      U.uLightCol.value[i].set(L.col[0], L.col[1], L.col[2]);
      if (L.spin) { const a = t * 0.7 + L.spin.phase; _d.set(Math.cos(a), -0.2, -Math.sin(a)).transformDirection(L.spin.base); U.uLightDir.value[i].set(_d.x, _d.y, _d.z, 0.9); }
      else U.uLightDir.value[i].set(0, 0, 0, -1);
    }
    U.uLightN.value = n;
  }

  // Clock. Everyone sees the same time. A visitor can hold the time of day and the season (see menu.js).
  updateTime(now = Date.now()) {
    const T = CONFIG.time, o = this.timeOverride;
    const dayMs = T.dayMinutes * 60000, yearMs = T.yearHours * 3600000;
    let dayPhase = (now % dayMs) / dayMs, yearPhase = (now % yearMs) / yearMs;
    if (T.pauseDay) dayPhase = T.dayPhase; else T.dayPhase = dayPhase;
    if (T.pauseSeason) yearPhase = T.seasonPhase; else T.seasonPhase = yearPhase;
    if (o) { if (o.dayPhase != null) dayPhase = o.dayPhase; if (o.yearPhase != null) yearPhase = o.yearPhase; }
    const pos = yearPhase * 4, s = Math.floor(pos) % 4, fr = pos - Math.floor(pos);
    const fade = REDUCED ? 0.4 : 0.08;
    const k = o && o.yearPhase != null ? 0 : smooth(1 - fade, 1, fr);
    const w = [0, 0, 0, 0]; w[s] = 1 - k; w[(s + 1) % 4] = k;
    this.time.dayPhase = dayPhase; this.time.yearPhase = yearPhase; this.time.seasonW = w; this.time.season = s;
    this.U.uSeasonW.value.set(w[0], w[1], w[2], w[3]);
    this.tide = CONFIG.dynamics.tides ? Math.sin(dayPhase * TAU) : 0;
    // Sun direction.
    const L = CONFIG.light;
    if (this.sunOverride) this.sunDir.copy(this.sunOverride);
    else if (L.lockToCamera) {
      const c = this.camera, az = L.azimuth * DEG + 0.6, h = L.height * DEG + 0.45;
      const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1), back = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 2);
      this.sunDir.set(0, 0, 0).addScaledVector(right, -Math.sin(az) * Math.cos(h)).addScaledVector(up, Math.sin(h)).addScaledVector(back, Math.cos(az) * Math.cos(h)).normalize();
    } else {
      const a = -dayPhase * TAU + L.azimuth * DEG, d = L.height * DEG;
      this.sunDir.set(Math.cos(d) * Math.cos(a), Math.sin(d), Math.cos(d) * Math.sin(a));
      this.sunTan.set(Math.sin(a), 0, -Math.cos(a));
    }
  }
  dayAt(dir) { return smooth(-0.12, 0.16, dir.dot(this.sunDir)); }

  syncConfig() {
    const U = this.U, C = CONFIG;
    U.uLightI.value = C.light.intensity;
    U.uShadowK.value = C.shadows.strength; U.uShadowSoft.value = C.shadows.softness;
    U.uAmbient.value = C.ambient.amount;
    U.uGrain.value = C.texture.grain; U.uDetail.value = C.texture.detail;
    U.uWindowTone.value = C.night.windowTone;
    U.uDim.value = C.focus.dim;
    if (this.camera.fov !== C.camera.fov) { this.camera.fov = C.camera.fov; this.camera.updateProjectionMatrix(); }
  }

  // Run the small animations. Each animator adds shapes for this frame.
  runAnimators(t, dt, camDir, limb) {
    this.dyn.reset(); this.fx.reset();
    const env = this.env || (this.env = {});
    env.t = t; env.dt = dt; env.dayPhase = this.time.dayPhase; env.seasonW = this.time.seasonW; env.lod = this.U.uLod.value; env.extras = this.T.extras; env.low = this.tier === 'low'; env.tide = this.tide;
    for (const a of this.animators) {
      if (a.off) continue;
      if (a.dir && a.dir.dot(camDir) < limb - 0.35) continue;
      if (a.minLod && env.lod < a.minLod) continue;
      if (a.extra && env.low) continue;
      env.day = a.dir ? this.dayAt(a.dir) : 1; env.night = 1 - env.day;
      env.rising = a.dir ? a.dir.dot(this.sunTan) > 0 : true;
      a.b.d = 0; a.b.top = a.b.mats[0]; a.b.lod = 0;
      if (a.fb) { a.fb.d = 0; a.fb.top = a.fb.mats[0]; a.fb.lod = 0; }
      a.fn(a.b, a.fb, t, env);
    }
    this.dyn.commit(); this.fx.commit();
  }
  removeAnimators(list) { const set = new Set(list); this.animators = this.animators.filter((a) => !set.has(a)); }
  addAnimator(tile, fn, opts = {}) {
    const base = opts.base || (tile ? tile.matrix : null);
    const a = { fn, dir: tile ? tile.center : null, tile, b: new Builder(this.dyn, null, base, tile ? tile.index : 255), fb: new Builder(this.fx, null, base, tile ? tile.index : 255), ...opts };
    this.animators.push(a); return a;
  }

  render(t, dt, view) {
    const r = this.renderer, cam = this.camera, U = this.U;
    this.syncConfig();
    U.uTime.value = t % 10000; this.lastT = t;
    const camPos = cam.position, camDist = camPos.length();
    const camDir = _a.copy(camPos).normalize();
    const alt = view && view.alt != null ? view.alt : camDist - 1;   // a photo from far away with a long lens keeps the detail of a close view
    const usePost = !!(view && view.dof);   // only a photo uses the last pass
    U.uLod.value = view && view.lod != null ? view.lod : clamp(1 - (alt - 0.42) / 2.6);
    const limb = 1 / Math.max(camDist, 1.02);

    // Sky: rings sit on the plane through the planet center, scaled to the visible edge of the planet.
    const k = 1 / Math.sqrt(Math.max(0.05, 1 - limb * limb));
    this.rings.quaternion.setFromUnitVectors(_b.set(0, 0, 1), camDir);
    this.rings.scale.setScalar(k);
    const far = smooth(0.25, 1.4, alt);
    for (const m of this.rings.children) m.material.uniforms.uFade.value = 0.35 + 0.65 * far;
    if (this.orbiters) {
      for (const o of this.orbiters) { o.spin.rotation.y = (REDUCED ? 20 : t) * o.speed; if (o.tail && alt > 1.0) o.tail(REDUCED ? 20 : t); }
      const m = this.orbiters[0]; m.spin.updateWorldMatrix(true, false);
      if (m.moonGrp) {
        // The moon stays over the night side: on its orbit line, at the point most opposite the sun. It sways a little.
        const rad = m.pts[0].length(), sw = 0.3 * Math.sin((REDUCED ? 20 : t) * 0.05);
        _e.copy(this.sunDir).negate().transformDirection(_m4.copy(m.spin.matrixWorld).invert()); _e.y = 0;
        if (_e.lengthSq() < 1e-4) _e.set(1, 0, 0);
        _e.normalize().applyAxisAngle(_up, sw);
        m.pts[0].copy(_e).multiplyScalar(rad); m.moonGrp.position.copy(m.pts[0]);
      }
      U.uMoonDir.value.copy(m.pts[0]).applyMatrix4(m.spin.matrixWorld).normalize();   // the moon lights the night side
      if (m.moonGrp) { m.spin.getWorldQuaternion(_q); m.moonGrp.quaternion.copy(_q.invert()).multiply(cam.quaternion); }   // the crescent always faces the viewer
    }
    this.sunMark.position.copy(this.sunDir).multiplyScalar(2.7); if (this.sunMark.tick) this.sunMark.tick(REDUCED ? 20 : t, cam);
    this.orbits.visible = this.sunMark.visible = (alt > 1.0 || !!this.keepOrbits) && !(view && view.noOrbits);
    this.weather.update(t, r.getDrawingBufferSize(_v2).y / (2 * Math.tan((cam.fov * DEG) / 2)));
    this.outline.update(dt);
    // A key light from the viewer's upper left. It lights a tile that the pointer is on at night.
    U.uKeyDir.value.setFromMatrixColumn(cam.matrixWorld, 2).multiplyScalar(0.55).addScaledVector(_c.setFromMatrixColumn(cam.matrixWorld, 0), -0.5).addScaledVector(_c.setFromMatrixColumn(cam.matrixWorld, 1), 0.65).normalize();
    this.updateLights(t, camPos, camDir, limb);

    if (this.aurora) for (const m of this.aurora) m.visible = CONFIG.dynamics.aurora;
    // Skip chunks on the far side.
    this.chunks.forEach((c, i) => { c.group.visible = c.center.dot(camDir) > limb - 0.78; this.waterChunks[i][0].group.visible = this.waterChunks[i][1].group.visible = c.group.visible; });
    U.uWave.value.w = this.waveAt != null && t - this.waveAt < 9 ? Math.max(0, t - this.waveAt) : -1;
    if (this.wire || this.wireK > 0) this.stepWire(dt);
    for (const f of this.tickers) f(t, U.uLod.value);
    this.runAnimators(t, dt, camDir, limb);

    // Shadow pass: fit the sun camera to what the viewer sees.
    const doShadow = !!this.shadowRT && CONFIG.shadows.strength > 0.01 && this.sunDir.dot(camDir) > -0.92;
    U.uShadowOn.value = doShadow ? 1 : 0;
    r.info.reset();
    // The shadow map is made again on every second frame. The map and its matrix stay together, so a frame that uses the last map is still correct.
    // A photo, and the first frame after a change of size or quality, always get a new map.
    this.shadowAge = (this.shadowAge || 0) + 1;
    const fresh = doShadow && (this.shadowAge >= 2 || this.shadowFor !== this.shadowRT || !!(view && (view.dof || view.lod != null)));
    if (fresh) {
      this.shadowAge = 0; this.shadowFor = this.shadowRT;
      const kf = clamp((alt - 0.42) / 2.0);
      const P = _c.copy(view && view.target && view.target.lengthSq() > 0.25 ? view.target : _d.copy(camDir).multiplyScalar(0.9)).multiplyScalar(1 - kf);
      const E = lerp(0.52, 1.3, kf);
      const sc = this.shadowCam;
      sc.left = -E; sc.right = E; sc.top = E; sc.bottom = -E; sc.near = 0.1; sc.far = 2 * (E + 0.45) + 0.1;
      sc.position.copy(P).addScaledVector(this.sunDir, E + 0.45 + 0.1);
      sc.up.set(0, 1, 0); if (Math.abs(this.sunDir.y) > 0.98) sc.up.set(1, 0, 0);
      sc.lookAt(P); sc.updateMatrixWorld(); sc.updateProjectionMatrix();
      U.uShadowMat.value.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse);
      const texel = (2 * E) / this.T.shadow;
      U.uShadowBiasN.value = texel * 1.6; U.uShadowBiasZ.value = (texel * 1.2) / (sc.far - sc.near);
      const prev = U.uShadowMap.value; U.uShadowMap.value = null;
      this.scene.overrideMaterial = this.depthMat;
      r.setRenderTarget(this.shadowRT); r.clear();
      r.render(this.scene, sc);
      this.scene.overrideMaterial = null;
      r.setRenderTarget(null);
      U.uShadowMap.value = prev;
    }
    if (usePost) {
      r.getDrawingBufferSize(_v2);
      if (!this.postRT || this.postRT.width !== _v2.x || this.postRT.height !== _v2.y) {
        if (this.postRT) { this.postRT.depthTexture.dispose(); this.postRT.dispose(); }
        this.postRT = new THREE.WebGLRenderTarget(_v2.x, _v2.y, { samples: (view && view.samples) ?? 4, depthBuffer: true, depthTexture: new THREE.DepthTexture(_v2.x, _v2.y) });
      }
      r.setRenderTarget(this.postRT);
    }
    r.clear();
    r.render(this.scene, cam);
    if (this.hiK > 0.01) {
      // The highlight line around one object (see discover.js).
      r.getDrawingBufferSize(_v2);
      if (!this.hiRT || this.hiRT.width !== _v2.x || this.hiRT.height !== _v2.y) { if (this.hiRT) this.hiRT.dispose(); this.hiRT = new THREE.WebGLRenderTarget(_v2.x, _v2.y, { samples: 4, depthBuffer: true }); }
      const tgt = r.getRenderTarget(), ca = r.getClearAlpha(); r.getClearColor(_col);
      r.setRenderTarget(this.hiRT); r.setClearColor(0x000000, 0); r.clear();
      cam.layers.set(3); this.scene.overrideMaterial = this.hiMaskMat; U.uHiCol.value.set(1, 1, 1);
      r.render(this.scene, cam);
      this.scene.overrideMaterial = null; cam.layers.set(0);
      r.setClearColor(_col, ca); r.setRenderTarget(tgt);
      const hu = this.hiEdge.uniforms; hu.tM.value = this.hiRT.texture; hu.uPx.value.set(1 / _v2.x, 1 / _v2.y); hu.uR.value = 2.4 * (_v2.y / Math.max(1, this.h)); hu.uK.value = this.hiK;
      r.render(this.hiScene, this.hiCam);
    }
    if (usePost) {
      const pu = this.postMat.uniforms, dof = view && view.dof;
      r.setRenderTarget((view && view.out) || null);   // a photo with a clear backdrop goes to a buffer, so its alpha can be read
      pu.uClear.value = view.out ? 1 : 0;
      pu.tC.value = this.postRT.texture; pu.tD.value = this.postRT.depthTexture; pu.uNear.value = cam.near; pu.uFar.value = cam.far;
      pu.uFocus.value = view && view.target && view.target.lengthSq() > 0.25 ? camPos.distanceTo(view.target) : Math.max(0.2, camDist - 0.95);
      pu.uAp.value = dof.ap; pu.uDead.value = dof.dead; pu.uMax.value = dof.max; pu.uSat.value = dof.sat || 1; pu.uPx.value.set(1 / this.postRT.width, 1 / this.postRT.height).multiplyScalar(this.postRT.height / 900);
      r.clear(); r.render(this.postScene, this.postCam);
    }
    this.drawCalls = r.info.render.calls;
  }
}
const _col = new THREE.Color();
const _q = new THREE.Quaternion(), _e = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _m4 = new THREE.Matrix4();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _v2 = new THREE.Vector2();
