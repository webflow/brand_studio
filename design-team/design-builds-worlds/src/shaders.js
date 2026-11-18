// GLSL for the look: a world of small cubes with smooth light from the sun and the sky, see-through water, and small lights at night.
// Color attribute aPal = (palette row, tone * 20, kind, param). The tone is a place on the row's own ramp.
//
// kinds: 0 normal, 1 window (warm light at night), 2 glow (own color at night), 3 leaf (season scale), 4 blossom (spring only),
// 5 tile water, 6 flat (unlit), 7 snow piece (winter only), 9 ocean, 11 leaf that stays, 13 land column (colored top, earth and stone below),
// 14 seabed, 15 fallen leaf (autumn only; param > 0 = it falls)
// Instanced aAux = (taper x, taper z, season sense, lod + 4 * pattern).
// patterns: 1 roof courses, 2 bricks, 3 planks, 5 stone courses, 6 window frame
import { ROWS, COLS, ROW } from './palette.js';

export const VERT = /* glsl */`
attribute vec4 aPal;
attribute vec4 aAux;
#ifndef USE_INSTANCING
attribute float aH;
#endif
uniform vec4 uSeasonW;
uniform float uLod;
uniform float uTime;
uniform mat4 uShadowMat;
uniform vec4 uWave;   // one large wave on the ocean: xyz = where it starts (a direction), w = its age in seconds (under 0 = no wave)
varying float vWv, vWx;
uniform float uCut, uCutR, uCutXR; uniform mat4 uCutM; uniform vec3 uCutE[6]; uniform vec3 uCutX1, uCutX3;   // cut-out photo: keep only what stands on one tile
bool cutOff(vec3 ow) { vec3 o = (uCutM * vec4(ow, 1.0)).xyz; bool off = o.y > 8.0 || o.y < -4.0 || dot(o.xz, o.xz) > uCutR * uCutR; for (int i = 0; i < 6; i++) { if (uCutE[i].x * o.x + uCutE[i].y * o.z + uCutE[i].z < -0.004) off = true; } vec2 xb = vec2(dot(ow, uCutX1), dot(ow, uCutX3)); if (uCutXR > 0.0 && dot(xb, xb) < uCutXR * uCutXR) off = true; return off; }
varying vec3 vN;
varying vec3 vW;
varying vec4 vPal;
varying vec4 vAux;
varying float vH;
varying float vInst;
varying vec3 vL;
varying vec3 vU;
varying vec3 vS;
varying float vPat;
attribute float aSlab;
void main() {
  vec3 p = position;
  vec3 n = normal;
  vPal = aPal; vAux = aAux; vWv = 0.0; vWx = 0.0;
  float kind = aPal.z;
  vH = 0.0;
  vInst = 0.0;
  vPat = 0.0;
  vU = position;
  vS = vec3(1.0);
  #ifdef USE_INSTANCING
    vInst = 1.0;
    vec2 tap = aAux.xy / 255.0;
    p.xz *= (1.0 - tap * aSlab);   // blocks: the taper goes in steps
    float s = 1.0;
    if (kind > 2.5 && kind < 3.5) s = dot(uSeasonW, vec4(1.1, 1.0, 0.7, 0.0));
    else if (kind > 10.5 && kind < 11.5) s = dot(uSeasonW, vec4(1.06, 1.0, 0.92, 0.85));
    else if (kind > 3.5 && kind < 4.5) s = uSeasonW.x;
    else if (kind > 6.5 && kind < 7.5) s = uSeasonW.w;
    else if (kind > 14.5 && kind < 15.5) s = uSeasonW.z;
    vPat = floor(aAux.w / 4.0);
    float lod = aAux.w - vPat * 4.0;
    if (lod > 1.5) s *= smoothstep(0.5, 0.74, uLod);
    else if (lod > 0.5) s *= smoothstep(0.1, 0.34, uLod);
    if (uCut > 0.5 && cutOff((modelMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 1.0)).xyz)) s = 0.0;   // the top of the shape: the base of a land column is deep, and can be under the next tile
    p *= s;
    mat4 im = instanceMatrix;
    vec4 wp = modelMatrix * im * vec4(p, 1.0);
    if (kind > 14.5 && kind < 15.5 && aPal.w > 0.5) {   // an autumn leaf in the air: it goes down, then it starts again at the top
      float fl = fract(uTime * 0.07 + aPal.w * 0.037); vec3 upw = normalize(wp.xyz);
      wp.xyz -= upw * fl * (aPal.w / 255.0) * 0.02; wp.xyz += normalize(cross(upw, vec3(0.3, 1.0, 0.2))) * sin(uTime * 2.0 + aPal.w) * 0.0012;
    }
    vec3 sc2 = vec3(dot(im[0].xyz, im[0].xyz), dot(im[1].xyz, im[1].xyz), dot(im[2].xyz, im[2].xyz));
    vec3 wn = mat3(modelMatrix) * (mat3(im) * (n / max(sc2, vec3(1e-12))));
    vS = sqrt(sc2);
    vL = p * vS;
  #else
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec3 wn = mat3(modelMatrix) * n;
    vH = aH;
    if (kind > 8.5 && kind < 9.5 && uWave.w >= 0.0) {
      // The wave is one ring that grows from its start point. It has a steep front and a long back. It gets low as it goes, and it stops after a short way.
      // The front is not a perfect circle: it is a little ahead in some directions and a little behind in others, and its height changes along it.
      vec3 dv = normalize(wp.xyz);
      float wob = 0.55 * sin(dot(dv, vec3(7.1, 3.3, 5.7)) + 0.6) + 0.45 * sin(dot(dv, vec3(-4.2, 8.1, 2.9)) + 1.7) + 0.3 * sin(dot(dv, vec3(13.0, -9.0, 11.0)));
      float ang = acos(clamp(dot(dv, uWave.xyz), -1.0, 1.0)), front = (0.1 + uWave.w * 0.1) * (1.0 + 0.14 * wob);
      vWx = (ang - front) / (0.07 * (1.0 + 0.2 * sin(dot(dv, vec3(5.0, 11.0, -6.0)))));
      float life = smoothstep(0.0, 0.8, uWave.w) * (1.0 - smoothstep(0.42, 0.72, front));
      vWv = (vWx > 0.0 ? exp(-vWx * vWx * 5.0) : exp(-vWx * vWx * 0.7)) * life;
      vWv *= 0.78 + 0.22 * sin(dot(dv, vec3(-9.0, 4.0, 12.0)) + 2.0);
      vWv *= smoothstep(0.003, 0.03, aH);   // aH = how far this point of the sea is from land. The wave is in the open sea only: it gets low at a shore and it does not go over a tile that has land.
      wp.xyz += normalize(wp.xyz) * vWv * 0.065;
    }
    vL = wp.xyz;
  #endif
  vN = normalize(wn);
  vW = wp.xyz;
  #ifdef MODE_DEPTH
    gl_Position = uShadowMat * wp;
  #else
    gl_Position = projectionMatrix * viewMatrix * wp;
  #endif
}
`;

