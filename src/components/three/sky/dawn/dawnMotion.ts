/** Dreamy blush-pink palette for light-mode cosmos. */
export const DAWN = {
  skyTop: '#FFF0F8',
  skyMid: '#FFFBFD',
  skyBottom: '#FFF5F0',
  clear: '#FFFBFD',
  sunCore: '#FFF8FC',
  sunGold: '#FFD4E8',
  sunPink: '#FFD6E8',
  starBlue: '#FAD0E4',
  starLavender: '#DDD0F8',
  starPink: '#F5B4D4',
  starGold: '#F8C4DC',
} as const

/** Organic orbit — elliptical, noisy, never a perfect circle. */
export function dawnOrbit(
  t: number,
  seed: number,
  radius: number,
  speed: number,
  phase: number,
  parallax: { x: number; y: number },
) {
  const angle = t * speed + phase
  const wobble =
    Math.sin(t * 0.62 + seed * 11.7) * 0.14 + Math.cos(t * 0.41 + seed * 7.3) * 0.11
  const r = radius * (1 + wobble)
  const ellipse = 0.68 + (seed % 0.22)
  const nx = Math.sin(t * 0.33 + seed * 6.1) * radius * 0.09
  const ny = Math.cos(t * 0.29 + seed * 4.8) * radius * 0.07
  const floatY = Math.sin(t * 0.48 + phase * 1.6) * radius * 0.11

  return {
    x: Math.cos(angle) * r + nx + parallax.x * radius * 0.12,
    y: Math.sin(angle) * r * ellipse + floatY + ny + parallax.y * radius * 0.1,
    z: Math.sin(t * 0.36 + seed * 3.2) * radius * 0.08,
  }
}

export function hashSeed(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
