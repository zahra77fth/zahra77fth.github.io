import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../skyInteraction'

const TILT = THREE.MathUtils.degToRad(28)

/** Tilted galaxy disc — slow breathing rotation. */
export function DawnCoreGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const sc = skyInteraction.scroll

    ref.current.rotation.x = TILT + Math.sin(t * 0.04) * 0.012
    ref.current.rotation.z = Math.sin(t * 0.03) * 0.006

    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, sc * 1.1, 0.035)
    const s = THREE.MathUtils.lerp(ref.current.scale.x, 1 + sc * 0.06, 0.035)
    ref.current.scale.setScalar(s)
  })

  return (
    <group ref={ref} scale={1.15}>
      {children}
    </group>
  )
}
