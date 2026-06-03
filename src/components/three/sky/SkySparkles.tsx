import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SKY_PALETTE } from './skyConfig'
import { skyInteraction } from './skyInteraction'

interface SkySparklesProps {
  count: number
}

/** Subtle atmospheric highlights — keeps the sky from feeling flat. */
export function SkySparkles({ count }: SkySparklesProps) {
  const ref = useRef<THREE.Points>(null)
  const viewport = useThree((s) => s.viewport)

  const { geometry, seeds } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seeds: { x: number; y: number; z: number; phase: number; speed: number }[] = []

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * viewport.width * 1.1
      const y = viewport.height * (0.25 + Math.random() * 0.55)
      const z = -6 - Math.random() * 3
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      seeds.push({
        x,
        y,
        z,
        phase: Math.random() * Math.PI * 2,
        speed: 0.08 + Math.random() * 0.2,
      })
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geometry: geo, seeds }
  }, [count, viewport.width, viewport.height])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const px = skyInteraction.pointerX * 0.1
    const py = skyInteraction.pointerY * 0.06

    for (let i = 0; i < count; i++) {
      const s = seeds[i]!
      const drift = Math.sin(t * s.speed + s.phase) * 0.06
      attr.setXYZ(
        i,
        s.x + px + drift,
        s.y + py + Math.cos(t * s.speed * 0.6 + s.phase) * 0.04,
        s.z,
      )
    }
    attr.needsUpdate = true
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = 0.22 + Math.sin(t * 0.35) * 0.05
  })

  return (
    <points ref={ref} geometry={geometry} renderOrder={5}>
      <pointsMaterial
        color={SKY_PALETTE.sparkle}
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.25}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
