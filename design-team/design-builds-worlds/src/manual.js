// The Region Manual: a panel that looks like a page from a corporate brand guidelines book.
import { toneHex, toneLabel, HUE_LABEL } from './palette.js';
import { BIOMES } from './region.js';
import { STYLES } from './buildings.js';
import { heroGlyph } from './glyphs.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad3 = (n) => String(n).padStart(3, '0');
const ROLE = ['Accent 1', 'Accent 2'], USE = ['roofs, large shapes', 'walls, details'];
const SIZE_LABEL = { small: 'Small', medium: 'Medium', large: 'Large' };

export function regionTitle(reg) {
  if (reg.kind === 'area') return { num: 'Unique area ' + String(reg.index + 1).padStart(2, '0'), tag: 'Unique area · not claimable' };
  if (reg.kind === 'practice') return { num: 'Practice region', tag: 'Practice region, not saved' };
  return { num: 'Region ' + pad3(reg.number), tag: 'Sample region' };
}
export function accentHex(reg) {
  if (reg.kind === 'area') return toneHex(reg.def.hues[0], 5);
  return toneHex(reg.cfg.hues[0], 5);
}

// One color = one round swatch. Its name, its hex value, and its use show under the row when the pointer or the focus is on it.
function swatches(hue, tones, use) {
  return tones.map((t) => { const hx = toneHex(hue, t), nm = toneLabel(hue, t); return `<span class="sw" tabindex="0" role="img" aria-label="${esc(nm)}, ${hx}, ${esc(use)}" style="background:${hx}"><span class="swt"><b>${esc(nm)}</b><code>${hx}</code>${esc(use)}</span></span>`; }).join('');
}
const swRow = (groups) => `<div class="sws">${groups.filter(Boolean).map((g) => `<span class="swg">${g}</span>`).join('')}<span class="swhint">Point at a color to see its name and its use.</span></div>`;