export const FRAG_DEPTH = /* glsl */`
void main() { gl_FragColor = vec4(1.0); }
`;

// The highlight mask: draws only what is inside a cylinder around one object. The line is made from the edge of this mask (see World.render).
export const FRAG_HI = /* glsl */`
uniform vec3 uHiC, uHiU, uHiP, uHiCol;
varying vec3 vW;
void main() {
  vec3 q = vW - uHiC; float a = dot(q, uHiU);
  if (a < uHiP.y || a > uHiP.z || length(q - uHiU * a) > uHiP.x) discard;
  gl_FragColor = vec4(uHiCol, 1.0);
}
`;
// Shared lighting code.
export const LIGHT_PARS = /* glsl */`
uniform sampler2D uPalTex;
uniform vec3 uSunDir;
uniform vec3 uKeyDir;
uniform float uLightI;
uniform float uShadowOn, uShadowK, uShadowSoft, uShadowTexel, uShadowBiasN, uShadowBiasZ;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat;
uniform float uAmbient;
uniform float uGrain, uDetail, uAlpha;
uniform vec3 uBg;
uniform vec4 uSeasonW;
uniform float uWindowTone;
uniform vec3 uFocusC;
uniform float uCut, uCutD; uniform mat4 uCutM;
varying float vWv, vWx;
uniform float uWire;
uniform vec4 uHole;   // the bed of the open sea has a round opening here (xyz = direction, w = cos of its size). A sea tile with a trench shows its own, deeper floor.
uniform float uFocusR, uFocusK, uFocusTile, uDim;
uniform vec3 uHoverC;
uniform float uHoverR, uHoverTile;
uniform vec3 uLitC;
uniform vec3 uMoonDir;
uniform float uLitR, uLitTile, uLitK;
uniform vec4 uLights[8];
uniform vec4 uLightDir[8];
uniform vec3 uLightCol[8];
uniform float uLightN;
uniform float uTime;
vec3 pal(float row, float tone) {
  return texture2D(uPalTex, vec2((clamp(tone, 0.0, 10.0) + 0.5) / ${COLS}.0, (row + 0.5) / ${ROWS}.0)).rgb;
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float shadowAt(vec3 wp, vec3 n, float ndl) {
  vec4 sc = uShadowMat * vec4(wp + n * uShadowBiasN * (1.0 + 3.0 * (1.0 - clamp(ndl, 0.0, 1.0))), 1.0);
  vec3 c = sc.xyz * 0.5 + 0.5;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float r = uShadowSoft * uShadowTexel;
  float z = c.z - uShadowBiasZ;
  float s = step(z, texture2D(uShadowMap, c.xy).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(r, 0.35 * r)).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(-r, -0.35 * r)).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(-0.35 * r, r)).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(0.35 * r, -r)).r);
  #ifdef HQ_SHADOW
  s += step(z, texture2D(uShadowMap, c.xy + vec2(0.7, 0.7) * r).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(-0.7, 0.7) * r).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(0.7, -0.7) * r).r);
  s += step(z, texture2D(uShadowMap, c.xy + vec2(-0.7, -0.7) * r).r);
  return s / 9.0;
  #else
  return s / 5.0;
  #endif
}
float dayOf(vec3 up) {
  float d = smoothstep(-0.14, 0.18, dot(up, uSunDir)) * 3.0;
  float i = floor(d);
  return (i + smoothstep(0.28, 0.72, d - i)) / 3.0;
}
`;

