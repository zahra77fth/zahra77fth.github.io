/** Shared core pulse — wave expands from galaxy center. */
export const dawnPulse = {
  strength: 0,
  waveRadius: 0,
}

let pulseStart = -1

/** Advance or trigger a core pulse. */
export function updateDawnPulse(t: number, nextAt: { value: number }): void {
  if (t >= nextAt.value) {
    nextAt.value = t + 9 + Math.random() * 11
    pulseStart = t
    dawnPulse.strength = 1
    dawnPulse.waveRadius = 0
  }

  if (pulseStart >= 0) {
    const age = t - pulseStart
    dawnPulse.waveRadius = age * 3.4
    dawnPulse.strength = Math.exp(-age * 0.55)
    if (dawnPulse.strength < 0.02) {
      pulseStart = -1
      dawnPulse.strength = 0
    }
  }
}

export function pulseBoostAt(distFromCore: number): number {
  if (dawnPulse.strength < 0.01) return 0
  const wave = Math.abs(distFromCore - dawnPulse.waveRadius)
  return Math.exp(-wave * wave * 1.8) * dawnPulse.strength * 0.75
}
