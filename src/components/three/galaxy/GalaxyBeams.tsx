import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const BEAMS = [
  { angle: 0.15, length: 26, width: 0.42, color: '#a78bfa', opacity: 0.11 },
  { angle: 0.95, length: 22, width: 0.34, color: '#818cf8', opacity: 0.09 },
  { angle: 1.75, length: 24, width: 0.38, color: '#6366f1', opacity: 0.1 },
  { angle: 2.55, length: 20, width: 0.3, color: '#c084fc', opacity: 0.08 },
  { angle: 3.35, length: 23, width: 0.36, color: '#38bdf8', opacity: 0.07 },
  { angle: 4.15, length: 18, width: 0.28, color: '#22d3ee', opacity: 0.06 },
] as const

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function beamGradientTexture(hex: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(16, 0, 16, 256)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.25, hexToRgba(hex, 0.02))
  grad.addColorStop(0.45, hexToRgba(hex, 0.35))
  grad.addColorStop(0.55, hexToRgba(hex, 0.12))
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 32, 256)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Radial light shafts from the galactic core — slow counter-rotation. */
export function GalaxyBeams() {
  const group = useRef<THREE.Group>(null)

  const textures = useMemo(() => BEAMS.map((b) => beamGradientTexture(b.color)), [])

  const beamsRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current || !beamsRef.current) return
    const t = state.clock.elapsedTime
    group.current.rotation.z = -t * 0.025
    beamsRef.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      if (!mat) return
      const base = BEAMS[i]?.opacity ?? 0.08
      mat.opacity = base + Math.sin(t * 0.5 + i * 1.4) * 0.03
    })
  })

  return (
    <group ref={group} position={[0, 0, -0.8]}>
      <group ref={beamsRef}>
      {BEAMS.map((beam, i) => (
        <mesh
          key={i}
          rotation={[0, 0, beam.angle]}
          position={[Math.cos(beam.angle) * 1.2, Math.sin(beam.angle) * 1.2, 0]}
        >
          <planeGeometry args={[beam.width, beam.length]} />
          <meshBasicMaterial
            map={textures[i]}
            transparent
            opacity={beam.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      </group>
      <mesh position={[0, 0, 0.3]}>
        <ringGeometry args={[1.8, 5.5, 64]} />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.2]}>
        <circleGeometry args={[3.2, 48]} />
        <meshBasicMaterial
          color="#4f46e5"
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
