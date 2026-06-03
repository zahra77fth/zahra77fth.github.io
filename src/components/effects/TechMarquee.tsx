import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'

export function TechMarquee() {
  const { skills } = usePortfolio()
  const reduceMotion = useReducedMotion()
  const items = skills.categories.flatMap((c) => c.items).slice(0, 14)

  const track = [...items, ...items]

  if (reduceMotion) {
    return (
      <div className="flex flex-wrap justify-center gap-2 px-4 py-6">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-xs text-muted">
            {item}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden border-y border-border/40 bg-surface/30 py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <motion.div
        className="flex w-max gap-3"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {track.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="shrink-0 rounded-full border border-border/60 bg-surface/80 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur-sm"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
