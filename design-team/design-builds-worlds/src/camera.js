// Camera: orbit the planet, or focus on one tile at its hero angle. Mouse, touch, and keyboard.
import * as THREE from 'three';
import { CONFIG, REDUCED, hostScrolls } from './config.js';
import { clamp, lerp, easeOut, DEG, TAU } from './util.js';

const V = THREE.Vector3;
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();

export class Cam {
  constructor(world, el) {
    this.world = world; this.el = el; this.camera = world.camera;
    this.mode = 'orbit';
    this.lon = 0.9; this.lat = CONFIG.camera.tilt * DEG; this.dist = CONFIG.camera.zoomMax; this.roll = 0;
    this.vLon = 0; this.vLat = 0;
    this.auto = !REDUCED;
    this.focus = null;       // { tile, az, tilt, dist }
    this.tr = null;          // transition { t, dur, pos, target, up }
    this.pos = new V(); this.target = new V(); this.up = new V(0, 1, 0);
    this.inset = { x: 0, y: 0 }; this.insetGoal = { x: 0, y: 0 };
    this.lastInput = performance.now();
    this.onTap = null; this.onHover = null; this.onDrag = null; this.onChange = null;
    this.dragLock = null;    // set by the design mode while a hero object is dragged
    this.flyGoal = null;
    this._bind();
  }

  _pose(pos, target, up) {
    if (this.mode === 'focus') {
      const f = this.focus, t = f.tile, n = t.center;
      target.copy(n).multiplyScalar(1 + (f.lift ?? 0.12) * t.rin);
      if (f.ox || f.oz) target.addScaledVector(t.e1, (f.ox || 0) * t.rin).addScaledVector(t.e3, (f.oz || 0) * t.rin);   // look at a point off the tile center (catalog pictures)
      const hx = Math.cos(f.az), hz = Math.sin(f.az), st = Math.sin(f.tilt), ct = Math.cos(f.tilt);
      pos.copy(target).addScaledVector(n, ct * f.dist).addScaledVector(t.e1, hx * st * f.dist).addScaledVector(t.e3, hz * st * f.dist);
      up.copy(n);
    } else if (this.mode === 'object') {
      // Follow one object (the moon, a ship). get() gives its place now: C = base point, up = its up axis, mid = how far up its middle is.
      const f = this.focus, o = f.get(); if (o) { f.C.copy(o.C).addScaledVector(o.up, o.mid); f.U.copy(o.up); }
      const n = f.U; _e1.crossVectors(_Y, n); if (_e1.lengthSq() < 1e-6) _e1.set(1, 0, 0); _e1.normalize(); _e3.crossVectors(_e1, n).normalize();
      const hx = Math.cos(f.az), hz = Math.sin(f.az), st = Math.sin(f.tilt), ct = Math.cos(f.tilt);
      target.copy(f.C);
      pos.copy(target).addScaledVector(n, ct * f.dist).addScaledVector(_e1, hx * st * f.dist).addScaledVector(_e3, hz * st * f.dist);
      up.copy(n);
    } else {
      const cl = Math.cos(this.lat);
      pos.set(cl * Math.cos(this.lon), Math.sin(this.lat), cl * Math.sin(this.lon)).multiplyScalar(this.dist);
      target.set(0, 0, 0); up.set(0, 1, 0);
    }
  }

  _startTr(dur = 1.0) {
    this.tr = { t: 0, dur: REDUCED ? 0.01 : dur, pos: this.pos.clone(), target: this.target.clone(), up: this.up.clone() };
  }

