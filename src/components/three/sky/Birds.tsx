import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { carouselPosition, carouselU } from './skyCarousel'
import { SKY_PALETTE } from './skyConfig'
import { skyInteraction } from './skyInteraction'

interface BirdSpec {
  id: number
  laneY: number
  arcHeight: number
  halfTravel: number
  travel: number
  startOffset: number
  scrollSpeed: number
  carouselDir: 1 | -1
  flockOffset: number
  wing: number
  wingPhase: number
  scale: number
  parallax: number
  z: number
  tiltPhase: number
}

const BIRD_COLOR = SKY_PALETTE.bird
const BIRD_LANE_COUNT = 5
/** Lower = slower carousel drift for birds */
const BIRD_DRIFT = 0.18

function birdLaneY(viewportHeight: number, lane: number) {
  const h = viewportHeight
  const spread = 0.55
  const base = h * 0.12
  const step = (h * spread) / Math.max(1, BIRD_LANE_COUNT - 1)
  return base + lane * step
}

function Bird({ spec }: { spec: BirdSpec }) {
  const group = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Group>(null)
  const rightWing = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current || !leftWing.current || !rightWing.current) return
    const t = state.clock.elapsedTime
    const px = skyInteraction.pointerX
    const py = skyInteraction.pointerY

    const u = carouselU(
      spec.startOffset,
      t,
      spec.scrollSpeed,
      spec.carouselDir,
      spec.flockOffset,
    )
    const { x, y: arcY, progress } = carouselPosition(
      u,
      spec.travel,
      spec.halfTravel,
      spec.arcHeight,
      spec.laneY,
    )

    const parallax = spec.parallax
    group.current.position.set(
      x + px * parallax * 0.35,
      arcY - py * parallax * 0.25,
      spec.z,
    )
    group.current.rotation.y = spec.carouselDir < 0 ? Math.PI : 0
    group.current.rotation.z =
      Math.cos((progress / spec.travel) * Math.PI) * 0.14 * spec.carouselDir +
      Math.sin(t * 0.25 + spec.tiltPhase) * 0.03
    group.current.scale.setScalar(spec.scale)

    const flap = Math.sin(t * spec.wing + spec.wingPhase)
    const wingAngle = 0.2 + flap * 0.5
    leftWing.current.rotation.z = wingAngle
    rightWing.current.rotation.z = -wingAngle
  })

  return (
    <group ref={group}>
      <group ref={leftWing} position={[-0.04, 0, 0]}>
        <mesh position={[-0.26, 0, 0]} renderOrder={15}>
          <boxGeometry args={[0.5, 0.05, 0.02]} />
          <meshBasicMaterial color={BIRD_COLOR} depthTest={false} depthWrite={false} />
        </mesh>
      </group>
      <group ref={rightWing} position={[0.04, 0, 0]}>
        <mesh position={[0.26, 0, 0]} renderOrder={15}>
          <boxGeometry args={[0.5, 0.05, 0.02]} />
          <meshBasicMaterial color={BIRD_COLOR} depthTest={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

/** Birds sweep along carousel arcs across the sky (same path style as clouds). */
export function Birds({ count }: { count: number }) {
  const viewport = useThree((s) => s.viewport)
  const unit = Math.min(viewport.width, viewport.height)
  const travel = viewport.width * 2.2
  const halfTravel = viewport.width * 1.2

  const birds = useMemo(() => {
    const h = viewport.height
    const flockSize = 3
    const flockCount = Math.floor(count / flockSize)
    const baseArc = h * 0.16

    return Array.from({ length: count }, (_, i) => {
      const flockId = Math.floor(i / flockSize)
      const inFlock = i % flockSize
      const isFlock = flockId < flockCount
      const lane = i % BIRD_LANE_COUNT
      const ring = Math.floor(i / BIRD_LANE_COUNT) % 2

      return {
        id: i,
        laneY: birdLaneY(h, lane) + (inFlock - 1) * 0.12,
        arcHeight: baseArc * (0.75 + ring * 0.2 + Math.random() * 0.15),
        halfTravel,
        travel,
        startOffset: Math.random(),
        scrollSpeed: (0.045 + Math.random() * 0.04) * BIRD_DRIFT,
        carouselDir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
        flockOffset: isFlock ? inFlock * 0.018 * (inFlock % 2 === 0 ? 1 : -1) : 0,
        wing: 2.4 + Math.random() * 2,
        wingPhase: Math.random() * Math.PI * 2,
        scale: unit * (0.055 + Math.random() * 0.03),
        parallax: 0.22 + Math.random() * 0.18,
        z: 3.5 + (i % 4) * 0.2,
        tiltPhase: Math.random() * Math.PI * 2,
      }
    })
  }, [count, unit, travel, halfTravel, viewport.height])

  if (viewport.width < 1) return null

  return (
    <group renderOrder={15}>
      {birds.map((b) => (
        <Bird key={b.id} spec={b} />
      ))}
    </group>
  )
}
