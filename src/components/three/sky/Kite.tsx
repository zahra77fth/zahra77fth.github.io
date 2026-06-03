import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from './skyInteraction'

const LIGHT_GREEN = '#8bc34a'
const DARK_GREEN = '#388e3c'
const FRAME = '#1a1a1a'
const TAIL_GREEN = '#2e7d32'

/** Always in front of clouds (opaque + transparent passes). */
const KITE_RENDER_ORDER = 30
const KITE_WORLD_Z = 8
const KITE_Z = 0.02

const KITE_LINE_PROPS = {
  renderOrder: KITE_RENDER_ORDER,
  transparent: true,
  depthTest: true,
  depthWrite: false,
} as const

const KITE_MESH_MAT = {
  side: THREE.DoubleSide,
  depthTest: true,
  depthWrite: true,
} as const

function triShape(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) {
  const s = new THREE.Shape()
  s.moveTo(a.x, a.y)
  s.lineTo(b.x, b.y)
  s.lineTo(c.x, c.y)
  s.closePath()
  return s
}

function Bow({ color, y }: { color: string; y: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.14, 0)
    s.lineTo(-0.04, 0.06)
    s.lineTo(0, 0)
    s.lineTo(0.04, 0.06)
    s.lineTo(0.14, 0)
    s.lineTo(0.04, -0.06)
    s.lineTo(0, 0)
    s.lineTo(-0.04, -0.06)
    s.closePath()
    return s
  }, [])

  return (
    <mesh position={[0, y, KITE_Z]} scale={0.55} renderOrder={KITE_RENDER_ORDER}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} {...KITE_MESH_MAT} />
    </mesh>
  )
}

function WavyRibbon({
  side,
  colors,
}: {
  side: 'left' | 'right'
  colors: [string, string]
}) {
  const points = useMemo(() => {
    const dir = side === 'left' ? -1 : 1
    const startX = dir * 0.72
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      pts.push(
        new THREE.Vector3(
          startX + dir * t * 0.35 + Math.sin(t * 6) * 0.06 * dir,
          Math.sin(t * 5) * 0.08,
          KITE_Z,
        ),
      )
    }
    return pts
  }, [side])

  return (
    <>
      <Line points={points} color={colors[0]} lineWidth={2.8} {...KITE_LINE_PROPS} />
      <Line
        points={points.map((p, i) => p.clone().add(new THREE.Vector3(0, -0.07 - i * 0.005, 0)))}
        color={colors[1]}
        lineWidth={2.8}
        {...KITE_LINE_PROPS}
      />
    </>
  )
}

/** Horizontal nudge in CSS pixels (positive = right). */
const KITE_OFFSET_X_PX = 160
/** Fixed viewport placement (fraction of height) — not tied to page scroll */
const KITE_Y_FRAC = 0.12
const KITE_FOOTER_Y_FRAC = -0.42
const KITE_SCALE_FRAC = 0.074

