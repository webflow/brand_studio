// Contact sheet: shoot a set without the panel, then tile the images into one picture.
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const [kind = 'regions', extra = '', cols = '5'] = process.argv.slice(2);
const n = kind === 'areas' ? 12 : 20;
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const imgs = [], errs = [];
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() !== 'log' && m.type() !== 'info' && m.type() !== 'debug') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(e.message));
await page.setViewport({ width: 520, height: 400, deviceScaleFactor: 1 });
for (let i = 0; i < n; i++) {
  await page.goto(`${file}?tier=high&nopanel=1&open=${kind === 'areas' ? 'a' + i : i + 1}&${extra}`);
  await new Promise((r) => setTimeout(r, 650));
  imgs.push(await page.screenshot({ encoding: 'base64' }));
}
const html = `<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;background:#888">${imgs.map((b, i) => `<div style="position:relative"><img src="data:image/png;base64,${b}" style="width:100%;display:block"><b style="position:absolute;right:4px;bottom:2px;font:12px monospace;background:#fff">${kind === 'areas' ? 'a' + i : i + 1}</b></div>`).join('')}</body>`;
const p2 = await browser.newPage();
await p2.setViewport({ width: +cols * 360, height: Math.ceil(n / +cols) * 278, deviceScaleFactor: 1 });
await p2.setContent(html);
const out = join(root, 'checkpoints', `sheet-${kind}${extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '_') : ''}.png`);
await p2.screenshot({ path: out });
console.log(out, errs.length ? 'ERRORS: ' + [...new Set(errs)].join(' | ') : 'no errors');
await browser.close();
