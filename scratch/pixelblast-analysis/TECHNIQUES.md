# Animation Techniques Used in PixelBlast

## Summary of Actual Techniques

PixelBlast combines several classic computer graphics techniques to create an animated, pixelated aesthetic:

---

## 1. Fractal Brownian Motion (FBM)

**Location:** Lines 198-209

**What it is:**
Layering multiple octaves of Perlin noise at different frequencies and amplitudes to create natural-looking, organic patterns.

**The code:**
```glsl
float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);  // Add octave
    freq *= FBM_LACUNARITY;          // 1.25x frequency
    amp  *= FBM_GAIN;                // 1.0x amplitude
  }
  return sum * 0.5 + 0.5;
}
```

**Why it's used:**
Creates complex, natural-looking patterns from simple noise. By adding 5 octaves, you get detail at multiple scales.

**Animation:**
Time `t` is passed as the 3rd dimension of the noise function, causing the pattern to smoothly evolve.

---

## 2. Perlin Noise (Value Noise)

**Location:** Lines 177-196

**What it is:**
A gradient noise function that produces smooth, continuous random values. Invented by Ken Perlin in 1983.

**Key characteristics:**
- Deterministic: same input always gives same output
- Smooth: has continuous derivatives
- Random-looking but controllable

**The code:**
```glsl
float vnoise(vec3 p){
  vec3 ip = floor(p);  // Integer part
  vec3 fp = fract(p);  // Fractional part

  // Sample 8 corners of cube
  float n000 = hash11(dot(ip + vec3(0,0,0), vec3(1,57,113)));
  float n100 = hash11(dot(ip + vec3(1,0,0), vec3(1,57,113)));
  // ... etc

  // Smoothstep interpolation
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);

  // Trilinear interpolation
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}
```

**Why it's used:**
Base building block for procedural textures. Much more visually pleasing than pure random noise.

---

## 3. Bayer Ordered Dithering

**Location:** Lines 164-169, 270-271

**What it is:**
A classic ordered dithering technique using a Bayer matrix to convert continuous values to binary (on/off) patterns.

**The code:**
```glsl
float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

// Usage:
float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
float bw = step(0.5, feed + bayer);  // Threshold
```

**Why it's used:**
Creates the pixelated, dithered aesthetic. Converts smooth noise gradients into discrete pixel patterns.

**Historical note:**
Bayer dithering dates back to 1973, used in early computer graphics and printing to simulate grayscale on 1-bit displays.

---

## 4. Mathematical Wave Propagation

**Location:** Lines 255-268

**What it is:**
Gaussian-enveloped circular waves emanating from click points.

**The code:**
```glsl
for (int i = 0; i < MAX_CLICKS; ++i){
  vec2 pos = uClickPos[i];
  float t = max(uTime - uClickTimes[i], 0.0);  // Time since click
  float r = distance(uv, cuv);                  // Distance from click

  float waveR = speed * t;                      // Wave radius grows
  float ring = exp(-pow((r - waveR) / thickness, 2.0));  // Gaussian ring

  float atten = exp(-dampT * t) * exp(-dampR * r);  // Decay over time & distance
  feed = max(feed, ring * atten * uRippleIntensity);
}
```

**Mathematical breakdown:**
- `waveR = speed * t`: Linear expansion
- `ring = exp(-(x²))`: Gaussian profile (bell curve)
- `atten = exp(-t) * exp(-r)`: Exponential decay

**Why it's used:**
Creates visually pleasing ripple effects without cellular automaton complexity.

---

## 5. Shape Masking

**Location:** Lines 211-230, 277-280

**What it is:**
Converts coverage values into different pixel shapes using signed distance fields (SDFs).

**Circle mask:**
```glsl
float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;  // SDF for circle
  float aa = 0.5 * fwidth(d);     // Antialiasing
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}
```

**Triangle mask:**
```glsl
float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;  // Checkerboard flip
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d = p.y - r*(1.0 - p.x);  // Half-plane SDF
  return cov * clamp(0.5 - d/fwidth(d), 0.0, 1.0);
}
```

**Diamond mask:**
```glsl
float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);  // Manhattan distance
}
```

**Why it's used:**
Adds visual variety. Same underlying pattern, different shapes.

---

## 6. Particle Trail Rendering

**Location:** Lines 6-90 (createTouchTexture)

**What it is:**
A CPU-based particle system that tracks pointer movement and renders trails to a canvas texture.

