import { usePerformanceTier } from '../../hooks/usePerformanceTier'
import { useReducedMotion } from 'framer-motion'
import { AuroraCanvas } from './AuroraCanvas'
import { BackgroundVideo } from './BackgroundVideo'
import { FlowLinesCanvas } from './FlowLinesCanvas'

export function BackgroundScene() {
  const reduceMotion = useReducedMotion()
  const tier = usePerformanceTier()

  if (reduceMotion) {
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-accent/5 to-background"
        aria-hidden
      />
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden contain-strict" aria-hidden>
      <BackgroundVideo />
      <div className={tier === 'lite' ? 'opacity-70' : 'opacity-85'}>
        <AuroraCanvas />
      </div>
      {tier === 'full' && <FlowLinesCanvas />}
      <div className="absolute inset-0 grid-bg opacity-[0.12]" />
      {/* CSS-only orbs — GPU-friendly, no JS animation loop */}
      <div className="bg-orb bg-orb-a animate-float" />
      <div className="bg-orb bg-orb-b animate-float-delayed" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_80%)]" />
    </div>
  )
}
