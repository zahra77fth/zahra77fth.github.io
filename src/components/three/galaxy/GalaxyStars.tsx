import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'
import { colorForStar, fillHaloStars, fillSpiralGalaxy } from './starField'

interface StarLayerProps {
  count: number
  fill: (arr: Float32Array, n: number) => void
  size: number
  opacity: number
  rotationSpeed: number
}

function StarLayer({ count, fill, size, opacity, rotationSpeed }: StarLayerProps) {
  const ref = useRef<THREE.Points>(null)
  const current = useRef(new Float32Array(count * 3))
  const target = useRef(new Float32Array(count * 3))
  const nextShuffle = useRef(0)
  const drift = useRef({ x: 0, y: 0 })

  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const col = new THREE.Color()
    const pos = new Float32Array(count * 3)
    fill(pos, count)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      colorForStar(pos[i3]!, pos[i3 + 1]!, pos[i3 + 2]!, col)
      arr[i3] = col.r
      arr[i3 + 1] = col.g
      arr[i3 + 2] = col.b
    }
    return arr
  }, [count, fill])

  const updateColorsFrom = useCallback(
    (pos: Float32Array) => {
      if (!ref.current) return
      const attr = ref.current.geometry.attributes.color as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      const col = new THREE.Color()
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        colorForStar(pos[i3]!, pos[i3 + 1]!, pos[i3 + 2]!, col)
        arr[i3] = col.r
        arr[i3 + 1] = col.g
        arr[i3 + 2] = col.b
      }
      attr.needsUpdate = true
    },
    [count],
  )

  const shuffle = useCallback(() => {
    fill(target.current, count)
    updateColorsFrom(target.current)
  }, [count, fill, updateColorsFrom])

  useEffect(() => {
    fill(target.current, count)
    current.current.set(target.current)
  }, [count, fill])

  useFrame((state, delta) => {
    if (!ref.current) return

    const t = state.clock.elapsedTime
    drift.current.x = Math.sin(t * 0.1) * 0.12 + skyInteraction.pointerX * 0.25
    drift.current.y = Math.cos(t * 0.08) * 0.08 - skyInteraction.pointerY * 0.18

    if (t >= nextShuffle.current) {
      shuffle()
      nextShuffle.current = t + 8 + Math.random() * 6
    }

    const lerp = Math.min(1, delta * 0.5)
    for (let i = 0; i < count * 3; i++) {
      current.current[i] += (target.current[i]! - current.current[i]!) * lerp
    }

    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      arr[i3] = current.current[i3]! + drift.current.x
      arr[i3 + 1] = current.current[i3 + 1]! + drift.current.y
      arr[i3 + 2] = current.current[i3 + 2]!
    }
    attr.needsUpdate = true

    ref.current.rotation.y = t * rotationSpeed
    ref.current.rotation.x = Math.sin(t * 0.05) * 0.04
  })

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    fill(arr, count)
    current.current.set(arr)
    target.current.set(arr)
    return arr
  }, [count, fill])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

interface GalaxyStarsProps {
  discCount: number
  haloCount: number
  size?: number
}

export function GalaxyStars({ discCount, haloCount, size = 0.038 }: GalaxyStarsProps) {
  return (
    <group>
      <StarLayer
        count={discCount}
        fill={fillSpiralGalaxy}
        size={size}
        opacity={0.92}
        rotationSpeed={0.018}
      />
      <StarLayer
        count={haloCount}
        fill={fillHaloStars}
        size={size * 0.65}
        opacity={0.45}
        rotationSpeed={0.006}
      />
    </group>
  )
}
