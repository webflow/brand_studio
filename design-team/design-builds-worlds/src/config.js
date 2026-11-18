// All tunable values live here.
export const CONFIG = {
  sampleCount: 20,
  light: {
    lockToCamera: false, // false = real sun from the clock. true = studio light fixed to the camera.
    azimuth: 0,          // degrees. Sun mode: offset along the day. Studio mode: angle from the camera.
    height: 10,          // degrees. Sun mode: axis tilt (declination). Studio mode: height above the view.
    intensity: 0.8,
  },
  shadows: { strength: 0.92, softness: 3.0 },
  ambient: { amount: 0.3 },
  texture: { grain: 0.015, detail: 1 },
  camera: { fov: 35, autoRotate: 0.05, zoomMin: 1.35, zoomMax: 4.2, tilt: 14 },
  time: {
    dayMinutes: 5, yearHours: 80 / 60,   // one day = 5 minutes. One year = 80 minutes, so each of the four seasons is 20 minutes.
    pauseDay: false, dayPhase: 0.3,
    pauseSeason: false, seasonPhase: 0.3, // 0..1 over the year. 0 = start of spring
  },
  night: { windowTone: 2.4 },
  focus: { dim: 0.3, nightLight: 1 },
  // Each cheap dynamic has its own switch.
  dynamics: { aurora: true, tides: true, smoke: true, fog: true, clouds: true, weather: true },
};

export function deepMerge(dst, src) {
  for (const k in src) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') deepMerge(dst[k], v);
    else if (k in dst && typeof dst[k] === typeof v) dst[k] = v;
  }
  return dst;
}

// The embed script (src/embed.js) runs this page inside a frame on another page. It sets these two values before the page starts.
export const EMBED = !!window.__DBW_EMBED;
export const QUERY = new URLSearchParams(window.__DBW_QUERY || location.search);
// The backdrop is clear: the planet has no white rectangle behind it (the option bg=white gives the white backdrop again).
// PAGE_BG = the color behind the planet. In an embed, the embed script reads it from the page around the frame.
// On the full page it is Webflow black, or the option bgcolor=rrggbb. Tiles that are not in focus fade to this color, and the wireframe view uses it.
// How much of the planet is in sunlight. A real planet has 0.5. This one has more, as a style: the line between day and night is moved to the night side.
// The part of a sphere where dot(up, sun) > c is (1 - c) / 2 of its surface. The day line was at c = 0.02, so DAY_SHIFT is added to the dot in every shader and in world.dayAt.
export const DAY_SIDE = 0.7, DAY_SHIFT = 2 * DAY_SIDE - 1 + 0.02, DAY_GLSL = DAY_SHIFT.toFixed(3), DAY_LIFT = (DAY_SHIFT + 0.1).toFixed(3);   // DAY_LIFT: how much higher the light of a low sun comes from
export const CLEAR = QUERY.get('bg') !== 'white';
const bgc = QUERY.get('bgcolor') || '';
export const HOST_BG = !CLEAR ? '#FFFFFF' : /^[0-9a-f]{6}$/i.test(bgc) ? '#' + bgc.toUpperCase() : EMBED ? '#FFFFFF' : '#080808';
// A dark color behind the planet: text that lies on the backdrop is light, and the planet has no glow of air around it (on a dark page the glow is a bright halo).
export const isDark = (hex) => { const v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255 < 0.45; };
export const HOST_DARK = isDark(HOST_BG);
// In an embed: does the page around the frame scroll? Then the mouse wheel and a finger that moves up or down are for the page.
export const hostScrolls = () => {
  if (!EMBED) return false;
  const w = QUERY.get('wheel'); if (w === 'zoom') return false; if (w === 'page') return true;
  try { const d = window.parent.document.scrollingElement; return d.scrollHeight > window.parent.innerHeight + 4; } catch (e) { return false; }
};
export const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