  // Hero angle: a composed view of one tile. az = where the camera stands around the tile.
  focusTile(tile, opts = {}) {
    this._startTr(opts.dur ?? 1.0);
    this.mode = 'focus';
    // Fit the tile into the part of the view that a panel does not cover.
    const w = this.world.w, h = this.world.h, remW = Math.max(120, w - this.insetGoal.x * 2), remH = Math.max(120, h - this.insetGoal.y * 2);
    const tilt = opts.tilt ?? 57 * DEG, tanV = Math.tan((CONFIG.camera.fov * DEG) / 2);
    const dW = (tile.rcirc * 1.1) / (tanV * (remW / h)), dH = (tile.rcirc * (Math.cos(tilt) + 0.3)) / (tanV * (remH / h));
    const d = Math.max(dW, dH, 0.5) * ((opts.dist ?? 0.76) / 0.76);
    this.focus = { tile, az: opts.az ?? Math.PI / 2, tilt, dist: d, lift: opts.lift, min: 0.34, max: d * 1.7 };
    this.auto = false; this.vLon = this.vLat = 0; this.flyGoal = null;
    this.changed();
  }
  // Zoom in on one object and stay with it as it moves. size = about half its width.
  followObject(get, size) {
    const o = get(); if (!o) return;
    this._startTr(1.1);
    const C = new V().copy(o.C).addScaledVector(o.up, o.mid), n = o.up;
    _e1.crossVectors(_Y, n); if (_e1.lengthSq() < 1e-6) _e1.set(1, 0, 0); _e1.normalize(); _e3.crossVectors(_e1, n).normalize();
    // Stand on the side of the object that the camera is on now, so the move is short.
    const d = _a.copy(this.pos).sub(C), az = Math.atan2(d.dot(_e3), d.dot(_e1));
    this.mode = 'object';
    this.focus = { get, az, tilt: 62 * DEG, dist: size * 5.2, min: size * 2.2, max: size * 14, C, U: new V().copy(n) };
    this.auto = false; this.vLon = this.vLat = 0; this.flyGoal = null;
    this.changed();
  }
  // Fit again after the window or a panel changes size.
  refit() {
    if (this.mode !== 'focus' || this.tr) return;
    const f = this.focus, tile = f.tile, w = this.world.w, h = this.world.h, remW = Math.max(120, w - this.insetGoal.x * 2), remH = Math.max(120, h - this.insetGoal.y * 2);
    const tanV = Math.tan((CONFIG.camera.fov * DEG) / 2);
    const d = Math.max((tile.rcirc * 1.1) / (tanV * (remW / h)), (tile.rcirc * (Math.cos(f.tilt) + 0.3)) / (tanV * (remH / h)), 0.5);
    f.dist = d; f.max = d * 1.7;
  }
  unfocus() {
    if (this.mode === 'orbit') return;
    this._startTr(0.9);
    const p = this.pos.clone().normalize();
    this.lat = clamp(Math.asin(p.y), -1.25, 1.25); this.lon = Math.atan2(p.z, p.x);
    this.dist = Math.max(this.dist, 3.0);
    this.mode = 'orbit'; this.focus = null;
    this.changed();
  }
  // Turn the planet so a tile faces the viewer (orbit mode).
  flyTo(tile) {
    if (this.mode !== 'orbit') return;
    this.auto = false; this.vLon = this.vLat = 0;
    this.flyGoal = { lon: tile.lon, lat: clamp(tile.lat * 0.85, -1.2, 1.2) };
    this.changed();
  }
  setInset(x, y) { this.insetGoal.x = x; this.insetGoal.y = y; this.changed(); }
  changed() { this.lastInput = performance.now(); if (this.onChange) this.onChange(); }

  get busy() { return !!this.tr || Math.abs(this.vLon) + Math.abs(this.vLat) > 1e-4 || this.auto || !!this.flyGoal || Math.abs(this.inset.x - this.insetGoal.x) + Math.abs(this.inset.y - this.insetGoal.y) > 0.5; }

