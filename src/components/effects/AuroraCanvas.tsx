import { useEffect, useRef } from 'react'
import { usePageVisible } from '../../hooks/usePageVisible'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'
import { useReducedMotion } from 'framer-motion'

interface Blob {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  hue: number
}

export function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduceMotion = useReducedMotion()
  const pageVisible = usePageVisible()
  const tier = usePerformanceTier()

  useEffect(() => {
    if (reduceMotion || tier === 'lite') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const blobCount = tier === 'full' ? 5 : 3
    const blobs: Blob[] = Array.from({ length: blobCount }, (_, i) => ({
      x: 0.2 + i * 0.15,
      y: 0.3 + (i % 2) * 0.2,
      r: 0.38 + (i % 3) * 0.04,
      vx: 0.0003 * (i % 2 === 0 ? 1 : -1),
      vy: 0.00025 * (i % 2 === 0 ? -1 : 1),
      hue: 240 + i * 18,
    }))

    let frame = 0
    let raf = 0
    let last = 0
    const targetFps = tier === 'full' ? 60 : 30
    const frameInterval = 1000 / targetFps

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, tier === 'full' ? 1.5 : 1)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (!pageVisible) return
      if (now - last < frameInterval) return
      last = now

      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      const dark = document.documentElement.classList.contains('dark')
      const t = frame * 0.008

      ctx.clearRect(0, 0, w, h)

      for (const b of blobs) {
        b.x += b.vx + Math.sin(t + b.hue) * 0.00006
        b.y += b.vy + Math.cos(t * 0.9 + b.hue) * 0.00006
        if (b.x < 0.08 || b.x > 0.92) b.vx *= -1
        if (b.y < 0.08 || b.y > 0.92) b.vy *= -1

        const cx = b.x * w
        const cy = b.y * h
        const radius = b.r * Math.min(w, h)
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        const a = dark ? 0.5 : 0.4
        grad.addColorStop(0, `hsla(${b.hue}, 80%, ${dark ? 60 : 55}%, ${a})`)
        grad.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      frame++
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduceMotion, tier, pageVisible])

  if (reduceMotion || tier === 'lite') return null

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
}
