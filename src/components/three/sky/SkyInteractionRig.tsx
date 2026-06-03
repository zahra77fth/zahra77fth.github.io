import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { getKiteScrollProgress } from './skyMotion'
import { skyInteraction } from './skyInteraction'

const POINTER_LERP = 0.14
const SCROLL_LERP = 0.16
const KITE_SCROLL_LERP = 0.12

/** Syncs DOM scroll + window pointer into shared skyInteraction (canvas is non-interactive). */
export function SkyInteractionRig() {
  const scrollTarget = useRef(0)
  const lastScrollY = useRef(0)
  const pointerTarget = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const updateScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      scrollTarget.current = window.scrollY / max
      skyInteraction.scrollShift = window.scrollY / window.innerHeight - 0.15
    }

    const onPointerMove = (e: PointerEvent) => {
      pointerTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerTarget.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }

    lastScrollY.current = window.scrollY
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  useFrame(() => {
    skyInteraction.pointerX += (pointerTarget.current.x - skyInteraction.pointerX) * POINTER_LERP
    skyInteraction.pointerY += (pointerTarget.current.y - skyInteraction.pointerY) * POINTER_LERP
    skyInteraction.scroll += (scrollTarget.current - skyInteraction.scroll) * SCROLL_LERP
    const kiteTarget = getKiteScrollProgress(window.scrollY)
    skyInteraction.kiteScroll += (kiteTarget - skyInteraction.kiteScroll) * KITE_SCROLL_LERP
    const vel = window.scrollY - lastScrollY.current
    lastScrollY.current = window.scrollY
    skyInteraction.scrollVelocity += (vel - skyInteraction.scrollVelocity) * 0.22
  })

  return null
}
