import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function HashScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return null
}
