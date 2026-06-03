import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../skyInteraction'

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
uniform float uTint; // 0 pink, 1 blue, 2 lavender

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.08;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv - 0.5 + uParallax;
  vec2 warp = vec2(
    sin(uTime * 0.09 + uv.y * 5.0) * 0.07,
    cos(uTime * 0.07 + uv.x * 4.0) * 0.06
  );
  vec2 stretch = uv * vec2(1.0 + sin(uTime * 0.05) * 0.08, 1.0 + cos(uTime * 0.06) * 0.06);
  vec2 flow = vec2(uTime * 0.014, uTime * 0.009);
  float n = fbm(stretch * 2.2 + flow + warp);
  n *= fbm(stretch * 3.4 - flow * 0.65 + warp * 1.3 + 4.1);
  n = smoothstep(0.36, 0.7, n);

  vec3 pink   = vec3(1.0, 0.86, 0.93);
  vec3 blush  = vec3(0.98, 0.82, 0.9);
  vec3 lavender = vec3(0.9, 0.86, 0.98);

  vec3 col = pink;
  if (uTint > 0.5 && uTint < 1.5) col = blush;
  if (uTint >= 1.5) col = lavender;

  float alpha = n * 0.34;
  gl_FragColor = vec4(col, alpha);
}
`

interface NebulaLayerProps {
  tint: number
  z: number
  scale: number
  speed: number
}

function NebulaLayer({ tint, z, scale, speed }: NebulaLayerProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const viewport = useThree((s) => s.viewport)
  const uniforms = useMemo(
    () => ({
      uParallax: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uTint: { value: tint },
    }),
    [tint],
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime * speed
    uniforms.uParallax.value.set(
      skyInteraction.pointerX * 0.04,
      skyInteraction.pointerY * 0.03,
    )
    if (mesh.current) {
      mesh.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.04 + tint) * 0.03
    }
  })

  const w = Math.max(viewport.width, 24) * scale
  const h = Math.max(viewport.height, 24) * scale

  return (
    <mesh ref={mesh} position={[0, 0, z]} scale={[w, h, 1]} renderOrder={-12}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}

/** Watercolor pastel nebula veils — pinks, purples, blues. */
export function DawnNebula() {
  return (
    <>
      <NebulaLayer tint={0} z={-9} scale={1.55} speed={0.85} />
      <NebulaLayer tint={1} z={-8.5} scale={1.45} speed={0.65} />
      <NebulaLayer tint={2} z={-8} scale={1.35} speed={0.5} />
    </>
  )
}
