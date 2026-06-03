import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { MouseEvent, ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const springConfig = { stiffness: 300, damping: 30 }

interface TiltCardProps {
  children: ReactNode
  className?: string
  intensity?: number
}

export function TiltCard({ children, className = '', intensity = 12 }: TiltCardProps) {
  const reduceMotion = useReducedMotion()
  const canTilt = useMediaQuery('(min-width: 768px) and (pointer: fine)')

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), springConfig)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), springConfig)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!canTilt || reduceMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  if (!canTilt || reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  )
}
