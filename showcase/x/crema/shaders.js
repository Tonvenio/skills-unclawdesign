// Tidewater "Crema": GLSL for the cup. Simulation runs in cup space: uv in [0,1]², liquid is the inscribed disc.

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

const NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = m * p + 7.31; a *= 0.5; } return s; }
`;

// ── crema pattern: computed once into a texture (G thickness, B tiger mottling) ──
export const PATTERN = HEAD + NOISE + `
uniform float uSeed;
// worley spots, returns distance to nearest jittered point and that point's random size
vec2 spots(vec2 p){
  vec2 i = floor(p), f = fract(p); float best = 9.0, sz = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y)); vec2 h = hash22(i + g);
    vec2 d = g + h - f; float dd = dot(d, d);
    if (dd < best){ best = dd; sz = hash12(i + g + 19.7); }
  }
  return vec2(sqrt(best), sz);
}
void main(){
  vec2 q = (vUv - 0.5) * 2.0;
  float r = length(q);
  vec2 s = vec2(uSeed * 3.7, uSeed * 1.9);
  vec2 w1 = vec2(fbm(q * 1.4 + s), fbm(q * 1.4 + s + 5.2));
  vec2 w2 = vec2(fbm(q * 2.0 + 2.0 * w1 + 1.7), fbm(q * 2.0 + 2.0 * w1 + 9.2));
  vec2 w = q + 0.32 * (w2 - 0.5);
  // freckles at three scales; stirring stretches them into tiger stripes
  vec2 a1 = spots(w * 21.0 + w1 * 3.0);
  vec2 a2 = spots(w * 10.0 + 17.0 + w2 * 2.0);
  vec2 a3 = spots(w * 46.0 + 5.0);
  float dens = smoothstep(0.28, 0.72, fbm(w * 2.3 + 13.0));
  float edge = smoothstep(0.45, 0.95, r);
  float f1 = smoothstep(0.34 * a1.y + 0.12, 0.02, a1.x) * step(0.40, a1.y);
  float f2 = smoothstep(0.30 * a2.y + 0.10, 0.02, a2.x) * step(0.60, a2.y);
  float f3 = smoothstep(0.28, 0.04, a3.x) * step(0.42, a3.y) * 0.8;
  float tiger = f1 * (0.25 + 0.85 * dens) + f2 * (0.2 + 0.8 * dens) + f3 * (0.25 + 0.5 * edge + 0.3 * dens);
  float ridge = 1.0 - abs(fbm(w * 2.8 + 2.0) * 2.0 - 1.0);
  tiger = clamp(max(tiger, smoothstep(0.80, 0.96, ridge) * 0.45 * dens), 0.0, 1.0);
  // thickness: a blond pool where the stream landed, hazel elsewhere, a darker ring at the wall
  float pool = smoothstep(0.85, 0.0, length(q - vec2(-0.12, 0.10) - 0.25 * (w2 - 0.5)));
  float c = 0.64 + 0.26 * fbm(w * 1.6 + 21.0) + 0.50 * pool * pool - 0.14 * dens;
  c -= 0.50 * smoothstep(0.62, 0.99, r);
  o = vec4(0.0, clamp(c, 0.0, 1.3), tiger, 1.0);
}`;

// ── generic multi-splat: adds up to 8 gaussians to a field ──
export const SPLAT = HEAD + `
uniform sampler2D uTarget;
uniform int uN;
uniform vec4 uP[8];   // x, y, sigma²
uniform vec4 uV[8];   // value
uniform float uClampLo, uClampHi;
void main(){
  vec4 base = texture(uTarget, vUv);
  for (int i = 0; i < 8; i++){
    if (i >= uN) break;
    vec2 d = vUv - uP[i].xy;
    base += uV[i] * exp(-dot(d, d) / uP[i].z);
  }
  o = clamp(base, vec4(uClampLo), vec4(uClampHi));
}`;

export const ADVECT_VEL = HEAD + `
uniform sampler2D uVel;
uniform vec2 uTexel;
uniform float uDt, uDiss;
void main(){
  vec2 v = texture(uVel, vUv).xy;
  vec2 nv = texture(uVel, vUv - uDt * v * uTexel).xy / (1.0 + uDiss * uDt);
  nv *= 1.0 - smoothstep(0.94, 1.0, length(vUv - 0.5) * 2.0);
  o = vec4(nv, 0.0, 1.0);
}`;

export const CURL = HEAD + `
uniform sampler2D uVel; uniform vec2 uTexel;
void main(){
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

export const VORTICITY = HEAD + `
uniform sampler2D uVel, uCurl; uniform vec2 uTexel; uniform float uCurlK, uDt;
void main(){
  float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= uCurlK * C; f.y *= -1.0;
  o = vec4(clamp(texture(uVel, vUv).xy + f * uDt, -1000.0, 1000.0), 0.0, 1.0);
}`;

export const DIVERGENCE = HEAD + `
uniform sampler2D uVel; uniform vec2 uTexel;
void main(){
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

export const SCALE = HEAD + `
uniform sampler2D uTex; uniform float uK;
void main(){ o = texture(uTex, vUv) * uK; }`;

export const PRESSURE = HEAD + `
uniform sampler2D uP, uDiv; uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  o = vec4((L + R + B + T - texture(uDiv, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

export const GRADIENT = HEAD + `
uniform sampler2D uP, uVel; uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  o = vec4(texture(uVel, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`;

// ── dye: advect by the flow, let milk fade, let crema heal towards its pattern ──
export const DYE = HEAD + `
uniform sampler2D uDye, uVel, uPattern;
uniform vec2 uVelTexel;
uniform float uDt, uMilkDecay, uCremaTarget, uCremaRelax, uTigerRelax;
void main(){
  vec2 v = texture(uVel, vUv).xy;
  vec4 d = texture(uDye, vUv - uDt * v * uVelTexel);
  vec4 pat = texture(uPattern, vUv);
  d.r *= exp(-uMilkDecay * uDt);
  d.g = mix(d.g, pat.g * uCremaTarget, 1.0 - exp(-uCremaRelax * uDt));
  d.b = mix(d.b, pat.b, 1.0 - exp(-uTigerRelax * uDt));
  o = d;
}`;

// ── ripples: damped wave equation, reflecting off the cup wall ──
export const WAVE = HEAD + `
uniform sampler2D uWave; uniform vec2 uTexel; uniform float uC, uDamp;
void main(){
  vec2 s = texture(uWave, vUv).xy;
  float l = texture(uWave, vUv - vec2(uTexel.x, 0.0)).x;
  float rr = texture(uWave, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture(uWave, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture(uWave, vUv - vec2(0.0, uTexel.y)).x;
  float h = (2.0 * s.x - s.y + uC * (l + rr + t + b - 4.0 * s.x)) * uDamp;
  h *= 1.0 - smoothstep(0.965, 0.995, length(vUv - 0.5) * 2.0);
  o = vec4(clamp(h, -4.0, 4.0), s.x, 0.0, 1.0);
}`;

// ── composite: table, cup(s), liquid, light, then scrims and the GL type ──
export const COMPOSITE = HEAD + NOISE + `
uniform vec2 uRes;
uniform float uTime, uPx, uFade, uWaveK;
uniform sampler2D uDye, uWave, uAtlas;
uniform vec2 uWaveTexel, uDyeTexel, uAtlasSize;
uniform vec3 uCup0, uCup1;
uniform float uCup1Vis;
uniform vec4 uLook;            // crema, clear, calm, cloud
uniform vec3 cBg, cSurf, cText, cMilk, cCrema, cUmber, cCoffee;
uniform vec3 sBg, sInkL, sInkD;
uniform float uLumL, uLumD;
uniform int uWordN;
uniform vec4 uWordRect[8];
uniform vec4 uWordUV[8];
uniform float uWordRev[8];
uniform int uScrimN;
uniform vec4 uScrim[6];
uniform float uScrimAmt;
uniform float uLumText;
uniform float uScrimT[6];   // per block: the background luminance its text needs (max for light text, min for dark)

const vec2 LDIR = vec2(-0.6, -0.8);
const float LIP_IN = 1.075;
const float LIP_OUT = 1.125;
const float HANDLE_A = 0.50;

vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
float sdCapsule(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }

float caustic(vec2 uv, float t){
  vec2 p = uv * 6.2831 - 250.0;
  vec2 i = p; float c = 1.0;
  for (int n = 0; n < 4; n++){
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 2.0);
}

vec3 tableColor(vec2 p){
  vec2 q = p / uRes.y;
  float pool = smoothstep(1.6, 0.0, length(q - vec2(0.12, -0.05)));
  vec2 c = p / uPx;
  float n = vnoise(c * 0.005) * 0.65 + vnoise(c * 0.045) * 0.35;
  return cBg * (0.78 + 0.36 * pool) * (0.96 + 0.08 * n);
}

// handle seen from above: a loop with the table showing through
float handleSD(vec2 d, out float hole){
  vec2 hd = rot(d, -HANDLE_A);
  float outer = sdCapsule(hd, vec2(1.02, 0.0), vec2(1.33, 0.0), 0.072);
  hole = sdCapsule(hd, vec2(1.15, 0.0), vec2(1.25, 0.0), 0.026);
  return max(outer, -hole);
}

float cupShadow(vec2 p, vec3 C){
  vec2 d = (p - C.xy) / C.z;
  float soft = smoothstep(1.7, 0.98, length(d - vec2(0.12, 0.17))) * 0.55;
  float contact = smoothstep(1.2, 1.09, length(d - vec2(0.02, 0.035))) * 0.55;
  float hh; float hs = handleSD(d - vec2(0.09, 0.13), hh);
  float hsh = smoothstep(0.09, -0.03, hs) * 0.42;
  return 1.0 - max(max(soft, contact), hsh);
}

// liquid surface: returns colour, writes normal, gloss and a smoothed version of the colour (for choosing type ink)
vec3 liquid(vec2 dl, float rl, vec2 uv, out vec3 N, out float gloss, out vec3 smoothCol){
  vec4 dye = texture(uDye, uv);
  float m = clamp(dye.r, 0.0, 1.25);
  float c = clamp(dye.g, 0.0, 1.3);
  float t = clamp(dye.b, 0.0, 1.0);
  vec2 e = uWaveTexel;
  float hL = texture(uWave, uv - vec2(e.x, 0.0)).x, hR = texture(uWave, uv + vec2(e.x, 0.0)).x;
  float hB = texture(uWave, uv - vec2(0.0, e.y)).x, hT = texture(uWave, uv + vec2(0.0, e.y)).x;
  vec2 g = vec2(hR - hL, hT - hB) * uWaveK * mix(0.4, 1.0, uLook.y);
  vec2 ed = uDyeTexel * 2.0;
  vec4 dL = texture(uDye, uv - vec2(ed.x, 0.0)), dR = texture(uDye, uv + vec2(ed.x, 0.0));
  vec4 dB = texture(uDye, uv - vec2(0.0, ed.y)), dT = texture(uDye, uv + vec2(0.0, ed.y));
  float clear = uLook.y, opaque = 1.0 - clear;
  vec2 relief = vec2(dR.g - dL.g, dT.g - dB.g) * 0.7 * opaque + vec2(dR.r - dL.r, dT.r - dB.r) * 1.1;
  float foam = vnoise(uv * 1100.0);
  N = normalize(vec3(-(g + relief * 0.6), 1.0));

  // espresso: hazel crema, blond where thick, tiger flecks in umber
  vec3 gold = cCrema;
  vec3 hazel = mix(cUmber, cCrema, 0.46);
  vec3 cremaDark = mix(cUmber, cCoffee, 0.34);
  vec3 cremaLight = mix(cCrema, cMilk, 0.24);
  float cv = c * opaque;
  vec3 esp = mix(cCoffee, cUmber * 0.8, smoothstep(0.0, 0.40, cv));
  esp = mix(esp, hazel, smoothstep(0.32, 0.78, cv));
  esp = mix(esp, gold, smoothstep(0.78, 1.08, cv));
  esp = mix(esp, cremaLight, smoothstep(1.08, 1.3, cv));
  vec3 espSmooth = esp;
  esp = mix(esp, cremaDark, t * smoothstep(0.15, 0.55, cv) * 0.62);
  esp = mix(esp, cremaDark, smoothstep(0.88, 0.995, rl) * smoothstep(0.1, 0.5, cv) * 0.6);
  esp *= 1.0 + (foam - 0.5) * 0.09 * smoothstep(0.1, 0.6, cv);

  // filter: translucent, amber at the shallow edge, caustics on the bottom
  vec3 clr = vec3(0.0), clrSmooth = vec3(0.0);
  if (clear > 0.002){
    float deep = smoothstep(0.995, 0.62, rl);
    vec3 amber = mix(cUmber, cCrema, 0.30);
    clr = mix(amber * 0.55, cCoffee * 0.26, deep);
    clr *= 0.9 + 0.2 * vnoise(dl * 3.0 + uTime * 0.05);
    clrSmooth = clr;
    vec2 cu = dl * 1.25 + N.xy * 0.30;
    float caus = caustic(cu + vec2(0.13, 0.27), uTime * 0.16 + 3.0) * (1.0 - uLook.z * 0.85);
    float patches = smoothstep(0.30, 0.75, fbm(dl * 1.6 + vec2(uTime * 0.02, 3.0)));
    clr += mix(amber, cCrema, 0.35) * caus * (0.22 + 0.30 * (1.0 - deep)) * (0.45 + 0.9 * patches);
    float cloud = uLook.w;
    clr = mix(clr, mix(cUmber, cCoffee, 0.5) * (0.85 + 0.3 * vnoise(uv * 160.0)), cloud * 0.6);
    clrSmooth = mix(clrSmooth, mix(cUmber, cCoffee, 0.5), cloud * 0.6);
  }
  vec3 col = mix(esp, clr, clear);
  smoothCol = mix(espSmooth, clrSmooth, clear);

  // milk: crisp-edged microfoam with a fine brown outline where it meets the crema
  float mAvg = (dL.r + dR.r + dB.r + dT.r) * 0.25;
  float mm = smoothstep(0.24, 0.50, m);
  float edge = smoothstep(0.06, 0.24, m) * (1.0 - smoothstep(0.24, 0.46, m));
  vec3 milk = cMilk * (0.95 + 0.06 * foam);
  vec3 milkCloud = mix(cCrema, cMilk, 0.45);
  col = mix(col, cremaDark * 0.8, edge * 0.5 * opaque);
  col = mix(col, milkCloud, smoothstep(0.03, 0.7, m) * clear * 0.9);
  col = mix(col, milk, mm * (0.97 - clear * 0.4));
  smoothCol = mix(smoothCol, milkCloud, smoothstep(0.03, 0.7, mAvg) * clear * 0.9);
  smoothCol = mix(smoothCol, cMilk, smoothstep(0.24, 0.5, mAvg) * (0.97 - clear * 0.4));

  gloss = mix(mix(0.035, 0.16, mm), mix(0.85, 0.5, uLook.w), clear) + uLook.z * 0.15;
  return col;
}

vec3 windowRefl(vec2 p, vec3 C, vec2 n){
  float big = smoothstep(0.5, 1.0, C.z / uRes.y);
  vec2 anchor = mix(C.xy + vec2(-0.42, -0.52) * C.z, vec2(0.26 * uRes.x, 0.20 * uRes.y), big);
  float sc = mix(C.z, 0.36 * uRes.y, big);
  vec2 q = (p - anchor) / sc + n * mix(1.8, 0.9, big);
  vec2 w = rot(q, -0.16) + 0.02 * (1.0 - big) * vec2(vnoise(q * 4.0 + 3.0), vnoise(q * 4.0 + 9.0));
  // an arched window: tall pane with a round top, no glazing bars
  float hw = 0.14, hh = 0.27;
  vec2 bq = abs(w - vec2(0.0, 0.07)) - vec2(hw, hh);
  float sd = min(length(max(bq, 0.0)) + min(max(bq.x, bq.y), 0.0), length(w - vec2(0.0, 0.07 - hh)) - hw);
  float pane = smoothstep(mix(0.05, 0.02, big), -0.02, sd);
  float sky = pane * (0.10 + 0.62 * smoothstep(0.36, -0.42, w.y) + 0.08 * vnoise(w * 9.0)) * mix(1.0, 0.75, big);
  float halo = smoothstep(0.95, 0.0, length(w * vec2(0.8, 0.6))) * 0.06;
  // the glint: the sun caught in the corner of the window
  float g = length((w - vec2(0.10, -0.16)) * vec2(1.0, 1.6));
  halo += smoothstep(0.035, 0.0, g) * 1.4 + smoothstep(0.16, 0.0, g) * 0.18;
  return mix(cText, cMilk, 0.25) * (sky + halo);
}

vec4 drawCup(vec2 p, vec3 C, float flip, vec3 under, out vec3 Nout, out float isLiquid, out vec3 smoothOut){
  Nout = vec3(0.0, 0.0, 1.0); isLiquid = 0.0; smoothOut = under;
  vec2 d = (p - C.xy) / C.z;
  float r = length(d);
  float aa = 1.3 / C.z;
  vec3 col = under;
  vec3 cer = mix(cText, cMilk, 0.18) * 0.80;
  vec3 L = normalize(vec3(LDIR * 0.6, 1.0));
  float speck = smoothstep(0.90, 0.97, vnoise(d * 190.0)) * 0.10;
  // handle
  float hole; float hs = handleSD(d, hole);
  if (hs < aa * 2.0 && r > 0.9){
    vec2 hd = rot(d, -HANDLE_A);
    float across = clamp(hd.y / 0.072, -1.0, 1.0);
    float lit = 0.55 + 0.42 * clamp(-across * 0.8 + 0.3, -1.0, 1.0);
    vec3 hc = cer * lit * (1.0 - speck) + cText * 0.25 * pow(max(0.0, 1.0 - abs(across + 0.45) * 2.4), 5.0);
    col = mix(col, hc, smoothstep(aa, -aa, hs));
    col *= 1.0 - 0.35 * smoothstep(0.02, -0.01, hole);
  }
  if (r > LIP_OUT + aa * 2.0) return vec4(col, 0.0);

  // perspective: the liquid sits lower, so it shifts towards the view centre
  vec2 view = (C.xy - uRes * 0.5) / uRes.y;
  view *= min(1.0, 0.9 / max(length(view), 1e-3));
  vec2 dl = (d + view * 0.045) / 0.99;
  float rl = length(dl);

  // lip: a rounded rim catching the window light
  float lipN = clamp((r - LIP_IN) / (LIP_OUT - LIP_IN), 0.0, 1.0) * 2.0 - 1.0;
  vec3 nLip = normalize(vec3((d / max(r, 1e-4)) * lipN * 0.95, sqrt(max(0.0, 1.0 - lipN * lipN)) + 0.05));
  float lipLit = clamp(dot(nLip, L), 0.0, 1.0);
  float lipSpec = pow(clamp(dot(reflect(-L, nLip), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 18.0);
  vec3 lipCol = cer * (0.50 + 0.62 * lipLit) * (1.0 - speck) + cText * 0.35 * lipSpec;
  // inner wall: lit on the side facing the window, deeper towards the liquid
  float wallLit = clamp(dot(-d / max(r, 1e-4), normalize(LDIR)) * 0.5 + 0.5, 0.0, 1.0);
  float depth = clamp((LIP_IN - r) / 0.10, 0.0, 1.0);
  vec3 wallCol = cer * (0.22 + 0.80 * wallLit * wallLit) * (1.0 - 0.45 * depth) * (1.0 - speck * 0.7);

  vec3 body = mix(wallCol, lipCol, smoothstep(LIP_IN - aa, LIP_IN + aa, r));
  float bodyA = smoothstep(LIP_OUT + aa, LIP_OUT - aa, r);
  col = mix(col, body, bodyA);
  smoothOut = col;

  float liqA = smoothstep(1.0 + aa, 1.0 - aa, rl) * smoothstep(LIP_IN + aa, LIP_IN - aa, r);
  if (liqA > 0.0){
    vec2 uv = (flip > 0.5 ? -dl : dl) * 0.5 + 0.5;
    vec3 N; float gloss; vec3 sm;
    vec3 lc = liquid(dl, rl, uv, N, gloss, sm);
    if (flip > 0.5) N.xy = -N.xy;
    float diff = clamp(dot(N, L), 0.0, 1.0) / L.z;
    lc *= mix(1.0, diff, 0.7);
    // broad window light across the surface, crescent shadow from the rim
    float sky = 0.94 + 0.12 * smoothstep(1.0, -1.0, dot(dl, normalize(-LDIR)));
    lc *= sky; sm *= sky;
    float sh = smoothstep(0.84, 1.03, length(dl + normalize(LDIR) * 0.15));
    lc *= 1.0 - sh * 0.55; sm *= 1.0 - sh * 0.55;
    float men = smoothstep(0.94, 0.99, rl) * (1.0 - smoothstep(0.99, 1.0, rl));
    lc += cer * men * (0.3 + 0.8 * wallLit);
    vec3 refl = windowRefl(p, C, N.xy) * gloss;
    float fres = 0.55 + 0.45 * smoothstep(0.6, 1.0, rl);
    lc += refl * fres * (1.0 - sh * 0.7);
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    lc += cText * pow(clamp(dot(N, H), 0.0, 1.0), 900.0) * (0.1 + gloss * 2.2) * (1.0 - sh);
    col = mix(col, lc, liqA);
    smoothOut = mix(smoothOut, sm, liqA);
    Nout = N; isLiquid = liqA;
  }
  return vec4(col, bodyA);
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 col = tableColor(p);
  col *= cupShadow(p, uCup0);
  if (uCup1Vis > 0.002) col *= mix(1.0, cupShadow(p, uCup1), uCup1Vis);
  vec3 N = vec3(0.0, 0.0, 1.0); float liq = 0.0;
  vec3 N0, sm0; float l0;
  vec4 c0 = drawCup(p, uCup0, 0.0, col, N0, l0, sm0);
  vec3 smoothCol = sm0;
  col = c0.rgb; if (l0 > 0.0){ N = N0; liq = l0; }
  if (uCup1Vis > 0.002){
    vec3 N1, sm1; float l1;
    vec4 c1 = drawCup(p, uCup1, 1.0, col, N1, l1, sm1);
    col = mix(col, c1.rgb, uCup1Vis);
    smoothCol = mix(smoothCol, sm1, uCup1Vis);
    if (l1 > 0.0){ N = mix(N, N1, uCup1Vis); liq = max(liq, l1 * uCup1Vis); }
  }
  vec2 vq = (p / uRes - 0.5);
  float vig = 1.0 - 0.30 * smoothstep(0.25, 0.85, length(vq * vec2(1.0, 0.9)));
  vec3 s = mix(sBg, toSRGB(col * vig), uFade);
  vec3 ss = mix(sBg, toSRGB(smoothCol * vig), uFade);

  // scrims behind text blocks keep body text at full token contrast
  // scrims behind text blocks: darken (or lighten) only as much as each pixel needs for that block's text to pass
  vec3 ls = toLin(s), lb = toLin(sBg);
  float Ls = lum(ls), Lb = lum(lb), a = 0.0;
  bool lightText = uLumText > Lb;
  for (int i = 0; i < 6; i++){
    if (i >= uScrimN) break;
    vec4 S = uScrim[i];
    vec2 h = S.zw * 0.5;
    vec2 q = abs(p - (S.xy + h)) - h;
    float dd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    float cov = smoothstep(110.0 * uPx, 20.0 * uPx, dd);
    if (cov <= 0.0) continue;
    float need = lightText ? clamp((Ls - uScrimT[i]) / max(Ls - Lb, 1e-4), 0.0, 1.0)
                           : clamp((uScrimT[i] - Ls) / max(Lb - Ls, 1e-4), 0.0, 1.0);
    a = max(a, cov * max(need, 0.18) * uScrimAmt);
  }
  if (a > 0.0){
    s = toSRGB(mix(ls, lb, a));
    ss = toSRGB(mix(toLin(ss), lb, a));
  }

  // GL type: letters sit in the cup, ripple with it, and take the ink that contrasts with what is under them
  float A = 0.0, SH = 0.0;
  vec2 wob = N.xy * liq * 0.012;
  for (int i = 0; i < 8; i++){
    if (i >= uWordN) break;
    vec4 R = uWordRect[i];
    vec2 q = (p - R.xy) / R.zw;
    if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
    vec4 U = uWordUV[i];
    vec2 auv = U.xy + clamp(q + wob, 0.002, 0.998) * U.zw;
    float a = textureLod(uAtlas, auv, 0.0).a;
    vec2 so = vec2(4.0, 7.0) * uPx / uAtlasSize;
    float sa = textureLod(uAtlas, clamp(auv - so, U.xy, U.xy + U.zw), 2.5).a;
    float rev = uWordRev[i];
    if (rev < 0.999){
      float n = fbm(p / uPx * 0.012 + float(i) * 13.0) * 0.8 + (1.0 - q.y) * 0.2;
      float k = smoothstep(n - 0.04, n + 0.04, rev * 1.25 - 0.12);
      a *= k; sa *= k;
    }
    A = max(A, a); SH = max(SH, sa);
  }
  if (A > 0.0 || SH > 0.0){
    float lu = lum(toLin(ss));
    float cl = (uLumL + 0.05) / (lu + 0.05);
    float cd = (lu + 0.05) / (uLumD + 0.05);
    float wl = smoothstep(-0.2, 0.2, log(cl / cd));
    vec3 ink = mix(sInkD, sInkL, wl);
    s = mix(s, mix(sBg, s, 0.5), SH * 0.6 * wl * liq * (1.0 - A));
    s = mix(s, ink, A);
  }
  s += (hash12(p + fract(uTime) * 61.0) - 0.5) / 255.0;
  o = vec4(s, 1.0);
}`;
