import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SKY_SHADER } from './skyConfig'
import { skyInteraction } from './skyInteraction'

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform vec2 uParallax;
uniform float uTime;
uniform float uScroll;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv + uParallax;
  float h = clamp(uv.y, 0.0, 1.0);
  vec2 centered = uv - 0.5;

  vec3 zenith = vec3(${SKY_SHADER.zenith.join(', ')});
  vec3 mid    = vec3(${SKY_SHADER.mid.join(', ')});
  vec3 horizon = vec3(${SKY_SHADER.horizon.join(', ')});
  vec3 warm = vec3(${SKY_SHADER.warm.join(', ')});
  vec3 accent = vec3(${SKY_SHADER.accent.join(', ')});

  vec3 sky = mix(zenith, accent, smoothstep(0.0, 0.22, h) * 0.18);
  sky = mix(sky, mid, smoothstep(0.0, 0.52, h));
  sky = mix(sky, horizon, smoothstep(0.38, 1.0, h));
  sky = mix(sky, warm, smoothstep(0.8, 1.0, h) * 0.28);

  float horizonGlow = exp(-abs(h - 0.9) * 32.0) * 0.06;
  sky += warm * horizonGlow;

  vec2 sunUv = vec2(0.74, 0.82) + uParallax * 0.18;
  float sunDist = length(uv - sunUv);
  float sunCore = exp(-sunDist * 60.0) * 0.42;
  float sunBloom = exp(-sunDist * 8.0) * 0.22;
  float sunHaze = exp(-sunDist * 2.4) * 0.08;
  sky += vec3(1.0, 0.98, 0.94) * (sunCore + sunBloom + sunHaze);

  float cirrus = fbm(uv * vec2(3.8, 1.1) + vec2(uTime * 0.006, 0.0));
  cirrus *= smoothstep(0.5, 0.92, h);
  sky += vec3(0.98, 0.995, 1.0) * cirrus * 0.038;

  float depth = fbm(uv * 2.2 + uTime * 0.003);
  sky += vec3(0.92, 0.96, 1.0) * depth * 0.018;

  float vignette = 1.0 - dot(centered * vec2(0.8, 0.6), centered * vec2(0.8, 0.6)) * 0.16;
  sky *= clamp(vignette, 0.9, 1.0);

  sky -= vec3(0.006, 0.01, 0.014) * uScroll * 0.08;

  sky = pow(clamp(sky, 0.0, 1.0), vec3(1.01));
  gl_FragColor = vec4(sky, 1.0);
}
`

export function SkyBackdrop() {
  const mesh = useRef<THREE.Mesh>(null)
  const viewport = useThree((s) => s.viewport)
  const uniforms = useMemo(
    () => ({
      uParallax: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    const sc = skyInteraction.scroll
    uniforms.uParallax.value.set(
      skyInteraction.pointerX * 0.016,
      skyInteraction.pointerY * 0.01 - sc * 0.018,
    )
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uScroll.value = sc

    if (mesh.current) {
      mesh.current.position.z = -14 + sc * 0.35
    }
  })

  const w = Math.max(viewport.width, 24) * 1.85
  const h = Math.max(viewport.height, 24) * 1.85

  return (
    <mesh ref={mesh} position={[0, 0, -14]} scale={[w, h, 1]} renderOrder={-10}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
