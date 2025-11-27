import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './PixelBlast.css';

const SHAPE_MAP = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3
};

// Shader for the cellular automata computation
const CA_VERTEX = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const CA_FRAGMENT = `
precision highp float;

uniform sampler2D previousState;
uniform vec2 uResolution;
uniform vec2 uCellSize;
uniform int uRule;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Sample current cell
  float current = texture2D(previousState, uv).r;

  // Sample 8 neighbors
  float neighbors = 0.0;
  for(int x = -1; x <= 1; x++) {
    for(int y = -1; y <= 1; y++) {
      if(x == 0 && y == 0) continue;
      vec2 offset = vec2(float(x), float(y)) * uCellSize;
      neighbors += texture2D(previousState, uv + offset).r;
    }
  }

  // Apply cellular automata rule
  float next = 0.0;

  if (uRule == 0) {
    // Conway's Game of Life
    if(current > 0.5) {
      if(neighbors >= 1.5 && neighbors <= 3.5) next = 1.0;
    } else {
      if(neighbors >= 2.5 && neighbors <= 3.5) next = 1.0;
    }
  } else if (uRule == 1) {
    // HighLife (similar but more chaotic)
    if(current > 0.5) {
      if(neighbors >= 1.5 && neighbors <= 3.5) next = 1.0;
    } else {
      if(neighbors >= 2.5 && neighbors <= 3.5) next = 1.0;
      if(neighbors >= 5.5 && neighbors <= 6.5) next = 1.0;
    }
  } else if (uRule == 2) {
    // Day & Night (symmetric rule, looks organic)
    if(current > 0.5) {
      if(neighbors >= 2.5 && neighbors <= 4.5) next = 1.0;
      if(neighbors >= 5.5 && neighbors <= 8.5) next = 1.0;
    } else {
      if(neighbors >= 2.5 && neighbors <= 4.5) next = 1.0;
      if(neighbors >= 5.5 && neighbors <= 8.5) next = 1.0;
    }
  } else {
    // Seeds (more subtle, dies unless exactly 2 neighbors)
    if(current < 0.5 && neighbors >= 1.5 && neighbors <= 2.5) {
      next = 1.0;
    }
  }

  fragColor = vec4(next, next, next, 1.0);
}
`;

// Display shader (renders with shapes and styling)
const DISPLAY_VERTEX = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const DISPLAY_FRAGMENT = `
precision highp float;

uniform sampler2D caState;
uniform vec3 uColor;
uniform vec2 uResolution;
uniform float uPixelSize;
uniform float uEdgeFade;
uniform int uShapeType;

const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;

out vec4 fragColor;

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / uResolution;

  vec2 pixelId = floor(fragCoord / uPixelSize);
  vec2 pixelUV = fract(fragCoord / uPixelSize);

  // Sample CA state
  float state = texture2D(caState, uv).r;

  // Apply shape masking
  float M = state;
  if (state > 0.5) {
    if (uShapeType == SHAPE_CIRCLE) {
      M = maskCircle(pixelUV, 1.0);
    } else if (uShapeType == SHAPE_TRIANGLE) {
      M = maskTriangle(pixelUV, pixelId, 1.0);
    } else if (uShapeType == SHAPE_DIAMOND) {
      M = maskDiamond(pixelUV, 1.0);
    }
  }

  // Edge fade
  if (uEdgeFade > 0.0) {
    vec2 norm = fragCoord / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  fragColor = vec4(uColor, M);
}
`;

