# Code Comparison: Cellular Automata vs PixelBlast

## What ACTUAL Cellular Automata Code Looks Like

### Example: Conway's Game of Life (Fragment Shader)

```glsl
uniform sampler2D previousGeneration;  // ← STATE BUFFER
uniform vec2 cellSize;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;

    // Read current cell state
    float current = texture2D(previousGeneration, uv).r;

    // Count living neighbors (THE KEY CA OPERATION)
    float neighbors = 0.0;
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            if(x == 0 && y == 0) continue;
            vec2 offset = vec2(x, y) * cellSize;
            neighbors += texture2D(previousGeneration, uv + offset).r;
        }
    }

    // Apply Conway's rules (RULE-BASED STATE TRANSITION)
    float nextState = 0.0;
    if(current > 0.5) {
        // Alive: survive if 2 or 3 neighbors
        if(neighbors >= 1.5 && neighbors <= 3.5) nextState = 1.0;
    } else {
        // Dead: birth if exactly 3 neighbors
        if(neighbors >= 2.5 && neighbors <= 3.5) nextState = 1.0;
    }

    gl_FragColor = vec4(nextState, nextState, nextState, 1.0);
}
```

**Key CA characteristics:**
- ✅ Reads from state buffer (previous generation)
- ✅ Samples neighbor cells
- ✅ Applies discrete rules
- ✅ Writes next state
- ✅ No time-based functions

---

## What PixelBlast Actually Does

### From PixelBlast Fragment Shader (Simplified)

```glsl
// NO state buffer!
uniform float uTime;  // ← Just time, no previous state
uniform vec2 uResolution;

// Perlin noise function (CONTINUOUS MATH)
float vnoise(vec3 p) {
    // ... interpolated gradient noise
    return mix(y0, y1, w.z) * 2.0 - 1.0;
}

// Fractal Brownian Motion (LAYERED NOISE)
float fbm2(vec2 uv, float t) {
    vec3 p = vec3(uv * uScale, t);  // ← Time as 3rd dimension
    float sum = 1.0;
    for (int i = 0; i < 5; ++i) {
        sum += amp * vnoise(p * freq);  // ← Pure function
        freq *= 1.25;
        amp *= 1.0;
    }
    return sum * 0.5 + 0.5;
}

void main() {
    vec2 uv = cellCoord / uResolution;

    // Generate pattern from NOISE (not neighbors)
    float base = fbm2(uv, uTime * 0.05);  // ← STATELESS

    // Add ripples from DISTANCE CALC (not CA)
    for (int i = 0; i < MAX_CLICKS; ++i) {
        float r = distance(uv, clickPos);  // ← Euclidean distance
        float waveR = speed * (uTime - clickTimes[i]);
        float ring = exp(-pow((r - waveR) / thickness, 2.0));  // ← Math wave
        feed = max(feed, ring * atten);
    }

    // Dither (makes it LOOK pixelated)
    float bayer = Bayer8(fragCoord / uPixelSize);
    float bw = step(0.5, feed + bayer);

    gl_FragColor = vec4(color, bw);
}
```

**PixelBlast characteristics:**
- ❌ No state buffer
- ❌ No neighbor sampling
- ❌ No discrete rules
- ✅ Time-based noise functions
- ✅ Mathematical wave equations
- ✅ Dithering for aesthetic only

---

## Side-by-Side: The Critical Difference

### Cellular Automata Approach
```glsl
// Frame N+1 depends on Frame N
currentState = texture2D(previousFrame, uv);
neighbors = sampleNeighbors(previousFrame, uv);
nextState = applyRules(currentState, neighbors);
```

### PixelBlast Approach
```glsl
// Frame N depends only on time
noiseValue = fbm(position, currentTime);
rippleValue = waveEquation(position, currentTime, clickPositions);
pixelValue = dither(noiseValue + rippleValue);
```

---

