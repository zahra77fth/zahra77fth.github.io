import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/** Locks orthographic zoom — scroll does not change apparent motion speed. */
export function SkyFlightRig() {
  const camera = useThree((s) => s.camera)
  const baseZoom = useRef<number | null>(null)

  useFrame(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return
    if (baseZoom.current === null) baseZoom.current = camera.zoom
    if (camera.zoom !== baseZoom.current) {
      camera.zoom = baseZoom.current
      camera.updateProjectionMatrix()
    }
  })

  return null
}
