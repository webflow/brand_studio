// The menu in the top-right corner: your region, the passport (the planet time, the 12 unique areas, the legends of the sea, the easter eggs), and the quality setting.
import { LEGENDS, legendPicture } from './sea.js';
import { CONFIG } from './config.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'dbw-passport', KEY2 = 'dbw-legends', KEY3 = 'dbw-eggs', KEY4 = 'dbw-lore';
// The easter eggs: things that do something when the visitor selects them.
// [id, name, the key of the thing (see discover.js), the unique area that has it (or null: it is in orbit), a line icon]
const EGGS = [
  ['flare', 'Heat Wave', 'sun', null, '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
  ['wave', 'Tidal Wave', 'moon', null, '<path d="M3 16c3 0 4-2 5-4.5C9.2 8.5 11 7 13.5 7c2.5 0 4 1.6 4 3.5 0 1.4-1 2.3-2.2 2.3"/><path d="M3 20c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0"/>'],
  ['wire', 'Wireframe', 'sat', null, '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M4.2 7.5L12 12l7.8-4.5M12 12v9"/>'],
  ['meteor', 'Meteor Shower', 'comet', null, '<path d="M20.5 3.500L11 13"/><path d="M20.5 9.500l-5 5M14.500 3.500l-5 5"/><circle cx="7.500" cy="16.500" r="3.500"/>'],
  ['erupt', 'Eruption', 'volcano', 'volcano-ring', '<path d="M3 20l5.5-9h7L21 20z"/><path d="M10 11l1-2.5M14 11l-1-2.5M12 7V3.5M8.5 6.500L7 4.500M15.500 6.500l1.500-2"/>'],
  ['launch', 'Launch!', 'pub', 'webflow-island', '<path d="M12 3c3 2.5 4 6 4 9.500V16H8v-3.500C8 9 9 5.500 12 3z"/><path d="M8 13l-2.500 3v2.500L8 17M16 13l2.500 3v2.500L16 17M10.500 19.500L12 22l1.500-2.500"/><circle cx="12" cy="9.500" r="1.400"/>'],
  ['storm', 'Electric Storm', 'tower', 'storm-eye', '<path d="M13 2.500L5.500 13.500h5L9.500 21.500l8-11.500h-5z"/>'],
].map((e) => { e[4] = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${e[4].replace(/(\.\d)00/g, '$1')}</svg>`; return e; });
// Webflow lore: things on the planet that have a story from the culture of Webflow. A visitor finds one and selects it: a window with its story opens, and it gets its stamp in the passport.
// [id, name, the key of the thing (see discover.js), the unique area that has it, the model for the picture (sea.js DRAW), the story (paragraphs)]
// PLACEHOLDER TEXT in the second paragraph of each one: Jose gives the real story.
const LORE = [
  ['wolfdew', 'Wolfdew', 'wolf', 'north-ice-crown', 'wolf', ['Wolfdew is Webflow, backwards.', 'Placeholder: the place of Wolfdew in the culture of Webflow. The real text goes here.']],
  ['founders', 'Vlad, Sergie, and Bryant', 'wizards', 'storm-eye', 'founders', ['Vlad, Sergie, and Bryant are the founders of Webflow.', 'Placeholder: where and when they founded Webflow. The real text goes here.']],
  ['flexbox', 'The flexbox game', 'flexman', 'mirror-lake', 'flexgame', ['Placeholder: how flexbox was added to the Style panel. The real text goes here.', 'Placeholder: the flexbox game was released in 2016 as a way for people to learn how CSS flexbox works. The real text goes here.']],
  ['cms', 'Webflow CMS', 'rack', 'ufo-crash', 'rack', ['Placeholder: Webflow CMS was added in October of 2015. The real text goes here.', 'Placeholder: why it was such a pivotal moment for Webflow. The real text goes here.']],
];
const STAR = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4l2.3 5 5.4.6-4 3.700 1.100 5.400L12 16l-4.800 2.700 1.100-5.400-4-3.700 5.400-.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'.replace(/(\.\d)00/g, '$1');
// The four seasons: name, a color (not used now), and a small line icon (a sprout, a sun, a leaf, a snowflake).
const SEASON = [
  ['Spring', '#2E9E5B', '<path d="M20 35V19"/><path d="M20 24c-8 0-12-4-12-11 7 0 12 4 12 11z"/><path d="M20 19c0-7 4-11 11-11 0 7-4 11-11 11z"/>'],
  ['Summer', '#E39B00', '<circle cx="20" cy="20" r="7"/><path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.700 8.700l3.500 3.500M27.800 27.800l3.500 3.500M8.700 31.300l3.500-3.500M27.800 12.200l3.500-3.500"/>'],
  ['Autumn', '#D9652B', '<path d="M8 32c0-15 9-24 24-24 0 15-9 24-24 24z"/><path d="M8 32l15-15M15 25h7M19 21v-6"/>'],
  ['Winter', '#2F7BE5', '<path d="M20 4v32M6.100 12l27.800 16M6.100 28l27.800-16M20 9l-3.500-3M20 9l3.500-3M20 31l-3.500 3M20 31l3.500 3"/>'],
].map(([n, c, d]) => [n, d.replace(/(\.\d)00/g, '$1')]);   // the color is not used: the icons are black
const pad2 = (n) => String(n).padStart(2, '0');
// One stamp in the passport: a round badge and a name under it. An empty slot has a dashed ring and a small sign (a tile, or a wave).
// A visited area has a solid ring and a blue filled pentagon. A found legend shows a picture of its model (a check mark if the picture cannot be made).
const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PENT = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4l8 5.8-3 9.4H7L4 9.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const PENT_ON = PENT.replace('fill="none"', 'fill="currentColor"');   // a visited area: the pentagon is filled
const WAVE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

export function setupMenu(app) {
  const { $ } = app, el = $('#settings'), btn = $('#settingsBtn');
  // The areas that the visitor opened: a stamp in the passport. The list stays in the browser.
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { seen = []; }
  if (!Array.isArray(seen)) seen = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { /* keep it in memory only */ } };
  // The legends of the sea that the visitor found (selected in the ocean).
  let legends = [];
  try { legends = JSON.parse(localStorage.getItem(KEY2) || '[]'); } catch (e) { legends = []; }
  if (!Array.isArray(legends)) legends = [];
  legends = legends.map((id) => (id === 'squid' ? 'kraken' : id)).filter((id) => LEGENDS.some((q) => q[0] === id));   // the giant squid has a new name; a legend that is gone (the mermaid) has no mark
  app.legendFound = (id) => legends.includes(id);
  app.legends = () => legends.slice();
  // The easter eggs that the visitor found.
  let eggs = [];
  try { eggs = JSON.parse(localStorage.getItem(KEY3) || '[]'); } catch (e) { eggs = []; }
  if (!Array.isArray(eggs)) eggs = [];
  app.eggs = () => eggs.slice();
  // The Webflow lore that the visitor found.
  let lore = [];
  try { lore = JSON.parse(localStorage.getItem(KEY4) || '[]'); } catch (e) { lore = []; }
  if (!Array.isArray(lore)) lore = [];
  lore = lore.filter((id) => LORE.some((q) => q[0] === id));
  app.lore = () => lore.slice();
  // The window with the story of one piece of lore. It closes with its button, with Escape, or with a click outside the card.
  const box = $('#lore'); let loreBack = null;
  // The window comes in and goes out gently (ui.css). With reduced motion it does not move.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; let loreOut = 0;
  const loreClose = () => {
    if (box.hidden || box.classList.contains('out')) return;
    const end = () => { box.hidden = true; box.classList.remove('out'); };
    if (calm) end(); else { box.classList.add('out'); loreOut = setTimeout(end, 150); }
    if (loreBack && loreBack.isConnected) loreBack.focus(); else $('#c').focus(); loreBack = null;
  };
  app.loreOpen = (id) => {
    const q = LORE.find((x) => x[0] === id); if (!q) return false;
    const pic = legendPicture(app.world, q[4]), im = $('#loreI');
    im.hidden = !pic; if (pic) im.src = pic;
    $('#loreT').textContent = q[1]; $('#loreP').innerHTML = q[5].map((t) => `<p>${esc(t)}</p>`).join('');
    clearTimeout(loreOut); box.classList.remove('out');
    loreBack = document.activeElement; box.hidden = false; $('#loreX').focus();
    $('#live').textContent = `${q[1]}. ${q[5].join(' ')}`;
    return true;
  };
  // "Are you sure you want to delete your region?" Cancel, Escape, or a click outside the card: nothing is deleted.
  const ask = $('#ask'); let askBack = null;
  const askClose = () => { if (ask.hidden) return; ask.hidden = true; if (askBack && askBack.isConnected) askBack.focus(); else btn.focus(); askBack = null; };
  const askDelete = (from) => { askBack = from; ask.hidden = false; $('#askNo').focus(); $('#live').textContent = 'Are you sure you want to delete your region?'; };
  $('#askNo').onclick = askClose;
  $('#askYes').onclick = () => { askBack = null; ask.hidden = true; close(); app.deleteRegion(); btn.focus(); };
  ask.addEventListener('pointerdown', (e) => { if (e.target === ask) askClose(); });
  window.addEventListener('keydown', (e) => { if (ask.hidden) return; if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); askClose(); } else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === $('#askNo') ? $('#askYes') : $('#askNo')).focus(); } }, true);
  $('#loreX').onclick = loreClose;
  box.addEventListener('pointerdown', (e) => { if (e.target === box) loreClose(); });
  window.addEventListener('keydown', (e) => { if (box.hidden) return; if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); loreClose(); } else if (e.key === 'Tab') { e.preventDefault(); $('#loreX').focus(); } }, true);
  let toastTimer = 0;
  let lastToast = { html: '', at: 0 };
  const toast = (html) => { const t = $('#toast'); lastToast = { html, at: performance.now() }; t.innerHTML = html; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200); };
  app.toast = toast;
  // A click on a thing at sea. A legend gets its mark in the passport.
  app.thingTap = (c) => {
    if (!c || !/^sea\d+$/.test(c.key)) return;
    const th = (app.world.seaThings || [])[+c.key.slice(3)]; if (!th || !th.legend) return;
    const first = !legends.includes(th.legend);
    if (first) { legends.push(th.legend); try { localStorage.setItem(KEY2, JSON.stringify(legends)); } catch (e) { /* keep it in memory only */ } if (!el.hidden) render(); }
    toast(`${first ? 'Found' : 'Seen again'}: ${esc(th.label)}<small>${legends.length} of ${LEGENDS.length} legends of the sea${first ? ' · added to your passport' : ''}</small>`);
    $('#live').textContent = `${first ? 'Found' : 'Seen again'}: ${th.label}. ${legends.length} of ${LEGENDS.length} legends of the sea.`;
  };
  // The visitor selected a thing that does something (key = its key in discover.js). The first time, the easter egg gets its mark in the passport.
  app.eggTap = (key) => {
    // A thing with Webflow lore: its story opens. The first time, it gets its stamp in the passport.
    const lq = LORE.find((q) => key === q[2] || key.startsWith(q[2]));
    if (lq) {
      if (!lore.includes(lq[0])) { lore.push(lq[0]); try { localStorage.setItem(KEY4, JSON.stringify(lore)); } catch (err) { /* keep it in memory only */ } if (!el.hidden) render(); toast(`Found: ${esc(lq[1])}<small>${lore.length} of ${LORE.length} Webflow lore · added to your passport</small>`); }
      app.loreOpen(lq[0]); return;
    }
    const e = EGGS.find((q) => key === q[2] || key.startsWith(q[2])); if (!e || eggs.includes(e[0])) return;
    eggs.push(e[0]); try { localStorage.setItem(KEY3, JSON.stringify(eggs)); } catch (err) { /* keep it in memory only */ }
    if (!el.hidden) render();
    // If the action showed its own message just now ("Published!"), keep its first line.
    const own = performance.now() - lastToast.at < 80 ? lastToast.html.split('<small>')[0] : '';
    toast(own ? `${own}<small>Easter egg found: ${esc(e[1])} · ${eggs.length} of ${EGGS.length} in your passport</small>` : `Easter egg found: ${esc(e[1])}<small>${eggs.length} of ${EGGS.length} easter eggs · added to your passport</small>`);
  };
  // When the menu closes and the focus was in it, the focus goes back to the menu button. (If not, the browser gives the focus to the planet, and its focus line is a border around the full frame.)
  const close = () => { if (!el.hidden) { const had = el.contains(document.activeElement); el.hidden = true; el.classList.remove('only-areas'); btn.setAttribute('aria-expanded', 'false'); if (armed) disarm(); if (had) btn.focus({ preventScroll: true }); } };
  app.closeMenu = close;

  // The planet time as a clock face, and the season as an icon. main.js calls this two times each second.
  let now = { m: 0, s: 1 };
  app.passTime = (m, sIdx) => {
    now = { m, s: sIdx };
    const hh = $('#ppH'); if (!hh) return;
    hh.setAttribute('transform', `rotate(${((m / 720) * 360).toFixed(1)} 20 20)`); $('#ppM').setAttribute('transform', `rotate(${(m % 60) * 6} 20 20)`);
    $('#ppTimeT').textContent = `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
    const [name, d] = SEASON[sIdx] || SEASON[1], st = $('#ppSeasonT');
    if (st.textContent !== name) { st.textContent = name; const ic = $('#ppSeasonI'); ic.innerHTML = d; ic.setAttribute('stroke', 'currentColor'); ic.setAttribute('aria-label', name); }
  };
  // Settings: the visitor can hold the planet at one time of day and at one season. "Live" follows the planet clock again.
  const DAYS = [[-1, 'Live'], [6, 'Dawn'], [12, 'Noon'], [18, 'Dusk'], [0, 'Night']], SEAS = [[-1, 'Live'], [0, 'Spring'], [1, 'Summer'], [2, 'Autumn'], [3, 'Winter']];
  const hold = { day: CONFIG.time.pauseDay ? -2 : -1, season: CONFIG.time.pauseSeason ? -2 : -1 };   // -2: held by a link option, no chip is on
  app.holdTime = (day, season) => {
    const T = CONFIG.time;
    if (day != null) { hold.day = day; if (day < 0) T.pauseDay = false; else { const ref = app.home ? app.home.tile.lon : 0, az = (CONFIG.light.azimuth * Math.PI) / 180; T.pauseDay = true; T.dayPhase = (((day / 24 - 0.5 + (az - ref) / (Math.PI * 2)) % 1) + 1) % 1; } }   // the hour is the planet time, at the meridian of the Webflow island
    if (season != null) { hold.season = season; if (season < 0) T.pauseSeason = false; else { T.pauseSeason = true; T.seasonPhase = (season + 0.5) / 4; } }
    app.cam.changed(); if (!el.hidden) render();
  };
  // A small dropdown under the planet time and under the season: "Live", or one fixed choice.
  const sel = (id, label, list, cur) => `<select id="${id}" class="hold${cur !== -1 ? ' on' : ''}" aria-label="${label}: live, or hold one">${cur === -2 ? '<option value="-2" selected>Held</option>' : ''}${list.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${v < 0 ? 'Live' : 'Hold: ' + l}</option>`).join('')}</select>`;
  let loreTimer = 0; const REDUCED_UI = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render() {
    const n = app.areas.filter((a) => seen.includes(a.def.id)).length;
    const order = app.areas.map((a, i) => i).sort((x, y) => (app.areas[y].def.center ? 1 : 0) - (app.areas[x].def.center ? 1 : 0));   // the Webflow island is first; the others keep their order
    $('#menuPass').innerHTML = `<h3>Passport</h3>
      <div id="menuTime">
        <div class="tcell"><svg viewBox="0 0 40 40" width="40" height="40" role="img" aria-label="Clock"><circle cx="20" cy="20" r="18" fill="#fff" stroke="currentColor" stroke-width="1.6"/><path d="M20 4.5v3.5M20 32v3.500M4.5 20h3.5M32 20h3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line id="ppH" x1="20" y1="20" x2="20" y2="11.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><line id="ppM" x1="20" y1="20" x2="20" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="20" cy="20" r="1.8" fill="currentColor"/></svg><div><small tabindex="0" data-tip="${esc(app.timeTip || '')}">Planet time</small><b id="ppTimeT">00:00</b>${sel('ppDaySel', 'Time of day', DAYS, hold.day)}</div></div>
        <div class="tcell"><svg id="ppSeasonI" viewBox="0 0 40 40" width="40" height="40" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Season"></svg><div><small>Season</small><b id="ppSeasonT"></b>${sel('ppSeaSel', 'Season', SEAS, hold.season)}</div></div>
      </div>
      <h3 class="leg areas-h">Unique areas<span>${n} of ${app.areas.length} visited</span></h3>
      <div class="stamps areas">${order.map((i) => { const a = app.areas[i], on = seen.includes(a.def.id); return `<button class="stamp${on ? ' on' : ''}" data-i="${i}" aria-label="${esc(a.name)}, ${on ? 'visited' : 'not visited'}"><span class="badge">${on ? PENT_ON : PENT}</span><span class="nm">${esc(a.name)}</span></button>`; }).join('')}</div>`;
    $('#menuPass').innerHTML += `<h3 class="leg">Webflow lore<span>${lore.length} of ${LORE.length} found</span></h3>
      <div class="stamps legends lore">${LORE.map(([id, name, , , model]) => { const on = lore.includes(id); const pic = on ? legendPicture(app.world, model) : ''; return on ? `<button class="stamp lorest on" data-lore="${id}" aria-label="${esc(name)}, found. Select it to see where it is and to read its story."><span class="badge${pic ? ' pic' : ''}">${pic ? `<img src="${pic}" alt="">` : CHECK}</span><span class="nm">${esc(name)}</span></button>` : `<button class="stamp lorest" data-lore-go="${id}" aria-label="${esc(name)}, not found. Select it to go to the area where it is."><span class="badge">${STAR}</span><span class="nm">${esc(name)}</span></button>`; }).join('')}</div>
      <p class="pphint">Select one to go to its area. Find it there, then select it.</p>`;
    $('#menuPass').innerHTML += `<h3 class="leg">Legends of the sea<span>${legends.length} of ${LEGENDS.length} found</span></h3>
      <div class="stamps legends">${LEGENDS.map(([id, name]) => { const on = legends.includes(id); const pic = on ? legendPicture(app.world, id) : ''; return `<div class="stamp legend${on ? ' on' : ''}" role="img" aria-label="${esc(name)}, ${on ? 'found' : 'not found'}"><span class="badge${pic ? ' pic' : ''}">${pic ? `<img src="${pic}" alt="">` : on ? CHECK : WAVE}</span><span class="nm">${esc(name)}</span></div>`; }).join('')}</div>
      <p class="pphint">Find them in the ocean, then select them.</p>
      <h3 class="leg">Easter eggs<span>${eggs.length} of ${EGGS.length} found</span></h3>
      <div class="stamps eggs">${EGGS.map(([id, name, , , icon]) => (eggs.includes(id) ? `<button class="stamp egg on" data-egg="${id}" aria-label="${esc(name)}, found. Select it to see where it is."><span class="badge">${icon}</span><span class="nm">${esc(name)}</span></button>` : `<div class="stamp egg" role="img" aria-label="An easter egg, not found"><span class="badge">?</span><span class="nm" aria-hidden="true">&nbsp;</span></div>`)).join('')}</div>`;
    // A piece of lore that is not found: its stamp opens the unique area where it is, so the visitor knows where to look.
    el.querySelectorAll('button.lorest[data-lore-go]').forEach((b) => (b.onclick = () => {
      const q = LORE.find((x) => x[0] === b.dataset.loreGo), area = app.areas.find((x) => x.def.id === q[3]);
      close();
      if (app.mode === 'design') app.exitDesign();
      if (app.following) app.stopFollow(true);
      if (area) app.openRegion(area);
    }));
    // A found piece of lore: the camera goes to it, then its story opens.
    el.querySelectorAll('button.lorest[data-lore]').forEach((b) => (b.onclick = () => {
      const q = LORE.find((x) => x[0] === b.dataset.lore);
      close();
      if (app.mode === 'design') app.exitDesign();
      if (app.following) app.stopFollow(); if (app.current) app.closeRegion();
      const area = app.areas.find((x) => x.def.id === q[3]);
      // First the planet turns until the area is in view. Then the camera goes down to the thing and looks at it from the side, from near (the same close view as for a ship or a whale).
      // Then the story opens. When the visitor closes it, the thing is there to look at, and "Back to planet" goes back.
      if (app.showThing) app.showThing(q[2], area ? area.tile : null);
      clearTimeout(loreTimer); let tries = 0;
      const near = () => {
        const c = app.findThing ? app.findThing(q[2]) : null;
        if (c && app.followThing) { app.followThing(c); const f = app.cam && app.cam.focus; if (f && f.max) f.dist = Math.min(f.max, f.dist * 2.1);   // a little more far than for a ship: the visitor sees the thing and the place around it
          loreTimer = setTimeout(() => app.loreOpen(q[0]), REDUCED_UI ? 0 : 1500); }
        else if (tries++ < 10) loreTimer = setTimeout(near, 250);
        else app.loreOpen(q[0]);
      };
      loreTimer = setTimeout(near, REDUCED_UI ? 0 : 900);
    }));
    // A found easter egg: bring the thing that starts it into view, so the visitor can select it again.
    el.querySelectorAll('button.egg').forEach((b) => (b.onclick = () => {
      const e = EGGS.find((q) => q[0] === b.dataset.egg);
      close();
      if (app.mode === 'design') app.exitDesign();
      if (app.following) app.stopFollow(); if (app.current) app.closeRegion();
      const area = e[3] ? app.areas.find((q) => q.def.id === e[3]) : null;
      if (app.showThing) app.showThing(e[2], area ? area.tile : null);   // no zoom: the thing comes to the middle of the view
    }));
    el.querySelectorAll('.stamps.areas button.stamp').forEach((b) => (b.onclick = () => {
      close();
      if (app.mode === 'design') app.exitDesign();
      if (app.following) app.stopFollow(true);
      app.openRegion(app.areas[+b.dataset.i]);
    }));
    const g = $('#goBtn'); if (g) g.hidden = !(app.practice && app.practice.reg);
    // The visitor's saved region: move it, hide it, or delete it. A hidden region: put it on a tile again, or delete it.
    const mine = app.myRegion ? app.myRegion() : 'none', mm = $('#menuMine'), db = $('#designBtn');
    db.hidden = mine === 'hidden'; mm.hidden = mine === 'none';
    mm.innerHTML = mine === 'none' ? '' : '<h3 class="leg">Your region</h3>' + (mine === 'placed' ? '<div class="minerow"><button class="btn small" data-act="move">Move</button><button class="btn small" data-act="hide">Hide</button><button class="btn small" data-act="delete">Delete</button></div>'
      : '<p>Your region is hidden. It is saved, but it has no place on the planet.</p><div class="minerow"><button class="btn primary" data-act="place">Put it on the planet</button><button class="btn small" data-act="delete">Delete</button></div>');
    mm.querySelectorAll('button').forEach((bn) => (bn.onclick = () => {
      const act = bn.dataset.act;
      if (act === 'delete') { askDelete(bn); return; }   // a window asks first
      close();
      if (act === 'hide') app.hideRegion(); else if (act === 'move') app.moveRegion(); else app.placeRegion();
    }));
    $('#ppDaySel').onchange = (e) => { app.holdTime(+e.target.value, null); const n2 = $('#ppDaySel'); if (n2) n2.focus(); };
    $('#ppSeaSel').onchange = (e) => { app.holdTime(null, +e.target.value); const n2 = $('#ppSeaSel'); if (n2) n2.focus(); };
    app.passTime(now.m, now.s);
  }
  // Reset the passport: the stamps of the areas, the legends of the sea, the easter eggs, and the Webflow lore. The first click asks; a second click in 4 seconds does it.
  const rb = $('#resetBtn'); let armed = 0;
  const disarm = () => { clearTimeout(armed); armed = 0; rb.textContent = 'Reset passport'; rb.classList.remove('warn'); };
  rb.onclick = () => {
    if (!armed) { rb.textContent = 'Select again to reset'; rb.classList.add('warn'); armed = setTimeout(disarm, 4000); $('#live').textContent = 'Select again to reset your passport.'; return; }
    disarm();
    seen = []; legends = []; eggs = []; lore = [];
    try { for (const k of [KEY, KEY2, KEY3, KEY4]) localStorage.removeItem(k); } catch (e) { /* nothing was kept */ }
    render(); toast('Passport reset<small>All stamps, legends, and easter eggs are empty again</small>'); $('#live').textContent = 'Your passport is empty again.';
  };
  // The menu button opens the full menu. If only the list of unique areas is open (see app.openPassport), the button shows the full menu.
  btn.onclick = () => {
    if (!el.hidden && el.classList.contains('only-areas')) { el.classList.remove('only-areas'); el.scrollTop = 0; return; }
    el.classList.remove('only-areas'); el.hidden = !el.hidden; btn.setAttribute('aria-expanded', String(!el.hidden)); if (!el.hidden) render();
  };
  // The link over the title of a unique area: open only the list of the 12 unique areas, with no other part of the menu, so the visitor can go to a different area fast.
  // The stamp of the area that is open now gets the focus, so the next one is one key press away.
  app.openPassport = () => {
    el.classList.add('only-areas');
    if (el.hidden) { el.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
    render(); el.scrollTop = 0;
    const cur = app.current && app.current.kind === 'area' ? el.querySelector(`.stamps.areas button.stamp[data-i="${app.areas.indexOf(app.current)}"]`) : null;
    const to = cur || el.querySelector('.stamps.areas button.stamp'); if (to) to.focus({ preventScroll: true });
    return true;
  };
  $('#designBtn').addEventListener('click', close);
  $('#goBtn').onclick = () => { close(); if (app.practice && app.practice.reg) { if (app.following) app.stopFollow(true); app.openRegion(app.practice.reg); } };
  $('#c').addEventListener('pointerdown', close);

  // An area gets its stamp when the visitor opens it.
  const open0 = app.openRegion;
  app.openRegion = (reg, opts) => {
    const r = open0(reg, opts);
    if (reg && reg.kind === 'area' && app.current === reg && !seen.includes(reg.def.id)) { seen.push(reg.def.id); save(); if (!el.hidden) render(); }
    return r;
  };
  app.passport = () => seen.slice();
  render();
}
