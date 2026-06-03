import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerContainer } from '../../lib/motion'

interface StaggerGridProps {
  children: ReactNode
  className?: string
}

export function StaggerGrid({ children, className = '' }: StaggerGridProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.06 }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 280, damping: 24 },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
