import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { dawnPulse, updateDawnPulse } from './dawnEffects'
import {
  createSparkleDust,
  createSpiralGalaxy,
  galaxyParticlePosition,
  type GalaxyParticle,
} from './dawnGalaxyField'
import { skyInteraction } from '../skyInteraction'
import { starColor } from './dawnPalette'

function createSoftStarTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,180,210,0.95)')
  g.addColorStop(0.55, 'rgba(230,120,170,0.55)')
  g.addColorStop(1, 'rgba(220,100,160,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

interface DawnGalaxyProps {
  particleCount: number
  sparkleCount: number
}

/** Dreamy light-pink spiral galaxy — soft glowing stars. */
export function DawnGalaxy({ particleCount, sparkleCount }: DawnGalaxyProps) {
  const spiral = useMemo(() => createSpiralGalaxy(particleCount), [particleCount])
  const dust = useMemo(() => createSparkleDust(sparkleCount), [sparkleCount])
  const starMap = useMemo(() => createSoftStarTexture(), [])

  return (
    <>
      <GalaxyLayer particles={spiral} map={starMap} baseSize={0.058} withRipple renderOrder={2} />
      <GalaxyLayer particles={dust} map={starMap} baseSize={0.038} withRipple={false} renderOrder={3} />
    </>
  )
}

function GalaxyLayer({
  particles,
  map,
  baseSize,
  withRipple,
  renderOrder,
}: {
  particles: GalaxyParticle[]
  map: THREE.CanvasTexture
  baseSize: number
  withRipple: boolean
  renderOrder: number
}) {
  const ref = useRef<THREE.Points>(null)
  const count = particles.length
  const ripple = useRef(new Float32Array(count * 3))
  const rippleVel = useRef(new Float32Array(count * 3))
  const groupSpin = useRef(0)
  const nextPulse = useRef({ value: 6 + Math.random() * 8 })

  const initialPositions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const p = galaxyParticlePosition(particles[i]!, 0, 0)
      const i3 = i * 3
      arr[i3] = p.x
      arr[i3 + 1] = p.y
      arr[i3 + 2] = p.z
    }
    return arr
  }, [particles, count])

  const initialColors = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const p = particles[i]!
      starColor(p.colorIdx, p.noiseSeed, c)
      const i3 = i * 3
      arr[i3] = c.r
      arr[i3 + 1] = c.g
      arr[i3 + 2] = c.b
    }
    return arr
  }, [particles, count])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    groupSpin.current += 0.0028
    updateDawnPulse(t, nextPulse.current)

    const mx = skyInteraction.pointerX * 5.5
    const my = skyInteraction.pointerY * 4.5
    const rippleR = 3.8
    const rippleR2 = rippleR * rippleR

    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const col = ref.current.geometry.attributes.color as THREE.BufferAttribute
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const p = particles[i]!
      const base = galaxyParticlePosition(p, t, groupSpin.current)
      const i3 = i * 3

      let rx = 0
      let ry = 0
      let rz = 0

      if (withRipple) {
        const dx = base.x - mx
        const dy = base.y - my
        const d2 = dx * dx + dy * dy
        if (d2 < rippleR2 && d2 > 0.02) {
          const d = Math.sqrt(d2)
          const force = (1 - d / rippleR) * 0.018
          rippleVel.current[i3]! += (dx / d) * force
          rippleVel.current[i3 + 1]! += (dy / d) * force
        }
        rippleVel.current[i3]! *= 0.87
        rippleVel.current[i3 + 1]! *= 0.87
        rippleVel.current[i3 + 2]! *= 0.87
        ripple.current[i3] = ripple.current[i3]! * 0.91 + rippleVel.current[i3]!
        ripple.current[i3 + 1] = ripple.current[i3 + 1]! * 0.91 + rippleVel.current[i3 + 1]!
        ripple.current[i3 + 2] = ripple.current[i3 + 2]! * 0.91 + rippleVel.current[i3 + 2]!
        rx = ripple.current[i3]!
        ry = ripple.current[i3 + 1]!
        rz = ripple.current[i3 + 2]!
      }

      pos.array[i3] = base.x + rx
      pos.array[i3 + 1] = base.y + ry
      pos.array[i3 + 2] = base.z + rz

      starColor(p.colorIdx, p.noiseSeed, c)
      col.array[i3] = c.r
      col.array[i3 + 1] = c.g
      col.array[i3 + 2] = c.b
    }

    pos.needsUpdate = true
    col.needsUpdate = true

    const mat = ref.current.material as THREE.PointsMaterial
    mat.size = baseSize * (1 + dawnPulse.strength * 0.12)
    mat.opacity = withRipple ? 0.94 : 0.78
  })

  if (count === 0) return null

  return (
    <points ref={ref} frustumCulled={false} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[initialColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={map}
        size={baseSize}
        vertexColors
        transparent
        opacity={0.88}
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  )
}
