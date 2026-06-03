import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

interface UseKeyboardShortcutsOptions {
  resumeUrl: string
}

export function useKeyboardShortcuts({ resumeUrl }: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const key = e.key.toLowerCase()

      if (key === 'p') {
        e.preventDefault()
        if (location.pathname === '/') {
          document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          navigate('/#projects')
        }
      }

      if (key === 'r' && resumeUrl) {
        e.preventDefault()
        window.open(resumeUrl, '_blank', 'noopener,noreferrer')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [location.pathname, navigate, resumeUrl])
}
