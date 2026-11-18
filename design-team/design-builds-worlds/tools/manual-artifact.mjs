// Region Manual review page: the real manual HTML of two regions (a sample region and the Webflow island), with a picture of each.
// Output: catalog/region-manual-artifact.html (a page fragment for a Claude artifact) and catalog/region-manual.html (a normal page).
// Usage: node tools/manual-artifact.mjs
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--allow-file-access-from-files'] });
const page = await browser.newPage(); const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const items = [];
for (const [code, q, what] of [['M1', 'open=3', 'A sample region'], ['M2', 'open=a6', 'A unique area (the Webflow island)']]) {
  await page.goto(`${file}?${q}&light=studio&season=0.3&tier=high`); await sleep(3200);
  const html = await page.evaluate(() => { const p = document.querySelector('#panel'); p.querySelectorAll('button').forEach((b) => b.setAttribute('tabindex', '-1')); return p.innerHTML; });
  const name = await page.evaluate(() => window.__dbw.current.name);
  const shot = 'data:image/jpeg;base64,' + await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1000, height: 900 } });
  items.push({ code, what, name, html, shot });
}
await browser.close();
// The manual keeps its own styles. Its panel selector (#panel) becomes a class, so two manuals can be on one page.
const css = readFileSync(join(root, 'src', 'ui.css'), 'utf8').replace(/#panel/g, '.pnl').replace(/html,body\{[^}]*\}/, '').replace(/body\{touch-action[^}]*\}/, '');
const font = readFileSync(join(root, 'assets', 'fonts', 'WFVisualSansVF.woff2')).toString('base64');
const DARK = '--pg:#141414;--pfg:#f2f2f2;--pmut:#a8a8a8;--pline:#333;color-scheme:dark';
const style = `<style>
@font-face{font-family:"WF Visual Sans";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-style:normal;font-display:swap}
${css}
/* The review page around the manuals. The manuals keep the light look of the prototype in both themes. */
:root{--pg:#f4f4f2;--pfg:#080808;--pmut:#5a5a5a;--pline:#d8d8d8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
body{margin:0;background:var(--pg);color:var(--pfg);font:15px/1.45 "WF Visual Sans",system-ui,sans-serif;overflow:auto;height:auto;user-select:text;-webkit-user-select:text;touch-action:auto}
.rv{max-width:1500px;margin:0 auto;padding-block:28px 60px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.rv>h1{font-size:28px;font-weight:600;margin:0 0 6px;text-wrap:balance}.rv>p{margin:0 0 10px;color:var(--pmut);max-width:70ch}
.rv .it{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,440px);gap:20px;align-items:start;margin-top:30px;border-top:2px solid var(--pfg);padding-top:14px}
.rv .it>header{grid-column:1/-1;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.rv .it>header b{font:700 13px/1 ui-monospace,Menlo,monospace;background:var(--pfg);color:var(--pg);padding:5px 7px}
.rv .it>header h2{font-size:18px;font-weight:600;margin:0}.rv .it>header span{color:var(--pmut);font-size:13px}
.rv .it img{display:block;width:100%;height:auto;border:1px solid var(--pline);border-radius:8px;position:sticky;top:12px}
.rv .pnl{position:relative;inset:auto;top:auto;right:auto;bottom:auto;width:100%;max-width:440px;height:auto;color:#080808;border-radius:12px;overflow:hidden;z-index:0}
.rv .pnl .mbody{overflow:visible;flex:none}
.rv .pnl button{pointer-events:none}
@media (max-width:860px){.rv .it{grid-template-columns:minmax(0,1fr)}.rv .it img{position:static}}
</style>`;
const body = `<div class="rv">
<h1>Region Manual</h1>
<p>Design builds worlds prototype. This page shows the Region Manual as it is in the prototype, for two kinds of tile. The text, the palette, the diagrams, and the buttons are the real ones. The buttons do nothing on this page.</p>
<p>To comment, select a part of a manual, or use the code and the section name, for example "M1, Palette: fewer swatches". Point at a color in a palette to see its name.</p>
${items.map((it) => `<section class="it" id="${it.code}"><header><b>${it.code}</b><h2>${it.name}</h2><span>${it.what}</span></header><img src="${it.shot}" alt="The region ${it.name} in the prototype"><div class="pnl manual">${it.html}</div></section>`).join('\n')}
</div>`;
mkdirSync(join(root, 'catalog'), { recursive: true });
writeFileSync(join(root, 'catalog', 'region-manual-artifact.html'), `<title>Worlds Region Manual</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${style}\n${body}\n`);
writeFileSync(join(root, 'catalog', 'region-manual.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Worlds Region Manual</title>${style}</head><body>${body}</body></html>`);
console.log(items.map((i) => `${i.code} ${i.name} (${Math.round(i.html.length / 1024)} KB of HTML)`).join(' | '), errs.length ? 'ERRORS ' + errs.join('|') : 'no errors');
