import { motion, useReducedMotion } from 'framer-motion'

export function FilmGrain() {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return null

  return (
    <motion.div
      className="film-grain pointer-events-none absolute inset-0 opacity-[0.045] dark:opacity-[0.07]"
      aria-hidden
      animate={{ opacity: [0.03, 0.06, 0.03] }}
      transition={{ duration: 0.15, repeat: Infinity, repeatType: 'mirror' }}
    />
  )
}