export const FRAG = /* glsl */`
${LIGHT_PARS}
varying vec3 vN;
varying vec3 vW;
varying vec4 vPal;
varying vec4 vAux;
varying float vH;
varying float vInst;
varying vec3 vL;
varying vec3 vU;
varying vec3 vS;
varying float vPat;
void main() {
  if (uCut > 0.5 && vInst < 0.5 && abs(vAux.w - uFocusTile) > 0.5) discard;
  if (uCut > 0.5 && (uCutM * vec4(vW, 1.0)).y < -uCutD) discard;   // the tile ends in a flat base, like a model on a table   // cut-out photo: the ocean, the seabed, and the land of other tiles
  float row = floor(vPal.x + 0.5);
  float tone = vPal.y / 20.0;
  float kind = floor(vPal.z + 0.5);
  if (kind == 14.0 && dot(normalize(vW), uHole.xyz) > uHole.w) discard;
  if (uWire > 0.995) { if (kind == 9.0 || kind == 5.0) discard; gl_FragColor = vec4(uBg, 1.0); return; }   // the wireframe view: plain faces in the backdrop color; no water
  float land = 0.0;   // 1 = the top of a land block (for dead grass in winter)
  float prm = vPal.w / 255.0;
  float sens = vAux.z / 255.0;
  float pat = floor(vPat + 0.5);
  vec3 N = normalize(vN);
  vec3 up = normalize(vW);
  vec3 V = normalize(cameraPosition - vW);

  // Which tile is this? (focus dim, hover lift, night light)
  float inF, inH, inL;
  if (vInst > 0.5) {
    inF = step(distance(vW, uFocusC), uFocusR);
    inH = step(distance(vW, uHoverC), uHoverR);
    inL = step(distance(vW, uLitC), uLitR);
  } else {
    float isO = kind == 9.0 ? 0.0 : 1.0;
    inF = isO * step(abs(vAux.w - uFocusTile), 0.5);
    inH = isO * step(abs(vAux.w - uHoverTile), 0.5);
    inL = isO * step(abs(vAux.w - uLitTile), 0.5);
  }
  float dayDot = dot(up, uSunDir);
  float dayReal = dayOf(up);
  #ifdef ALWAYS_DAY
    dayReal = 1.0; dayDot = max(dayDot, 0.5);
  #endif
  float nightReal = 1.0 - dayReal;
  // A tile under the pointer at night gets a spotlight from above: a soft round pool of light.
  float spot = 1.0 - smoothstep(uLitR * 0.72, uLitR * 1.42, distance(vW, uLitC));   // it spills a little onto the tiles next to it
  float litAmt = uLitK * nightReal * spot;
  float day = mix(dayReal, 1.0, litAmt * 0.86);
  float ink = 0.0;        // a pattern on a wall or a roof: a deeper tone of the same color
  float frame = 0.0, winDark = 0.0, winGlass = 0.0, winShade = 0.0, winDeep = 0.0;   // window parts
  float alpha = 1.0;
  float wopa = 0.0;       // water: how much the surface hides what is under it

  if (kind == 5.0) {
    // Tile water. Shallow and pale at the shore, deep and dark away from it.
    N = up;
    float n1 = vnoise(vW * 40.0 + vec3(0.0, uTime * 0.1, uTime * 0.07));
    float d = prm + (n1 - 0.5) * 0.08;
    tone = mix(tone - 3.3, tone + 1.0, smoothstep(0.0, 0.8, d)) + (n1 - 0.5) * 0.45;
    float foam = 1.0 - smoothstep(0.0, 0.05 + 0.025 * sin(uTime * 0.7 + n1 * 7.0), prm);
    tone = mix(tone, 0.7, foam * 0.75);
    tone = floor(tone * 2.0 + 0.5) / 2.0;
  } else if (kind == 9.0) {
    // Ocean. vH = distance to the nearest tile.
    N = up;
    vec3 Wq = (floor(vW * 62.0) + 0.5) / 62.0; float sH = floor(vH * 62.0) / 62.0;
    float n1 = vnoise(Wq * 13.0 + vec3(uTime * 0.03, 0.0, uTime * 0.02));
    float n2 = vnoise(Wq * 54.0 - vec3(0.0, uTime * 0.05, uTime * 0.04));
    tone += (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.35;
    float shelf = 1.0 - smoothstep(0.0, 0.075, sH + (n1 - 0.5) * 0.035);
    tone = mix(tone, 3.4, shelf * 0.72);
    float foam = 1.0 - smoothstep(0.0035, 0.008 + 0.004 * sin(uTime * 0.8 + n2 * 9.0), sH);
    tone = mix(tone, 0.8, foam * 0.7);
    wopa = shelf * 0.3 + foam * 0.6;
    float fres = pow(1.0 - max(dot(up, V), 0.0), 3.0);
    tone -= fres * 1.7;
    tone = floor(tone * 2.0 + 0.5) / 2.0;
  } else if (kind == 14.0) {
    // Seabed: blocks of sand and rock under the water.
    vec3 cq = floor(vW * 64.0);
    float big = vnoise(cq / 9.0);
    if (big > 0.56) { row = ${ROW.rock}.0; tone = 5.6; }
    tone += (hash13(cq) - 0.5) * 1.1 + (big - 0.5) * 1.6 - (1.0 - smoothstep(0.0, 0.07, vH)) * 1.4;
  } else if (vInst > 0.5) {
    if (kind == 13.0) {
      // Block column: a colored top, an earth side, a lip of the top color.
      float dp = vS.y - vL.y;
      if (vU.y < 0.999 && dp > 0.003) {
        // Earth under the top, then layers of stone.
        float sideRow = floor(vPal.w + 0.5);
        bool snowSide = abs(sideRow - ${ROW.snow}.0) < 0.5;   // a snow block on a high mountain: white all the way down
        if (snowSide) { row = sideRow; tone = 0.4 + mod(floor(dp / 0.0085), 3.0) * 0.3 + min(dp, 0.2) * 3.0; }
        else if (dp > 0.014 && sideRow > 0.5) { row = ${ROW.rock}.0; tone = 4.6 + mod(floor(dp / 0.0085), 3.0) * 0.5 + min(dp, 0.09) * 9.0; }
        else { row = sideRow; tone = 5.4 + min(dp, 0.085) * 40.0; }   // a blue side (row 0) stays blue all the way down: no stone
      } else land = 1.0;
      kind = 0.0;
    } else if (kind == 0.0 || kind == 3.0 || kind == 11.0) {
      {
        vec3 g = floor(vL / 0.0028 + 0.001); float k = 0.0;
        if (pat == 1.0) k = step(mod(g.y, 2.0), 0.5) * 0.5;
        else if (pat == 2.0) k = max(step(mod(g.y, 3.0), 0.5), step(mod(g.x + g.z + floor(g.y / 3.0) * 2.0, 5.0), 0.5)) * 0.36;
        else if (pat == 3.0) k = step(mod(g.x + g.z, 3.0), 0.5) * 0.36;
        else if (pat == 5.0) k = max(step(mod(g.y, 4.0), 0.5), step(mod(g.x + g.z + floor(g.y / 4.0) * 3.0, 7.0), 0.5)) * 0.3;
        ink = k * uDetail * (1.0 - smoothstep(0.3, 0.7, fwidth(vW.x / 0.0028) + fwidth(vW.y / 0.0028) + fwidth(vW.z / 0.0028)));
      }
      // A soft contact shade where a wall meets what is below it.
      if (kind == 0.0) ink += (1.0 - smoothstep(0.0, 0.0028, vL.y)) * 0.55 * step(abs(dot(N, up)), 0.6) * uDetail;
    } else if (kind == 1.0 && pat == 6.0) {
      float fw = fwidth(vU.x) + fwidth(vU.y), ax = abs(vU.x);
      float vis = (1.0 - smoothstep(0.1, 0.3, fw)) * step(0.01, uDetail);
      float face = step(ax, 0.499) * step(vU.y, 0.999);   // the glass side (not the thin edges of the window box)
      // Dark glass set back in the wall: a shadow at the top, a light stone sill, no bars. The glass shows the sky.
      frame = step(vU.y, 0.1) * vis; winShade = (smoothstep(0.62, 1.0, vU.y) * 0.4 + step(0.36, vU.x) * 0.1) * face; winGlass = face; winDeep = 1.0;
      if (face < 0.5) { frame = vis; winDark = 1.0; }
    }
  }
  // Blocks: a small pixel texture on every face.
  if (kind != 9.0 && kind != 1.0 && kind != 6.0 && kind != 14.0) {
    vec3 tx = floor((vInst > 0.5 ? vL : vW) / 0.0028 + 0.001);
    float tf = 1.0 - smoothstep(0.25, 0.6, fwidth(vW.x / 0.0028) + fwidth(vW.y / 0.0028) + fwidth(vW.z / 0.0028));
    tone += (hash13(tx + row) - 0.5) * 0.7 * tf;
  }

  // Seasons shift tones inside the row's own ramp.
  float seasonal = (kind == 0.0 || kind == 3.0 || kind == 11.0) ? sens : 0.0;
  tone += seasonal * (-0.55 * uSeasonW.x + 0.5 * uSeasonW.z + 0.4 * uSeasonW.w);
  if (kind == 3.0) tone += 0.9 * uSeasonW.z;
  // Winter snow on surfaces that face up.
  float snow = uSeasonW.w * step(0.5, sens * (0.55 + 0.9 * smoothstep(0.35, 0.75, dot(N, up)))) * step(0.3, dot(N, up));
  if (kind == 1.0 || kind == 2.0 || kind == 5.0 || kind == 6.0 || kind == 9.0) snow = 0.0;
  // Snow lies in patches, so the land under it still shows. Cold land (tundra, alpine, the ice areas) is white all over.
  if (sens < 0.86) snow *= smoothstep(0.44, 0.58, vnoise(vW * 26.0));
  tone = mix(tone, 0.0, snow);
  ink *= 1.0 - snow * 0.6;

  vec3 Ls = normalize(mix(uSunDir, normalize(uLitC * 1.6 + uKeyDir * 0.25 - vW), litAmt));
  float ndl = dot(N, Ls);
  float sh = 1.0;
  if (uShadowOn > 0.5 && dayDot > -0.15 && ndl > 0.02) sh = mix(shadowAt(vW, N, ndl), 1.0, litAmt);

  // Smooth light from the sun and the sky, real water, a tone curve.
  vec3 base = pal(row, tone + ink * 0.7);
  // Grass: it goes a little golden in autumn, and it is dead (pale straw) in winter where no snow lies.
  float grassy = land * ((abs(row - ${ROW.grass}.0) < 0.5 || abs(row - ${ROW.forest}.0) < 0.5 || abs(row - ${ROW.olive}.0) < 0.5) ? 1.0 : 0.0) * step(0.05, sens);
  base = mix(base, pal(${ROW.autumn}.0, 3.0), grassy * uSeasonW.z * 0.28);
  base = mix(base, pal(${ROW.autumn}.0, 2.3) * vec3(0.9, 0.88, 0.8), grassy * uSeasonW.w * (1.0 - snow) * 0.72);
  if (kind == 3.0) base = mix(base, pal(floor(vPal.w + 0.5), clamp(tone, 3.5, 6.5)), uSeasonW.z * 0.85);
  bool wet = kind == 5.0 || kind == 9.0;
  if (kind == 14.0) base *= vec3(0.62, 0.86, 0.9) * (0.9 + 0.35 * step(0.72, vnoise(floor(vW * 64.0) / 3.0 + uTime * 0.25)));   // under water: cooler, with moving light
  float dif = clamp(ndl, 0.0, 1.0);
  #ifdef SPACE
    dif = max(dif, 0.3 + 0.45 * clamp(dot(N, up), 0.0, 1.0));   // things in orbit always get some light
  #endif
  if (kind == 3.0 || kind == 11.0) dif = clamp((ndl + 0.45) / 1.45, 0.0, 1.0);
  float lit0 = dif;
  dif *= mix(1.0, sh, uShadowK);
  vec3 sunC = mix(vec3(1.0, 0.6, 0.36), vec3(1.0, 0.95, 0.86), smoothstep(0.0, 0.45, dayDot)) * 1.75 * uLightI;
  sunC = mix(sunC, vec3(1.0, 0.95, 0.84) * 1.5, litAmt);
  vec3 skyA = mix(vec3(0.3, 0.27, 0.25), vec3(0.42, 0.55, 0.78), dot(N, up) * 0.5 + 0.5) * (0.3 + uAmbient * 0.6);
  vec3 cDay = base * (skyA + dif * sunC);
  vec3 Hh = normalize(Ls + V);
  float sp = pow(max(dot(N, Hh), 0.0), 36.0) * 0.1 * dif;
  float moonUp = smoothstep(-0.65, 0.25, dot(up, uMoonDir)), msp = 0.0;
  if (wet) {
    vec3 Nw = normalize(up + (vec3(vnoise(vW * 210.0 + uTime * 0.3), vnoise(vW * 210.0 + 17.0), vnoise(vW * 210.0 + 31.0 - uTime * 0.25)) - 0.5) * 0.14 + (vec3(vnoise(vW * 620.0 - uTime * 0.5), 0.5, vnoise(vW * 620.0 + 9.0 + uTime * 0.4)) - 0.5) * 0.1);
    float F = 0.03 + 0.97 * pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
    vec3 skyR = mix(vec3(0.8, 0.87, 0.95), vec3(0.4, 0.58, 0.86), max(dot(reflect(-V, Nw), up), 0.0));
    cDay = mix(base * (skyA * 0.9 + dif * sunC * 0.75), skyR, F * 0.7);
    sp = pow(max(dot(Nw, Hh), 0.0), 320.0) * 2.2 * lit0 * mix(1.0, sh, uShadowK);
    msp = pow(max(dot(Nw, normalize(uMoonDir + V)), 0.0), 160.0) * moonUp;
    if (kind == 9.0) alpha = clamp(0.4 + F * 0.62 + wopa + nightReal * 0.22, 0.0, 1.0);   // look down: see into the water
    else if (vInst > 0.5) alpha = clamp(0.36 + F * 0.5 + (1.0 - smoothstep(0.0, 0.12, prm)) * 0.3 + nightReal * 0.25, 0.0, 1.0);
  } else if (kind == 1.0) { sp = pow(max(dot(N, Hh), 0.0), 60.0) * 0.5 * dif; }
  cDay += sp * sunC;
  // Night: a dim blue sky light, and cool light from the moon where the moon is up.
  vec3 cNight = base * (vec3(0.1, 0.135, 0.235) * (wet ? 1.5 : 1.0) + vec3(0.34, 0.43, 0.62) * clamp(dot(N, uMoonDir) * 0.55 + 0.45, 0.0, 1.0) * moonUp) + vec3(0.42, 0.5, 0.66) * msp * 0.5;
  vec3 col = mix(cNight, cDay, day);
  col = 1.0 - exp(-col * 1.25);
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.25);

  // Lamps and lighthouse beams: pools of warm light at night, in steps.
  if (uLightN > 0.5 && nightReal > 0.04 && kind != 6.0) {
    float g = 0.0; vec3 lc = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uLightN) break;
      vec3 dv = uLights[i].xyz - vW;
      float dist = length(dv), r = uLights[i].w;
      if (dist > r) continue;
      vec3 dn = dv / max(dist, 1e-5);
      float a = 1.0 - dist / r; a *= a;
      a *= clamp(dot(N, dn) * 0.7 + 0.5, 0.0, 1.0);
      vec4 sd = uLightDir[i];
      if (sd.w > -0.5) a *= smoothstep(sd.w - 0.07, sd.w + 0.09, dot(-dn, sd.xyz));
      g += a; lc += uLightCol[i] * a;
    }
    if (g > 0.001) {
      lc /= g;
      float gq = clamp(g * 2.2, 0.0, 1.0);
    vec3 lit = pal(row, tone + ink - 0.2) * lc;
      col = mix(col, lit, gq * nightReal * (1.0 - litAmt) * 0.92);
    }
  }

  if (kind == 1.0) {
    // Window: dark glass by day, warm light at night. Each window has its own switch-on point.
    float on = step(0.12 + prm * 0.62, nightReal) * step(prm, 0.9);
    // Glass that shows the sky: lighter at the top, with one slanted streak of light.
    float streak = step(abs(fract((vU.x + vU.y * 0.55) * 1.3) - 0.5), 0.09) * 0.14;
    vec3 glass = mix(vec3(0.3, 0.44, 0.6), vec3(0.72, 0.85, 0.95), clamp(vU.y * 0.9 + streak * 2.0, 0.0, 1.0));
    if (winDeep > 0.5) {
      // Dark glass in small square steps: deep blue at the bottom, sky at the top, and two slanted glints.
      vec2 q = (floor(vec2(vU.x + 0.5, vU.y) * vec2(6.0, 8.0)) + 0.5) / vec2(6.0, 8.0);
      float d1 = abs(fract((q.x + q.y * 0.6) * 1.05 + 0.2) - 0.5);
      float glint = step(d1, 0.085) + step(abs(d1 - 0.2), 0.03) * 0.5;
      glass = mix(vec3(0.07, 0.13, 0.22), vec3(0.33, 0.52, 0.68), clamp(q.y * 0.8, 0.0, 1.0)) + glint * vec3(0.22, 0.27, 0.3);
    }
    glass *= mix(0.2, 1.0, day);
    col = mix(col, glass, winGlass);
    col *= 1.0 - winShade;
    col = mix(col, pal(${ROW.yellow}.0, uWindowTone) * (1.0 - winShade * 0.5), on);
    vec3 frameC = winDark > 0.5 ? mix(pal(${ROW.rock}.0, 9.6), pal(${ROW.rock}.0, 8.0), day) : mix(pal(${ROW.plaster}.0, 6.5), pal(${ROW.plaster}.0, 0.5), day);
    col = mix(col, frameC, frame);
  } else if (kind == 2.0) {
    float pulse = 0.72 + 0.28 * sin(uTime * 1.6 + prm * 40.0);
  col = mix(col, pal(row, max(tone - 2.0, 0.0)), nightReal * pulse);
  } else if (kind == 6.0) {
    col = pal(row, tone);
  }

  col = mix(col, uBg, uFocusK * (1.0 - inF) * uDim * (kind == 9.0 || kind == 14.0 ? 0.3 : 1.0) * (0.3 + 0.7 * dayReal));
  col = mix(col, vec3(1.0), inH * 0.07);
  col += (hash12(gl_FragCoord.xy) - 0.5) * uGrain;
  if (kind == 9.0 && vWv > 0.01) {
    // The body of the wave is solid water: dark on its steep front, lighter on its back. Only the top has foam, in broken patches.
    vec3 body = vWx > 0.0 ? vec3(0.06, 0.27, 0.46) : mix(vec3(0.1, 0.4, 0.58), vec3(0.2, 0.55, 0.7), smoothstep(-2.2, -0.3, vWx));
    col = mix(col, body, smoothstep(0.03, 0.4, vWv) * 0.78);
    float foam = smoothstep(0.84, 0.97, vWv) * (0.15 + 0.45 * step(0.5, vnoise(vW * 90.0 + uTime * 0.6)));   // a thin, broken line of foam on the top
    col = mix(col, vec3(0.86, 0.93, 0.97), foam);
    alpha = max(alpha, smoothstep(0.03, 0.3, vWv));
  }
  if (uWire > 0.0) { col = mix(col, uBg, uWire); if (kind == 9.0 || kind == 5.0) alpha *= 1.0 - uWire; }   // on the way into the wireframe view: the colors go to the backdrop color, and the water goes away
  gl_FragColor = vec4(col, alpha * uAlpha);
}
`;