## Visual Architecture Comparison

### Cellular Automata Data Flow
```
┌──────────────┐
│ State Buffer │ ← Frame N
│  (Texture)   │
└──────┬───────┘
       │
       ├─────► Read Current Cell
       │
       └─────► Read Neighbors
                     │
                     ▼
              ┌──────────────┐
              │  Apply Rules │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ State Buffer │ ← Frame N+1
              │  (Texture)   │
              └──────────────┘
                     │
                     └─────► Display
```

### PixelBlast Data Flow
```
       Time Parameter
              │
              ▼
    ┌────────────────────┐
    │ Noise Function     │
    │ (Pure Math)        │
    └─────────┬──────────┘
              │
              ▼
    ┌────────────────────┐
    │ Add Ripples        │
    │ (Distance Calc)    │
    └─────────┬──────────┘
              │
              ▼
    ┌────────────────────┐
    │ Bayer Dithering    │
    └─────────┬──────────┘
              │
              ▼
           Display
```

**Notice:** PixelBlast has NO feedback loop - it's a pure pipeline!

---

## The Smoking Gun: Required Uniforms

### True Cellular Automata MUST Have:
```javascript
uniforms: {
    previousGeneration: { value: stateTexture },  // ← Required!
    cellSize: { value: new THREE.Vector2(1/width, 1/height) }
}

// AND needs ping-pong buffers:
renderTargetA.render(scene, camera);
renderTargetB.render(scene, camera);
swap(renderTargetA, renderTargetB);  // ← State persistence
```

### PixelBlast Actually Has:
```javascript
uniforms: {
    uTime: { value: 0 },  // ← Just time
    uResolution: { value: new THREE.Vector2(0, 0) },
    uColor: { value: new THREE.Color(color) },
    // ... visual parameters only, NO state buffers
}

// No ping-pong buffers, just:
renderer.render(scene, camera);  // ← Stateless render
```

---

## Real-World Analogy

### Cellular Automata is like:
**A chess game** - Each move depends on the current board state. You can't determine move 100 without knowing move 99.

### PixelBlast is like:
**A mathematical plot** - `y = sin(x * time)`. You can calculate the value at any point without knowing previous values.

---

## Could PixelBlast Be Modified Into CA?

Yes! Here's what you'd need to add:

```javascript
// 1. Create ping-pong render targets
const targetA = new THREE.WebGLRenderTarget(width, height);
const targetB = new THREE.WebGLRenderTarget(width, height);

// 2. Modify shader to read previous state
const FRAGMENT_SRC = `
uniform sampler2D previousState;  // ← ADD THIS

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Sample current and neighbors
    float current = texture2D(previousState, uv).r;
    float left = texture2D(previousState, uv + vec2(-cellSize.x, 0)).r;
    float right = texture2D(previousState, uv + vec2(cellSize.x, 0)).r;
    // ... etc for all 8 neighbors

    // Apply actual CA rule (e.g., Game of Life)
    float next = applyRule(current, neighbors);

    gl_FragColor = vec4(next);
}
`;

// 3. Render with ping-pong
function animate() {
    // Render to target A using target B as input
    uniforms.previousState.value = targetB.texture;
    renderer.setRenderTarget(targetA);
    renderer.render(scene, camera);

    // Display target A
    renderer.setRenderTarget(null);
    renderer.render(displayScene, camera);

    // Swap
    [targetA, targetB] = [targetB, targetA];
}
```

**But current PixelBlast does NONE of this!**

---

## Conclusion

PixelBlast is **procedural noise animation with dithering**, not cellular automata.

The resemblance is purely **aesthetic** - it achieves a pixelated, evolving pattern look through completely different means than CA.

It's like the difference between:
- **Video of waves** (PixelBlast: mathematical simulation)
- **Actual wave propagation CA** (each cell computes from neighbors)

Both can look similar, but the underlying mechanics are fundamentally different.
