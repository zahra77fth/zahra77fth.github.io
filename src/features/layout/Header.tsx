import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'
import { useScrolled } from '../../hooks/useScrolled'
import { Button } from '../../components/ui/Button'
import { Container } from '../../components/ui/Container'
import { cn } from '../../design-system'
import { ThemeToggle } from './ThemeToggle'
import { MobileMenu } from './MobileMenu'

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      to={href}
      data-cursor="link"
      className={cn('site-header__nav-link', active && 'site-header__nav-link--active')}
    >
      {active && (
        <motion.span
          layoutId="header-nav-pill"
          className="site-header__nav-indicator"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <span className="site-header__nav-label">{label}</span>
    </Link>
  )
}

export function Header() {
  const { site } = usePortfolio()
  const [open, setOpen] = useState(false)
  const closeMenu = useCallback(() => setOpen(false), [])
  const location = useLocation()
  const scrolled = useScrolled(16)

  const isActive = (href: string) => {
    if (href === '/contact') return location.pathname === '/contact'
    if (href.startsWith('/#')) return location.pathname === '/' && location.hash === href.slice(1)
    return false
  }

  return (
    <>
      <header className="site-header" data-scrolled={scrolled || undefined}>
        <motion.div
          className={cn('site-header__shell', scrolled && 'site-header__shell--scrolled')}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Container className="site-header__inner">
            <Link to="/" className="site-header__brand" data-cursor="link">
              <span className="site-header__mark" aria-hidden>
                <span className="site-header__mark-letter">{site.name.charAt(0)}</span>
              </span>
              <span className="site-header__brand-text">
                <span className="site-header__name">{site.name}</span>
                <span className="site-header__role">{site.title}</span>
              </span>
            </Link>

            <nav className="site-header__nav" aria-label="Main">
              {site.navigation.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
              ))}
            </nav>

            <div className="site-header__actions">
              <ThemeToggle className="site-header__icon-btn" />
              <Button variant="primary" href="/contact" className="site-header__cta hidden sm:inline-flex">
                Get in touch
              </Button>
              <button
                type="button"
                className={cn('site-header__icon-btn site-header__menu-btn lg:hidden', open && 'site-header__menu-btn--open')}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-navigation"
                aria-label={open ? 'Close menu' : 'Open menu'}
              >
                <span className="site-header__menu-icon" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </Container>
        </motion.div>

        <MobileMenu open={open} onClose={closeMenu} items={site.navigation} isActive={isActive} />
      </header>

      <div className="header-spacer" aria-hidden />
    </>
  )
}
