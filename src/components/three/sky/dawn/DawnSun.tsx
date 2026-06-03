import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { dawnPulse } from './dawnEffects'
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
uniform float uTime;
uniform float uPulse;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;

  float core = exp(-r * 12.0);
  float inner = exp(-r * 5.5) * 0.6;
  float gold = exp(-r * 2.8) * 0.32;
  float bloom = exp(-r * 1.6) * 0.12;

  vec3 col = vec3(1.0, 0.98, 0.99) * core;
  col += vec3(1.0, 0.88, 0.94) * inner;
  col += vec3(1.0, 0.82, 0.9) * gold;
  col += vec3(1.0, 0.9, 0.95) * bloom;

  float pulse = 0.96 + sin(uTime * 0.65) * 0.04 + uPulse * 0.35;
  col *= 1.0 + uPulse * 0.25;
  float alpha = clamp((core + inner + gold + bloom) * pulse, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha * 0.72);
}
`

/** Cosmic sun — white-gold glow behind the galaxy core. */
export function DawnSun() {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const size = 5.2

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    if (mat.current) {
      mat.current.uniforms.uTime!.value = state.clock.elapsedTime
      mat.current.uniforms.uPulse!.value = dawnPulse.strength
    }
    if (mesh.current) {
      mesh.current.position.x = THREE.MathUtils.lerp(
        mesh.current.position.x,
        skyInteraction.pointerX * 0.25,
        0.035,
      )
      mesh.current.position.y = THREE.MathUtils.lerp(
        mesh.current.position.y,
        -skyInteraction.pointerY * 0.2,
        0.035,
      )
    }
  })

  return (
    <mesh ref={mesh} position={[0, 0, -5.2]} scale={size} renderOrder={-15}>
      <circleGeometry args={[1, 64]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}
