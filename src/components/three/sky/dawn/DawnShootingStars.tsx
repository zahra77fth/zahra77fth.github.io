import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { hashSeed } from './dawnMotion'

interface Streak {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

const MAX = 5

function spawnStreak(w: number, h: number): Streak {
  const fromLeft = Math.random() > 0.45
  const top = Math.random() > 0.25
  return {
    active: true,
    x: fromLeft ? -w * 0.68 : w * 0.68,
    y: h * (top ? 0.15 + Math.random() * 0.5 : -0.05 + Math.random() * 0.35),
    vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4),
    vy: (top ? -1 : 1) * (0.35 + Math.random() * 1.0),
    life: 0,
    maxLife: 1.2 + Math.random() * 0.7,
  }
}

const streakVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const streakFragment = /* glsl */ `
varying vec2 vUv;
uniform float uOpacity;
void main() {
  float along = vUv.x;
  float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
  float head = smoothstep(0.0, 0.4, along);
  float tail = 1.0 - smoothstep(0.5, 1.0, along);
  float alpha = head * tail * across * uOpacity;
  vec3 headCol = vec3(1.0, 0.96, 0.99);
  vec3 midCol = vec3(0.98, 0.78, 0.88);
  vec3 tailCol = vec3(0.94, 0.63, 0.78);
  vec3 col = mix(tailCol, mix(midCol, headCol, along), along);
  gl_FragColor = vec4(col, alpha * 0.95);
}
`

/** Dreamy pink shooting stars across the sky. */
export function DawnShootingStars() {
  const viewport = useThree((s) => s.viewport)
  const group = useRef<THREE.Group>(null)
  const streaks = useRef<Streak[]>(
    Array.from({ length: MAX }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
    })),
  )
  const nextSpawn = useRef(0.8)
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(MAX).fill(null))

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: streakVertex,
        fragmentShader: streakFragment,
        uniforms: { uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      }),
    [],
  )

  useEffect(() => {
    streaks.current[0] = spawnStreak(viewport.width, viewport.height)
    nextSpawn.current = 1.8 + Math.random() * 2
  }, [viewport.width, viewport.height])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const w = viewport.width
    const h = viewport.height

    if (t >= nextSpawn.current) {
      const slot = streaks.current.find((s) => !s.active)
      if (slot) Object.assign(slot, spawnStreak(w, h))
      nextSpawn.current = t + 1.4 + Math.random() * 2.8
    }

    for (let i = 0; i < MAX; i++) {
      const mesh = meshRefs.current[i]
      const st = streaks.current[i]!
      if (!mesh) continue

      if (!st.active) {
        mesh.visible = false
        continue
      }

      st.life += dt
      st.x += st.vx * dt
      st.y += st.vy * dt

      if (st.life > st.maxLife || Math.abs(st.x) > w * 0.78) {
        st.active = false
        mesh.visible = false
        continue
      }

      mesh.visible = true
      const fade = 1 - st.life / st.maxLife
      const angle = Math.atan2(st.vy, st.vx)
      const len = 5.5 + hashSeed(i * 7.3 + st.life) * 4.0
      const thickness = 0.06 + hashSeed(i * 3.1) * 0.035

      mesh.position.set(st.x - (Math.cos(angle) * len) / 2, st.y - (Math.sin(angle) * len) / 2, 4.2)
      mesh.rotation.z = angle
      mesh.scale.set(len, thickness, 1)

      const mat = mesh.material as THREE.ShaderMaterial
      mat.uniforms.uOpacity!.value = fade * 0.98
    }
  })

  return (
    <group ref={group} renderOrder={30}>
      {Array.from({ length: MAX }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el
          }}
          visible={false}
          material={material.clone()}
          renderOrder={30}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}
