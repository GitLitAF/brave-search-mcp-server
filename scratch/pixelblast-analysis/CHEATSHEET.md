# Quick Reference: CA vs Animation

## One-Line Verdict

**PixelBlast = Animated Perlin Noise + Bayer Dithering (NOT Cellular Automata)**

---

## The 5-Second Test

### Cellular Automata MUST have:
```glsl
uniform sampler2D previousGeneration;  // ✅ State buffer

float current = texture2D(previousGeneration, uv).r;
float neighbors = sampleNeighbors(previousGeneration, uv);
float next = applyRule(current, neighbors);
```

### PixelBlast has:
```glsl
uniform float uTime;  // ❌ Just time, no state

float noise = fbm2(uv, uTime);
float ripple = waveEquation(distance, uTime);
float pixel = dither(noise + ripple);
```

**→ No state buffer = Not CA**

---

## Visual Flowchart

### Cellular Automata
```
┌─────────────┐
│ State[N-1]  │
└──────┬──────┘
       │
┌──────▼──────────┐
│ Read Neighbors  │
└──────┬──────────┘
       │
┌──────▼──────────┐
│  Apply Rules    │
└──────┬──────────┘
       │
┌──────▼──────┐
│  State[N]   │ ← Depends on previous state
└─────────────┘
```

### PixelBlast
```
┌──────────┐
│   Time   │
└────┬─────┘
     │
┌────▼─────────┐
│  Noise(t)    │
└────┬─────────┘
     │
┌────▼─────────┐
│  Dither      │
└────┬─────────┘
     │
┌────▼─────┐
│  Render  │ ← Independent of previous frames
└──────────┘
```

---

## Code Smoking Guns

### PixelBlast Line 245:
```glsl
float base = fbm2(uv, uTime * 0.05);
```
**→ Pure function of position and time = Animation**

### What CA Would Look Like:
```glsl
float base = texture2D(previousGeneration, uv).r;
```
**→ Reading previous state = Cellular Automata**

---

## Feature Checklist

| Feature | CA | PixelBlast |
|---------|----|-----------|
| State buffer texture | ✅ Required | ❌ Absent |
| Ping-pong render targets | ✅ Required | ❌ Absent |
| Neighbor sampling loop | ✅ Required | ❌ Absent |
| Discrete state transitions | ✅ Required | ❌ Absent |
| Time-based noise functions | ❌ Not typical | ✅ Present |
| Perlin/FBM noise | ❌ Not typical | ✅ Present |
| Bayer dithering | ❌ Optional | ✅ Present |
| Mathematical wave equations | ❌ Not typical | ✅ Present |

**Score: 0/4 CA features, 4/4 Animation features**

---

## The Math Test

### CA Formula:
```
cell[x,y,t+1] = rule(cell[x,y,t], neighbors[x,y,t])
```
Where `neighbors` = cells adjacent to [x,y]

### PixelBlast Formula:
```
pixel[x,y,t] = dither(fbm(x, y, t) + ripple(x, y, t))
```
Where `fbm` and `ripple` are pure mathematical functions

**→ Different mathematical models = Different algorithms**

---

## Pattern Source

### CA Pattern Emerges From:
- Initial seed state
- Rule application
- Neighbor interactions
- **Emergent behavior**

Example: Gliders in Game of Life

### PixelBlast Pattern Comes From:
- Perlin noise function
- FBM layering
- Time parameter
- **Designed function**

Example: Smooth noise evolution

---

## Can You Jump To Frame 1000?

### Cellular Automata: **NO**
```
Must compute: Frame 0 → 1 → 2 → ... → 999 → 1000
Reason: Each frame depends on previous frame
```

### PixelBlast: **YES**
```
Can directly compute: Frame 1000
Reason: fbm(uv, 1000) is a pure function
```

**→ This is the fundamental difference**

---

## Memory Requirements

### CA Implementation Needs:
```javascript
// Two framebuffers (ping-pong)
const stateA = new WebGLRenderTarget(width, height);  // 4 bytes × width × height
const stateB = new WebGLRenderTarget(width, height);  // 4 bytes × width × height

// Example: 1024×1024 = ~8MB
```

