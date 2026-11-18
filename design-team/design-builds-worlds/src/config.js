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
// In an embed: does the page around the frame scroll? Then the mouse wheel and a finger that moves up or down are for the page.
export const hostScrolls = () => {
  if (!EMBED) return false;
  const w = QUERY.get('wheel'); if (w === 'zoom') return false; if (w === 'page') return true;
  try { const d = window.parent.document.scrollingElement; return d.scrollHeight > window.parent.innerHeight + 4; } catch (e) { return false; }
};
export const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