// Construction diagram: top-down tile, 7 anchor points, hero objects placed.
function diagram(reg) {
  const t = reg.tile, S = 98, cx = 150, cy = 136;
  const pts = (t.shape || t.poly).map((p) => `${(cx + p.x * S).toFixed(1)},${(cy + p.z * S).toFixed(1)}`).join(' ');
  let s = `<svg viewBox="0 0 300 290" class="fig" role="img" aria-label="Top-down diagram of the tile with anchor points and hero objects">`;
  s += `<polygon points="${pts}" fill="none" stroke="#080808" stroke-width="1.2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${S}" fill="none" stroke="#ABABAB" stroke-width="0.6" stroke-dasharray="2 3"/>`;
  s += `<path d="M${cx - S - 14} ${cy}h${2 * S + 28} M${cx} ${cy - S - 14}v${2 * S + 28}" stroke="#E0E0E0" stroke-width="0.6"/>`;
  if (reg.plan) {   // a unique area: the land, the footprint of each larger object, and a few names
    const pl = reg.plan;
    s += `<g transform="translate(${cx} ${cy}) scale(${S / 100})"><path d="${pl.land}" fill="#ECEEF1"/><path d="${pl.soft}" fill="var(--acc)" fill-opacity="0.2" stroke="var(--acc)" stroke-width="0.5"/><path d="${pl.solid}" fill="#fff" fill-opacity="0.75" stroke="#080808" stroke-width="0.6" stroke-linejoin="round"/></g>`;
    s += `<polygon points="${pts}" fill="none" stroke="#080808" stroke-width="1.2"/>`;
    pl.marks.forEach(([label, x, z]) => { const px = cx + x * S, py = cy + z * S; s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="var(--acc)" stroke="#fff" stroke-width="1"/><text x="${(px + 6).toFixed(1)}" y="${(py + 3).toFixed(1)}" class="t2 lab">${esc(label)}</text>`; });
  }
  const an = reg.anchors || [];
  an.forEach((a, i) => { const x = cx + a.x * S, y = cy + a.z * S; s += `<g stroke="#5A5A5A" stroke-width="0.7" fill="none"><circle cx="${x}" cy="${y}" r="3.2"/><path d="M${x - 6} ${y}h12 M${x} ${y - 6}v12"/></g><text x="${x + 6}" y="${y - 6}" class="t2">A${i}</text>`; });
  (reg.heroes || []).forEach((h, i) => {
    const x = cx + (h.cx ?? h.x) * S, y = cy + (h.cz ?? h.z) * S, r = Math.max(8, h.r * S);
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--acc)" fill-opacity="0.16" stroke="var(--acc)" stroke-width="1.4"/>`;
    s += `<path d="M${x} ${y}l${Math.cos(h.ang) * r} ${Math.sin(h.ang) * r}" stroke="var(--acc)" stroke-width="1.4"/>`;
    s += `<circle cx="${x}" cy="${y}" r="7" fill="#080808"/><text x="${x}" y="${y + 3.2}" text-anchor="middle" class="t3">${i + 1}</text>`;
  });
  s += `<path d="M22 262h${S} M22 258v8 M${22 + S} 258v8" stroke="#080808" stroke-width="1"/><text x="22" y="278" class="t2">1 UNIT = TILE INRADIUS</text>`;
  s += `<path d="M276 34v-20 M271 20l5-7 5 7" stroke="#080808" stroke-width="1" fill="none"/><text x="276" y="46" text-anchor="middle" class="t2">N</text>`;
  s += `<text x="278" y="278" text-anchor="end" class="t2">TILE ${pad3(t.index)}, TOP VIEW</text></svg>`;
  return s;
}


// The owner of a region: a picture (or initials when there is no picture), the full name, the job title, and a short bio.
// A sample region has no real owner, so it shows placeholder text with a "demo" mark.
export const initials = (name) => { const w = String(name || '').trim().split(/\s+/).filter(Boolean); return ((w[0] ? w[0][0] : '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() || '?'; };
function ownerHTML(reg) {
  const c = reg.cfg, demo = reg.kind === 'sample';
  const name = c.ownerName || (demo ? 'Sample owner' : 'Guest'), title = c.ownerTitle || (demo ? 'Job title' : ''), bio = c.ownerBio || (demo ? 'A short bio of the owner shows here.' : '');
  const pic = c.ownerPic && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.ownerPic) ? `<img src="${c.ownerPic}" alt="">` : `<span aria-hidden="true">${esc(initials(name))}</span>`;
  return `<section><h2>Owner</h2><div class="owner"><div class="avatar">${pic}</div><div class="who"><b>${esc(name)}${demo ? ' <em class="demo">demo</em>' : ''}</b>${title ? `<span>${esc(title)}</span>` : ''}</div></div>${bio ? `<p class="bio">${esc(bio)}</p>` : reg.kind === 'practice' ? '<p class="note">Add your name, your job title, a short bio, and a picture in step 5 of “Design your region”.</p>' : ''}</section>`;
}

export function manualHTML(app, reg) {
  const tt = regionTitle(reg), found = app.foundCount ? app.foundCount(reg) : 0, total = reg.details.length;
  const head = `<div class="handle" aria-hidden="true"><i></i></div>
  <header class="mtop"><span>Region Manual</span><span class="mid"></span>
    <button class="expand" aria-label="Expand the panel" aria-pressed="false"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
    <button class="x" aria-label="Close the Region Manual"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6"/></svg></button></header>`;
  const detailsSec = `<section><h2>Hidden details</h2>
    <p class="big" id="foundLine"><b>${found}</b> of ${total} found</p>
    <div class="dots" aria-hidden="true">${reg.details.map((d, i) => `<i class="${app.isFound && app.isFound(reg, i) ? 'on' : ''}"></i>`).join('')}</div>
    <p class="note">Small surprises hide in this region. Zoom in close, then point at one or tap it.</p>
    ${total ? '<button class="btn small" id="hintBtn">Find the next one for me</button>' : ''}</section>`;
  const photo = `<footer class="mfoot">${reg.kind === 'practice' ? '<button class="btn" id="editBtn">Edit</button>' : ''}<button class="btn primary" id="photoBtn">Take a photo</button></footer>`;

  if (reg.kind === 'area') {
    const d = reg.def;
    return `${head}<div class="mbody" tabindex="-1">
    <section class="cover"><h1>${esc(reg.name)}</h1><p class="motto">${esc(d.look)}</p><div class="tag">${esc(tt.tag)}</div></section>
    <section><h2>Identity</h2><dl class="spec"><dt>Type</dt><dd>Unique area. One of 12. Nobody can claim it.</dd><dt>Position</dt><dd>${{ north: 'North pole', south: 'South pole', upper: 'Upper ring', lower: 'Lower ring' }[d.ring]}</dd><dt>Since</dt><dd>Day one</dd><dt>Tile</dt><dd>Pentagon ${pad3(reg.tile.index)}</dd></dl></section>
    <section><h2>Palette</h2>${swRow([...d.hues.map((h, i) => swatches(h, h === 'darkblue' ? [5] : [1, 3, 5, 7], `Color ${i + 1}: ${HUE_LABEL[h]}`)), d.extra ? '<span class="sw" tabindex="0" role="img" aria-label="White, #FFFFFF" style="background:#FFFFFF"><span class="swt"><b>White</b><code>#FFFFFF</code>Plus</span></span>' : ''])}</section>
    <section><h2>Seasons</h2><p>${esc(reg.season || d.season)}</p></section>
    ${detailsSec}
    <section><h2>Construction diagram</h2>${diagram(reg)}</section></div>${photo}`;
  }
  const c = reg.cfg, P = reg.P;
  const dial = (label, v) => `<tr><th>${label}</th><td><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div></td><td class="n">${v.toFixed(2)}</td></tr>`;
  return `${head}<div class="mbody" tabindex="-1">
  <section class="cover"><h1>${esc(c.name || 'Your region')}</h1><p class="motto">${esc(c.motto || '')}</p>
    <div class="tag">${esc(tt.tag)}</div></section>
  ${ownerHTML(reg)}
  <section><h2>Identity</h2><dl class="spec"><dt>Founded</dt><dd>${reg.kind === 'sample' ? esc(c.founded) + ' <em class="demo">demo</em>' : 'Not saved'}</dd><dt>Biome</dt><dd>${BIOMES[c.biome].label} <small>${BIOMES[c.biome].hint}</small></dd><dt>Scenery</dt><dd>${STYLES[c.arch] || 'None'}</dd></dl></section>
  <section><h2>Palette</h2>${swRow([BIOMES[c.biome].rows.map((h) => swatches(h, h === 'darkblue' ? [5] : [3, 5], 'Natural: land, plants, water')).join(''), ...P.hues.map((h, i) => ((i && P.hues.indexOf(h) < i) ? '' : swatches(h, P.tones(h), `${ROLE[i]}: ${USE[i]}`)))])}
    <p class="note">Natural colors come from the biome. A person picks the two accent colors.</p></section>
  <section><h2>Landmarks</h2>${reg.heroes.length ? '' : '<p class="note">No landmarks yet.</p>'}<div class="heroes"${reg.heroes.length ? '' : ' hidden'}>${reg.heroes.map((h, i) => `<figure tabindex="0" data-hi="h${reg.tile.index}-${h.i}"><div class="hg">${heroGlyph(h.type, 44)}</div><figcaption><b>${h.def.label}</b><span>Anchor A${h.anchor} · ${SIZE_LABEL[c.heroes[h.i].size] || 'Medium'} · ${((c.heroes[h.i].rot | 0) * 60) % 360}°</span></figcaption></figure>`).join('')}</div></section>
  <section><h2>Dials</h2><table class="dials">${dial('Terrain roughness', c.rough)}${dial('Water level', c.water)}${dial('Vegetation density', c.veg)}${dial('Scenery density', c.bld)}${dial('Whimsy', c.whimsy)}${dial('Hue shift', c.hueShift)}
    <tr><th>Seed</th><td colspan="2" class="n">${c.seed}</td></tr></table></section>
  ${detailsSec}
  <section><h2>Construction diagram</h2>${diagram(reg)}
    <ol class="legend">${reg.heroes.map((h) => `<li>${h.def.label}</li>`).join('')}</ol></section></div>${photo}`;
}
