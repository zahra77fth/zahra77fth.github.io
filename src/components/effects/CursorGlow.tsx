import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useTheme } from '../../context/ThemeContext'

/** Soft follow glow — dark mode (galaxy) only */
export function CursorGlow() {
  const { theme } = useTheme()
  const reduceMotion = useReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 1024px) and (pointer: fine)')
  const x = useMotionValue(-500)
  const y = useMotionValue(-500)
  const springX = useSpring(x, { stiffness: 150, damping: 25 })
  const springY = useSpring(y, { stiffness: 150, damping: 25 })

  useEffect(() => {
    if (!isDesktop || reduceMotion) return

    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [isDesktop, reduceMotion, x, y])

  if (!isDesktop || reduceMotion || theme !== 'dark') return null

  return (
    <motion.div
      className="pointer-events-none fixed z-[5] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[80px]"
      style={{ left: springX, top: springY }}
      aria-hidden
    />
  )
}