const PixelBlastCA = ({
  variant = 'circle',
  pixelSize = 6,
  color = '#B19EEF',
  className,
  style,
  antialias = true,
  transparent = true,
  edgeFade = 0.25,
  caRule = 1, // 0=Life, 1=HighLife, 2=Day&Night, 3=Seeds
  speed = 0.6, // generations per second
  initialDensity = 0.15, // 0-1, how many cells start alive
  clickRadius = 5 // cells to spawn on click
}) => {
  const containerRef = useRef(null);
  const threeRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cleanup previous
    if (threeRef.current) {
      const t = threeRef.current;
      cancelAnimationFrame(t.raf);
      t.caScene?.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      t.displayScene?.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      t.targetA?.dispose();
      t.targetB?.dispose();
      t.renderer.dispose();
      if (t.renderer.domElement.parentElement === container) {
        container.removeChild(t.renderer.domElement);
      }
      threeRef.current = null;
    }

    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    if (transparent) renderer.setClearAlpha(0);
    else renderer.setClearColor(0x000000, 1);

    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);

      const rw = renderer.domElement.width;
      const rh = renderer.domElement.height;

      if (threeRef.current) {
        threeRef.current.targetA.setSize(rw, rh);
        threeRef.current.targetB.setSize(rw, rh);
        threeRef.current.caUniforms.uResolution.value.set(rw, rh);
        threeRef.current.caUniforms.uCellSize.value.set(1/rw, 1/rh);
        threeRef.current.displayUniforms.uResolution.value.set(rw, rh);
        threeRef.current.displayUniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();

        // Reinitialize CA state
        initializeCA();
      }
    };

    // Create render targets (ping-pong buffers)
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    const rw = renderer.domElement.width;
    const rh = renderer.domElement.height;

    const targetA = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });

    const targetB = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });

    // CA computation scene
    const caScene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const caUniforms = {
      previousState: { value: null },
      uResolution: { value: new THREE.Vector2(rw, rh) },
      uCellSize: { value: new THREE.Vector2(1/rw, 1/rh) },
      uRule: { value: caRule }
    };

    const caMaterial = new THREE.ShaderMaterial({
      vertexShader: CA_VERTEX,
      fragmentShader: CA_FRAGMENT,
      uniforms: caUniforms,
      glslVersion: THREE.GLSL3
    });

    const caQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), caMaterial);
    caScene.add(caQuad);

    // Display scene
    const displayScene = new THREE.Scene();
    const displayUniforms = {
      caState: { value: null },
      uColor: { value: new THREE.Color(color) },
      uResolution: { value: new THREE.Vector2(rw, rh) },
      uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
      uEdgeFade: { value: edgeFade },
      uShapeType: { value: SHAPE_MAP[variant] ?? 1 }
    };

    const displayMaterial = new THREE.ShaderMaterial({
      vertexShader: DISPLAY_VERTEX,
      fragmentShader: DISPLAY_FRAGMENT,
      uniforms: displayUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3
    });

    const displayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMaterial);
    displayScene.add(displayQuad);

    // Initialize CA state randomly
    const initializeCA = () => {
      const size = rw * rh * 4;
      const data = new Float32Array(size);
      for (let i = 0; i < size; i += 4) {
        const alive = Math.random() < initialDensity ? 1.0 : 0.0;
        data[i] = alive;
        data[i + 1] = alive;
        data[i + 2] = alive;
        data[i + 3] = 1.0;
      }
      const texture = new THREE.DataTexture(data, rw, rh, THREE.RGBAFormat, THREE.FloatType);
      texture.needsUpdate = true;
      renderer.setRenderTarget(targetA);
      renderer.clear();
      // Render initialization data
      const initScene = new THREE.Scene();
      const initMaterial = new THREE.ShaderMaterial({
        vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
        fragmentShader: `
          precision highp float;
          uniform sampler2D initTex;
          out vec4 fragColor;
          void main() {
            vec2 uv = gl_FragCoord.xy / vec2(${rw}.0, ${rh}.0);
            fragColor = texture2D(initTex, uv);
          }
        `,
        uniforms: { initTex: { value: texture } },
        glslVersion: THREE.GLSL3
      });
      const initQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), initMaterial);
      initScene.add(initQuad);
      renderer.render(initScene, camera);
      renderer.setRenderTarget(null);
      initQuad.geometry.dispose();
      initMaterial.dispose();
      texture.dispose();
    };

    initializeCA();

    const ro = new ResizeObserver(setSize);
    ro.observe(container);

    // Click handling - spawn pattern
    const onPointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const scaleX = renderer.domElement.width / rect.width;
      const scaleY = renderer.domElement.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = renderer.domElement.height - (e.clientY - rect.top) * scaleY;

      // Spawn cells in a circle
      const spawnScene = new THREE.Scene();
      const spawnMaterial = new THREE.ShaderMaterial({
        vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
        fragmentShader: `
          precision highp float;
          uniform sampler2D prevState;
          uniform vec2 clickPos;
          uniform float radius;
          uniform vec2 resolution;
          out vec4 fragColor;
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            float dist = length(gl_FragCoord.xy - clickPos);
            float current = texture2D(prevState, uv).r;
            float spawn = dist < radius ? 1.0 : current;
            fragColor = vec4(spawn, spawn, spawn, 1.0);
          }
        `,
        uniforms: {
          prevState: { value: targetA.texture },
          clickPos: { value: new THREE.Vector2(x, y) },
          radius: { value: clickRadius },
          resolution: { value: new THREE.Vector2(rw, rh) }
        },
        glslVersion: THREE.GLSL3
      });
      const spawnQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), spawnMaterial);
      spawnScene.add(spawnQuad);

      renderer.setRenderTarget(targetB);
      renderer.render(spawnScene, camera);
      renderer.setRenderTarget(null);

      // Swap so the spawned pattern becomes current state
      [threeRef.current.targetA, threeRef.current.targetB] =
        [threeRef.current.targetB, threeRef.current.targetA];

      spawnQuad.geometry.dispose();
      spawnMaterial.dispose();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });

    // Animation loop
    let lastUpdateTime = 0;
    const updateInterval = 1000 / speed; // ms per generation

    const animate = (time) => {
      // Update CA at specified speed
      if (time - lastUpdateTime >= updateInterval) {
        lastUpdateTime = time;

        // Compute next CA generation
        caUniforms.previousState.value = targetA.texture;
        renderer.setRenderTarget(targetB);
        renderer.render(caScene, camera);
        renderer.setRenderTarget(null);

        // Swap buffers
        [threeRef.current.targetA, threeRef.current.targetB] =
          [threeRef.current.targetB, threeRef.current.targetA];
      }

      // Display current state
      displayUniforms.caState.value = targetA.texture;
      renderer.render(displayScene, camera);

      threeRef.current.raf = requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(animate);

    threeRef.current = {
      renderer,
      caScene,
      displayScene,
      camera,
      targetA,
      targetB,
      caUniforms,
      displayUniforms,
      resizeObserver: ro,
      raf
    };

    return () => {
      if (!threeRef.current) return;
      const t = threeRef.current;
      t.resizeObserver?.disconnect();
      cancelAnimationFrame(t.raf);
      t.caScene?.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      t.displayScene?.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      t.targetA?.dispose();
      t.targetB?.dispose();
      t.renderer.dispose();
      if (t.renderer.domElement.parentElement === container) {
        container.removeChild(t.renderer.domElement);
      }
      threeRef.current = null;
    };
  }, [variant, pixelSize, color, antialias, transparent, edgeFade, caRule, speed, initialDensity, clickRadius]);

  return (
    <div
      ref={containerRef}
      className={`pixel-blast-container ${className ?? ''}`}
      style={style}
      aria-label="PixelBlast CA interactive background"
    />
  );
};

export default PixelBlastCA;