  update(dt) {
    const C = CONFIG.camera;
    if (this.mode === 'orbit') {
      if (this.auto && !this.dragging) this.lon -= C.autoRotate * dt;
      if (!this.dragging) {
        this.lon += this.vLon * dt; this.lat += this.vLat * dt;
        const d = Math.exp(-dt * 3.2); this.vLon *= d; this.vLat *= d;
        if (this.flyGoal) {
          let dl = this.flyGoal.lon - this.lon; dl = ((dl + Math.PI) % TAU + TAU) % TAU - Math.PI;
          const k = 1 - Math.exp(-dt * 5);
          this.lon += dl * k; this.lat += (this.flyGoal.lat - this.lat) * k;
          const dd = this.flyGoal.dist != null ? this.flyGoal.dist - this.dist : 0; this.dist += dd * k;   // dist is optional: the distance to go to
          if (Math.abs(dl) + Math.abs(this.flyGoal.lat - this.lat) + Math.abs(dd) < 0.002) this.flyGoal = null;
        }
      }
      this.lat = clamp(this.lat, -1.3, 1.3);
      this.dist = clamp(this.dist, C.zoomMin, C.zoomMax);
    } else {
      const f = this.focus;
      f.tilt = clamp(f.tilt, 12 * DEG, 78 * DEG); f.dist = clamp(f.dist, f.min, f.max);
    }
    const pos = _p, target = _t, up = _u;
    this._pose(pos, target, up);
    if (this.tr) {
      const tr = this.tr; tr.t += dt / tr.dur;
      const e = easeOut(tr.t);
      // Move along an arc around the planet, not through it.
      const r0 = tr.pos.length(), r1 = pos.length();
      const a = _a.copy(tr.pos).normalize(), b = _b.copy(pos).normalize();
      const ang = a.angleTo(b);
      if (ang > 1e-4) { const s = Math.sin(ang); a.multiplyScalar(Math.sin((1 - e) * ang) / s).addScaledVector(b, Math.sin(e * ang) / s); } else a.lerp(b, e);
      // Lift the path a little in the middle of long moves so the planet stays in view.
      const arc = Math.sin(Math.PI * e) * Math.min(1, ang) * 0.5;
      pos.copy(a).normalize().multiplyScalar(lerp(r0, r1, e) + arc);
      target.lerpVectors(tr.target, target, e);
      up.lerpVectors(tr.up, up, e).normalize();
      if (tr.t >= 1) this.tr = null;
    }
    this.pos.copy(pos); this.target.copy(target); this.up.copy(up);
    const cam = this.camera;
    cam.position.copy(pos); cam.up.copy(up); cam.lookAt(target);
    if (this.mode === 'orbit' && this.roll) cam.rotateZ(this.roll);
    // Shift the view so the planet stays clear of an open panel.
    const ki = 1 - Math.exp(-dt * 7);
    this.inset.x += (this.insetGoal.x - this.inset.x) * ki; this.inset.y += (this.insetGoal.y - this.inset.y) * ki;
    const w = this.world.w, h = this.world.h;
    if (Math.abs(this.inset.x) > 0.5 || Math.abs(this.inset.y) > 0.5) cam.setViewOffset(w, h, this.inset.x, this.inset.y, w, h);
    else if (cam.view && cam.view.enabled) cam.clearViewOffset();
    cam.updateMatrixWorld();
  }

