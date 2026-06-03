import { motion, useReducedMotion } from 'framer-motion'
import { useScrollProgress } from '../../hooks/useScrollProgress'

export function ScrollProgress() {
  const scaleX = useScrollProgress()
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return null

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-accent via-[var(--color-accent-secondary)] to-accent"
      style={{ scaleX }}
      aria-hidden
    />
  )
}