/** Clip-art kite — green diamond, black frame, colorful ribbons & tail bows. */
export function Kite() {
  const root = useRef<THREE.Group>(null)
  const group = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)
  const viewport = useThree((s) => s.viewport)
  const size = useThree((s) => s.size)

  const shapes = useMemo(() => {
    const tl = new THREE.Vector2(-0.72, 0)
    const tr = new THREE.Vector2(0.72, 0)
    const top = new THREE.Vector2(0, 1)
    const bot = new THREE.Vector2(0, -0.62)
    const ctr = new THREE.Vector2(0, 0)
    return {
      topL: triShape(tl, ctr, top),
      topR: triShape(ctr, tr, top),
      botL: triShape(tl, bot, ctr),
      botR: triShape(ctr, bot, tr),
    }
  }, [])

  const frameLines = useMemo(
    () => [
      [new THREE.Vector3(0, 1, KITE_Z), new THREE.Vector3(0, -0.62, KITE_Z)],
      [new THREE.Vector3(-0.72, 0, KITE_Z), new THREE.Vector3(0.72, 0, KITE_Z)],
      [new THREE.Vector3(0, 1, KITE_Z), new THREE.Vector3(-0.72, 0, KITE_Z)],
      [new THREE.Vector3(0, 1, KITE_Z), new THREE.Vector3(0.72, 0, KITE_Z)],
      [new THREE.Vector3(-0.72, 0, KITE_Z), new THREE.Vector3(0, -0.62, KITE_Z)],
      [new THREE.Vector3(0.72, 0, KITE_Z), new THREE.Vector3(0, -0.62, KITE_Z)],
    ],
    [],
  )

  const tailPoints = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push(new THREE.Vector3(Math.sin(t * 4) * 0.07, -0.62 - t * 1.55, KITE_Z))
    }
    return pts
  }, [])

  const footerPoint = useMemo(() => new THREE.Vector3(), [])
  const midPoint = useMemo(() => new THREE.Vector3(), [])
  const kitePoint = useMemo(() => new THREE.Vector3(), [])
  const stringPoints = useMemo(
    () => [footerPoint, midPoint, kitePoint],
    [footerPoint, midPoint, kitePoint],
  )

  const bowColors = ['#ec407a', '#ffca28', '#42a5f5', '#ffca28', '#ec407a'] as const
  const bowYs = [-0.85, -1.08, -1.32, -1.55, -1.78]

  const footerWorld = useRef(new THREE.Vector3())
  const midWorld = useRef(new THREE.Vector3())
  const kiteWorld = useRef(new THREE.Vector3())

  useFrame((state) => {
    if (!group.current || !root.current) return
    const t = state.clock.elapsedTime
    const unit = Math.min(viewport.width, viewport.height)
    const h = viewport.height
    const ks = skyInteraction.kiteScroll
    const scrollBoost = Math.min(1, Math.abs(skyInteraction.scrollVelocity) / 14)

    const scale = unit * (KITE_SCALE_FRAC + ks * 0.012)
    const pxWorld = viewport.width / Math.max(1, size.width)
    const waveAmp = unit * (0.018 + ks * 0.055 + scrollBoost * 0.035)
    const waveX = Math.sin(t * 2.4 + ks * 14) * waveAmp
    const waveY = Math.sin(t * 1.85 + ks * 10 + 1.1) * waveAmp * 0.7
    const sway = Math.sin(t * 3.2 + ks * 16) * (0.05 + ks * 0.09 + scrollBoost * 0.05)

    const kiteX =
      -viewport.width * (0.5 + Math.sin(t * 0.35) * 0.02) +
      skyInteraction.pointerX * unit * 0.025 +
      KITE_OFFSET_X_PX * pxWorld +
      waveX
    const kiteY =
      h * (KITE_Y_FRAC + ks * 0.05) +
      Math.sin(t * 0.9) * unit * 0.012 -
      skyInteraction.pointerY * unit * 0.02 +
      waveY

    root.current.position.set(kiteX, kiteY, KITE_WORLD_Z)
    root.current.renderOrder = KITE_RENDER_ORDER

    group.current.rotation.z = Math.sin(t * 0.85) * 0.1 + sway
    group.current.scale.setScalar(scale)

    if (tailRef.current) {
      tailRef.current.rotation.z =
        Math.sin(t * 2.5) * 0.12 + Math.sin(t * 4 + ks * 11) * (0.06 + ks * 0.14)
    }

    footerWorld.current.set(kiteX * 0.5, h * KITE_FOOTER_Y_FRAC, KITE_WORLD_Z)
    kiteWorld.current.set(kiteX, kiteY - scale * 0.35, KITE_WORLD_Z)
    midWorld.current.set(
      (kiteWorld.current.x + footerWorld.current.x) * 0.5 +
        Math.sin(t * 1.2 + ks * 8) * unit * (0.02 + ks * 0.03),
      (kiteWorld.current.y + footerWorld.current.y) * 0.5 +
        Math.cos(t * 1.5 + ks * 6) * unit * (0.012 + ks * 0.02),
      KITE_WORLD_Z,
    )

    root.current.worldToLocal(footerWorld.current)
    root.current.worldToLocal(midWorld.current)
    root.current.worldToLocal(kiteWorld.current)

    footerPoint.copy(footerWorld.current)
    midPoint.copy(midWorld.current)
    kitePoint.copy(kiteWorld.current)
    footerPoint.z = KITE_Z
    midPoint.z = KITE_Z
    kitePoint.z = KITE_Z
  })

  return (
    <group ref={root} renderOrder={KITE_RENDER_ORDER}>
      <Line
        points={stringPoints}
        color="#546e7a"
        lineWidth={1.4}
        opacity={0.6}
        {...KITE_LINE_PROPS}
      />

      <group ref={group}>
        <mesh renderOrder={KITE_RENDER_ORDER}>
          <shapeGeometry args={[shapes.topL]} />
          <meshBasicMaterial color={LIGHT_GREEN} {...KITE_MESH_MAT} />
        </mesh>
        <mesh renderOrder={KITE_RENDER_ORDER}>
          <shapeGeometry args={[shapes.topR]} />
          <meshBasicMaterial color={LIGHT_GREEN} {...KITE_MESH_MAT} />
        </mesh>
        <mesh renderOrder={KITE_RENDER_ORDER}>
          <shapeGeometry args={[shapes.botL]} />
          <meshBasicMaterial color={DARK_GREEN} {...KITE_MESH_MAT} />
        </mesh>
        <mesh renderOrder={KITE_RENDER_ORDER}>
          <shapeGeometry args={[shapes.botR]} />
          <meshBasicMaterial color={DARK_GREEN} {...KITE_MESH_MAT} />
        </mesh>

        {frameLines.map((pair, i) => (
          <Line key={i} points={pair} color={FRAME} lineWidth={2.2} {...KITE_LINE_PROPS} />
        ))}

        <WavyRibbon side="left" colors={['#ec407a', '#42a5f5']} />
        <WavyRibbon side="right" colors={['#ffca28', '#42a5f5']} />

        <group ref={tailRef}>
          <Line points={tailPoints} color={TAIL_GREEN} lineWidth={2.6} {...KITE_LINE_PROPS} />
          {bowYs.map((y, i) => (
            <Bow key={i} color={bowColors[i] ?? '#ec407a'} y={y} />
          ))}
        </group>
      </group>
    </group>
  )
}