### PixelBlast Needs:
```javascript
// No state buffers needed
// Just uniform values (< 1KB)

uniforms = {
    uTime: 0.0,
    uResolution: [1024, 1024],
    // ... etc
}
```

**→ CA requires 8MB+, PixelBlast requires < 1KB**

---

## Performance Characteristics

### CA:
- Memory bandwidth bound (reading previous frame)
- Can't parallelize generations (sequential dependency)
- Can parallelize cells within generation
- Performance: O(width × height × generations)

### PixelBlast:
- Compute bound (noise calculations)
- Fully parallel (no dependencies)
- Can render any frame independently
- Performance: O(width × height)

---

## Rendering Comparison

### CA Render Loop:
```javascript
function animate() {
    // Render generation N using generation N-1
    uniforms.previousState.value = targetB.texture;
    renderer.setRenderTarget(targetA);
    renderer.render(scene, camera);

    // Display
    renderer.setRenderTarget(null);
    displayTexture(targetA);

    // Swap for next frame
    [targetA, targetB] = [targetB, targetA];
}
```

### PixelBlast Render Loop:
```javascript
function animate() {
    // Update time
    uniforms.uTime.value = clock.getElapsedTime();

    // Render directly
    renderer.render(scene, camera);
}
```

**→ CA: 3 steps + swap, PixelBlast: 1 step**

---

## Interactivity

### CA:
```javascript
// Click sets initial state
onClick(() => {
    // Write to state buffer
    setState(x, y, 1);
    // Effect propagates through rules
});
```

### PixelBlast:
```javascript
// Click triggers wave equation
onClick((x, y) => {
    clickPos[i] = [x, y];
    clickTime[i] = currentTime;
    // Effect computed mathematically
});
```

**→ CA: State modification, PixelBlast: Parameter injection**

---

## Terminology Usage

### If It Has These, Call It CA:
- "Previous generation"
- "Neighbor rules"
- "State transition"
- "Birth/death conditions"
- "Survive/die based on neighbors"

### If It Has These, Call It Animation:
- "Noise function"
- "Time parameter"
- "Procedural texture"
- "Dithering"
- "Wave equation"

**PixelBlast uses:** Animation terminology ✅

---

## Famous Examples

### Cellular Automata:
- Conway's Game of Life
- Langton's Ant
- Rule 30
- Brian's Brain
- Wire World

### Procedural Animation (like PixelBlast):
- Perlin noise terrain
- Shadertoy demos
- Procedural textures
- Animated backgrounds
- WebGL art

**PixelBlast belongs in:** Second category ✅

---

## Debug Test

### To Verify It's CA:
```javascript
// Pause animation
pauseAnimation();

// Manually step one frame
stepOneGeneration();

// Check: Did it compute from previous frame?
// CA: Yes
// PixelBlast: N/A (can't step generations, only render at time T)
```

### To Verify It's Animation:
```javascript
// Render at specific time
uniforms.uTime.value = 1000.0;
renderer.render();

// Render at different time
uniforms.uTime.value = 5000.0;
renderer.render();

// Check: Can jump to arbitrary times?
// PixelBlast: Yes ✅
// CA: No (must compute intermediate frames)
```

---

## Summary Table

| Question | CA Answer | PixelBlast Answer |
|----------|-----------|-------------------|
| Needs state buffer? | Yes | No |
| Reads neighbors? | Yes | No |
| Stateless rendering? | No | Yes |
| Uses noise functions? | Rarely | Yes |
| Can skip frames? | No | Yes |
| Rule-based? | Yes | No |
| Emergent behavior? | Yes | No |
| Mathematical function? | No | Yes |

**Match: 0/8 → Not CA**

---

## Final Verdict

```
if (hasStateBuffer && samplesNeighbors && appliesRules) {
    return "Cellular Automata";
} else if (usesNoiseFunctions && timeBasedAnimation) {
    return "Procedural Animation";  // ← PixelBlast is here
}
```

---

## One Sentence Summary

**PixelBlast renders independent frames using noise functions and dithering, while cellular automata iteratively compute each generation from the previous one using neighbor-based rules.**
