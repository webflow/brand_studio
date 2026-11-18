// The embed script. A page (for example a Webflow page) has a <canvas>, and loads this one file. The planet takes the place of the canvas.
//
// How it works: the script puts a frame (an <iframe>) where the canvas is. The frame gets the id, the classes, the inline style, and the
// width and height attributes of the canvas, so the size that the page gives to the canvas still applies. The prototype runs inside the
// frame. So the styles and the scripts of the page cannot change the prototype, and the prototype cannot change the page.
// The frame has the same origin as the page, so the passport and the visitor's region stay in the storage of the browser.
//
// Use:
//   <canvas data-design-builds-worlds></canvas>            (or: <canvas id="design-builds-worlds"></canvas>)
//   <script src=".../design-builds-worlds.min.js"></script>
// Options, as attributes of the canvas:
//   data-tier="low | medium | high | max"   the quality level (default: it measures, then picks one)
//   data-wheel="zoom | page"                what the mouse wheel does (default: "page" when the page scrolls, "zoom" when it does not)
//   data-bg="white"                         a white backdrop (default: clear, so the page shows behind the planet)
//   data-inset="48px"                       room at the top and the bottom: the planet stays that far from the edges, and the menu button moves down
//                                           by the same amount. Any CSS length of the page works, for example var(--my-section-spacing)
//   data-inset-mobile="24px"                the same, for a narrow window (default width: 767px or less; change it with data-mobile-width="478")
//   data-align-right=".container .btn"      a CSS selector of an element of the page. The menu button and the passport line up with the right edge of that element
//                                           (it is measured again when the window changes size)
//   data-font-url="https://.../font.woff2"  a font file for the text (default: the WF Visual Sans file that the page loaded, if there is one; if not, a system font)
// The same options also work on the script tag. And on the script tag: data-target="a CSS selector for the canvas".
// Or, from your own code: DesignBuildsWorlds.mount(canvasOrSelector, { tier, wheel, bg, inset, insetMobile, mobileWidth, alignRight, fontUrl }).
const HTML = __DBW_HTML__;
const SCRIPT = document.currentScript;
const QUERY_OPTIONS = ['tier', 'wheel', 'bg', 't', 'season', 'samples'];

// The frame does not get the fonts of the page. If the page already loaded a WF Visual Sans file, the frame uses the same file (it is in the cache).
function siteFont() {
  try { return performance.getEntriesByType('resource').map((e) => e.name).find((n) => /visual[^/]*sans[^/]*\.woff2/i.test(n)) || undefined; } catch (e) { return undefined; }
}

// The color of the page behind an element: the first background color that is not clear, from the element up. The result is 'rrggbb'.
function pageColor(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(getComputedStyle(n).backgroundColor);
    if (m && (m[4] === undefined || +m[4] > 0.5)) return [m[1], m[2], m[3]].map((v) => Math.round(+v).toString(16).padStart(2, '0')).join('');
  }
  return 'ffffff';
}

