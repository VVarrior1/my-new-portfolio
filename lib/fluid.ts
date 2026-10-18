// A small real-time fluid: semi-Lagrangian advection, vorticity confinement and a Jacobi pressure
// solve on the GPU, after Jos Stam's "Stable Fluids".
//
// Adapted from WebGL-Fluid-Simulation by Pavel Dobryakov (MIT licence,
// https://github.com/PavelDoGreat/WebGL-Fluid-Simulation). Copyright (c) 2017 Pavel Dobryakov.
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software
// and associated documentation files, to deal in the Software without restriction, subject to the
// condition that the above copyright notice and this permission notice are included in all copies
// or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
// ANY KIND.
//
// Changes from the original: TypeScript, no bloom or sunrays, two dye channels instead of RGB, an
// ambient curl-noise force, and a display that traces contours on a blurred copy of the dye.
// Red is the neutral dye (smoke in the dark theme, ink in the light one) and green is the accent,
// so the display pass can only ever paint the page's neutrals and its one accent colour.

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };
type FBO = { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelX: number; texelY: number; attach: (id: number) => number };
type DoubleFBO = { width: number; height: number; texelX: number; texelY: number; read: FBO; write: FBO; swap: () => void };
type Format = { internal: number; format: number };

export type Palette = {
  /** The pool colour the fluid sits in. */
  bg: [number, number, number];
  /** The neutral dye: smoke (dark theme) or ink (light theme). */
  neutral: [number, number, number];
  accent: [number, number, number];
  /** Relief from the dye's surface, 0 (flat) to 1. */
  shading: number;
};

export type FluidColors = Palette & {
  /** The opposite theme's palette, for the inverted chapter bands. */
  invert: Palette;
  /** How strongly each dye can cover the pool, 0 to 1. */
  neutralMax: number;
  accentMax: number;
  /** How much of each dye is drawn as a fill and as contour lines, 0 to 1, and the line spacing. */
  fill: number;
  lines: number;
  steps: number;
  /** How much of the contour lines still shows through calm water (behind text), 0 to 1. */
  calmLines?: number;
};

/** One image drawn into the liquid, in CSS px of the viewport. */
export type PlaneDraw = {
  texture: WebGLTexture;
  rect: { left: number; top: number; width: number; height: number };
  radius: number;
  /** Scroll velocity, about -1..1. */
  bend: number;
  /** Pointer in CSS px relative to the plane's top-left. */
  mouse: { x: number; y: number };
  hover: number;
  reveal: number;
  /** How much the liquid's current refracts it: 0 at rest, so a still image is sharp. */
  refract: number;
};

export type FluidConfig = {
  simResolution: number;
  dyeResolution: number;
  densityDissipation: number;
  velocityDissipation: number;
  pressure: number;
  pressureIterations: number;
  curl: number;
};

const BASE_VERTEX = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const CLEAR = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value;
void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`;

const SPLAT = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
uniform vec2 uShift;
void main () {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize - uShift;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize - uShift;
  vec4 result = texture2D(uSource, coord);
#endif
  // What comes in from beyond any edge is clean water, not a smear of the last row or column, so
  // dye never banks up against the side of the screen.
  if (coord.y < 0.0 || coord.y > 1.0 || coord.x < 0.0 || coord.x > 1.0) result = vec4(0.0);
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}`;

const DIVERGENCE = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const CURL = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

const VORTICITY = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const PRESSURE = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUBTRACT = `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

// Ambient life: a slow, divergence-free stir from curl noise. The stream function is two layers
// of gradient noise drifting in different directions, so the eddies morph rather than slide, and
// its curl is added to the current as a gentle force. This is what keeps the pool moving from
// second to second when nothing else touches it.
const FORCE = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity; uniform float uTime; uniform float uAmp; uniform float uScale; uniform float uAspect;
uniform vec2 uDrift; uniform float dt;
vec2 grad2 (vec2 i) { float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453) * 6.2831853; return vec2(cos(a), sin(a)); }
float gnoise (vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad2(i), f);
  float b = dot(grad2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(grad2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(grad2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float psi (vec2 p) {
  float t = uTime;
  return gnoise(p + vec2(t * 0.045, -t * 0.03)) + 0.5 * gnoise(p * 2.07 + vec2(-t * 0.06, t * 0.04) + 5.2);
}
void main () {
  vec2 p = vec2(vUv.x * uAspect, vUv.y) * uScale;
  float e = 0.02;
  float dy = psi(p + vec2(0.0, e)) - psi(p - vec2(0.0, e));
  float dx = psi(p + vec2(e, 0.0)) - psi(p - vec2(e, 0.0));
  vec2 curl = vec2(dy, -dx) / (2.0 * e);
  vec2 v = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(v + (curl * uAmp + uDrift) * dt, 0.0, 1.0);
}`;

