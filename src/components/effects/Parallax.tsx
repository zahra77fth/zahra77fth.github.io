import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { cn } from '../../design-system'

interface ParallaxProps {
  children: ReactNode
  className?: string
  /** Negative = slower than scroll, positive = faster */
  speed?: number
}

export function Parallax({ children, className, speed = 0.35 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [speed * 48, speed * -48])

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
