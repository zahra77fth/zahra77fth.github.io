/**
 * Light-mode sky + UI harmony — CSS boot, WebGL clear, and shader stay in sync.
 */
export const SKY_BOOT_GRADIENT =
  'linear-gradient(180deg, #4a6d94 0%, #6d9ec4 40%, #a8cce6 74%, #edf4fa 100%)'

export const SKY_CANVAS_CLEAR = '#7aacd0'

export const SKY_PALETTE = {
  zenith: '#4a6d94',
  mid: '#6d9ec4',
  horizon: '#edf4fa',
  sun: '#fff8ee',
  cloud: '#ffffff',
  cloudFar: '#f4f9fd',
  cloudHighlight: '#fcfeff',
  cloudShadow: '#b0c9de',
  bird: '#2a4460',
  sparkle: '#f5faff',
} as const

/** RGB 0–1 for SkyBackdrop shader */
export const SKY_SHADER = {
  zenith: [0.29, 0.427, 0.58] as const,
  mid: [0.427, 0.62, 0.769] as const,
  horizon: [0.929, 0.957, 0.98] as const,
  warm: [1.0, 0.973, 0.933] as const,
  accent: [0.55, 0.72, 0.88] as const,
} as const
