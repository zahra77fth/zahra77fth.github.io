import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'
import { getGalaxyDive } from './galaxyMotion'

/** Scroll pushes the camera into the tilted galaxy disc. */
export function GalaxyDiveRig() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const target = useRef(new THREE.Vector3(0, 0, 0))

  useFrame(() => {
    const dive = getGalaxyDive(skyInteraction.scroll)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, dive.cameraZ, 0.08)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, dive.cameraY, 0.08)
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, skyInteraction.pointerX * 0.35, 0.06)
      camera.fov = THREE.MathUtils.lerp(camera.fov, dive.fov, 0.06)
      camera.lookAt(target.current)
      camera.updateProjectionMatrix()
    }

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, dive.fogNear, 0.06)
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, dive.fogFar, 0.06)
    }
  })

  return null
}
