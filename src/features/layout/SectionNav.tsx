import { Link, useLocation } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'

/** Desktop section rail — quick jump links */
export function SectionNav() {
  const { site } = usePortfolio()
  const location = useLocation()

  if (location.pathname !== '/') return null

  const sections = site.navigation.filter((n) => n.href.startsWith('/#'))

  return (
    <nav
      className="section-rail fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 xl:flex"
      aria-label="Section navigation"
    >
      {sections.map((item) => {
        const active = location.hash === item.href.slice(1)
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`section-rail__dot group relative flex items-center justify-end gap-2 ${
              active ? 'section-rail__dot--active' : ''
            }`}
            title={item.label}
          >
            <span className="section-rail__label font-display opacity-0 transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
            <span className="section-rail__marker" />
          </Link>
        )
      })}
    </nav>
  )
}
