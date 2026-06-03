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
uniform float uScroll;
uniform float uTime;

void main() {
  float y = clamp(vUv.y + uParallax.y, 0.0, 1.0);

  vec3 top = vec3(1.0, 0.945, 0.973);    // #FFF0F8
  vec3 mid = vec3(1.0, 0.984, 0.992);    // #FFFBFD
  vec3 bottom = vec3(1.0, 0.961, 0.941); // #FFF5F0

  vec3 sky = mix(bottom, mid, smoothstep(0.0, 0.4, y));
  sky = mix(sky, top, smoothstep(0.35, 1.0, y));

  float blush = smoothstep(0.0, 0.3, y) * (1.0 - smoothstep(0.3, 0.55, y));
  sky = mix(sky, vec3(1.0, 0.92, 0.95), blush * 0.12);

  float drift = sin(uTime * 0.08 + vUv.x * 3.0) * 0.008;
  sky += vec3(0.02, 0.01, 0.015) * drift;

  gl_FragColor = vec4(sky, 1.0);
}
`

/** Dreamy blush-pink sky gradient. */
export function DawnBackdrop() {
  const mesh = useRef<THREE.Mesh>(null)
  const viewport = useThree((s) => s.viewport)
  const uniforms = useMemo(
    () => ({
      uParallax: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    const sc = skyInteraction.scroll
    uniforms.uParallax.value.set(
      skyInteraction.pointerX * 0.018,
      skyInteraction.pointerY * 0.012 - sc * 0.04,
    )
    uniforms.uScroll.value = sc
    uniforms.uTime.value = state.clock.elapsedTime
    if (mesh.current) mesh.current.position.z = -16 + sc * 1.2
  })

  const w = Math.max(viewport.width, 24) * 1.65
  const h = Math.max(viewport.height, 24) * 1.65

  return (
    <mesh ref={mesh} position={[0, 0, -16]} scale={[w, h, 1]} renderOrder={-20}>
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