// A separable Gaussian (9 taps folded into 5 linear reads), used to make the smooth scalar field
// the contour lines are traced on. Contours of the raw dye pick up every texel step and every
// half-float rounding, which is what made the old lines stair-stepped and speckled.
const BLUR = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uSource; uniform vec2 uDir;
void main () {
  vec4 s = texture2D(uSource, vUv) * 0.2270270270;
  s += (texture2D(uSource, vUv + uDir * 1.3846153846) + texture2D(uSource, vUv - uDir * 1.3846153846)) * 0.3162162162;
  s += (texture2D(uSource, vUv + uDir * 3.2307692308) + texture2D(uSource, vUv - uDir * 3.2307692308)) * 0.0702702703;
  gl_FragColor = s;
}`;

/** How many calm rectangles (text blocks) the display and the obstacle pass know about. */
export const MAX_CALM = 10;

// Shared by the display and obstacle passes: how much a point (buffer px, y up) is inside the calm
// rectangles. Each rect is a rounded box with a soft edge; strength 0 switches a slot off.
const CALM_GLSL = `
uniform vec4 uCalm[${MAX_CALM}];
uniform float uCalmStrength[${MAX_CALM}];
uniform float uFeather;
float sdBox (vec2 p, vec2 c, vec2 h, float r) {
  vec2 q = abs(p - c) - h + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float calmHash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float calmNoise (vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(calmHash(i), calmHash(i + vec2(1.0, 0.0)), f.x), mix(calmHash(i + vec2(0.0, 1.0)), calmHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float calmAt (vec2 px) {
  float keep = 1.0;
  for (int i = 0; i < ${MAX_CALM}; i++) {
    vec4 r = uCalm[i];
    float s = uCalmStrength[i];
    if (s <= 0.0) continue;
    vec2 c = 0.5 * (r.xy + r.zw);
    vec2 h = 0.5 * abs(r.zw - r.xy);
    // Far outside the block (beyond the widest the shore can reach) it holds nothing back.
    vec2 o = abs(px - c) - h;
    if (max(o.x, o.y) > uFeather * 1.9) continue;
    // The shore is ragged, not ruled: the edge wanders outward (never into the text) with a noise
    // that travels with the block.
    float wob = calmNoise((px - r.xy) / (uFeather * 1.7)) + 0.5 * calmNoise((px - r.xy) / (uFeather * 0.7) + 7.3);
    float d = sdBox(px, c, h, uFeather * 0.6) + (wob - 1.5) * uFeather * 0.5;
    float inside = 1.0 - smoothstep(-uFeather * 0.35, uFeather, d);
    keep *= 1.0 - s * inside;
  }
  return 1.0 - keep;
}`;

// Drags the current inside the calm rectangles, so the liquid slows as it passes behind text, like
// water over a shallow bank. The drag is a rate (uDrag per frame, from dt): stronger than this it
// chokes every channel between blocks and the ink banks up against their shores.
const OBSTACLE = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity; uniform vec2 uViewport; uniform float uDrag;
${CALM_GLSL}
void main () {
  vec2 v = texture2D(uVelocity, vUv).xy;
  float calm = calmAt(vUv * uViewport);
  gl_FragColor = vec4(v * (1.0 - uDrag * calm), 0.0, 1.0);
}`;

// The display pass: marbling. Each dye is drawn as a soft fill plus hairline contours at even
// steps of its density (suminagashi, or a topographic map of the ink), so a busy system adds
// lines, never a wash. Red is the neutral dye, green the accent.
// Everything is read from the smoothed field, never the raw dye: the fill is a clean gradient,
// and each contour is drawn at a constant width in screen pixels from the field's value and its
// gradient (the distance to the nearest level, in px), so lines are anti-aliased and evenly
// weighted however steep the dye is. Levels that crowd closer than a few pixels fade into the
// fill instead of aliasing, and small isolated islands (whose wide blur stays thin) draw no lines.
// The page can hold up to two "inverted" bands (a chapter set in the opposite theme); their edges
// are a wobbling waterline the current pushes around. Calm rectangles hold the fill back behind
// text; only a faint trace of the lines runs through them, so the map reads as continuous.
const DISPLAY = `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uField; uniform sampler2D uWide; uniform sampler2D uVelocity;
uniform vec2 uFieldTexel; uniform vec2 uViewport;
uniform float uTime; uniform float uDpr;
uniform vec3 uBg; uniform vec3 uNeutral; uniform vec3 uAccent;
uniform vec3 uBg2; uniform vec3 uNeutral2; uniform vec3 uAccent2;
uniform float uNeutralMax; uniform float uAccentMax; uniform float uShading; uniform float uShading2;
uniform float uFill; uniform float uLines; uniform float uSteps; uniform float uCalmLines;
uniform vec4 uBands;
${CALM_GLSL}
// A hairline on every 1/steps of v: g is v's gradient in buffer px, w the line's half width.
float contour (float v, float g, float steps, float w) {
  float f = v * steps;
  float gs = max(g * steps, 1e-6);
  float d = abs(fract(f + 0.5) - 0.5) / gs;
  float l = 1.0 - smoothstep(w - 0.55, w + 0.55, d);
  return l * (1.0 - smoothstep(0.14, 0.3, gs));
}
float edge (float y, float x) {
  float t = uTime;
  float w = sin(x * 0.0042 / uDpr + t * 0.7) * 7.0 + sin(x * 0.0113 / uDpr - t * 1.1 + 1.3) * 3.5 + sin(x * 0.027 / uDpr + t * 1.9) * 1.2;
  vec2 v = texture2D(uVelocity, vec2(vUv.x, clamp(y / uViewport.y, 0.0, 1.0))).xy;
  return y + (w + clamp(v.y * 0.035, -26.0, 26.0)) * uDpr;
}
float band (vec2 px, float top, float bottom) {
  if (top <= bottom) return 0.0;
  float t = edge(top, px.x);
  float b = edge(bottom, px.x);
  float aa = 1.2 * uDpr;
  return smoothstep(b - aa, b + aa, px.y) * (1.0 - smoothstep(t - aa, t + aa, px.y));
}
float waterline (vec2 px, float y) {
  if (y <= -9000.0) return 0.0;
  float e = edge(y, px.x);
  return 1.0 - smoothstep(0.4 * uDpr, 1.6 * uDpr, abs(px.y - e));
}
void main () {
  vec2 px = vUv * uViewport;
  vec2 h = uFieldTexel;
  vec4 c = texture2D(uField, vUv);
  vec4 fl = texture2D(uField, vUv - vec2(h.x, 0.0));
  vec4 fr = texture2D(uField, vUv + vec2(h.x, 0.0));
  vec4 ft = texture2D(uField, vUv + vec2(0.0, h.y));
  vec4 fb = texture2D(uField, vUv - vec2(0.0, h.y));
  vec4 wide = texture2D(uWide, vUv);
  // Gradients in dye per buffer px.
  vec2 span = 2.0 * h * uViewport;
  vec2 gn = vec2(fr.r - fl.r, ft.r - fb.r) / span;
  vec2 ga = vec2(fr.g - fl.g, ft.g - fb.g) / span;

  float inv = max(band(px, uBands.x, uBands.y), band(px, uBands.z, uBands.w));
  vec3 bg = mix(uBg, uBg2, inv);
  vec3 neutral = mix(uNeutral, uNeutral2, inv);
  vec3 accent = mix(uAccent, uAccent2, inv);
  float shading = mix(uShading, uShading2, inv);

  // The dye thins out toward the sides of the screen instead of being cut off by them.
  float side = 0.04 * uViewport.x;
  float shore = smoothstep(0.0, side, px.x) * smoothstep(0.0, side, uViewport.x - px.x);
  float guard = 1.0 - calmAt(px);
  float traceOf = mix(uCalmLines, 1.0, guard) * shore;

  // Fill: a smooth ink gradient; thin wisps stay faint, dense cores saturate gently.
  float n = smoothstep(0.0, 0.95, c.r) * guard * shore;
  float a = smoothstep(0.03, 0.7, c.g) * guard * shore;

  // Contours, hairline thin (about one CSS px), only on bodies of dye that are more than a fleck.
  // They are traced on a saturating height (1 - e^-1.3x), so a dense core gets a handful of rings,
  // not a pile of them, however much dye a busy system pours in.
  float w = max(0.62, 0.55 * uDpr);
  vec2 hc = 1.0 - exp(-1.3 * c.rg);
  vec2 hs = 1.3 * exp(-1.3 * c.rg);
  float ln = contour(hc.x, length(gn) * hs.x, uSteps, w) * smoothstep(0.05, 0.14, wide.r) * smoothstep(0.02, 0.06, c.r) * traceOf;
  float la = contour(hc.y, length(ga) * hs.y, uSteps * 0.7, w) * smoothstep(0.07, 0.16, wide.g) * smoothstep(0.05, 0.1, c.g) * traceOf;

  vec3 col = mix(bg, neutral, n * uNeutralMax * uFill);
  col = mix(col, neutral, ln * uLines * 0.6);
  col = mix(col, accent, a * uAccentMax * uFill * 0.3);
  col = mix(col, accent, la * uLines * uAccentMax);

  if (shading > 0.0) {
    vec3 normal = normalize(vec3(-(gn + ga) * 70.0, 1.0));
    float light = dot(normal, normalize(vec3(-0.4, 0.6, 1.0)));
    col += shading * (light - 0.81) * 0.3 * (n + a);
  }

  // The waterline: a hairline of the accent where a chapter's edge meets the pool.
  float wl = max(max(waterline(px, uBands.x), waterline(px, uBands.y)), max(waterline(px, uBands.z), waterline(px, uBands.w)));
  col = mix(col, accent, wl * 0.85);

  // Less than half a level of 8-bit noise, so long dark gradients don't band.
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 400.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const PLANE_VERTEX = `
precision highp float;
attribute vec2 aPosition;
uniform vec4 uQuad;
varying vec2 vLocal; varying vec2 vScreen;
void main () {
  vec2 t = aPosition * 0.5 + 0.5;
  vLocal = vec2(t.x, 1.0 - t.y);
  vec2 clip = mix(uQuad.xy, uQuad.zw, t);
  vScreen = clip * 0.5 + 0.5;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

// A product screenshot (or the portrait) drawn into the liquid. The plane bows with scroll speed
// like a sheet dragged through water, the current under it refracts it while the page moves, the
// pointer drops ripples into it, and it condenses out of the ink when it first appears. At rest it
// is the image itself, sharp and in its own colours: every distortion scales with uAgitate (scroll
// speed, decaying within half a second of rest) or with the pointer over it.
const PLANE = `
precision highp float; precision highp sampler2D;
varying vec2 vLocal; varying vec2 vScreen;
uniform sampler2D uImage; uniform sampler2D uVelocity;
uniform vec2 uSize; uniform float uMargin; uniform float uRadius;
uniform float uBend; uniform vec2 uMouse; uniform float uHover; uniform float uReveal; uniform float uTime;
uniform float uDpr; uniform vec3 uAccent; uniform float uRefract;
float hash (vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise (vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm (vec2 p) { return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 3.7) + 0.15 * noise(p * 4.3 + 9.1); }
float sdBox (vec2 p, vec2 h, float r) { vec2 q = abs(p) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main () {
  vec2 full = uSize + 2.0 * uMargin;
  vec2 p = vLocal * full - uMargin;
  vec2 q = p;
  // Bow: the middle of the plane lags the edges, more the faster you scroll.
  float across = clamp(q.x / uSize.x, 0.0, 1.0);
  q.y -= uBend * sin(3.14159 * across) * 46.0 * uDpr;
  // Refraction from the liquid's current at this point of the screen, only while things move.
  vec2 v = texture2D(uVelocity, vScreen).xy;
  q += vec2(-v.x, v.y) * 0.010 * uDpr * uRefract;
  // Ripples from the pointer.
  vec2 dm = q - uMouse;
  float dist = length(dm);
  float ring = sin(dist / (11.0 * uDpr) - uTime * 6.5) * exp(-dist / (150.0 * uDpr));
  q += (dm / max(dist, 1.0)) * ring * 7.0 * uDpr * uHover;
  // Lens: a soft magnifier under the pointer.
  q -= dm * 0.07 * uHover * exp(-dist / (120.0 * uDpr));

  float sd = sdBox(q - uSize * 0.5, uSize * 0.5, uRadius);
  float shape = 1.0 - smoothstep(-0.75 * uDpr, 0.75 * uDpr, sd);
  vec2 uv = q / uSize;

  // Condense out of the ink: a noisy front sweeps up from the bottom, and is past every point of
  // the image (field tops out at 1.2) well before uReveal reaches 1.
  float n = fbm(uv * vec2(3.0, 2.2) + vec2(0.0, uTime * 0.05));
  float front = uReveal * 1.7 - 0.3;
  float field = (1.0 - uv.y) * 0.65 + n * 0.55;
  float shown = smoothstep(field - 0.04, field + 0.04, front);
  float rim = smoothstep(field - 0.035, field - 0.01, front) * (1.0 - shown) * 0.7;

  // A little chromatic split with speed: the image's own colours, never a new hue.
  float split = clamp(abs(uBend), 0.0, 1.0) * 0.006;
  vec3 img = vec3(texture2D(uImage, uv + vec2(0.0, split)).r, texture2D(uImage, uv).g, texture2D(uImage, uv - vec2(0.0, split)).b);

  float alpha = shape * shown;
  float rimA = shape * rim;
  gl_FragColor = vec4(img * alpha + uAccent * rimA, alpha + rimA);
}`;

export class Fluid {
  private gl: WebGLRenderingContext;
  private ext: { formatRGBA: Format; formatRG: Format; formatR: Format; type: number; linear: boolean };
  private programs: Record<string, Program> = {};
  private dye!: DoubleFBO;
  private velocity!: DoubleFBO;
  private divergence!: FBO;
  private curlFbo!: FBO;
  private pressure!: DoubleFBO;
  /** The smoothed dye the display traces (half the dye's size), and a much wider blur of it
   * (an eighth) that tells a body of dye from a stray fleck. Each has a scratch target for the
   * separable blur's first pass. */
  private field!: FBO;
  private fieldTmp!: FBO;
  private wide!: FBO;
  private wideTmp!: FBO;
  readonly canvas: HTMLCanvasElement;
  config: FluidConfig;
  colors: FluidColors;
  /** Calm rectangles in CSS px of the viewport (left, top, right, bottom) and how much dye each
   * holds back, 0 to 1. At most MAX_CALM are used. */
  calm: Array<{ left: number; top: number; right: number; bottom: number; strength: number; hold?: number }> = [];
  /** Inverted chapter bands: viewport CSS px (top, bottom); off-screen edges may lie outside. */
  bands: Array<{ top: number; bottom: number }> = [];
  /** Seconds, for the waterline's wobble and the planes' ripples. */
  time = 0;
  /** CSS px to drawing-buffer px. */
  dpr = 1;
  /** The ambient curl-noise stir: strength (sim texels/s², 0 is off) and eddies per screen height. */
  ambient = 0;
  ambientScale = 2.4;
  /** A steady push on the whole pool, sim texels/s² (x right, y up). */
  drift: [number, number] = [0, 0];
  private calmData = new Float32Array(MAX_CALM * 4);
  private calmStrength = new Float32Array(MAX_CALM);
  private calmHold = new Float32Array(MAX_CALM);

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, ext: Fluid["ext"], config: FluidConfig, colors: FluidColors) {
    this.canvas = canvas;
    this.gl = gl;
    this.ext = ext;
    this.config = config;
    this.colors = colors;
    this.compile();
    this.initBuffers();
    this.initFramebuffers();
  }

  /** Returns null when the browser has no usable WebGL with float render targets. */
  static create(canvas: HTMLCanvasElement, config: FluidConfig, colors: FluidColors): Fluid | null {
    const params: WebGLContextAttributes = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" };
    let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
    const isWebGL2 = !!gl;
    if (!gl) gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext | null;
    if (!gl) return null;

    let halfFloatType: number;
    let linear: boolean;
    if (isWebGL2) {
      if (!gl.getExtension("EXT_color_buffer_float")) return null;
      linear = !!gl.getExtension("OES_texture_float_linear");
      halfFloatType = gl.HALF_FLOAT;
    } else {
      const half = gl.getExtension("OES_texture_half_float");
      if (!half) return null;
      linear = !!gl.getExtension("OES_texture_half_float_linear");
      halfFloatType = half.HALF_FLOAT_OES;
    }
    gl.clearColor(0, 0, 0, 1);

    const formatRGBA = supportedFormat(gl, isWebGL2 ? gl.RGBA16F : gl.RGBA, gl.RGBA, halfFloatType);
    const formatRG = supportedFormat(gl, isWebGL2 ? gl.RG16F : gl.RGBA, isWebGL2 ? gl.RG : gl.RGBA, halfFloatType);
    const formatR = supportedFormat(gl, isWebGL2 ? gl.R16F : gl.RGBA, isWebGL2 ? gl.RED : gl.RGBA, halfFloatType);
    if (!formatRGBA || !formatRG || !formatR) return null;

    try {
      return new Fluid(canvas, gl, { formatRGBA, formatRG, formatR, type: halfFloatType, linear }, config, colors);
    } catch {
      return null;
    }
  }

  private compile() {
    const gl = this.gl;
    const vertex = shader(gl, gl.VERTEX_SHADER, BASE_VERTEX);
    const planeVertex = shader(gl, gl.VERTEX_SHADER, PLANE_VERTEX);
    const make = (source: string, keywords: string[] = [], vs: WebGLShader = vertex) => {
      const defines = keywords.map((k) => `#define ${k}\n`).join("");
      const fragment = shader(gl, gl.FRAGMENT_SHADER, defines + source);
      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
      const uniforms: Program["uniforms"] = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(program, i)!.name;
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      return { program, uniforms };
    };
    this.programs = {
      clear: make(CLEAR),
      splat: make(SPLAT),
      advection: make(ADVECTION, this.ext.linear ? [] : ["MANUAL_FILTERING"]),
      divergence: make(DIVERGENCE),
      curl: make(CURL),
      vorticity: make(VORTICITY),
      pressure: make(PRESSURE),
      gradient: make(GRADIENT_SUBTRACT),
      display: make(DISPLAY),
      force: make(FORCE),
      blur: make(BLUR),
      obstacle: make(OBSTACLE),
      plane: make(PLANE, [], planeVertex),
    };
  }

  private initBuffers() {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  }

  private resolution(target: number) {
    const w = this.gl.drawingBufferWidth;
    const h = this.gl.drawingBufferHeight;
    let aspect = w / h;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(target);
    const max = Math.round(target * aspect);
    return w > h ? { width: max, height: min } : { width: min, height: max };
  }

  /** (Re)allocates the simulation textures for the canvas's current size, keeping what's in them. */
  initFramebuffers() {
    const gl = this.gl;
    const sim = this.resolution(this.config.simResolution);
    const dye = this.resolution(this.config.dyeResolution);
    const { formatRGBA, formatRG, formatR, type, linear } = this.ext;
    const filtering = linear ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    this.dye = this.dye ? this.resizeDouble(this.dye, dye.width, dye.height, formatRGBA, type, filtering) : this.createDouble(dye.width, dye.height, formatRGBA, type, filtering);
    this.velocity = this.velocity
      ? this.resizeDouble(this.velocity, sim.width, sim.height, formatRG, type, filtering)
      : this.createDouble(sim.width, sim.height, formatRG, type, filtering);
    this.divergence = this.createFBO(sim.width, sim.height, formatR, type, gl.NEAREST);
    this.curlFbo = this.createFBO(sim.width, sim.height, formatR, type, gl.NEAREST);
    this.pressure = this.createDouble(sim.width, sim.height, formatR, type, gl.NEAREST);
    const fw = Math.max(1, Math.round(dye.width / 2));
    const fh = Math.max(1, Math.round(dye.height / 2));
    const ww = Math.max(1, Math.round(dye.width / 8));
    const wh = Math.max(1, Math.round(dye.height / 8));
    this.field = this.createFBO(fw, fh, formatRGBA, type, filtering);
    this.fieldTmp = this.createFBO(fw, fh, formatRGBA, type, filtering);
    this.wide = this.createFBO(ww, wh, formatRGBA, type, filtering);
    this.wideTmp = this.createFBO(ww, wh, formatRGBA, type, filtering);
  }

  private createFBO(w: number, h: number, f: Format, type: number, param: number): FBO {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, type, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelX: 1 / w,
      texelY: 1 / h,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDouble(w: number, h: number, f: Format, type: number, param: number): DoubleFBO {
    let a = this.createFBO(w, h, f, type, param);
    let b = this.createFBO(w, h, f, type, param);
    return {
      width: w,
      height: h,
      texelX: a.texelX,
      texelY: a.texelY,
      get read() {
        return a;
      },
      set read(v) {
        a = v;
      },
      get write() {
        return b;
      },
      set write(v) {
        b = v;
      },
      swap() {
        const t = a;
        a = b;
        b = t;
      },
    };
  }

  private resizeDouble(target: DoubleFBO, w: number, h: number, f: Format, type: number, param: number): DoubleFBO {
    if (target.width === w && target.height === h) return target;
    const next = this.createDouble(w, h, f, type, param);
    // Copy the old contents across (stretched), so a resize doesn't wipe the field.
    const p = this.programs.clear;
    this.gl.useProgram(p.program);
    this.gl.uniform1i(p.uniforms.uTexture, target.read.attach(0));
    this.gl.uniform1f(p.uniforms.value, 1);
    this.blit(next.write);
    next.swap();
    return next;
  }

  private blit(target: FBO | null) {
    const gl = this.gl;
    if (target === null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  /** Moves the whole field by this much this step, in UV (y up): the page scrolling over it. */
  shift = 0;

  /** Advances the fluid by dt seconds. */
  step(dt: number) {
    const gl = this.gl;
    const { programs: p, velocity, config } = this;
    gl.disable(gl.BLEND);

    gl.useProgram(p.curl.program);
    gl.uniform2f(p.curl.uniforms.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(p.curl.uniforms.uVelocity, velocity.read.attach(0));
    this.blit(this.curlFbo);

    gl.useProgram(p.vorticity.program);
    gl.uniform2f(p.vorticity.uniforms.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(p.vorticity.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.vorticity.uniforms.uCurl, this.curlFbo.attach(1));
    gl.uniform1f(p.vorticity.uniforms.curl, config.curl);
    gl.uniform1f(p.vorticity.uniforms.dt, dt);
    this.blit(velocity.write);
    velocity.swap();

    if (this.ambient > 0 || this.drift[0] !== 0 || this.drift[1] !== 0) {
      gl.useProgram(p.force.program);
      gl.uniform2f(p.force.uniforms.texelSize, velocity.texelX, velocity.texelY);
      gl.uniform1i(p.force.uniforms.uVelocity, velocity.read.attach(0));
      gl.uniform1f(p.force.uniforms.uTime, this.time);
      gl.uniform1f(p.force.uniforms.uAmp, this.ambient);
      gl.uniform1f(p.force.uniforms.uScale, this.ambientScale);
      gl.uniform1f(p.force.uniforms.uAspect, velocity.width / velocity.height);
      gl.uniform2f(p.force.uniforms.uDrift, this.drift[0], this.drift[1]);
      gl.uniform1f(p.force.uniforms.dt, dt);
      this.blit(velocity.write);
      velocity.swap();
    }

    gl.useProgram(p.divergence.program);
    gl.uniform2f(p.divergence.uniforms.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(p.divergence.uniforms.uVelocity, velocity.read.attach(0));
    this.blit(this.divergence);

    gl.useProgram(p.clear.program);
    gl.uniform1i(p.clear.uniforms.uTexture, this.pressure.read.attach(0));
    gl.uniform1f(p.clear.uniforms.value, config.pressure);
    this.blit(this.pressure.write);
    this.pressure.swap();

    gl.useProgram(p.pressure.program);
    gl.uniform2f(p.pressure.uniforms.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(p.pressure.uniforms.uDivergence, this.divergence.attach(0));
    for (let i = 0; i < config.pressureIterations; i++) {
      gl.uniform1i(p.pressure.uniforms.uPressure, this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    gl.useProgram(p.gradient.program);
    gl.uniform2f(p.gradient.uniforms.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(p.gradient.uniforms.uPressure, this.pressure.read.attach(0));
    gl.uniform1i(p.gradient.uniforms.uVelocity, velocity.read.attach(1));
    this.blit(velocity.write);
    velocity.swap();

    gl.useProgram(p.advection.program);
    gl.uniform2f(p.advection.uniforms.texelSize, velocity.texelX, velocity.texelY);
    if (!this.ext.linear) gl.uniform2f(p.advection.uniforms.dyeTexelSize, velocity.texelX, velocity.texelY);
    const velocityId = velocity.read.attach(0);
    gl.uniform1i(p.advection.uniforms.uVelocity, velocityId);
    gl.uniform1i(p.advection.uniforms.uSource, velocityId);
    gl.uniform1f(p.advection.uniforms.dt, dt);
    gl.uniform1f(p.advection.uniforms.dissipation, config.velocityDissipation);
    gl.uniform2f(p.advection.uniforms.uShift, 0, this.shift);
    this.blit(velocity.write);
    velocity.swap();

    if (!this.ext.linear) gl.uniform2f(p.advection.uniforms.dyeTexelSize, this.dye.texelX, this.dye.texelY);
    gl.uniform1i(p.advection.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.advection.uniforms.uSource, this.dye.read.attach(1));
    gl.uniform1f(p.advection.uniforms.dissipation, config.densityDissipation);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  /** Packs the calm rectangles into buffer px (y up) for the shaders. */
  private packCalm() {
    const h = this.gl.drawingBufferHeight;
    const k = this.dpr;
    this.calmData.fill(0);
    this.calmStrength.fill(0);
    this.calmHold.fill(0);
    this.calm.slice(0, MAX_CALM).forEach((r, i) => {
      this.calmData[i * 4] = r.left * k;
      this.calmData[i * 4 + 1] = h - r.bottom * k;
      this.calmData[i * 4 + 2] = r.right * k;
      this.calmData[i * 4 + 3] = h - r.top * k;
      this.calmStrength[i] = r.strength;
      this.calmHold[i] = r.hold ?? r.strength;
    });
  }

  private setCalm(p: Program, strength = this.calmStrength) {
    const gl = this.gl;
    gl.uniform4fv(p.uniforms["uCalm[0]"], this.calmData);
    gl.uniform1fv(p.uniforms["uCalmStrength[0]"], strength);
    gl.uniform1f(p.uniforms.uFeather, 32 * this.dpr);
  }

  /** Drags the current inside the calm rectangles. Call once per frame, with its dt, before step(). */
  obstruct(dt = 1 / 60) {
    this.packCalm();
    if (!this.calm.length) return;
    const gl = this.gl;
    const p = this.programs.obstacle;
    gl.useProgram(p.program);
    gl.uniform2f(p.uniforms.texelSize, this.velocity.texelX, this.velocity.texelY);
    gl.uniform1i(p.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform2f(p.uniforms.uViewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(p.uniforms.uDrag, 1 - Math.exp(-dt * 3));
    // The current is slowed by each block's hold, not its strength: the device is calm to look at
    // (its caption sits on the liquid) but lets the river through, since it is where it comes from.
    this.setCalm(p, this.calmHold);
    this.blit(this.velocity.write);
    this.velocity.swap();
  }

  /** One pass of the separable blur from `source` (texel size `tx`, `ty`) into `target`. */
  private blurPass(source: WebGLTexture, target: FBO, dx: number, dy: number) {
    const gl = this.gl;
    const p = this.programs.blur;
    gl.useProgram(p.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source);
    gl.uniform1i(p.uniforms.uSource, 0);
    gl.uniform2f(p.uniforms.uDir, dx, dy);
    this.blit(target);
  }

  /** Rebuilds the smooth field (and its wide twin) from the dye. */
  private smooth() {
    const d = this.dye;
    const f = this.field;
    // About 4 CSS px of blur: enough to erase texel steps, half-float rounding and the finest
    // wrinkles and loops (the lines keep their own fixed width, so they stay crisp).
    this.blurPass(d.read.texture, this.fieldTmp, d.texelX * 2.4, 0);
    this.blurPass(this.fieldTmp.texture, f, 0, f.texelY * 1.2);
    // About 25 CSS px: a stray fleck all but vanishes in it, a body of dye does not.
    this.blurPass(f.texture, this.wideTmp, f.texelX * 3.2, 0);
    this.blurPass(this.wideTmp.texture, this.wide, 0, this.wide.texelY * 0.9);
  }

  /** Draws the dye to the canvas. */
  render() {
    const gl = this.gl;
    const p = this.programs.display;
    const c = this.colors;
    this.packCalm();
    gl.disable(gl.BLEND);
    this.smooth();
    gl.useProgram(p.program);
    gl.uniform2f(p.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform2f(p.uniforms.uFieldTexel, this.field.texelX, this.field.texelY);
    gl.uniform2f(p.uniforms.uViewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1i(p.uniforms.uField, this.field.attach(0));
    gl.uniform1i(p.uniforms.uVelocity, this.velocity.read.attach(1));
    gl.uniform1i(p.uniforms.uWide, this.wide.attach(2));
    gl.uniform1f(p.uniforms.uTime, this.time);
    gl.uniform1f(p.uniforms.uDpr, this.dpr);
    gl.uniform3f(p.uniforms.uBg, ...c.bg);
    gl.uniform3f(p.uniforms.uNeutral, ...c.neutral);
    gl.uniform3f(p.uniforms.uAccent, ...c.accent);
    gl.uniform3f(p.uniforms.uBg2, ...c.invert.bg);
    gl.uniform3f(p.uniforms.uNeutral2, ...c.invert.neutral);
    gl.uniform3f(p.uniforms.uAccent2, ...c.invert.accent);
    gl.uniform1f(p.uniforms.uNeutralMax, c.neutralMax);
    gl.uniform1f(p.uniforms.uAccentMax, c.accentMax);
    gl.uniform1f(p.uniforms.uShading, c.shading);
    gl.uniform1f(p.uniforms.uShading2, c.invert.shading);
    gl.uniform1f(p.uniforms.uFill, c.fill);
    gl.uniform1f(p.uniforms.uLines, c.lines);
    gl.uniform1f(p.uniforms.uSteps, c.steps);
    gl.uniform1f(p.uniforms.uCalmLines, c.calmLines ?? 0);
    const h = gl.drawingBufferHeight;
    const k = this.dpr;
    const b = [0, 0, 0, 0];
    this.bands.slice(0, 2).forEach((band, i) => {
      b[i * 2] = h - band.top * k;
      b[i * 2 + 1] = h - band.bottom * k;
    });
    // Off bands sit far off screen, so neither their area nor their waterline shows.
    if (this.bands.length < 2) b.splice(2, 2, -10000, -10000);
    if (this.bands.length < 1) b.splice(0, 2, -10000, -10000);
    gl.uniform4f(p.uniforms.uBands, b[0], b[1], b[2], b[3]);
    this.setCalm(p);
    this.blit(null);
  }

  /** Uploads an image (already decoded) as a texture for drawPlane. */
  createTexture(image: TexImageSource): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return texture;
  }

  deleteTexture(texture: WebGLTexture) {
    this.gl.deleteTexture(texture);
  }

  /** Draws one image plane over the rendered liquid (call after render()). */
  drawPlane(d: PlaneDraw) {
    const gl = this.gl;
    const p = this.programs.plane;
    const k = this.dpr;
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;
    const margin = 64;
    const x0 = (d.rect.left - margin) * k;
    const x1 = (d.rect.left + d.rect.width + margin) * k;
    const yTop = (d.rect.top - margin) * k;
    const yBottom = (d.rect.top + d.rect.height + margin) * k;
    // Clip space: y up, so the quad's first corner is the bottom-left.
    const cx0 = (x0 / W) * 2 - 1;
    const cx1 = (x1 / W) * 2 - 1;
    const cy0 = 1 - (yBottom / H) * 2;
    const cy1 = 1 - (yTop / H) * 2;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(p.program);
    gl.uniform4f(p.uniforms.uQuad, cx0, cy0, cx1, cy1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, d.texture);
    gl.uniform1i(p.uniforms.uImage, 0);
    gl.uniform1i(p.uniforms.uVelocity, this.velocity.read.attach(1));
    gl.uniform2f(p.uniforms.uSize, d.rect.width * k, d.rect.height * k);
    gl.uniform1f(p.uniforms.uMargin, margin * k);
    gl.uniform1f(p.uniforms.uRadius, d.radius * k);
    gl.uniform1f(p.uniforms.uBend, d.bend);
    gl.uniform2f(p.uniforms.uMouse, d.mouse.x * k, d.mouse.y * k);
    gl.uniform1f(p.uniforms.uHover, d.hover);
    gl.uniform1f(p.uniforms.uReveal, d.reveal);
    gl.uniform1f(p.uniforms.uTime, this.time);
    gl.uniform1f(p.uniforms.uDpr, k);
    gl.uniform1f(p.uniforms.uRefract, d.refract);
    gl.uniform3f(p.uniforms.uAccent, ...this.colors.accent);
    gl.viewport(0, 0, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.BLEND);
  }

  /**
   * Adds a splat at (x, y) in UV space (0..1, y up): a push of (dx, dy) and an amount of each dye.
   * `radius` is a fraction of the shorter side, roughly.
   */
  splat(x: number, y: number, dx: number, dy: number, neutral: number, accent: number, radius: number) {
    const gl = this.gl;
    const p = this.programs.splat;
    const aspect = this.canvas.width / this.canvas.height;
    const r = aspect > 1 ? (radius / 100) * aspect : radius / 100;
    gl.useProgram(p.program);
    gl.uniform1i(p.uniforms.uTarget, this.velocity.read.attach(0));
    gl.uniform1f(p.uniforms.aspectRatio, aspect);
    gl.uniform2f(p.uniforms.point, x, y);
    gl.uniform3f(p.uniforms.color, dx, dy, 0);
    gl.uniform1f(p.uniforms.radius, r);
    this.blit(this.velocity.write);
    this.velocity.swap();

    if (neutral > 0 || accent > 0) {
      gl.uniform1i(p.uniforms.uTarget, this.dye.read.attach(0));
      gl.uniform3f(p.uniforms.color, neutral, accent, 0);
      this.blit(this.dye.write);
      this.dye.swap();
    }
  }

  /** Adds dye only (no push) at (x, y) in UV space: a thread laid into whatever current is there. */
  ink(x: number, y: number, neutral: number, accent: number, radius: number) {
    if (neutral <= 0 && accent <= 0) return;
    const gl = this.gl;
    const p = this.programs.splat;
    const aspect = this.canvas.width / this.canvas.height;
    gl.useProgram(p.program);
    gl.uniform1i(p.uniforms.uTarget, this.dye.read.attach(0));
    gl.uniform1f(p.uniforms.aspectRatio, aspect);
    gl.uniform2f(p.uniforms.point, x, y);
    gl.uniform3f(p.uniforms.color, neutral, accent, 0);
    gl.uniform1f(p.uniforms.radius, aspect > 1 ? (radius / 100) * aspect : radius / 100);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  /** Resizes the drawing buffer to the canvas's CSS size times `dpr`. Returns true if it changed. */
  resize(dpr: number): boolean {
    this.dpr = dpr;
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width === w && this.canvas.height === h) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    this.initFramebuffers();
    return true;
  }

  dispose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "compile failed");
  return s;
}

function supportedFormat(gl: WebGLRenderingContext, internal: number, format: number, type: number): Format | null {
  if (!renderable(gl, internal, format, type)) {
    const gl2 = gl as WebGL2RenderingContext;
    if (internal === gl2.R16F) return supportedFormat(gl, gl2.RG16F, gl2.RG, type);
    if (internal === gl2.RG16F) return supportedFormat(gl, gl2.RGBA16F, gl.RGBA, type);
    return null;
  }
  return { internal, format };
}

function renderable(gl: WebGLRenderingContext, internal: number, format: number, type: number) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, 4, 4, 0, format, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
}
