import { useScroll, useSpring } from 'framer-motion'

export function useScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
  return scaleX
}
