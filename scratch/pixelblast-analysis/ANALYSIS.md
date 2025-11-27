# PixelBlast Code Analysis: Cellular Automata vs Animation

## TL;DR: **This is NOT cellular automata - it's procedural animation**

---

## What ARE Cellular Automata?

Cellular automata have these key characteristics:
1. **Grid of cells** with discrete states (e.g., alive/dead, on/off)
2. **Local rules** - each cell's next state depends on its current state and neighbors' states
3. **Iterative evolution** - generation N+1 is computed from generation N
4. **State persistence** - cells maintain state between frames

Classic examples: Conway's Game of Life, Rule 30, Langton's Ant

---

## What THIS Code Actually Does

### Main Components:

#### 1. **Fragment Shader (lines 136-292)** - The Core Visual Engine
The shader divides the screen into pixels/cells, but here's the critical difference:

**Pattern Generation (lines 245-246):**
```glsl
float base = fbm2(uv, uTime * 0.05);
base = base * 0.5 - 0.65;
```
- Uses **Fractal Brownian Motion (FBM)** with Perlin noise
- Each pixel is computed **independently** from a continuous mathematical function
- NO neighbor-based rules
- NO state that persists between frames

**FBM Implementation (lines 198-209):**
```glsl
float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}
```
- Layered Perlin noise at different frequencies
- This is a **stateless continuous function**
- Animation comes from the time parameter `t`

#### 2. **Bayer Dithering (lines 164-169, 270-271):**
```glsl
float Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))
...
float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
float bw = step(0.5, feed + bayer);
```
- Ordered dithering pattern for pixel-like appearance
- Creates threshold pattern, NOT cellular automaton rules
- Just makes continuous values look pixelated

#### 3. **Ripple Effects (lines 255-268):**
```glsl
float t = max(uTime - uClickTimes[i], 0.0);
float r = distance(uv, cuv);
float waveR = speed * t;
float ring  = exp(-pow((r - waveR) / thickness, 2.0));
```
- Mathematical wave equations expanding from click points
- Distance-based calculation (not neighbor-based)
- Gaussian decay functions

#### 4. **Touch/Liquid Effects:**
- `createTouchTexture()` (lines 6-90): Particle trail system
- `createLiquidEffect()` (lines 92-120): UV distortion based on texture

---

## Why This Is NOT Cellular Automata

### Missing CA Characteristics:

1. **No State Storage**
   - True CA: Each cell stores state (alive/dead)
   - This code: Everything recomputed from scratch each frame using noise functions

2. **No Neighbor Rules**
   - True CA: `cell[x][y].next = rule(cell[x-1][y], cell[x+1][y], cell[x][y-1], cell[x][y+1])`
   - This code: `pixel.value = fbm2(uv, time) + ripples + dither`

3. **No Generational Evolution**
   - True CA: Generation 100 depends on generation 99
   - This code: Frame 100 is computed independently from noise(time=100)

4. **Continuous vs Discrete**
   - True CA: Discrete states (0 or 1, finite state machine)
   - This code: Continuous noise values thresholded by dithering

---

## What This Actually IS

### Procedural Animation Techniques:

1. **Fractal Brownian Motion (FBM)** - Layered noise for organic patterns
2. **Perlin Noise** - Smooth gradient noise (lines 177-196)
3. **Bayer Dithering** - Ordered dithering for pixel aesthetic
4. **Wave Equations** - Mathematical ripples (exponential decay)
5. **Particle Systems** - Touch trail rendering

### The "Cellular" Look Is Just Aesthetics:
- Grid division into pixels
- Threshold with dithering creates binary on/off appearance
- Shape masking (circle, square, triangle, diamond)
- But it's all **stateless rendering** of mathematical functions

---

## Key Evidence From Code

### Line 245: The Smoking Gun
```glsl
float base = fbm2(uv, uTime * 0.05);
```
Every pixel's base value is computed from a **pure function of position and time**.
No cell states, no neighbor lookups, no evolution rules.

### Lines 255-268: Ripples Are Math, Not CA
```glsl
for (int i = 0; i < MAX_CLICKS; ++i){
  // Distance-based calculation
  float r = distance(uv, cuv);
  float waveR = speed * t;
  // Gaussian envelope, not CA propagation
  float ring  = exp(-pow((r - waveR) / thickness, 2.0));
}
```

### No State Array
There's no `vec4 previousFrame[]` or `sampler2D stateBuffer`. True CA would need:
```glsl
// What CA would look like:
uniform sampler2D previousGeneration;
vec4 cell = texture2D(previousGeneration, uv);
vec4 neighbors = sampleNeighbors(previousGeneration, uv);
vec4 nextState = applyRule(cell, neighbors);
```

---

## Conclusion

**PixelBlast is sophisticated procedural animation** using:
- Noise functions (FBM with Perlin noise)
- Ordered dithering (Bayer matrix)
- Mathematical wave propagation
- Particle trail rendering

It **mimics** the pixelated aesthetic often associated with CA, but has **none of the algorithmic properties** of cellular automata. It's purely stateless, continuous mathematics rendered with dithering to look discrete.

Think of it as: **"Conway's Game of Life" aesthetic without "Conway's Game of Life" algorithm**

---

## Comparison Table

| Feature | Cellular Automata | PixelBlast |
|---------|-------------------|------------|
| Cell states | Discrete (0/1, finite) | Continuous (noise values) |
| Neighbor rules | Yes (explicit) | No |
| State persistence | Yes (buffer between frames) | No (recomputed each frame) |
| Evolution | Generational | Time-based function |
| Pattern source | Rule application | Noise functions |
| Example | Game of Life, Rule 30 | Animated noise + dithering |