// Flat unlit effects: light beams, aurora, fog, rings. aPal.w = alpha (0..255).
// kinds for fx: 0 always, 1 night only, 2 day only, 3 dawn only
export const FX_VERT = /* glsl */`
uniform float uCut, uCutR, uCutXR; uniform mat4 uCutM; uniform vec3 uCutE[6]; uniform vec3 uCutX1, uCutX3;   // cut-out photo: keep only what stands on one tile
bool cutOff(vec3 ow) { vec3 o = (uCutM * vec4(ow, 1.0)).xyz; bool off = o.y > 8.0 || o.y < -4.0 || dot(o.xz, o.xz) > uCutR * uCutR; for (int i = 0; i < 6; i++) { if (uCutE[i].x * o.x + uCutE[i].y * o.z + uCutE[i].z < -0.004) off = true; } vec2 xb = vec2(dot(ow, uCutX1), dot(ow, uCutX3)); if (uCutXR > 0.0 && dot(xb, xb) < uCutXR * uCutXR) off = true; return off; }

attribute vec4 aPal;
attribute vec4 aAux;
uniform float uLod;
varying vec4 vPal;
varying vec3 vW;
void main() {
  vec3 p = position;
  vPal = aPal;
  #ifdef USE_INSTANCING
    vec2 tap = aAux.xy / 255.0;
    p.xz *= (1.0 - tap * clamp(p.y, 0.0, 1.0));
    float pt = floor(aAux.w / 4.0);
    float lod = aAux.w - pt * 4.0;
    if (lod > 1.5) p *= smoothstep(0.5, 0.74, uLod);
    else if (lod > 0.5) p *= smoothstep(0.1, 0.34, uLod);
    if (uCut > 0.5 && cutOff((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz)) p *= 0.0;
    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  #else
    vec4 wp = modelMatrix * vec4(p, 1.0);
  #endif
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
export const FX_FRAG = /* glsl */`
uniform sampler2D uPalTex;
uniform vec3 uSunDir;
varying vec4 vPal;
varying vec3 vW;
vec3 pal(float row, float tone) {
  return texture2D(uPalTex, vec2((clamp(tone, 0.0, 10.0) + 0.5) / ${COLS}.0, (row + 0.5) / ${ROWS}.0)).rgb;
}
void main() {
  float kind = floor(vPal.z + 0.5);
  float day = smoothstep(-0.12, 0.16, dot(normalize(vW), uSunDir));
  float a = vPal.w / 255.0;
  if (kind == 1.0) a *= 1.0 - day;
  else if (kind == 2.0) a *= day;
  else if (kind == 3.0) a *= day * (1.0 - day) * 4.0;
  if (a < 0.004) discard;
  gl_FragColor = vec4(pal(floor(vPal.x + 0.5), vPal.y / 20.0), a);
}
`;
