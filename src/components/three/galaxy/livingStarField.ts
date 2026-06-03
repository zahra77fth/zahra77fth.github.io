import * as THREE from 'three'

export type StarKind = 'memory' | 'idea' | 'drift'

export interface LivingStar {
  x: number
  y: number
  z: number
  kind: StarKind
  phase: number
  speed: number
  orbit: number
  pulse: number
}

const ARMS = 5
const TWIST = 0.95

export function createLivingStars(count: number): LivingStar[] {
  const stars: LivingStar[] = []

  for (let i = 0; i < count; i++) {
    const arm = Math.floor(Math.random() * ARMS)
    const armAngle = (arm / ARMS) * Math.PI * 2
    const radius = Math.pow(Math.random(), 0.58) * 12 + 0.8
    const spin = radius * TWIST + armAngle
    const spread = (Math.random() - 0.5) * (0.32 + radius * 0.1)

    const roll = Math.random()
    const kind: StarKind = roll > 0.92 ? 'idea' : roll > 0.55 ? 'memory' : 'drift'

    stars.push({
      x: Math.cos(spin) * radius + spread,
      y: (Math.random() - 0.5) * 0.28 * Math.max(0.15, 1.15 - radius / 12),
      z: Math.sin(spin) * radius * 0.48 + spread * 0.3 - 2,
      kind,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.55,
      orbit: 0.04 + Math.random() * 0.14,
      pulse: 0.6 + Math.random() * 1.4,
    })
  }

  return stars
}

export function colorForKind(kind: StarKind, pulseT: number, out: THREE.Color) {
  switch (kind) {
    case 'idea': {
      const p = 0.65 + Math.sin(pulseT) * 0.35
      out.setRGB(0.45 * p, 0.82 * p, 1.0 * p)
      break
    }
    case 'memory':
      out.setRGB(0.82, 0.78, 0.95)
      break
    default:
      out.setRGB(0.72, 0.76, 0.92)
  }
}
