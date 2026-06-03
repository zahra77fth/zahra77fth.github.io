import { motion, useReducedMotion } from 'framer-motion'

const orbs = [
  { size: 120, left: '8%', top: '18%', delay: 0, duration: 9 },
  { size: 80, left: '82%', top: '12%', delay: 1.2, duration: 11 },
  { size: 160, left: '75%', top: '62%', delay: 0.6, duration: 13 },
  { size: 100, left: '15%', top: '72%', delay: 2, duration: 10 },
  { size: 60, left: '48%', top: '8%', delay: 0.8, duration: 8 },
]

export function FloatingOrbs() {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-accent/10 bg-gradient-to-br from-accent/15 to-transparent backdrop-blur-sm"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
          }}
          animate={{
            y: [0, -24, 0, 16, 0],
            x: [0, 12, 0, -10, 0],
            scale: [1, 1.08, 1, 0.95, 1],
            opacity: [0.4, 0.7, 0.5, 0.65, 0.4],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            delay: orb.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
