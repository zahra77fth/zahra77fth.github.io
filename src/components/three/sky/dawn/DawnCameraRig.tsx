import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { skyInteraction } from '../skyInteraction'

/** Slow cinematic drift around the galaxy. */
export function DawnCameraRig() {
  const camera = useThree((s) => s.camera)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sc = skyInteraction.scroll

    const targetX = Math.sin(t * 0.022) * 1.1 + skyInteraction.pointerX * 0.28
    const targetY = Math.cos(t * 0.019) * 0.75 - skyInteraction.pointerY * 0.2 - sc * 0.35
    const targetZ = 18 - sc * 2.5

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.028)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.028)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.04)
    camera.lookAt(0, 0, 0)
  })

  return null
}
