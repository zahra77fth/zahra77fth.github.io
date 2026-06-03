import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'

/** Bright galactic nucleus — warm core + cool corona. */
export function GalaxyCore() {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 0.7) * 0.08
    group.current.scale.setScalar(pulse)
    group.current.position.x = skyInteraction.pointerX * 0.35
    group.current.position.y = -skyInteraction.pointerY * 0.25
    group.current.rotation.z = t * 0.03
  })

  return (
    <group ref={group} position={[0, 0, -0.5]}>
      <mesh renderOrder={-8}>
        <circleGeometry args={[0.85, 48]} />
        <meshBasicMaterial
          color="#fef08a"
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={-9}>
        <circleGeometry args={[1.8, 48]} />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={-10}>
        <circleGeometry args={[3.8, 40]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={-11}>
        <circleGeometry args={[6, 36]} />
        <meshBasicMaterial
          color="#312e81"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
