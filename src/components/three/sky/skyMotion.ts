/**
 * Kite scroll influence (0–1) — ramps from ~Projects downward, capped so footer stays stable.
 */
export function getKiteScrollProgress(scrollY: number): number {
  if (typeof document === 'undefined') return 0
  const projects = document.getElementById('projects')
  const anchor = projects?.offsetTop ?? window.innerHeight * 2.2
  const start = anchor - window.innerHeight * 0.35
  const range = window.innerHeight * 0.9
  return Math.min(1, Math.max(0, (scrollY - start) / range))
}

