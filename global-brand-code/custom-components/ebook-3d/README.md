# ebook-3d

A 3D soft-cover book for a Webflow page. It tilts with the cursor and floats over a soft floor shadow. It uses the cover image that the page already shows.

The page always ships a normal `<img>`. This script only upgrades it. If anything is unsupported or fails, the static image stays.

- File: `ebook-3d.min.js` (Three.js is bundled in; about 105 KB brotli)
- Needs WebGL2 (iOS 15 or newer, current Chrome, Firefox, Edge, Safari)
- One book per page

## Use it

**1. Markup.** Put one element with `data-ebook-3d` on the page. Put the cover `<img>` inside it. `data-spine-color` is optional (any CSS color; hex with or without the `#`, for example `#5FED75` or `5FED75`). If it is empty, the script uses the average color of the cover's left edge.

`data-finish` is optional. It sets the cover material: `paper` (default, satin paper), `cloth` (fine woven book cloth) or `leather` (pebbled leather grain). The value is not case-sensitive, and `fabric`, `linen`, `buckram`, `pebble` and `leatherette` also work. An empty or unknown value uses paper. In Webflow, bind it to a CMS option field.

```html
<div class="ebook-stage" data-ebook-3d data-spine-color="#1a5cff" data-finish="paper">
  <img src="COVER.jpg" alt="Cover of the ebook" width="850" height="1100" fetchpriority="high">
</div>
```

The book takes the cover's own shape: any width/height ratio from 0.5 (tall) to 1.6 (wide). A cover outside that range is center-cropped to the nearest limit. Use at least 1700 px on the long side for a sharp texture. An SVG cover is drawn at the full texture size, so it stays sharp at any natural size.

**2. CSS.** Put this in the page `<head>`. It sizes the stage and sets the static image at the same angle and size as the 3D book, so the swap does not jump. The image sits in a 74% × 72% box with `object-fit: contain`, so any cover ratio fits the way the 3D book does.

```css
.ebook-stage { position: relative; width: 100%; aspect-ratio: 4 / 5; max-height: 92vh; touch-action: pan-y; -webkit-user-select: none; user-select: none; }
@media (max-width: 800px) { .ebook-stage { max-height: 62vh; } }
.ebook-stage img { position: absolute; left: 50%; top: 50%; width: 74%; height: 72%; max-width: none; object-fit: contain; pointer-events: none;
  transform: translate(-50%, -50%) perspective(1000px) rotateY(-0.06rad) rotateX(0.06rad); }
```

**Layout.** The stage is 100% of its parent's width. If the parent is a grid column that stays narrow on small screens (for example a one-third column), the book shrinks with it. Make that column full width on tablet and mobile in the Designer. As a fallback, add this to the head CSS:

```css
@media (max-width: 800px) { div:has(> .ebook-stage) { max-width: 100% !important; flex: 0 0 100% !important; } }
```

**3. Script.** Load it from jsDelivr, pinned to a commit, with an integrity hash. Never use a branch name.

```html
<script src="https://cdn.jsdelivr.net/gh/webflow/brand_studio@COMMIT_SHA/global-brand-code/custom-components/ebook-3d/ebook-3d.min.js"
        integrity="sha384-HASH" crossorigin="anonymous" defer></script>
```

Replace `COMMIT_SHA` with the commit that contains this file. Replace `sha384-HASH` with the output of `npm run sri`.

## Behavior

The book rests almost straight on and turns toward the cursor (about 29 degrees at the window edge). On touch screens, dragging a finger over the book turns it. The key light is at the top left, and it dims as the book turns toward it.

The lighting adapts to the cover: covers with large white areas get brighter, more even light, and covers with large black areas get less reflection. The paper grain is sized for the book's on-screen size.

The script starts after the page has loaded and the browser is idle, so it does not delay the largest-contentful-paint image. It pauses when the book is off screen or the tab is hidden.

The static image stays when: the connection is 2G or Save-Data is on, WebGL2 is missing, the cover cannot be read by WebGL, or the WebGL context is lost. Weak devices get a flat CSS shadow. Reduced motion gets one still frame.

The stage gets a `data-ebook-3d-state` attribute: `loading`, `ready`, `fallback-save-data`, `fallback-no-webgl`, `fallback-image`, `fallback-context-lost` or `fallback-error`. It also fires `ebook3d:ready` and `ebook3d:fallback` events. Add `?ebook3d=stats` to a page URL for a live badge with frame rate and timing.

## Build

```bash
npm ci --ignore-scripts
npm run build     # writes ebook-3d.min.js
npm run sri       # prints the integrity hash for the script tag
```

Versions are pinned (`three` 0.170.0, `esbuild` 0.28.2). The build is reproducible: the same source and lockfile give the same file. Commit the built `ebook-3d.min.js` together with the source change, because the CDN serves the file from the repo. After any rebuild, use the new commit SHA and a new hash in the script tag.
