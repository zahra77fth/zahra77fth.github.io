import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'

const socialLabels: Record<string, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  twitter: 'X',
  dribbble: 'Dribbble',
}

export function Footer() {
  const { site } = usePortfolio()
  const year = new Date().getFullYear()
  const socialEntries = Object.entries(site.social).filter(([, url]) => url.trim() !== '')

  return (
    <footer className="relative z-10 border-t border-border/80 bg-surface/80 backdrop-blur-lg">
      <Container className="section-padding-sm">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <Reveal>
            <Link to="/" className="font-display text-xl font-bold">
              {site.name}
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{site.tagline}</p>
          </Reveal>

          <Reveal delay={50}>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-accent">Navigate</p>
            <nav className="mt-3 flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
              {site.navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-sm text-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </Reveal>

          <Reveal delay={100}>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-accent">Connect</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {socialEntries.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted transition-colors hover:text-accent"
                >
                  {socialLabels[key] ?? key}
                </a>
              ))}
            </div>
            <a
              href={`mailto:${site.email}`}
              className="mt-4 inline-block text-sm font-semibold text-accent transition-transform hover:translate-x-1"
            >
              {site.email} →
            </a>
          </Reveal>
        </div>

        <div className="section-divider mt-10" />
        <p className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
          <span>
            © {year} {site.name}. Edit{' '}
            <code className="rounded-md border border-border/60 px-1.5 py-0.5">src/data/</code>
          </span>
          {site.resumeUrl && (
            <span className="ds-kbd-hint">
              <kbd className="ds-kbd">P</kbd> projects · <kbd className="ds-kbd">R</kbd> résumé
            </span>
          )}
        </p>
      </Container>
    </footer>
  )
}
