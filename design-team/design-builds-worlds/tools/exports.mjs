// Save sample exported photos (the real export path) to checkpoints/.
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(join(root, 'dist', 'design-builds-worlds.html')).href;
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
await page.goto(file + '?tier=high&t=0.3'); await new Promise((r) => setTimeout(r, 1500));
const jobs = [[2, 0, 'golden', '1', 'export-16x9-farro-golden-summer'], [4, 1, 'night', 'current', 'export-9x16-cobalt-night'], [0, 2, 'noon', '0', 'export-4x5-mora-noon-spring'], ['a6', 0, 'noon', 'current', 'export-16x9-webflow-island-noon'], ['a7', 2, 'golden', '3', 'export-4x5-high-peak-winter'], [2, 3, 'golden', '1', 'export-planet-farro']];
for (const [ri, si, time, season, name] of jobs) {
  const url = await page.evaluate((ri, si, time, season) => { const a = window.__dbw; const reg = typeof ri === 'string' ? a.areas[+ri.slice(1)] : a.samples[ri]; return a.photoCanvas(reg, si, time, season).toDataURL('image/png'); }, ri, si, time, season);
  writeFileSync(join(root, 'checkpoints', name + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log(name);
}
await browser.close();
