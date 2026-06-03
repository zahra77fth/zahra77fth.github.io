import * as THREE from 'three'

/** Dreamy light-mode palette — soft pinks, blush, lavender. */
export const DAWN_PALETTE = {
  skyTop: '#FFF0F8',
  skyMid: '#FFFBFD',
  skyBottom: '#FFF5F0',
  star: ['#C84888', '#D86098', '#B83878', '#E878A8'] as const,
  starLavender: '#9878C8',
  link: new THREE.Color(0.94, 0.76, 0.88),
  nebulaPink: '#FFD6EC',
  nebulaBlush: '#F8C8E0',
  nebulaLavender: '#E4D4F8',
  sunCore: '#FFF8FC',
  sunPink: '#FFD4E8',
  shootHead: '#FFF0F8',
  shootTail: '#F0A0C8',
} as const

export function starColor(index: number, seed: number, out: THREE.Color): void {
  if (seed > 0.82) {
    out.set(DAWN_PALETTE.starLavender)
    return
  }
  out.set(DAWN_PALETTE.star[index % DAWN_PALETTE.star.length]!)
}

export function pickStarColorIndex(seed: number): number {
  if (seed > 0.82) return 4
  return Math.floor(seed * DAWN_PALETTE.star.length) % DAWN_PALETTE.star.length
}
