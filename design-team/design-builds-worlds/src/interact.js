// Interaction: hover names, open and close a region, the Region Manual panel, keyboard access.
import { manualHTML, regionTitle, accentHex } from './manual.js';
import { CONFIG } from './config.js';

export function setupInteraction(app) {
  const { world, cam, $ } = app, U = world.U;
  const tip = $('#tip'), panel = $('#panel'), live = $('#live'), canvas = world.canvas;
  let focusGoal = 0, tipTimer = 0, litGoal = 0, litPin = null, claimArm = null;
  app.current = null;
  app.regionAt = (i) => app.byTile.get(i) || (app.practice && app.practice.reg && app.practice.tile.index === i ? app.practice.reg : null);
  app.areas.forEach((a, i) => (a.index = i));

  const isSheet = () => window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
  app.isSheet = isSheet;
  app.layoutInset = () => {
    if (panel.hidden) return cam.setInset(0, 0);
    const r = panel.getBoundingClientRect();
    if (isSheet()) cam.setInset(0, Math.min(r.height, window.innerHeight * 0.62) / 2); else cam.setInset(r.width / 2, 0);
  };

  function showTip(reg, tile, x, y) {
    if (!tile) { tip.hidden = true; return; }
    const tt = reg ? regionTitle(reg) : null;
    tip.innerHTML = reg ? `${reg.name.replace(/[<&]/g, '')}<small>${tt.num}${reg.kind === 'sample' ? ' · Sample' : ''}</small>` : `${app.canClaim && app.canClaim() ? 'Claim this region' : 'Free tile'}<small>Tile ${String(tile.index).padStart(3, '0')}</small>`;
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.hidden = false;
  }
  function thingTip(c, x, y) { tip.innerHTML = `${c.label}<small>${String(c.sub).replace(/[<&]/g, '')}</small>`; tip.style.left = (c.sx ?? x) + 'px'; tip.style.top = Math.max(96, (c.sy ?? y) + 14) + 'px'; tip.hidden = false; }
  function setHover(tile) {
    const reg = tile ? app.regionAt(tile.index) : null;
    // A free tile is open ocean: show its outline. A region gets a small lift.
    world.outline.set(tile && !reg ? tile : null);
    U.uHoverTile.value = reg ? tile.index : -1;
    if (reg) { U.uHoverC.value.copy(tile.center); U.uHoverR.value = tile.rcirc * 1.02; } else U.uHoverR.value = 0;
  }
  // Night light: the tile under the pointer is lit, so a person can still enjoy it at night.
  function setLit(tile) {
    const t = tile || litPin;
    if (t) { U.uLitTile.value = t.index; U.uLitC.value.copy(t.center); U.uLitR.value = t.rcirc * (tile ? 1.03 : 1.14); litGoal = 1; } else litGoal = 0;
  }
  const lightBtn = $('#lightBtn');
  function syncLightBtn() {
    const reg = app.current, show = !!reg && app.mode !== 'design' && world.dayAt(reg.tile.center) < 0.5;
    lightBtn.hidden = !show; lightBtn.setAttribute('aria-pressed', String(!!litPin)); lightBtn.textContent = litPin ? 'Back to night' : 'Light this region';
  }
  app.pinLight = (tile) => { litPin = tile; setLit(null); syncLightBtn(); };
  lightBtn.onclick = () => app.pinLight(litPin ? null : app.current && app.current.tile);
  cam.onHover = (x, y) => {
    if (x < 0 || app.modalOpen) { setHover(null); setLit(null); tip.hidden = true; if (app.setHi) app.setHi(null); return; }
    // A single object under the pointer (the moon, a ship, a hero object) gets a highlight line and its own label.
    const thing = app.pickThing && app.mode !== 'design' ? app.pickThing(x, y) : null;
    if (app.setHi) app.setHi(thing);
    const hit = cam.pick(x, y);
    const tile = hit ? hit.tile : null;
    setLit(tile && app.regionAt(tile.index) ? tile : null);
    if (app.current && tile === app.current.tile) { setHover(null); tip.hidden = true; if (app.detailHover) app.detailHover(x, y); if (thing && tip.hidden) thingTip(thing, x, y); return; }
    if (app.mode === 'design') { setHover(null); tip.hidden = true; return; }
    setHover(tile); showTip(tile ? app.regionAt(tile.index) : null, tile, x, y);
    if (thing) thingTip(thing, x, y);
    canvas.style.cursor = tile && app.regionAt(tile.index) ? 'pointer' : '';
  };
  cam.onTap = (x, y, type) => {
    if (app.modalOpen) return;
    const hit = cam.pick(x, y);
    if (app.mode === 'design') { if (app.designTap) app.designTap(x, y, hit); return; }
    // A click on an object that is not on a tile (the moon, the satellite, a ship) zooms in on it and follows it.
    const thing = app.pickThing ? app.pickThing(x, y) : null;
    // A thing with its own action (the sun, the moon, the satellite, the Publish button, the volcano, the lighthouse): do it. No zoom, and its region does not open.
    if (thing && thing.tap) { thing.tap(); if (app.eggTap) app.eggTap(thing.key); return; }
    if (thing && thing.zoom) { if (app.current) app.closeRegion(); tip.hidden = true; app.setHi(null); app.followThing(thing); if (app.thingTap) app.thingTap(thing); return; }
    // A click somewhere else ends the close view of an object.
    if (app.following) { const reg0 = hit ? app.regionAt(hit.tile.index) : null; if (reg0) { app.stopFollow(true); app.openRegion(reg0); } else app.stopFollow(); return; }
    if (!hit) { if (app.current) app.closeRegion(); return; }
    const reg = app.regionAt(hit.tile.index);
    if (app.current && reg === app.current) { if (app.detailTap && app.detailTap(x, y)) return; if (reg.onTap) reg.onTap(hit); return; }
    if (reg) app.openRegion(reg);
    else if (app.current) app.closeRegion();
    else if (app.canClaim && app.canClaim()) {
      // No region yet: a click on an empty tile claims it. On a touch screen the first tap shows the name and the second tap claims.
      if (type === 'mouse' || claimArm === hit.tile) { claimArm = null; tip.hidden = true; app.claimTile(hit.tile); }
      else { claimArm = hit.tile; showTip(null, hit.tile, x, y); clearTimeout(tipTimer); tipTimer = setTimeout(() => { tip.hidden = true; claimArm = null; }, 2600); }
    }
    else if (type !== 'mouse') { showTip(null, hit.tile, x, y); clearTimeout(tipTimer); tipTimer = setTimeout(() => (tip.hidden = true), 1400); }
  };

  app.openRegion = (reg, opts = {}) => {
    if (app.mode === 'design' && !opts.keepMode) return;
    if (app.following) app.stopFollow(true);
    app.current = reg;
    setHover(null); tip.hidden = true; canvas.style.cursor = '';
    U.uFocusTile.value = reg.tile.index; U.uFocusC.value.copy(reg.tile.center); U.uFocusR.value = reg.tile.rcirc * 1.03; focusGoal = 1;
    if (!opts.noPanel) {
      panel.style.setProperty('--acc', accentHex(reg));
      panel.className = 'manual'; panel.innerHTML = manualHTML(app, reg); panel.hidden = false;
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Region Manual: ' + reg.name);
      document.body.classList.add('panel-open');
      bindPanel(reg);
      app.layoutInset();
      if (opts.focus !== false) setTimeout(() => { const x = panel.querySelector('.x'); if (x && !isSheet()) x.focus({ preventScroll: true }); }, 60);
      live.textContent = reg.desc;
    }
    document.body.classList.add('focused');
    cam.focusTile(reg.tile, { az: reg.az, tilt: reg.tilt, dur: opts.dur, lift: reg.lift, dist: reg.camDist });
    litPin = reg.tile; setLit(null); syncLightBtn();   // an open region keeps the spotlight when it is night there
    if (app.onOpen) app.onOpen(reg);
  };
  app.closeRegion = () => {
    if (!app.current) return;
    app.current = null; focusGoal = 0; litPin = null; setLit(null); lightBtn.hidden = true;
    panel.hidden = true; panel.innerHTML = ''; panel.classList.remove('full'); thumb.hidden = true; document.body.classList.remove('panel-open');
    document.body.classList.remove('focused');
    app.layoutInset(); cam.unfocus();
    if (app.onClose) app.onClose();
    if (document.activeElement === document.body || !document.activeElement) canvas.focus({ preventScroll: true });
  };

  function bindPanel(reg) {
    panel.querySelector('.x').onclick = () => app.closeRegion();
    const ph = panel.querySelector('#photoBtn'); if (ph) ph.onclick = () => app.takePhoto && app.takePhoto(reg);
    const hb = panel.querySelector('#hintBtn'); if (hb) hb.onclick = () => app.hintDetail && app.hintDetail(app.current || reg);
    const eb = panel.querySelector('#editBtn'); if (eb) eb.onclick = () => { app.closeRegion(); app.enterDesign(); };
    // A hero object row in the manual: the pointer or the focus on it puts the silhouette on that object in the scene.
    panel.querySelectorAll('[data-hi]').forEach((el) => { const on = () => app.holdHi && app.holdHi(el.dataset.hi, Infinity), off = () => app.releaseHi && app.releaseHi(el.dataset.hi); el.onmouseenter = on; el.onmouseleave = off; el.onfocus = on; el.onblur = off; });
    if (app.bindSheet) app.bindSheet(panel, () => app.closeRegion());
  }
  app.setFocusDim = (on, tile) => { focusGoal = on ? 1 : 0; if (tile) { U.uFocusTile.value = tile.index; U.uFocusC.value.copy(tile.center); U.uFocusR.value = tile.rcirc * 1.03; } };

  // Phone sheet: drag handle, expand arrow, swipe down to close, swipe sideways for steps.
  const thumb = $('#thumb');
  app.bindSheet = (el, onClose, onSwipe) => {
    const handle = el.querySelector('.handle'), exp = el.querySelector('.expand'), top = el.querySelector('.mtop'), body = el.querySelector('.mbody');
    const sync = () => { const full = el.classList.contains('full'); if (exp) { exp.setAttribute('aria-pressed', String(full)); exp.setAttribute('aria-label', full ? 'Return the panel to half height' : 'Expand the panel to full height'); } thumb.hidden = !(full && isSheet()); app.layoutInset(); };
    if (exp) exp.onclick = () => { el.classList.toggle('full'); sync(); };
    const drag = (src) => src && src.addEventListener('pointerdown', (e) => {
      if (!isSheet() || e.target.closest('button')) return;
      const y0 = e.clientY, h0 = el.getBoundingClientRect().height, t0 = performance.now(); let h = h0, moved = false;
      src.setPointerCapture(e.pointerId);
      const mv = (ev) => { h = Math.max(60, Math.min(window.innerHeight, h0 + (y0 - ev.clientY))); if (Math.abs(ev.clientY - y0) > 4) moved = true; if (!moved) return; el.classList.add('dragging'); el.classList.remove('full'); el.style.setProperty('--sheet', h + 'px'); };
      const up = (ev) => {
        src.removeEventListener('pointermove', mv); src.removeEventListener('pointerup', up); src.removeEventListener('pointercancel', up);
        el.classList.remove('dragging'); if (!moved) return;
        const fast = (ev.clientY - y0) / Math.max(1, performance.now() - t0);
        if (h < window.innerHeight * 0.2 || (fast > 0.9 && ev.clientY - y0 > 60)) { el.style.removeProperty('--sheet'); onClose(); return; }
        if (h > window.innerHeight * 0.86) { el.classList.add('full'); el.style.removeProperty('--sheet'); }
        sync();
      };
      src.addEventListener('pointermove', mv); src.addEventListener('pointerup', up); src.addEventListener('pointercancel', up);
    });
    drag(handle); drag(top);
    if (onSwipe && body) { let sx = 0, sy = 0; body.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true }); body.addEventListener('touchend', (e) => { const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 2 && !e.target.closest('input')) onSwipe(dx < 0 ? 1 : -1); }, { passive: true }); }
    sync();
  };
  // At full height the sheet hides the region, so a small live preview shows in a corner.
  const tctx = $('#thumbC').getContext('2d'); let tn = 0;
  app.afterRender = () => {
    if (thumb.hidden || (tn++ % 4)) return;
    const c = world.canvas, pr = c.width / world.w, s = Math.min(world.w, world.h * 0.5) * pr;
    const cx = (world.w / 2 - cam.inset.x) * pr, cy = (world.h / 2 - cam.inset.y) * pr;
    tctx.fillStyle = '#fff'; tctx.fillRect(0, 0, 240, 180); tctx.drawImage(c, cx - s / 2, cy - s * 0.375, s, s * 0.75, 0, 0, 240, 180);
  };

  // Keyboard access: one hidden button per region. Tab moves between regions, Enter opens.
  const nav = $('#a11y');
  const list = [...app.samples, ...app.areas];
  list.forEach((reg) => {
    const b = document.createElement('button');
    const tt = regionTitle(reg);
    b.textContent = `${reg.name}. ${tt.tag}. ${reg.desc}`;
    b.onfocus = () => { if (app.current || app.mode === 'design') return; cam.flyTo(reg.tile); setHover(reg.tile); showTip(reg, reg.tile, window.innerWidth / 2 - cam.inset.x, window.innerHeight / 2 - 40); };
    b.onblur = () => { setHover(null); tip.hidden = true; };
    b.onclick = () => app.openRegion(reg);
    nav.append(b);
  });

  // Esc closes. Tab stays inside an open panel.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (app.modalOpen && app.closeModal) app.closeModal();
      else if (app.mode === 'design' && app.exitDesign) app.exitDesign();
      else if (app.current) app.closeRegion();
      else if (app.following) app.stopFollow();
      else if (app.closeMenu) app.closeMenu();
    }
    if (e.key === 'Tab') {
      const box = app.modalOpen ? $('#modal') : !panel.hidden ? panel : null;
      if (!box) return;
      const f = [...box.querySelectorAll('button:not([disabled]),input,select,textarea,[tabindex="0"]')].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', () => { app.layoutInset(); cam.refit(); });
  // The first-visit hint goes away after the first action.
  const hint = $('#hint'); const hintOff = () => hint.classList.add('off');
  canvas.addEventListener('pointerdown', hintOff, { once: true }); canvas.addEventListener('wheel', hintOff, { once: true, passive: true }); setTimeout(hintOff, 14000);
  // iOS Safari: keep the page from zooming when two fingers pinch the planet.
  document.addEventListener('gesturestart', (e) => e.preventDefault()); document.addEventListener('gesturechange', (e) => e.preventDefault());

  const prevUpdate = app.update;
  app.update = (t, dt) => {
    if (prevUpdate) prevUpdate(t, dt);
    const k = 1 - Math.exp(-dt * 5);
    U.uFocusK.value += (focusGoal - U.uFocusK.value) * k;
    const lg = litGoal * CONFIG.focus.nightLight;
    U.uLitK.value += (lg - U.uLitK.value) * (1 - Math.exp(-dt * 6));
    app.busy = Math.abs(focusGoal - U.uFocusK.value) > 0.01 || Math.abs(lg - U.uLitK.value) > 0.01 || (world.outline.k > 0.01 && world.outline.k < 0.99);
    if (app.current && app.mode !== 'design' && lightBtn.hidden === (world.dayAt(app.current.tile.center) < 0.5)) syncLightBtn();
  };
}
