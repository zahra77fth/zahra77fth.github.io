import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export const HOME_SECTION_IDS = [
  'about',
  'skills',
  'experience',
  'projects',
  'education',
  'writing',
] as const

export interface ViewportAnchor {
  x: number
  y: number
}

function measureSection(id: string): ViewportAnchor {
  const el = document.getElementById(id)
  if (!el) return { x: 0.55, y: 0.2 }

  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + Math.min(rect.height * 0.35, 120)
  const x = (cx / window.innerWidth) * 2 - 1
  const y = 1 - (cy / window.innerHeight) * 2
  return {
    x: Math.max(-0.92, Math.min(0.92, x)),
    y: Math.max(-0.88, Math.min(0.88, y)),
  }
}

export function useSectionAnchors() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const activeRef = useRef(isHome ? 'about' : 'contact')
  const [activeSectionId, setActiveSectionId] = useState(activeRef.current)
  const [anchor, setAnchor] = useState<ViewportAnchor>({ x: 0.55, y: 0.2 })

  useEffect(() => {
    if (!isHome) {
      const id = location.pathname === '/contact' ? 'contact' : 'home'
      activeRef.current = id
      setActiveSectionId(id)
      setAnchor(location.pathname === '/contact' ? { x: 0.55, y: 0.25 } : { x: 0, y: 0 })
      return
    }

    const sync = (id: string) => {
      activeRef.current = id
      setActiveSectionId(id)
      setAnchor(measureSection(id))
    }

    const elements = HOME_SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (elements.length === 0) {
      sync('about')
      return
    }

    const visible = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.intersectionRatio))
        let best = activeRef.current
        let bestRatio = 0
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        })
        if (bestRatio > 0.08) sync(best)
      },
      { rootMargin: '-18% 0px -52% 0px', threshold: [0, 0.15, 0.35, 0.55, 0.75] },
    )

    elements.forEach((el) => observer.observe(el))

    const onScroll = () => sync(activeRef.current)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    sync('about')

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [isHome, location.pathname])

  return { activeSectionId, anchor, isHome }
}
