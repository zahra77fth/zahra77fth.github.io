import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { cn } from '../../design-system'

interface NavItem {
  label: string
  href: string
}

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  items: NavItem[]
  isActive: (href: string) => boolean
}

export function MobileMenu({ open, onClose, items, isActive }: MobileMenuProps) {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only when route changes
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="mobile-menu__backdrop lg:hidden"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="mobile-menu__panel lg:hidden"
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="mobile-menu__header">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">Menu</p>
              <button
                type="button"
                className="mobile-menu__close"
                onClick={onClose}
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden>
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <nav className="mobile-menu__nav" aria-label="Mobile">
              <ul className="ds-stack ds-stack--xs">
                {items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        data-cursor="link"
                        onClick={onClose}
                        className={cn('mobile-menu__link', active && 'mobile-menu__link--active')}
                      >
                        <span className="mobile-menu__link-text">{item.label}</span>
                        <span className="mobile-menu__link-arrow" aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="mobile-menu__footer">
              <Button variant="primary" href="/contact" className="w-full">
                Hire me
              </Button>
              <p className="mobile-menu__hint text-center text-[11px] text-muted">
                Press <kbd className="ds-kbd">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
