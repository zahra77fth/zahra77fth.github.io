import { useEffect, useRef } from 'react'
import { usePageVisible } from '../../hooks/usePageVisible'
import { useReducedMotion } from 'framer-motion'

export function FlowLinesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduceMotion = useReducedMotion()
  const pageVisible = usePageVisible()

  useEffect(() => {
    if (reduceMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    let last = 0
    const lines = 12

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (!pageVisible || now - last < 33) return
      last = now

      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      const dark = document.documentElement.classList.contains('dark')

      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = dark ? 'rgba(129, 140, 248, 0.05)' : 'rgba(79, 70, 229, 0.06)'
      ctx.lineWidth = 1

      for (let i = 0; i < lines; i++) {
        ctx.beginPath()
        const yBase = (h / (lines + 1)) * (i + 1)
        for (let x = 0; x <= w; x += 10) {
          const y = yBase + Math.sin(x * 0.007 + t + i * 0.45) * 22
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      t += 0.01
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduceMotion, pageVisible])

  if (reduceMotion) return null

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-70" aria-hidden />
}
