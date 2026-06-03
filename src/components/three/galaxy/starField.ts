import * as THREE from 'three'

const ARMS = 4
const ARM_TWIST = 1.12

/** Logarithmic spiral disc — reads like a barred spiral galaxy. */
export function fillSpiralGalaxy(out: Float32Array, count: number) {
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const arm = Math.floor(Math.random() * ARMS)
    const armAngle = (arm / ARMS) * Math.PI * 2
    const radius = Math.pow(Math.random(), 0.62) * 11.5 + 0.15
    const spin = radius * ARM_TWIST + armAngle
    const spread = (Math.random() - 0.5) * (0.28 + radius * 0.09)
    const x = Math.cos(spin) * radius + spread
    const z = Math.sin(spin) * radius * 0.52 + spread * 0.35
    const y = (Math.random() - 0.5) * 0.22 * Math.max(0.12, 1.1 - radius / 11.5)
    out[i3] = x
    out[i3 + 1] = y
    out[i3 + 2] = z - 2.2
  }
}

/** Sparse halo stars outside the disc. */
export function fillHaloStars(out: Float32Array, count: number) {
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const radius = 9 + Math.random() * 10
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    out[i3] = radius * Math.sin(phi) * Math.cos(theta)
    out[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.4
    out[i3 + 2] = radius * Math.cos(phi) * 0.3 - 3
  }
}

export function colorForStar(x: number, y: number, z: number, out: THREE.Color) {
  const r = Math.sqrt(x * x + y * y + (z + 2) * (z + 2) * 0.3)
  const tint = Math.random()

  if (r < 1.8) {
    out.set(tint > 0.5 ? '#fef3c7' : '#fde68a')
  } else if (r < 4.5) {
    out.set(tint > 0.6 ? '#f0abfc' : '#c4b5fd')
  } else if (tint > 0.88) {
    out.set('#7dd3fc')
  } else if (tint > 0.82) {
    out.set('#a5b4fc')
  } else {
    out.set('#e2e8f0')
  }
}