  // Which tile is under a screen point? Returns { tile, point } or null.
  // The point of the sea surface under the pointer, as a direction from the middle of the planet (length 1). null = the pointer is not over the planet.
  seaPoint(cx, cy, R = 0.988) {
    const rect = this.el.getBoundingClientRect();
    _ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const o = _ray.ray.origin, d = _ray.ray.direction, b = o.dot(d), disc = b * b - (o.lengthSq() - R * R);
    if (disc < 0) return null;
    return o.clone().addScaledVector(d, -b - Math.sqrt(disc)).normalize();
  }
  pick(cx, cy) {
    const rect = this.el.getBoundingClientRect();
    _ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    const o = _ray.ray.origin, d = _ray.ray.direction;
    const R = 1.035; // a little larger than the planet: a forgiving hit area
    const b = o.dot(d), c = o.lengthSq() - R * R, disc = b * b - c;
    if (disc < 0) return null;
    const s = -b - Math.sqrt(disc);
    if (s < 0) return null;
    const p = new V().copy(o).addScaledVector(d, s);
    const n = _a.copy(p).normalize();
    let best = null, bd = -2;
    for (const t of this.world.tiles) { const k = t.center.dot(n); if (k > bd) { bd = k; best = t; } }
    const rt = this.world.roundTile; if (rt && Math.acos(Math.min(1, rt.center.dot(n))) < rt.alpha) best = rt;   // the round cell is larger than its pentagon
    return { tile: best, point: p, ray: _ray.ray };
  }
  ray(cx, cy) {
    const rect = this.el.getBoundingClientRect();
    _ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, this.camera);
    return _ray.ray;
  }
  // Screen position of a world point (CSS pixels), or null when it is behind the planet edge.
  project(p) {
    const v = _a.copy(p).project(this.camera);
    const rect = this.el.getBoundingClientRect();
    return { x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height, front: v.z < 1 };
  }

  _bind() {
    const el = this.el, pts = new Map();
    let moved = 0, downAt = 0, pinch = null, last = null;
    const touch = () => { this.auto = false; this.flyGoal = null; this.changed(); };
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { moved = 0; downAt = performance.now(); last = { x: e.clientX, y: e.clientY }; this.dragging = true; this.vLon = this.vLat = 0;
        if (this.onDrag) this.dragLock = this.onDrag('start', e.clientX, e.clientY) ? 1 : null; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; moved = 99; }
      touch();
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) { if (e.pointerType === 'mouse' && this.onHover) this.onHover(e.clientX, e.clientY); return; }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y; last.x = e.clientX; last.y = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (this.dragLock) { this.onDrag('move', e.clientX, e.clientY); return; }
        if (moved < 4) return;
        if (this.mode === 'orbit') {
          const k = (this.dist - 0.92) * 0.0019 * (900 / Math.max(500, this.world.h));
          const c = Math.cos(this.roll), s = Math.sin(this.roll);
          const rx = dx * c + dy * s, ry = -dx * s + dy * c;
          this.lon += rx * k; this.lat += ry * k;
          this.vLon = lerp(this.vLon, (rx * k) / 0.016, 0.4); this.vLat = lerp(this.vLat, (ry * k) / 0.016, 0.4);
        } else if (!this.tr) { this.focus.az += dx * 0.006; this.focus.tilt -= dy * 0.004; }
      } else if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
        const z = pinch.d / Math.max(1, d);
        let da = ang - pinch.a; da = ((da + Math.PI) % TAU + TAU) % TAU - Math.PI;
        if (this.mode === 'orbit') { this.dist *= z; this.roll += da; } else if (!this.tr) { this.focus.dist *= z; this.focus.az += da; }
        pinch.d = d; pinch.a = ang;
      }
      touch();
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) {
        this.dragging = false;
        if (this.dragLock) { this.onDrag('end', e.clientX, e.clientY); this.dragLock = null; }
        else if (moved < 7 && performance.now() - downAt < 600 && this.onTap) this.onTap(e.clientX, e.clientY, e.pointerType);
      } else { const p = [...pts.values()][0]; last = { x: p.x, y: p.y }; }
      touch();
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { if (this.onHover) this.onHover(-1, -1); });
    el.addEventListener('wheel', (e) => {
      // In an embed on a page that scrolls, the wheel scrolls the page. Zoom needs the Ctrl or the Command key (a pinch on a trackpad sends Ctrl).
      if (!(e.ctrlKey || e.metaKey) && hostScrolls()) return;
      e.preventDefault();
      const z = Math.exp(clamp(e.deltaY, -120, 120) * (e.ctrlKey ? 0.01 : 0.0016));
      if (this.mode === 'orbit') this.dist *= z; else if (!this.tr) this.focus.dist *= z;
      touch();
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  // Keyboard steps.
  nudge(dx, dy) { this.auto = false; this.flyGoal = null; if (this.mode === 'orbit') { this.vLon += dx * 1.4; this.vLat += dy * 1.0; } else { this.focus.az += dx * 0.25; this.focus.tilt -= dy * 0.12; } this.changed(); }
  zoom(f) { this.auto = false; if (this.mode === 'orbit') this.dist *= f; else this.focus.dist *= f; this.changed(); }
}
const _p = new V(), _t = new V(), _u = new V(), _a = new V(), _b = new V();
const _e1 = new V(), _e3 = new V(), _Y = new V(0, 1, 0);
