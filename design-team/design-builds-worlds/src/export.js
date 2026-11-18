// Image export: "Take a photo". Renders the region to a PNG in an isometric view (a long lens from far away),
// at a higher sample count than the live view, with a depth of field blur in front of and behind the tile. Three sizes.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { DEG } from './util.js';
import { edgeE } from './terrain.js';

const SIZES = [['16:9', 2560, 1440, 'Wide'], ['9:16', 1440, 2560, 'Tall'], ['4:5', 1600, 2000, 'Portrait'], ['Planet', 2048, 2048, 'Full planet', 'planet']];   // the last one shows the full planet with the tile in the middle
const TIMES = [['current', 'Current light'], ['dawn', 'Dawn'], ['noon', 'Noon'], ['golden', 'Golden hour'], ['dusk', 'Dusk'], ['night', 'Night']];
const SEASONS = [['current', 'Current season'], ['0', 'Spring'], ['1', 'Summer'], ['2', 'Autumn'], ['3', 'Winter']];
const ELEV = { dawn: 7, noon: 62, golden: 17, dusk: 1.5, night: -35 };
const BLURS = [['soft', 'Soft'], ['strong', 'Strong'], ['off', 'Off']];
const GRAINS = [['off', 'Off'], ['light', 'Light'], ['strong', 'Strong']];
const BACKS = [['white', 'White'], ['clear', 'Transparent']];
const ISO_TILT = 54.74 * DEG, ISO_FOV = 7;   // the true isometric angle (35.26 degrees above the ground), and a lens narrow enough that lines stay parallel

