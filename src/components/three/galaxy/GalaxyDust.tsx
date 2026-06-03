import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'
import { fillSpiralGalaxy } from './starField'

interface GalaxyDustProps {
  count: number
}

/** Dark dust lanes along the spiral — adds depth between star layers. */
export function GalaxyDust({ count }: GalaxyDustProps) {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    fillSpiralGalaxy(arr, count)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      arr[i3]! += (Math.random() - 0.5) * 0.6
      arr[i3 + 1]! *= 0.5
      arr[i3 + 2]! -= 0.3
    }
    return arr
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.rotation.y = t * 0.016
    ref.current.position.x = skyInteraction.pointerX * 0.15
    ref.current.position.y = -skyInteraction.pointerY * 0.1
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#1e1b4b"
        transparent
        opacity={0.22}
        depthWrite={false}
        blending={THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  )
}
