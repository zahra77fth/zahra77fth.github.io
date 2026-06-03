import { useMediaQuery } from './useMediaQuery'

export type PerformanceTier = 'full' | 'balanced' | 'lite'

/** Chooses background fidelity based on device — keeps Lighthouse scores high. */
export function usePerformanceTier(): PerformanceTier {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const prefersReducedData = useMediaQuery('(prefers-reduced-data: reduce)')

  if (prefersReducedData) return 'lite'
  if (isMobile) return 'balanced'
  return 'full'
}

/** Map lite → balanced so WebGL still mounts with fewer particles. */
export function resolveCanvasQuality(tier: PerformanceTier): Exclude<PerformanceTier, 'lite'> {
  return tier === 'lite' ? 'balanced' : tier
}