**Key mechanics:**
```javascript
const addTouch = norm => {
  const dx = norm.x - last.x;
  const dy = norm.y - last.y;
  const d = Math.sqrt(dx*dx + dy*dy);

  vx = dx / d;  // Velocity direction
  vy = dy / d;

  force = Math.min(dd * 10000, 1);  // Speed → force

  trail.push({ x, y, age: 0, force, vx, vy });
};

const update = () => {
  for (let point of trail) {
    const f = point.force * speed * (1 - point.age / maxAge);
    point.x += point.vx * f;  // Move along velocity
    point.y += point.vy * f;
    point.age++;
    if (point.age > maxAge) remove(point);
  }
};
```

**Rendering technique:**
```javascript
const color = `${((vx + 1) / 2) * 255}, ${((vy + 1) / 2) * 255}, ${intensity * 255}`;
// R = horizontal velocity
// G = vertical velocity
// B = intensity
```

**Why it's used:**
Creates interactive touch/mouse trails. The texture is then read by the liquid effect shader.

---

## 7. UV Distortion (Liquid Effect)

**Location:** Lines 92-120

**What it is:**
A post-processing shader that distorts UVs based on the touch texture.

**The code:**
```glsl
void mainUv(inout vec2 uv) {
  vec4 tex = texture2D(uTexture, uv);
  float vx = tex.r * 2.0 - 1.0;  // Decode velocity from R channel
  float vy = tex.g * 2.0 - 1.0;  // Decode velocity from G channel
  float intensity = tex.b;       // Decode intensity from B channel

  float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);

  float amt = uStrength * intensity * wave;

  uv += vec2(vx, vy) * amt;  // Displace UVs along velocity direction
}
```

**Why it's used:**
Creates liquid-like distortion where you touch/move the mouse. The sine wave adds wobble.

---

## 8. Pixel Jitter (Pseudo-Random Variation)

**Location:** Lines 273-275

**What it is:**
Per-pixel random variation in size for organic look.

**The code:**
```glsl
float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
float coverage = bw * jitterScale;
```

**Technique:**
Hash function based on pixel coordinates to get deterministic random value.

**Why it's used:**
Prevents uniform grid from looking too mechanical. Adds organic variation.

---

## 9. Edge Fade

**Location:** Lines 282-287

**What it is:**
Vignette-like fade at screen edges.

**The code:**
```glsl
vec2 norm = gl_FragCoord.xy / uResolution;
float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
float fade = smoothstep(0.0, uEdgeFade, edge);
M *= fade;
```

**Technique:**
Distance from nearest edge, smoothly faded.

**Why it's used:**
Aesthetic choice - creates smooth boundary instead of hard cutoff.

---

## Summary of Technique Categories

| Category | Technique | Purpose |
|----------|-----------|---------|
| **Pattern Generation** | Perlin Noise + FBM | Organic, smooth base pattern |
| **Pixelation** | Bayer Dithering | Convert smooth → discrete pixels |
| **Interaction** | Wave Equations | Click ripples |
| **Touch Effects** | Particle System | Mouse/touch trails |
| **Distortion** | UV Displacement | Liquid effect |
| **Variation** | Hash-based Jitter | Organic variation |
| **Shapes** | SDF Masking | Circle/triangle/diamond pixels |
| **Polish** | Edge Fade | Smooth boundaries |

---

## Why This Looks Like CA (But Isn't)

The combination of:
1. **Grid-based rendering** (pixels on a grid)
2. **Bayer dithering** (discrete on/off states)
3. **Smooth animation** (time-based evolution)
4. **Ripple propagation** (looks like spreading states)

Creates the **visual impression** of cellular automata, but the underlying implementation is completely different.

It's like comparing:
- **A video of dominoes falling** (smooth animation)
- **Actual domino physics simulation** (state transitions)

Both show dominoes falling, but one is pre-rendered video, the other is computed physics.

---

## Modern Graphics Lineage

These techniques represent a lineage of computer graphics:

1. **1960s-70s:** Bayer dithering for early displays
2. **1980s:** Perlin noise for CGI
3. **1990s:** Particle systems in games
4. **2000s:** Shader-based effects
5. **2010s:** WebGL brings it to browsers
6. **2020s:** React + Three.js integration

PixelBlast is a **modern web implementation** of classic graphics techniques, packaged as a React component.

---

## What Makes This "Animation" Not "CA"

**Animation characteristics (PixelBlast has these):**
- ✅ Time-based functions
- ✅ Stateless rendering
- ✅ Mathematical equations
- ✅ Can jump to any frame

**CA characteristics (PixelBlast lacks these):**
- ❌ State buffers
- ❌ Neighbor sampling
- ❌ Rule-based transitions
- ❌ Generational dependencies

**Verdict:** This is **procedural animation** with a **CA-inspired aesthetic**.
