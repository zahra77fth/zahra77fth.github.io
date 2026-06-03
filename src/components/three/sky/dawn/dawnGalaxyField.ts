import * as THREE from 'three'
import { hashSeed } from './dawnMotion'
import { pickStarColorIndex } from './dawnPalette'

const DAWN_LINK_COLOR = new THREE.Color(0.94, 0.76, 0.88)

export interface GalaxyParticle {
  radius: number
  angle: number
  y: number
  zSpread: number
  angularSpeed: number
  driftPhase: number
  noiseSeed: number
  colorIdx: number
  opacity: number
  size: number
}

const ARMS = 5
const TWIST = 0.94

export function createSpiralGalaxy(count: number): GalaxyParticle[] {
  const particles: GalaxyParticle[] = []
  const perArm = Math.ceil(count / ARMS)

  for (let i = 0; i < count; i++) {
    const seed = hashSeed(i * 13.71)
    const arm = Math.floor(i / perArm) % ARMS
    const armAngle = (arm / ARMS) * Math.PI * 2
    const radius = 0.15 + Math.pow(hashSeed(i * 29.17), 0.48) * 8.5
    const armSpread = (hashSeed(i * 19.43) - 0.5) * (0.14 + radius * 0.065)
    const angle = radius * TWIST + armAngle + armSpread
    const y = (hashSeed(i * 41.03) - 0.5) * 0.26 * Math.max(0.12, 1.1 - radius / 12)
    const inner = 1 / (0.5 + radius * 0.1)
    const coreBoost = radius < 2.5 ? 1.35 : radius < 5 ? 1.12 : 1

    particles.push({
      radius,
      angle,
      y,
      zSpread: (hashSeed(i * 7.91) - 0.5) * 0.38,
      angularSpeed: inner * (0.08 + seed * 0.06),
      driftPhase: seed * Math.PI * 2,
      noiseSeed: hashSeed(i * 3.37),
      colorIdx: pickStarColorIndex(seed),
      opacity: (0.72 + seed * 0.24) * coreBoost,
      size: ((radius < 2 ? 0.28 : radius < 5 ? 0.22 : 0.16) + seed * 0.1) * coreBoost,
    })
  }

  return particles
}

/** Halo stars — still follow spiral arms but wider scatter. */
export function createSparkleDust(count: number): GalaxyParticle[] {
  const particles: GalaxyParticle[] = []

  for (let i = 0; i < count; i++) {
    const seed = hashSeed(i * 23.11 + 900)
    const arm = Math.floor(seed * ARMS) % ARMS
    const armAngle = (arm / ARMS) * Math.PI * 2
    const radius = 2 + Math.pow(seed, 0.65) * 7.5
    const angle = radius * TWIST * 0.92 + armAngle + (seed - 0.5) * 1.1

    particles.push({
      radius,
      angle,
      y: (hashSeed(i * 5.3) - 0.5) * 0.45,
      zSpread: (hashSeed(i * 9.7) - 0.5) * 0.65,
      angularSpeed: (0.05 + seed * 0.04) / (0.6 + radius * 0.08),
      driftPhase: seed * Math.PI * 2,
      noiseSeed: hashSeed(i * 1.9),
      colorIdx: pickStarColorIndex(seed),
      opacity: 0.55 + seed * 0.35,
      size: 0.12 + seed * 0.08,
    })
  }

  return particles
}

export function galaxyParticlePosition(
  p: GalaxyParticle,
  t: number,
  groupSpin: number,
): { x: number; y: number; z: number } {
  const spin = groupSpin + t * p.angularSpeed
  const a = p.angle + spin
  const wobble =
    Math.sin(t * 0.36 + p.noiseSeed * 11.3) * 0.09 +
    Math.cos(t * 0.25 + p.driftPhase * 1.4) * 0.06
  const r = p.radius * (1 + wobble * 0.04)
  const floatY =
    Math.sin(t * 0.42 + p.driftPhase) * 0.06 +
    Math.cos(t * 0.29 + p.noiseSeed * 7.2) * 0.04

  return {
    x: Math.cos(a) * r,
    y: p.y + floatY,
    z: Math.sin(a) * r * 0.42 + p.zSpread,
  }
}

function cellKey(x: number, y: number, z: number, cellSize: number) {
  return `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`
}

/** Spatial-grid star connections — visible spiral arm structure. */
export function buildGalaxyLinks(
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
  const grid = new Map<string, number[]>()

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const key = cellKey(positions[i3]!, positions[i3 + 1]!, positions[i3 + 2]!, cellSize)
    const bucket = grid.get(key)
    if (bucket) bucket.push(i)
    else grid.set(key, [i])
  }

  let links = 0
  const linkCol = DAWN_LINK_COLOR
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
            if (i >= j) continue
            const j3 = j * 3
            const ddx = positions[i3]! - positions[j3]!
            const ddy = positions[i3 + 1]! - positions[j3 + 1]!
            const ddz = positions[i3 + 2]! - positions[j3 + 2]!
            const d2 = ddx * ddx + ddy * ddy + ddz * ddz
            if (d2 > linkDistSq || d2 < 0.08) continue
            candidates.push({ j, d2 })
          }
        }
      }
    }

    candidates.sort((a, b) => a.d2 - b.d2)
    let added = 0

    for (const { j, d2 } of candidates) {
      if (links >= maxLinks || added >= maxPerStar) break
      const pairKey = `${i}-${j}`
      if (usedPairs.has(pairKey)) continue
      usedPairs.add(pairKey)

      const dist = Math.sqrt(d2)
      const fade = 1 - dist / linkDistance
      const pulse = 0.42 + Math.sin(t * 1.1 + i * 0.21 + j * 0.13) * 0.18
      const alpha = fade * fade * pulse * 0.42

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
