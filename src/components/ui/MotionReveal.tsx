import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { easeSmooth } from '../../lib/motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'rotate'

const offsets: Record<Direction, object> = {
  up: { y: 36 },
  down: { y: -36 },
  left: { x: -36 },
  right: { x: 36 },
  scale: { scale: 0.9 },
  rotate: { y: 24, rotate: 3 },
}

interface MotionRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: Direction
  /** Re-animate when scrolling back up (default: once) */
  repeat?: boolean
}

export function MotionReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  repeat = false,
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: 'blur(10px)', ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }}
      viewport={{ once: !repeat, amount: 0.08, margin: '0px 0px -40px 0px' }}
      transition={{ ...easeSmooth, delay }}
    >
      {children}
    </motion.div>
  )
}
