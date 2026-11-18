// Build: bundle src/main.js with esbuild, then inline JS + CSS into one HTML file.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist', 'design-builds-worlds.html');

const res = await build({
  entryPoints: [join(root, 'src', 'main.js')],
  bundle: true,
  minify: true,
  treeShaking: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16)) },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// WF Visual Sans (from the Blueprint design system) goes into the file as a data URI: no network request.
// The subset has the Latin characters and the weights 400 to 700. The font file is optional: it is a Webflow brand font, and it is not kept
// in a public repository. With no font file, the build has no inline font: the page uses the font of the site it is on, or a system font.
const fontPath = join(root, 'assets', 'fonts', 'WFVisualSans-subset.woff2');
const font = existsSync(fontPath) ? readFileSync(fontPath).toString('base64') : '';
if (!font) console.log('note: no font file at assets/fonts/WFVisualSans-subset.woff2. This build has no inline font.');
const fontFace = font ? `@font-face{font-family:"WF Visual Sans";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 700;font-style:normal;font-display:swap}\n` : '';
const cssBase = readFileSync(join(root, 'src', 'ui.css'), 'utf8').replace(/\s*\n\s*/g, '\n');
const body = readFileSync(join(root, 'src', 'body.html'), 'utf8');

const page = (css) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="robots" content="noindex">
<title>Design builds worlds (prototype)</title>
<style>${css}</style>
</head>
<body>
${body}
<script>${js}</script>
</body>
</html>
`;
const html = page(fontFace + cssBase);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
// The embed script: one JavaScript file for a page that has a <canvas> (for example a Webflow page). See src/embed.js.
// The page above is inside it, always with no inline font (the script can be in a public repository; the host page gives the font).
const emb = await build({
  entryPoints: [join(root, 'src', 'embed.js')], bundle: true, minify: true, format: 'iife', target: ['es2020'], write: false, legalComments: 'none',
  define: { __DBW_HTML__: JSON.stringify(page(cssBase)) },
});
const embOut = out.replace('.html', '.min.js'), embJs = emb.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync(embOut, embJs);
console.log(`built ${embOut}  ${(Buffer.byteLength(embJs) / 1024).toFixed(0)} KB`);
const kb = Buffer.byteLength(html) / 1024;
console.log(`built ${out}  ${kb.toFixed(0)} KB  (${(kb / 1024).toFixed(2)} MB of 2.00 MB limit)`);
if (kb > 2000) { console.error('FILE IS OVER THE 2 MB LIMIT'); process.exit(1); }
