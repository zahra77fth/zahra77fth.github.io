import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useTheme } from '../../context/ThemeContext'

type CursorMode = 'default' | 'project' | 'link' | 'close'

const labels: Record<CursorMode, string | null> = {
  default: null,
  project: 'View',
  link: 'Open',
  close: 'Close',
}

const ringSizes: Record<CursorMode, number> = {
  default: 36,
  link: 56,
  close: 60,
  project: 72,
}

export function InteractiveCursor() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const reduceMotion = useReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 1024px) and (pointer: fine)')
  const [mode, setMode] = useState<CursorMode>('default')
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const spring = { stiffness: 420, damping: 32, mass: 0.4 }
  const ringX = useSpring(x, spring)
  const ringY = useSpring(y, spring)
  const dotX = useSpring(x, { ...spring, stiffness: 800, damping: 40 })
  const dotY = useSpring(y, { ...spring, stiffness: 800, damping: 40 })

  useEffect(() => {
    if (!isDesktop || reduceMotion) {
      document.documentElement.classList.remove('ds-custom-cursor')
      return
    }

    document.documentElement.classList.add('ds-custom-cursor')

    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }

    const resolveMode = (target: EventTarget | null): CursorMode => {
      if (!(target instanceof Element)) return 'default'
      const cursor = target.closest('[data-cursor]')?.getAttribute('data-cursor')
      if (cursor === 'close' || cursor === 'project' || cursor === 'link') return cursor
      return 'default'
    }

    const onOver = (e: MouseEvent) => setMode(resolveMode(e.target))
    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget
      if (related instanceof Element && related.closest('[data-cursor]')) return
      setMode('default')
    }

    window.addEventListener('mousemove', move, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout', onOut, { passive: true })

    return () => {
      document.documentElement.classList.remove('ds-custom-cursor')
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
    }
  }, [isDesktop, reduceMotion, x, y])

  if (!isDesktop || reduceMotion) return null

  const label = labels[mode]
  const ringSize = ringSizes[mode]

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--ds-z-cursor)]" aria-hidden>
      <motion.div
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
          isDark ? 'cursor-ring--dark border-indigo-300/80 mix-blend-screen' : 'cursor-ring--light border-sky-600/40 bg-white/30'
        }`}
        style={{ left: ringX, top: ringY }}
        animate={{ width: ringSize, height: ringSize }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      />
      <motion.div
        className={`absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${isDark ? 'bg-indigo-300' : 'bg-sky-600'}`}
        style={{ left: dotX, top: dotY }}
      />
      {label && (
        <motion.span
          className="absolute -translate-x-1/2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent"
          style={{ left: ringX, top: ringY }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 44 }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}
