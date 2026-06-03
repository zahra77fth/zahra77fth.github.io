import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { Container } from '../ui/Container'
import { MotionReveal } from '../ui/MotionReveal'

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
    <footer className="relative border-t border-border/80 bg-surface/50 backdrop-blur-xl">
      <Container className="section-padding-sm">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <MotionReveal>
            <Link to="/" className="font-display text-xl font-bold">
              {site.name}
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{site.tagline}</p>
          </MotionReveal>

          <MotionReveal delay={0.05}>
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
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-accent">Connect</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {socialEntries.map(([key, url]) => (
                <motion.a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-muted hover:text-accent"
                  whileHover={{ y: -2 }}
                >
                  {socialLabels[key] ?? key}
                </motion.a>
              ))}
            </div>
            <motion.a
              href={`mailto:${site.email}`}
              className="mt-4 inline-block text-sm font-semibold text-accent"
              whileHover={{ x: 4 }}
            >
              {site.email} →
            </motion.a>
          </MotionReveal>
        </div>

        <div className="section-divider mt-10" />
        <p className="mt-6 text-center text-xs text-muted sm:text-left">
          © {year} {site.name}. Customize via{' '}
          <code className="rounded-md border border-border/60 bg-surface-elevated/80 px-1.5 py-0.5">
            src/data/
          </code>
        </p>
      </Container>
    </footer>
  )
}
