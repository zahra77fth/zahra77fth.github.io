import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'

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

void main() {
  vec2 uv = vUv - 0.5 + uParallax;
  float dist = length(uv);
  float angle = atan(uv.y, uv.x);

  vec3 deep = vec3(0.008, 0.012, 0.045);
  vec3 mid = vec3(0.04, 0.05, 0.14);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.65, dist));

  float spin = angle + dist * 7.0 - uTime * 0.06;
  float arms = pow(sin(spin * 2.0) * 0.5 + 0.5, 3.2);
  arms *= smoothstep(0.5, 0.08, dist) * smoothstep(0.05, 0.12, dist);
  arms *= 0.55 + noise(uv * 4.0 + uTime * 0.03) * 0.45;

  col += vec3(0.22, 0.12, 0.38) * arms * 0.28;
  col += vec3(0.12, 0.22, 0.42) * arms * 0.18;

  float breathe = 0.92 + sin(uTime * 0.25) * 0.04;
  col *= breathe;
  col *= 1.0 - smoothstep(0.48, 0.62, dist) * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`

/** Soft deep-space nebula — no bright galactic core. */
export function GalaxyNebula() {
  const mesh = useRef<THREE.Mesh>(null)
  const viewport = useThree((s) => s.viewport)
  const uniforms = useMemo(
    () => ({
      uParallax: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    uniforms.uParallax.value.set(
      skyInteraction.pointerX * 0.05,
      skyInteraction.pointerY * 0.04 - skyInteraction.scroll * 0.14,
    )
    uniforms.uTime.value = state.clock.elapsedTime

    if (mesh.current) {
      const dive = skyInteraction.scroll * 2.2
      mesh.current.position.z = -10 + dive
    }
  })

  const w = Math.max(viewport.width, 24) * 1.6
  const h = Math.max(viewport.height, 24) * 1.6

  return (
    <mesh ref={mesh} position={[0, 0, -10]} scale={[w, h, 1]} renderOrder={-20}>
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