export function setupExport(app) {
  const { world, cam, $ } = app, modal = $('#modal');
  const st = { size: 0, time: 'golden', season: 'current', blur: 'soft', grain: 'off', back: 'white', rot: 0, reg: null, last: null };   // golden hour: warm light and long shadows

  // Render one frame at w x h and copy it to a 2D canvas right away.
  const fitMemo = { key: null, target: null, d: 0 };
  function shoot(reg, w, h, time, season, scale = 1, blur = st.blur, planet = false, rot = 0, grain = 'off', back = 'white', fitKey = null) {
    const clear = back === 'clear';
    const r = world.renderer, c = world.camera, U = world.U, tile = reg.tile, n = tile.center;
    const save = { fov: c.fov, near: c.near, far: c.far, pr: r.getPixelRatio(), pos: c.position.clone(), quat: c.quaternion.clone(), up: c.up.clone(), to: world.timeOverride, so: world.sunOverride,
      fk: U.uFocusK.value, ft: U.uFocusTile.value, fc: U.uFocusC.value.clone(), fr: U.uFocusR.value, ht: U.uHoverTile.value, hr: U.uHoverR.value };
    const W = Math.round(w * scale), H = Math.round(h * scale);
    // Quality: render more pixels than the picture has, then scale down. This makes edges and small parts smooth.
    const maxTex = r.capabilities.maxTextureSize || 4096;
    // The number of pixels to draw has a limit, so that a 2K photo does not use too much graphics memory (less on the lower quality levels).
    const ss = Math.max(1, Math.min(2, Math.sqrt((world.tier === 'high' || world.tier === 'max' ? 12.5e6 : 6.5e6) / (W * H)), maxTex / Math.max(W, H)));
    r.setPixelRatio(1); r.setSize(Math.round(W * ss), Math.round(H * ss), false);
    const fov0 = CONFIG.camera.fov, lens = planet ? fov0 : ISO_FOV; CONFIG.camera.fov = lens;   // world.render reads the lens from the config
    c.fov = lens; c.aspect = W / H; c.clearViewOffset(); c.updateProjectionMatrix();
    const tilt = ISO_TILT, az = reg.az + rot * (Math.PI / 3), tanV = Math.tan((lens * DEG) / 2);   // rot: turn the view in steps of 60 degrees
    const dW = (tile.rcirc * 1.14) / (tanV * (W / H)), dH = (tile.rcirc * (Math.cos(tilt) + 0.36)) / tanV;
    let d = Math.max(dW, dH) * 1.5;   // a wide first frame; fit() below sets the real distance
    const target = n.clone().multiplyScalar(1 + (reg.lift ?? 0.12) * tile.rin);
    const dir = n.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(tile.e1, Math.cos(az) * Math.sin(tilt)).addScaledVector(tile.e3, Math.sin(az) * Math.sin(tilt));
    if (planet) {
      // The full planet, seen from straight over the tile, so the tile is in the middle. North is up.
      d = 1.36 / Math.sin(Math.atan(tanV * Math.min(1, W / H)));
      const upv = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y); if (upv.lengthSq() < 0.04) upv.copy(tile.e1); upv.normalize();
      target.copy(n);
      c.position.copy(n).multiplyScalar(d); c.up.copy(upv); c.lookAt(0, 0, 0); c.updateMatrixWorld();
      c.near = save.near; c.far = save.far; c.updateProjectionMatrix();
    } else {
      c.position.copy(target).addScaledVector(dir, d); c.up.copy(n); c.lookAt(target); c.updateMatrixWorld();
      c.near = Math.max(0.05, d - 2.6); c.far = d + 2.6; c.updateProjectionMatrix();
    }
    if (time !== 'current') {
      const el = (planet && time === 'golden' ? 32 : ELEV[time]) * DEG, ha = az + 1.95;   // the planet view needs a higher sun, or half of the planet is dark
      world.sunOverride = n.clone().multiplyScalar(Math.sin(el)).addScaledVector(tile.e1, Math.cos(ha) * Math.cos(el)).addScaledVector(tile.e3, Math.sin(ha) * Math.cos(el)).normalize();
    }
    if (season !== 'current') world.timeOverride = { yearPhase: (+season + 0.5) / 4 };
    world.updateTime();
    U.uFocusK.value = planet ? 0 : 0.5; U.uFocusTile.value = tile.index; U.uFocusC.value.copy(n); U.uFocusR.value = tile.rcirc * 1.03; U.uHoverTile.value = -1; U.uHoverR.value = 0;
    const weather0 = CONFIG.dynamics.weather; CONFIG.dynamics.weather = false;   // no rain and no wind streaks in a photo
    // A clear backdrop. For a region photo this is a cut-out: only the tile and what stands on it, with nothing around it.
    // For the planet photo it is the planet with no sky behind it.
    let cutD = 0.16;
    const hid = [], dyn0 = { clouds: CONFIG.dynamics.clouds, aurora: CONFIG.dynamics.aurora }, cc0 = new THREE.Color(), ca0 = r.getClearAlpha();
    r.getClearColor(cc0);
    if (clear) {
      r.setClearColor(0x000000, 0);
      const own = (o) => { let ok = false; o.traverse((q) => { if (q.material && q.material.uniforms === U) ok = true; }); return ok; };   // made of the main materials: the cut works on it
      for (const o of world.scene.children) if (o.visible && !own(o) && !(world.stormEye && o === world.stormEye.grp && reg.def && reg.def.id === 'storm-eye')) { o.visible = false; hid.push(o); }
      if (!planet) {
        CONFIG.dynamics.clouds = false; CONFIG.dynamics.aurora = false;
        const pts = tile.poly, E = U.uCutE.value;
        U.uCut.value = 1; U.uCutM.value.copy(tile.matrix).invert();
        // The base of the cut-out: thin for dry land, and deep enough to keep the floor of a pond or a lagoon under its water.
        let low = 0; if (reg.H) for (let i = -11; i <= 11; i++) for (let j = -11; j <= 11; j++) { const x = i / 10, z = j / 10; if (edgeE(tile, x, z) > 0.02) low = Math.min(low, reg.H(x, z)); }
        cutD = Math.max(0.16, Math.min(0.3, -1.6 * low) + 0.05); U.uCutD.value = cutD;
        U.uCutR.value = tile.round ? tile.round + 0.004 : 1e9;
        for (let i = 0; i < 6; i++) {
          if (tile.round || i >= pts.length) { E[i].set(0, 0, 1); continue; }
          const p0 = pts[i], p1 = pts[(i + 1) % pts.length]; let ex = p1.z - p0.z, ez = -(p1.x - p0.x), ec = -(ex * p0.x + ez * p0.z); const L = Math.hypot(ex, ez) || 1;
          if (ec < 0) { ex = -ex; ez = -ez; ec = -ec; }
          E[i].set(ex / L, ez / L, ec / L);
        }
        const bite = tile.bites && tile.bites[0];
        if (bite) { U.uCutX1.value.copy(bite.e1).divideScalar(bite.rin); U.uCutX3.value.copy(bite.e3).divideScalar(bite.rin); U.uCutXR.value = bite.R; } else U.uCutXR.value = 0;
      }
    }
    // Compose the picture by measurement. Draw the tile and all that stands on it as a small mask, and find its box on the screen.
    // Then move the camera so that the box is in the middle of the frame and fills most of it. So a tall object is not cut, and the subject is never low.
    const fit = () => {
      const mw = W >= H ? 192 : Math.round((192 * W) / H), mh = W >= H ? Math.round((192 * H) / W) : 192;
      r.setSize(mw, mh, false);
      world.render(world.lastT || 0, 0, { target, lod: 1, alt: 0.4 });   // this puts all moving parts in place for this camera
      const rt = new THREE.WebGLRenderTarget(mw, mh, { depthBuffer: true }), cc = new THREE.Color(), ca = r.getClearAlpha();
      const kc = U.uHiC.value.clone(), ku = U.uHiU.value.clone(), kp = U.uHiP.value.clone(), kcol = U.uHiCol.value.clone();
      r.getClearColor(cc);
      U.uHiC.value.copy(n); U.uHiU.value.copy(n); U.uHiP.value.set(tile.rcirc * 1.02, (clear && !planet ? -cutD : -0.07) * tile.rin, 3 * tile.rin);   // a cut-out shows its base too U.uHiCol.value.set(1, 1, 1);
      r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear();
      c.layers.set(3); world.scene.overrideMaterial = world.hiMaskMat; r.render(world.scene, c); world.scene.overrideMaterial = null; c.layers.set(0);
      const buf = new Uint8Array(mw * mh * 4); r.readRenderTargetPixels(rt, 0, 0, mw, mh, buf);
      r.setRenderTarget(null); r.setClearColor(cc, ca); rt.dispose();
      U.uHiC.value.copy(kc); U.uHiU.value.copy(ku); U.uHiP.value.copy(kp); U.uHiCol.value.copy(kcol);
      let x0 = mw, x1 = -1, y0 = mh, y1 = -1;
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (buf[(y * mw + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < x0 || y1 < y0) return;
      const halfH = d * tanV, halfW = halfH * (W / H);
      const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
      target.addScaledVector(right, ((x0 + x1 + 1) / mw - 1) * halfW).addScaledVector(up, ((y0 + y1 + 1) / mh - 1) * halfH);
      d *= Math.max((x1 - x0 + 1) / mw / 0.8, (y1 - y0 + 1) / mh / 0.76);
      c.position.copy(target).addScaledVector(dir, d); c.up.copy(n); c.lookAt(target); c.updateMatrixWorld();
      c.near = Math.max(0.05, d - 2.6); c.far = d + 2.6; c.updateProjectionMatrix();
    };
    // The frame must not change when the season or the time of day changes, or when a bird moves. So the fit is made in summer,
    // and while the photo dialog is open it is made one time for each size, angle, and background, and used again.
    if (!planet) {
      const key = fitKey ? `${fitKey}|${tile.index}|${w}x${h}|${rot}|${back}` : null, hit = key && fitMemo.key === key ? fitMemo : null;
      if (hit) { target.copy(hit.target); d = hit.d; c.position.copy(target).addScaledVector(dir, d); c.up.copy(n); c.lookAt(target); c.updateMatrixWorld(); c.near = Math.max(0.05, d - 2.6); c.far = d + 2.6; c.updateProjectionMatrix(); }
      else {
        const o = world.timeOverride; world.timeOverride = { yearPhase: 0.375 }; world.updateTime();
        fit(); fit();   // the second pass is more exact, because the subject is larger in its mask
        world.timeOverride = o; world.updateTime();
        if (key) { fitMemo.key = key; fitMemo.target = target.clone(); fitMemo.d = d; }
      }
    }
    r.setSize(Math.round(W * ss), Math.round(H * ss), false);
    // The depth of field: the tile is sharp, and the blur grows in front of it and behind it. The numbers are in tile sizes, not in lens units.
    const dof = blur === 'off' ? { ap: 0, dead: 1, max: 0, sat: 1.1 } : { ap: d / (tile.rcirc * (blur === 'strong' ? 1.5 : 2.6)), dead: blur === 'strong' ? 0.3 : 0.42, max: blur === 'strong' ? 20 : 13, sat: 1.1 };   // sat: a little more color
    const outRT = clear ? new THREE.WebGLRenderTarget(W, H, { depthBuffer: false }) : null;   // the size of the picture: the scale down happens on the way in
    if (planet) {
      // A soft blur that grows to the edge of the planet. No orbit lines, so the frame does not cut them.
      const pd = blur === 'off' ? { ap: 0, dead: 1, max: 0, sat: 1.1 } : { ap: blur === 'strong' ? 2.6 : 1.7, dead: 0.14, max: blur === 'strong' ? 14 : 9, sat: 1.1 };
      world.render(world.lastT || 0, 0, { target, dof: pd, noOrbits: true, samples: ss >= 2 ? 2 : 4, out: outRT });
    } else
    world.render(world.lastT || 0, 0, { target, lod: 1, alt: 0.4, dof, samples: ss >= 2 ? 2 : 4, out: outRT });
    CONFIG.dynamics.weather = weather0; CONFIG.dynamics.clouds = dyn0.clouds; CONFIG.dynamics.aurora = dyn0.aurora;
    U.uCut.value = 0; for (const o of hid) o.visible = true; r.setClearColor(cc0, ca0);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    if (outRT) {
      // Read the buffer. It is bottom-up and premultiplied; a canvas wants top-down and straight color.
      const buf = new Uint8Array(W * H * 4); r.readRenderTargetPixels(outRT, 0, 0, W, H, buf); r.setRenderTarget(null); outRT.dispose();
      const img = ctx.createImageData(W, H), dt = img.data;
      for (let y = 0; y < H; y++) { const src = (H - 1 - y) * W * 4, dst = y * W * 4; for (let x = 0; x < W * 4; x += 4) { const al = buf[src + x + 3]; if (al) { const k = 255 / al; dt[dst + x] = buf[src + x] * k; dt[dst + x + 1] = buf[src + x + 1] * k; dt[dst + x + 2] = buf[src + x + 2] * k; dt[dst + x + 3] = al; } } }
      ctx.putImageData(img, 0, 0);
    } else { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(r.domElement, 0, 0, W, H); }
    if (grain !== 'off') {
      // Film grain: fine noise on the brightness, a little weaker in the bright parts so the white backdrop stays clean.
      const amp = grain === 'strong' ? 30 : 15, img = ctx.getImageData(0, 0, W, H), px4 = img.data;
      let sd = 0x9e3779b9;
      const rnd = () => { sd ^= sd << 13; sd ^= sd >>> 17; sd ^= sd << 5; return (sd >>> 0) / 4294967296; };
      for (let i = 0; i < px4.length; i += 4) {
        const l = (px4[i] * 0.299 + px4[i + 1] * 0.587 + px4[i + 2] * 0.114) / 255, k = (rnd() + rnd() - 1) * amp * (1 - 0.6 * l * l);
        px4[i] += k; px4[i + 1] += k; px4[i + 2] += k;
      }
      ctx.putImageData(img, 0, 0);
    }
    // Put everything back.
    world.timeOverride = save.to; world.sunOverride = save.so;
    U.uFocusK.value = save.fk; U.uFocusTile.value = save.ft; U.uFocusC.value.copy(save.fc); U.uFocusR.value = save.fr; U.uHoverTile.value = save.ht; U.uHoverR.value = save.hr;
    if (world.postRT) { world.postRT.depthTexture.dispose(); world.postRT.dispose(); world.postRT = null; }   // free the large photo buffer
    CONFIG.camera.fov = fov0;
    c.fov = save.fov; c.near = save.near; c.far = save.far; c.updateProjectionMatrix();
    r.setPixelRatio(save.pr); world.resize();
    c.position.copy(save.pos); c.quaternion.copy(save.quat); c.up.copy(save.up); c.updateMatrixWorld();
    world.updateTime(); cam.update(0); world.render(world.lastT || 0, 0, { target: cam.target });
    return out;
  }

  function preview() {
    const [, w, h, , mode] = SIZES[st.size];
    const cv = shoot(st.reg, w, h, st.time, st.season, 0.25, st.blur, mode === 'planet', st.rot, st.grain, st.back, 'dialog');
    const box = modal.querySelector('.prev'); box.innerHTML = ''; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Preview of the photo'); box.append(cv);
  }
  function download() {
    const [name, w, h, , mode] = SIZES[st.size];
    const cv = shoot(st.reg, w, h, st.time, st.season, 1, st.blur, mode === 'planet', st.rot, st.grain, st.back, 'dialog');
    st.last = { w: cv.width, h: cv.height };
    const slug = (st.reg.name || 'region').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'region';
    cv.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `design-builds-worlds-${slug}-${name.replace(':', 'x').toLowerCase()}-${w}x${h}.png`;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
      const s = modal.querySelector('.status'); if (s) s.textContent = `Saved a ${w} × ${h} PNG.`;
    }, 'image/png');
  }
  // Copy the picture to the clipboard, so a person can paste it into a message or a post.
  async function copy() {
    const s = modal.querySelector('.status'), [, w, h, , mode] = SIZES[st.size];
    if (!navigator.clipboard || !window.ClipboardItem) { if (s) s.textContent = 'This browser cannot copy an image. Use Download PNG.'; return; }
    const cv = shoot(st.reg, w, h, st.time, st.season, 1, st.blur, mode === 'planet', st.rot, st.grain, st.back, 'dialog');
    st.last = { w: cv.width, h: cv.height };
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png')) })]);
      if (s) s.textContent = `Copied a ${w} × ${h} image.`;
    } catch (e) { if (s) s.textContent = 'The browser did not allow the copy. Use Download PNG.'; }
  }
  app.photoCanvas = (reg, sizeIndex, time = 'current', season = 'current', scale = 1, blur = 'soft', rot = 0, grain = 'off', back = 'white') => { const [, w, h, , mode] = SIZES[sizeIndex]; return shoot(reg, w, h, time, season, scale, blur, mode === 'planet', rot, grain, back); };

  let returnFocus = null;
  app.takePhoto = (reg) => {
    if (!reg) return;
    st.reg = reg; st.rot = 0; fitMemo.key = null; returnFocus = document.activeElement;   // each region starts at its own best angle
    app.modalOpen = true;
    modal.hidden = false;
    modal.innerHTML = `<div class="mbox" role="dialog" aria-modal="true" aria-label="Take a photo">
      <header><b>Take a photo</b><button class="x" aria-label="Close"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6"/></svg></button></header>
      <div class="prev"></div>
      <fieldset><legend>Size</legend><div class="grid g2">${SIZES.map(([n, w, h, l], i) => `<button class="opt" data-size="${i}" aria-pressed="${i === st.size}"><b>${n}</b><small>${l} · ${w} × ${h}</small></button>`).join('')}</div></fieldset>
      <div class="two"><label class="tx"><span>Time of day</span><select id="phTime">${TIMES.map(([v, l]) => `<option value="${v}" ${v === st.time ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="tx"><span>Season</span><select id="phSeason">${SEASONS.map(([v, l]) => `<option value="${v}" ${v === st.season ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="tx"><span>Focus blur</span><select id="phBlur">${BLURS.map(([v, l]) => `<option value="${v}" ${v === st.blur ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="tx"><span>Background</span><select id="phBack">${BACKS.map(([v, l]) => `<option value="${v}" ${v === st.back ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="tx"><span>Grain</span><select id="phGrain">${GRAINS.map(([v, l]) => `<option value="${v}" ${v === st.grain ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="tx"><span id="phRotL0">Angle</span><div class="rot" role="group" aria-labelledby="phRotL0"><button class="btn" id="phRotL" aria-label="Turn the view left">‹</button><output id="phRot">${st.rot * 60}°</output><button class="btn" id="phRotR" aria-label="Turn the view right">›</button></div></div></div>
      <p class="note">PNG image. The first three sizes are an isometric view of the region. “Planet” shows the full planet with the region in the middle. A transparent background gives the region alone, with nothing around it. Nothing is uploaded. <span class="status" role="status"></span></p>
      <footer><button class="btn" id="phCancel">Cancel</button><button class="btn" id="phCopy">Copy image</button><button class="btn primary" id="phSave">Download PNG</button></footer></div>`;
    modal.querySelectorAll('[data-size]').forEach((b) => (b.onclick = () => { st.size = +b.dataset.size; modal.querySelectorAll('[data-size]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); preview(); }));
    modal.querySelector('#phTime').onchange = (e) => { st.time = e.target.value; preview(); };
    modal.querySelector('#phSeason').onchange = (e) => { st.season = e.target.value; preview(); };
    modal.querySelector('#phBlur').onchange = (e) => { st.blur = e.target.value; preview(); };
    modal.querySelector('#phGrain').onchange = (e) => { st.grain = e.target.value; preview(); };
    modal.querySelector('#phBack').onchange = (e) => { st.back = e.target.value; preview(); };
    const turn = (k) => { st.rot = (st.rot + k + 6) % 6; modal.querySelector('#phRot').textContent = st.rot * 60 + '°'; preview(); };
    modal.querySelector('#phRotL').onclick = () => turn(-1); modal.querySelector('#phRotR').onclick = () => turn(1);
    modal.querySelector('#phSave').onclick = download;
    modal.querySelector('#phCopy').onclick = copy;
    modal.querySelector('#phCancel').onclick = modal.querySelector('.x').onclick = () => app.closeModal();
    modal.onclick = (e) => { if (e.target === modal) app.closeModal(); };
    preview();
    setTimeout(() => modal.querySelector('#phSave').focus(), 30);
  };
  app.closeModal = () => { app.modalOpen = false; modal.hidden = true; modal.innerHTML = ''; if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true }); cam.changed(); };
  app.photoCamera = () => (fitMemo.key ? `${fitMemo.target.x.toFixed(4)} ${fitMemo.target.y.toFixed(4)} ${fitMemo.target.z.toFixed(4)} d ${fitMemo.d.toFixed(4)}` : null);   // for the tests: where the photo camera looks
}
