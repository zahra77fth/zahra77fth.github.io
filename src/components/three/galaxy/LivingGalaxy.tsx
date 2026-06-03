import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { skyInteraction } from '../sky/skyInteraction'
import { colorForKind, createLivingStars, type LivingStar, type StarKind } from './livingStarField'

interface LivingGalaxyProps {
  starCount: number
  linkDistance?: number
  maxLinks?: number
  maxLinksPerStar?: number
}

const KIND_SIZE: Record<StarKind, number> = {
  memory: 0.034,
  idea: 0.05,
  drift: 0.026,
}

function cellKey(x: number, y: number, z: number, cellSize: number) {
  return `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`
}

function buildConnections(
  positions: Float32Array,
  count: number,
  linkDistance: number,
  maxLinks: number,
  maxPerStar: number,
  linePositions: Float32Array,
  lineColors: Float32Array,
  t: number,
) {
  const cellSize = linkDistance
  const linkDistSq = linkDistance * linkDistance
  const minDistSq = 0.2
  const grid = new Map<string, number[]>()

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const key = cellKey(positions[i3]!, positions[i3 + 1]!, positions[i3 + 2]!, cellSize)
    const bucket = grid.get(key)
    if (bucket) bucket.push(i)
    else grid.set(key, [i])
  }

  let links = 0
  const linkCol = new THREE.Color(0.52, 0.6, 0.96)
  const usedPairs = new Set<string>()

  for (let i = 0; i < count && links < maxLinks; i++) {
    const i3 = i * 3
    const cx = Math.floor(positions[i3]! / cellSize)
    const cy = Math.floor(positions[i3 + 1]! / cellSize)
    const cz = Math.floor(positions[i3 + 2]! / cellSize)
    const candidates: { j: number; d2: number }[] = []

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(`${cx + dx},${cy + dy},${cz + dz}`)
          if (!cell) continue
          for (const j of cell) {
            if (i === j) continue
            const j3 = j * 3
            const ddx = positions[i3]! - positions[j3]!
            const ddy = positions[i3 + 1]! - positions[j3 + 1]!
            const ddz = positions[i3 + 2]! - positions[j3 + 2]!
            const d2 = ddx * ddx + ddy * ddy + ddz * ddz
            if (d2 > linkDistSq || d2 < minDistSq) continue
            candidates.push({ j, d2 })
          }
        }
      }
    }

    candidates.sort((a, b) => a.d2 - b.d2)
    let added = 0

    for (const { j, d2 } of candidates) {
      if (links >= maxLinks || added >= maxPerStar) break
      const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`
      if (usedPairs.has(pairKey)) continue
      usedPairs.add(pairKey)

      const dist = Math.sqrt(d2)
      const fade = 1 - dist / linkDistance
      const pulse = 0.38 + Math.sin(t * 1.15 + i * 0.28 + j * 0.17) * 0.2
      const alpha = fade * fade * pulse * 0.52

      const j3 = j * 3
      const li = links * 6
      linePositions[li] = positions[i3]!
      linePositions[li + 1] = positions[i3 + 1]!
      linePositions[li + 2] = positions[i3 + 2]!
      linePositions[li + 3] = positions[j3]!
      linePositions[li + 4] = positions[j3 + 1]!
      linePositions[li + 5] = positions[j3 + 2]!

      for (let k = 0; k < 2; k++) {
        const ci = li + k * 3
        lineColors[ci] = linkCol.r * alpha
        lineColors[ci + 1] = linkCol.g * alpha
        lineColors[ci + 2] = linkCol.b * alpha
      }

      links++
      added++
    }
  }

  return links
}

function computeStarPosition(s: LivingStar, t: number, px: number, py: number) {
  const driftX = Math.sin(t * s.speed + s.phase) * s.orbit
  const driftY = Math.cos(t * s.speed * 0.85 + s.phase * 1.3) * s.orbit * 0.7
  const driftZ = Math.sin(t * s.speed * 0.5 + s.phase) * s.orbit * 0.25
  return {
    x: s.x + driftX + px,
    y: s.y + driftY + py,
    z: s.z + driftZ,
  }
}

function KindLayer({ stars, kind }: { stars: LivingStar[]; kind: StarKind }) {
  const ref = useRef<THREE.Points>(null)
  const count = stars.length
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  const colors = useMemo(() => new Float32Array(count * 3), [count])

  useFrame((state) => {
    if (!ref.current || count === 0) return
    const t = state.clock.elapsedTime
    const px = skyInteraction.pointerX * 0.22
    const py = -skyInteraction.pointerY * 0.16
    const col = new THREE.Color()
    let size = KIND_SIZE[kind]

    for (let i = 0; i < count; i++) {
      const s = stars[i]!
      const i3 = i * 3
      const p = computeStarPosition(s, t, px, py)
      positions[i3] = p.x
      positions[i3 + 1] = p.y
      positions[i3 + 2] = p.z

      colorForKind(kind, t * s.pulse + s.phase, col)
      colors[i3] = col.r
      colors[i3 + 1] = col.g
      colors[i3 + 2] = col.b

      if (kind === 'idea') {
        size = KIND_SIZE.idea * (0.85 + Math.sin(t * s.pulse + s.phase) * 0.22)
      }
    }

    const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const colAttr = ref.current.geometry.attributes.color as THREE.BufferAttribute
    ;(posAttr.array as Float32Array).set(positions)
    ;(colAttr.array as Float32Array).set(colors)
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    ;(ref.current.material as THREE.PointsMaterial).size = size
  })

  const initialPositions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    stars.forEach((s, i) => {
      const i3 = i * 3
      arr[i3] = s.x
      arr[i3 + 1] = s.y
      arr[i3 + 2] = s.z
    })
    return arr
  }, [stars, count])

  const initialColors = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const col = new THREE.Color()
    stars.forEach((_, i) => {
      colorForKind(kind, 0, col)
      const i3 = i * 3
      arr[i3] = col.r
      arr[i3 + 1] = col.g
      arr[i3 + 2] = col.b
    })
    return arr
  }, [stars, kind, count])

  if (count === 0) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[initialColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={KIND_SIZE[kind]}
        vertexColors
        transparent
        opacity={kind === 'drift' ? 0.55 : 0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

/** Tilted living galaxy — scroll dives in, stars linked by memory threads. */
export function LivingGalaxy({
  starCount,
  linkDistance = 3.6,
  maxLinks = 900,
  maxLinksPerStar = 5,
}: LivingGalaxyProps) {
  const stars = useMemo(() => createLivingStars(starCount), [starCount])

  const linesRef = useRef<THREE.LineSegments>(null)
  const byKind = useMemo(
    () => ({
      memory: stars.filter((s) => s.kind === 'memory'),
      idea: stars.filter((s) => s.kind === 'idea'),
      drift: stars.filter((s) => s.kind === 'drift'),
    }),
    [stars],
  )

  const positions = useMemo(() => new Float32Array(stars.length * 3), [stars.length])
  const linePositions = useMemo(() => new Float32Array(maxLinks * 6), [maxLinks])
  const lineColors = useMemo(() => new Float32Array(maxLinks * 6), [maxLinks])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const px = skyInteraction.pointerX * 0.22
    const py = -skyInteraction.pointerY * 0.16

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]!
      const i3 = i * 3
      const p = computeStarPosition(s, t, px, py)
      positions[i3] = p.x
      positions[i3 + 1] = p.y
      positions[i3 + 2] = p.z
    }

    if (linesRef.current) {
      const links = buildConnections(
        positions,
        stars.length,
        linkDistance,
        maxLinks,
        maxLinksPerStar,
        linePositions,
        lineColors,
        t,
      )

      const geo = linesRef.current.geometry
      const posAttr = geo.attributes.position as THREE.BufferAttribute
      const colAttr = geo.attributes.color as THREE.BufferAttribute
      ;(posAttr.array as Float32Array).set(linePositions)
      ;(colAttr.array as Float32Array).set(lineColors)
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      geo.setDrawRange(0, links * 2)
    }
  })

  const initialLinePos = useMemo(() => new Float32Array(maxLinks * 6), [maxLinks])
  const initialLineCol = useMemo(() => new Float32Array(maxLinks * 6), [maxLinks])

  return (
    <group>
      <KindLayer stars={byKind.drift} kind="drift" />
      <KindLayer stars={byKind.memory} kind="memory" />
      <KindLayer stars={byKind.idea} kind="idea" />

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[initialLinePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[initialLineCol, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  )
}
