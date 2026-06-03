import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'
import { GALAXY_TILT, getGalaxyDive } from './galaxyMotion'

/** Shared 60° tilt + scroll dive for nebula and star field. */
export function GalaxyDiscGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!ref.current) return
    const dive = getGalaxyDive(skyInteraction.scroll)
    ref.current.rotation.x = GALAXY_TILT + Math.sin(state.clock.elapsedTime * 0.04) * 0.012
    ref.current.rotation.y = state.clock.elapsedTime * 0.004
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, dive.groupZ, 0.07)
    const s = THREE.MathUtils.lerp(ref.current.scale.x, dive.scale, 0.07)
    ref.current.scale.setScalar(s)
  })

  return (
    <group ref={ref} rotation={[GALAXY_TILT, 0, 0]}>
      {children}
    </group>
  )
}
