import { motion, useReducedMotion } from 'framer-motion'

const particles = Array.from({ length: 6 }, (_, i) => i)

export function BackgroundEffects() {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-30" aria-hidden />
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 grid-bg opacity-25" />
      <motion.div
        className="animate-float absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35], x: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="animate-float-delayed absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-[var(--color-accent-secondary)]/20 blur-[100px]"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.45, 0.25], x: [0, -24, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 h-72 w-[700px] -translate-x-1/2 rounded-full bg-accent/15 blur-[90px]"
        animate={{ y: [0, -24, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      {particles.map((i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-accent/40"
          style={{
            left: `${12 + i * 14}%`,
            top: `${20 + (i % 3) * 22}%`,
          }}
          animate={{
            y: [0, -20 - i * 4, 0],
            opacity: [0.2, 0.7, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 4 + i * 0.7, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
    </div>
  )
}
