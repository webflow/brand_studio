# Design builds worlds (prototype)

A prototype from the Webflow design team. One shared planet of 92 tiles. Each person designs one region. The 12 pentagon tiles are unique areas.

The file for a site is one script: `dist/design-builds-worlds.min.js`. It needs a `<canvas>` on the page.

## Use it on a Webflow page

1. Put a `<canvas>` on the page. Give it the custom attribute `data-design-builds-worlds`. Give it a size with a class (for example: 100% wide, 100vh high).
2. Add the script in the custom code of the page, before `</body>`. Use the hash of your commit:

```html
<!-- [Component] Design builds worlds -->
<script src="https://cdn.jsdelivr.net/gh/webflow/brand_studio@COMMIT/design-team/design-builds-worlds/dist/design-builds-worlds.min.js"></script>
```

If you cannot add an attribute to the canvas, name the canvas on the script tag:

```html
<script src="...design-builds-worlds.min.js" data-target=".section canvas"></script>
```

### What the script does

- It puts a frame (an `<iframe>`) where the canvas is. The frame gets the id, the classes, the inline style, and the width and height attributes of the canvas, so the size from the page still applies.
- A canvas with no size (300 x 150) becomes 100% wide and as high as the window (760 px at most).
- The planet runs inside the frame. The styles and scripts of the page cannot change it, and it cannot change the page.
- The backdrop is clear: the page shows behind the planet. There is no title, time, or season in the corner (the passport in the menu has the time and the season).
- It starts when the canvas comes near the view, and it stops drawing while it is out of view.
- The passport and the visitor's region stay in the storage of the browser, for the address of the page.

### Options (attributes of the canvas)

| Attribute | Effect |
|---|---|
| `data-tier="low"`, `medium`, `high`, `max` | Sets the quality level. Default: it measures the frame rate, then picks one. |
| `data-wheel="zoom"` or `page` | What the mouse wheel does. Default: `page` when the page scrolls (zoom needs Ctrl or the Command key, or a pinch), `zoom` when the page does not scroll. |
| `data-bg="white"` | A white backdrop. Default: the backdrop is clear, so the page shows behind the planet. Tiles that are not in focus fade to the color of the page. |
| `data-font-url="https://.../font.woff2"` | A font file for the text. Default: the WF Visual Sans file that the page loaded, if there is one. If not, a system font. |

From your own code: `DesignBuildsWorlds.mount(canvasOrSelector, { tier, wheel, fontUrl })`.

### Limits

- On a page that scrolls, a finger that moves up or down on the planet scrolls the page. A move to the side turns the planet. This is not tested on a real phone.
- This is a prototype. Nothing is saved on a server.

## Build

```bash
npm install
```

```bash
npm run build
```

The build makes `dist/design-builds-worlds.min.js`, and `dist/design-builds-worlds.html` (the full page, for tests on your own computer; it is not kept in this repository).

## Font

The font file is not in this repository. The script has no font inside it. If you have the file, put it at `assets/fonts/WFVisualSans-subset.woff2`: then the full page for local tests has the font inline. This folder is in `.gitignore`.

## Test

The tests use the Google Chrome app that is installed on a Mac (`/Applications/Google Chrome.app`). They do not download a browser.

```bash
npm test
```

```bash
npm run test:embed
```

```bash
npm run test:webkit
```

`npm run test:embed` loads `tools/embed-test.html`: a host page with a canvas. `npm run test:webkit` needs the WebKit browser of Playwright (`npx playwright install webkit`).

## Folders

| Path | Contents |
|---|---|
| `src/` | The source. `main.js` is the start of the planet. `embed.js` is the script for a host page. `body.html` and `ui.css` are the page inside the frame. |
| `tools/` | Tests, pictures, and measurements. |
| `dist/` | The built script. |
