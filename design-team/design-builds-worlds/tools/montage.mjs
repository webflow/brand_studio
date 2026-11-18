// Tile a list of PNG files from checkpoints/ into one picture. Usage: node tools/montage.mjs out.png cols file1 file2 ...
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'checkpoints');
const [out, cols, ...files] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--allow-file-access-from-files'] });
const p = await browser.newPage(); const w = 640, h = 400;
await p.setViewport({ width: +cols * w, height: Math.ceil(files.length / +cols) * h });
await p.goto(pathToFileURL(join(root, files[0])).href);
await p.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;background:#777">${files.map((f) => `<div style="position:relative"><img src="${pathToFileURL(join(root, f)).href}" style="width:100%;display:block"><b style="position:absolute;left:4px;bottom:2px;font:13px monospace;background:#fff">${f.replace('.png', '')}</b></div>`).join('')}</body>`);
await new Promise((r) => setTimeout(r, 800));
await p.screenshot({ path: join(root, out) }); await browser.close(); console.log(join(root, out));
