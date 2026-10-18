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
// Changes from the original: TypeScript, no bloom or sunrays, and the dye's channels are meanings,
// not colours. Red is the neutral dye (smoke in the dark theme, ink in the light one), green is the
// accent and blue is failure, so the display pass can only ever paint the page's neutrals, its one
// accent, and the simulator's fail colour while requests are actually failing.

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };
type FBO = { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelX: number; texelY: number; attach: (id: number) => number };
type DoubleFBO = { width: number; height: number; texelX: number; texelY: number; read: FBO; write: FBO; swap: () => void };
type Format = { internal: number; format: number };

/** How many boxes of text the display pass can hold the dye back from at once. */
export const MAX_RECTS = 16;

export type FluidColors = {
  /** The page colour the fluid sits on. */
  bg: [number, number, number];
  /** The neutral dye: smoke (dark theme) or ink (light theme). */
  neutral: [number, number, number];
  accent: [number, number, number];
  /** The simulator's failure colour: only the packet carries it, and only while requests fail. */
  fail: [number, number, number];
  /** How strongly each dye can cover the page, 0 to 1. */
  neutralMax: number;
  accentMax: number;
  /** 1 adds a soft relief from the dye's gradient (the liquid's surface), 0 keeps it flat. */
  shading: number;
  /** 0 to 1: how visible the drafting grid cut into the ink is. */
  grid: number;
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
void main () {
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
#endif
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

// The display pass. Each dye goes through a soft tone curve with a floor, so thin haze vanishes
// instead of greying the page, wisps stay faint and dense cores saturate instead of clipping. It
// paints the page colour toward the neutral, then the accent, then (only while the simulator is
// failing) the fail colour. The accent is drawn mostly where its dye has an edge, so a busy system
// shows bright filaments rather than a flat tinted wash. `uRects` are boxes in canvas pixels
// (text over the liquid) where the dye is held back by `uRectStrength`, feathered at the edges.
// `uGrid` cuts a hairline drafting grid into the ink: you only see the grid where the liquid is.
const DISPLAY = `
precision highp float; precision highp sampler2D;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uTexture; uniform vec2 texelSize; uniform vec2 uSize; uniform float uDpr;
uniform vec3 uBg; uniform vec3 uNeutral; uniform vec3 uAccent; uniform vec3 uFail;
uniform float uNeutralMax; uniform float uAccentMax; uniform float uShading; uniform float uGrid;
uniform vec4 uRects[${MAX_RECTS}]; uniform float uRectStrength[${MAX_RECTS}]; uniform int uRectCount;
float tone (float d) { return smoothstep(0.035, 0.7, d); }
void main () {
  vec3 c = texture2D(uTexture, vUv).rgb;
  vec2 px = vUv * uSize;
  float hold = 0.0;
  float feather = 28.0 * uDpr;
  for (int i = 0; i < ${MAX_RECTS}; i++) {
    if (i >= uRectCount) break;
    vec4 r = uRects[i];
    vec2 lo = smoothstep(r.xy - feather, r.xy + feather * 0.25, px);
    vec2 hi = 1.0 - smoothstep(r.zw - feather * 0.25, r.zw + feather, px);
    hold = max(hold, uRectStrength[i] * lo.x * lo.y * hi.x * hi.y);
  }
  float guard = 1.0 - hold;
  float n = tone(c.r) * guard;
  float gx = texture2D(uTexture, vR).g - texture2D(uTexture, vL).g;
  float gy = texture2D(uTexture, vT).g - texture2D(uTexture, vB).g;
  float edge = smoothstep(0.004, 0.03, length(vec2(gx, gy)));
  float core = smoothstep(0.06, 0.5, c.g);
  float a = clamp(core * 0.55 + edge * smoothstep(0.04, 0.2, c.g) * 0.6, 0.0, 1.0) * guard;
  float f = smoothstep(0.04, 0.45, c.b) * mix(1.0, guard, 0.6);
  vec3 col = mix(uBg, uNeutral, n * uNeutralMax);
  col = mix(col, uAccent, a * uAccentMax);
  col = mix(col, uFail, f * 0.75);
  if (uGrid > 0.0) {
    float cell = 32.0 * uDpr;
    vec2 m = mod(px, cell);
    float line = 1.0 - smoothstep(0.0, 1.1 * uDpr, min(min(m.x, cell - m.x), min(m.y, cell - m.y)));
    col = mix(col, uBg, line * uGrid * smoothstep(0.2, 0.9, n) * (1.0 - a));
  }
  if (uShading > 0.0) {
    float l = tone(texture2D(uTexture, vL).r + texture2D(uTexture, vL).g);
    float rr = tone(texture2D(uTexture, vR).r + texture2D(uTexture, vR).g);
    float t = tone(texture2D(uTexture, vT).r + texture2D(uTexture, vT).g);
    float b = tone(texture2D(uTexture, vB).r + texture2D(uTexture, vB).g);
    vec3 normal = normalize(vec3(l - rr, b - t, 0.04));
    float light = dot(normal, normalize(vec3(-0.4, 0.6, 1.0)));
    col += uShading * (light - 0.86) * 0.32 * (n + a) * guard;
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
  readonly canvas: HTMLCanvasElement;
  config: FluidConfig;
  colors: FluidColors;
  /** Boxes in viewport CSS pixels (left, top, right, bottom) where the dye is held back, and how much (0 to 1). */
  protect: Array<{ left: number; top: number; right: number; bottom: number; strength: number }> = [];
  private rectData = new Float32Array(MAX_RECTS * 4);
  private rectStrength = new Float32Array(MAX_RECTS);

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
    const make = (source: string, keywords: string[] = []) => {
      const defines = keywords.map((k) => `#define ${k}\n`).join("");
      const fragment = shader(gl, gl.FRAGMENT_SHADER, defines + source);
      const program = gl.createProgram()!;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
      const uniforms: Program["uniforms"] = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(program, i)!.name;
        uniforms[name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, name);
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
    this.blit(velocity.write);
    velocity.swap();

    if (!this.ext.linear) gl.uniform2f(p.advection.uniforms.dyeTexelSize, this.dye.texelX, this.dye.texelY);
    gl.uniform1i(p.advection.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(p.advection.uniforms.uSource, this.dye.read.attach(1));
    gl.uniform1f(p.advection.uniforms.dissipation, config.densityDissipation);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  /** Draws the dye to the canvas. */
  render() {
    const gl = this.gl;
    const p = this.programs.display;
    const c = this.colors;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const scale = w / Math.max(1, this.canvas.clientWidth);
    const count = Math.min(MAX_RECTS, this.protect.length);
    for (let i = 0; i < count; i++) {
      const r = this.protect[i];
      // Canvas pixels, y up.
      this.rectData[i * 4] = r.left * scale;
      this.rectData[i * 4 + 1] = h - r.bottom * scale;
      this.rectData[i * 4 + 2] = r.right * scale;
      this.rectData[i * 4 + 3] = h - r.top * scale;
      this.rectStrength[i] = r.strength;
    }
    gl.useProgram(p.program);
    gl.uniform2f(p.uniforms.texelSize, 1 / w, 1 / h);
    gl.uniform2f(p.uniforms.uSize, w, h);
    gl.uniform1f(p.uniforms.uDpr, scale);
    gl.uniform1i(p.uniforms.uTexture, this.dye.read.attach(0));
    gl.uniform3f(p.uniforms.uBg, ...c.bg);
    gl.uniform3f(p.uniforms.uNeutral, ...c.neutral);
    gl.uniform3f(p.uniforms.uAccent, ...c.accent);
    gl.uniform3f(p.uniforms.uFail, ...c.fail);
    gl.uniform1f(p.uniforms.uNeutralMax, c.neutralMax);
    gl.uniform1f(p.uniforms.uAccentMax, c.accentMax);
    gl.uniform1f(p.uniforms.uShading, c.shading);
    gl.uniform1f(p.uniforms.uGrid, c.grid);
    gl.uniform4fv(p.uniforms.uRects, this.rectData);
    gl.uniform1fv(p.uniforms.uRectStrength, this.rectStrength);
    gl.uniform1i(p.uniforms.uRectCount, count);
    this.blit(null);
  }

  /**
   * Adds a splat at (x, y) in UV space (0..1, y up): a push of (dx, dy) and an amount of each dye.
   * `radius` is a fraction of the shorter side, roughly.
   */
  splat(x: number, y: number, dx: number, dy: number, neutral: number, accent: number, radius: number, fail = 0) {
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

    if (neutral > 0 || accent > 0 || fail > 0) {
      gl.uniform1i(p.uniforms.uTarget, this.dye.read.attach(0));
      gl.uniform3f(p.uniforms.color, neutral, accent, fail);
      this.blit(this.dye.write);
      this.dye.swap();
    }
  }

  /** Resizes the drawing buffer to the canvas's CSS size times `dpr`. Returns true if it changed. */
  resize(dpr: number): boolean {
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
