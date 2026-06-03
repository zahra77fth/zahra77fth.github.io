import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { useScrolled } from '../../hooks/useScrolled'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      to={href}
      className={`touch-target relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? 'text-accent' : 'text-muted hover:bg-white/5 hover:text-foreground'
      }`}
    >
      {label}
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 -z-10 rounded-full bg-accent/15 ring-1 ring-accent/25"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
    </Link>
  )
}

export function Header() {
  const { site } = usePortfolio()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const scrolled = useScrolled(8)

  const isActive = (href: string) => {
    if (href === '/contact') return location.pathname === '/contact'
    if (href.startsWith('/#')) return location.pathname === '/' && location.hash === href.slice(1)
    return false
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
        <motion.div
          className={`glass-header mx-auto max-w-6xl transition-shadow duration-500 ${
            scrolled ? 'glass-header-scrolled shadow-2xl shadow-black/10' : ''
          }`}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Container className="flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-4">
            <Link to="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3">
              <motion.span
                className="font-display relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-[var(--color-accent-secondary)] text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 sm:h-10 sm:w-10"
                whileHover={{ scale: 1.08, rotate: -4 }}
                whileTap={{ scale: 0.94 }}
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                {site.name.charAt(0)}
              </motion.span>
              <span className="font-display hidden truncate font-semibold sm:inline">{site.name}</span>
            </Link>

            <nav
              className="glass-nav hidden items-center gap-0.5 rounded-full p-1 lg:flex"
              aria-label="Main"
            >
              {site.navigation.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <div className="hidden sm:block">
                <Button variant="primary" href="/contact">
                  Hire me
                </Button>
              </div>
              <motion.button
                type="button"
                className="touch-target glass-nav flex h-11 w-11 items-center justify-center rounded-xl lg:hidden"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label="Toggle menu"
                whileTap={{ scale: 0.92 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 8h16M4 16h16" />}
                </svg>
              </motion.button>
            </div>
          </Container>

          <AnimatePresence>
            {open && (
              <motion.nav
                className="glass-nav border-t border-white/10 lg:hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                aria-label="Mobile"
              >
                <div className="flex max-h-[min(70vh,420px)] flex-col gap-1 overflow-y-auto p-3 sm:p-4">
                  {site.navigation.map((item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ x: -16, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className={`touch-target flex items-center rounded-xl px-4 py-3.5 text-sm font-medium ${
                          isActive(item.href)
                            ? 'bg-accent/15 text-accent'
                            : 'hover:bg-white/5 active:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  ))}
                  <Button variant="primary" href="/contact" className="mt-2 w-full">
                    Hire me
                  </Button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[4.25rem] shrink-0 sm:h-[5.25rem]" aria-hidden />
    </>
  )
}
