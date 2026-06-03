import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SKY_PALETTE } from './skyConfig'
import { carouselPosition, carouselU } from './skyCarousel'
import { skyInteraction } from './skyInteraction'

interface CloudLayerProps {
  count: number
  layer?: 'far' | 'near'
}

type Puff = { x: number; y: number; r: number }

const PUFF_LAYOUTS: Puff[][] = [
  [
    { x: 0, y: 0.02, r: 0.38 },
    { x: -0.34, y: -0.04, r: 0.28 },
    { x: 0.36, y: -0.05, r: 0.3 },
    { x: -0.12, y: 0.18, r: 0.22 },
    { x: 0.16, y: 0.16, r: 0.24 },
  ],
  [
    { x: 0, y: 0, r: 0.34 },
    { x: -0.28, y: -0.02, r: 0.26 },
    { x: 0.3, y: -0.03, r: 0.27 },
    { x: 0.08, y: 0.14, r: 0.2 },
  ],
  [
    { x: 0, y: 0.01, r: 0.42 },
    { x: -0.38, y: -0.06, r: 0.3 },
    { x: 0.4, y: -0.04, r: 0.32 },
    { x: -0.18, y: 0.12, r: 0.22 },
    { x: 0.2, y: 0.1, r: 0.24 },
    { x: 0, y: 0.2, r: 0.18 },
  ],
]

const LANE_COUNT = 6
const CLOUD_DRIFT = 0.32
/** Clouds stay behind the kite (opaque pass + depth). */
const CLOUD_RENDER_ORDER = 2

function SoftCloud({ scale, layoutIndex, isFar }: { scale: number; layoutIndex: number; isFar: boolean }) {
  const puffs = PUFF_LAYOUTS[layoutIndex % PUFF_LAYOUTS.length] ?? PUFF_LAYOUTS[0]!
  const puffColor = isFar ? SKY_PALETTE.cloudFar : SKY_PALETTE.cloud

  return (
    <group scale={scale}>
      <mesh position={[0, -0.1, -0.03]} scale={[1.2, 0.32, 1]} renderOrder={CLOUD_RENDER_ORDER}>
        <circleGeometry args={[0.4, 28]} />
        <meshBasicMaterial
          color={SKY_PALETTE.cloudShadow}
          transparent
          opacity={0.1}
          depthTest
          depthWrite={false}
        />
      </mesh>
      {puffs.map((puff, i) => (
        <mesh key={i} position={[puff.x, puff.y, 0]} renderOrder={CLOUD_RENDER_ORDER}>
          <circleGeometry args={[puff.r, 36]} />
          <meshBasicMaterial
            color={i === 0 ? puffColor : SKY_PALETTE.cloudHighlight}
            depthTest
            depthWrite
          />
        </mesh>
      ))}
    </group>
  )
}

function laneY(viewport: { height: number }, lane: number, isFar: boolean) {
  const h = viewport.height
  const spread = isFar ? 0.42 : 0.5
  const base = h * (isFar ? 0.08 : 0.02)
  const step = (h * spread) / Math.max(1, LANE_COUNT - 1)
  return base + lane * step
}

export function CloudLayer({ count, layer = 'near' }: CloudLayerProps) {
  const group = useRef<THREE.Group>(null)
  const viewport = useThree((s) => s.viewport)
  const isFar = layer === 'far'

  const clouds = useMemo(() => {
    const unit = Math.min(viewport.width, viewport.height)
    const travel = viewport.width * 2.5
    const arcHeight = viewport.height * (isFar ? 0.12 : 0.2)

    return Array.from({ length: count }, (_, i) => {
      const lane = i % LANE_COUNT
      const carouselRing = Math.floor(i / LANE_COUNT) % 3
      return {
        id: i,
        lane,
        laneY: laneY(viewport, lane, isFar),
        scale: (0.85 + Math.random() * 0.9) * unit * (isFar ? 0.058 : 0.08),
        scrollSpeed:
          ((isFar ? 0.028 : 0.048) + Math.random() * (isFar ? 0.035 : 0.055)) * CLOUD_DRIFT,
        startOffset: Math.random(),
        travel,
        arcHeight: arcHeight * (0.7 + carouselRing * 0.18),
        halfTravel: viewport.width * 1.25,
        depth: (isFar ? 0.15 : 0.38) + (lane % 3) * (isFar ? 0.08 : 0.12),
        layout: i % PUFF_LAYOUTS.length,
        tiltPhase: Math.random() * Math.PI * 2,
        carouselDir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
      }
    })
  }, [count, isFar, viewport.width, viewport.height])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const px = skyInteraction.pointerX
    const py = skyInteraction.pointerY
    group.current.children.forEach((child, i) => {
      const c = clouds[i]
      if (!c) return

      const u = carouselU(c.startOffset, t, c.scrollSpeed, c.carouselDir)
      const { x, y: arcY } = carouselPosition(
        u,
        c.travel,
        c.halfTravel,
        c.arcHeight,
        c.laneY,
      )

      const parallax = c.depth
      const y = arcY - py * parallax * 0.35

      const cloudZ = (isFar ? -9 : -6) - parallax * (isFar ? 2 : 1.2)
      child.position.set(x + px * parallax * 0.5, y, cloudZ)
      child.rotation.z = Math.sin(t * 0.25 + c.tiltPhase) * 0.05
      child.rotation.y = Math.sin(t * 0.15 + c.tiltPhase) * 0.03 * c.carouselDir
      child.visible = true
    })
  })

  return (
    <group ref={group}>
      {clouds.map((c) => (
        <SoftCloud key={c.id} scale={c.scale} layoutIndex={c.layout} isFar={isFar} />
      ))}
    </group>
  )
}