function mount(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el || !el.parentNode) return null;
  const frame = document.createElement('iframe');
  for (const a of ['id', 'class', 'style', 'width', 'height']) if (el.hasAttribute(a)) frame.setAttribute(a, el.getAttribute(a));
  frame.title = el.getAttribute('aria-label') || 'Design builds worlds: a planet that you can turn and explore';
  frame.setAttribute('allow', 'clipboard-write');
  frame.style.border = '0';
  if (getComputedStyle(el).display === 'inline') frame.style.display = 'block';
  const q = new URLSearchParams();
  const opt = (k) => options[k] ?? el.dataset[k] ?? (SCRIPT ? SCRIPT.dataset[k] : undefined);   // an option: from the code, from the canvas, or from the script tag
  for (const k of QUERY_OPTIONS) { const v = opt(k); if (v != null && v !== '') q.set(k, v); }
  // The inset is a CSS length of the page (it can be a variable of the page). Measure it in pixels, at the place of the canvas.
  const insetCss = opt('inset'), insetMobile = opt('insetMobile'), mobileWidth = +opt('mobileWidth') || 767, alignSel = opt('alignRight'), host = el.parentNode;
  const lengthPx = (css) => { if (!css) return 0; const p = document.createElement('div'); p.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:' + css; host.appendChild(p); const v = p.getBoundingClientRect().height; p.remove(); return Math.round(v * 100) / 100; };
  const insetPx = () => lengthPx(insetMobile && window.matchMedia('(max-width:' + mobileWidth + 'px)').matches ? insetMobile : insetCss);
  // How far the right edge of the element that the page named is from the right edge of the frame. 0 if there is no such element, or it is to the right of the frame.
  const rightPx = (fr) => { if (!alignSel) return 0; let t = null; try { t = document.querySelector(alignSel); } catch (e) { /* not a selector */ } if (!t) return 0; const a = t.getBoundingClientRect(), b = (fr || el).getBoundingClientRect(); return Math.max(0, Math.round((b.right - a.right) * 100) / 100); };
  if (insetCss || insetMobile) q.set('inset', insetPx());
  if (alignSel) q.set('insetRight', rightPx());
  q.set('bgcolor', pageColor(el.parentElement));
  if (q.get('bg') !== 'white') { frame.style.background = 'transparent'; frame.style.colorScheme = 'light'; }   // colorScheme: a browser gives a frame a solid backdrop if the page is in the dark scheme and the frame is not
  const fontUrl = opt('fontUrl') ?? siteFont();
  const head = (fontUrl ? `<style>@font-face{font-family:"WF Visual Sans";src:url(${JSON.stringify(new URL(fontUrl, location.href).href)}) format("woff2");font-weight:100 900;font-style:normal;font-display:swap}</style>` : '')
    + `<style>html{background:${q.get('bg') === 'white' ? '#fff' : 'transparent'}!important}</style>`
    + `<script>window.__DBW_EMBED=1;window.__DBW_QUERY=${JSON.stringify(q.toString())}<\/script>`;
  frame.srcdoc = HTML.replace('<head>', () => '<head>' + head);
  el.replaceWith(frame);
  // A canvas with no size from the page is 300 x 150. That is too small for the planet: give the frame a useful size.
  const r = frame.getBoundingClientRect(), bare = Math.round(r.width) === 300 && Math.round(r.height) === 150;   // bare: the size of a canvas that the page gave no size
  if (bare || r.width < 200) frame.style.width = '100%';
  if (bare || r.height < 200) frame.style.height = 'min(100vh, 760px)';
  // The length can change with the size of the window (a clamp, a breakpoint), and the element can move: measure again.
  const apply = () => { try { if (frame.contentWindow && frame.contentWindow.__dbwInset) frame.contentWindow.__dbwInset(insetPx(), alignSel ? rightPx(frame) : undefined); } catch (e) { /* the frame is not ready */ } };
  if (insetCss || insetMobile || alignSel) { window.addEventListener('resize', apply); frame.addEventListener('load', apply); setTimeout(apply, 1200); }   // the last one: the page can change its layout when its fonts load
  // Stop the drawing while the frame is not in view.
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { try { if (frame.contentWindow) frame.contentWindow.__DBW_PAUSED = !es[es.length - 1].isIntersecting; } catch (e) { /* the frame is not ready */ } }, { rootMargin: '120px' }).observe(frame);
  return frame;
}

// Find the canvas, and start when it comes near the view (the start takes a moment of work, so a canvas far down the page waits).
function auto() {
  const sel = (SCRIPT && SCRIPT.dataset.target) || 'canvas[data-design-builds-worlds], canvas#design-builds-worlds';
  const els = document.querySelectorAll(sel);
  if (!els.length) { console.warn('[design-builds-worlds] No canvas found. Add the attribute data-design-builds-worlds to a <canvas>, or set data-target on the script tag.'); return; }
  els.forEach((el) => {
    if (!('IntersectionObserver' in window)) { mount(el); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); mount(el); } }, { rootMargin: '600px' });
    io.observe(el);
  });
}
window.DesignBuildsWorlds = { mount };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
