import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { fadeUp, staggerContainer } from '../../lib/motion'
import { Button } from '../../components/ui/Button'
import { Container } from '../../components/ui/Container'
import { GlassCard } from '../../components/ui/GlassCard'
import { RotatingRoles } from '../../components/ui/RotatingRoles'
import { ScrollIndicator } from '../../components/ui/ScrollIndicator'
import { SplitHeadline } from '../../components/motion/SplitHeadline'
import { TiltCard } from '../../components/ui/TiltCard'
import { Parallax } from '../../components/effects/Parallax'
import { useTheme } from '../../context/ThemeContext'

export function Hero() {
  const { site, profile } = usePortfolio()
  const { hero, about } = profile
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40])
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.4])

  const roles = hero.rotatingRoles ?? [site.title]

  return (
    <section
      ref={ref}
      className={`hero-stage relative flex min-h-[calc(100vh-var(--header-height))] flex-col justify-center overflow-hidden pb-16 pt-6 sm:pb-20 sm:pt-8 ${isLight ? 'hero-stage--light' : 'hero-stage--dark'}`}
    >
      {isLight ? null : (
        <div className="hero-constellation pointer-events-none absolute inset-0" aria-hidden />
      )}

      <Container className="relative z-10 flex flex-1 flex-col">
        <motion.div
          style={reduceMotion ? undefined : { y: textY, opacity }}
          className="grid flex-1 items-center gap-10 lg:grid-cols-12 lg:gap-6 xl:gap-10"
          variants={staggerContainer}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <div className="order-2 lg:order-1 lg:col-span-7">
            <motion.div variants={fadeUp} className="mb-6 flex flex-wrap items-center gap-3">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="hero-chip">{site.availability}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
                Tehran · Remote
              </span>
            </motion.div>

            <motion.p variants={fadeUp} className="font-mono text-xs font-medium uppercase tracking-[0.35em] text-accent">
              {hero.greeting}
            </motion.p>

            <SplitHeadline
              as="h1"
              text={site.name}
              delay={0.12}
              className="font-display mt-4 text-[clamp(2.75rem,11vw,5.25rem)] font-bold leading-[1.02] tracking-tight"
            />

            <motion.p variants={fadeUp} className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              <span className="font-display font-bold text-foreground">{site.title}.</span> {hero.headline}
            </motion.p>

            {roles.length > 0 && (
              <motion.div variants={fadeUp} className="mt-5">
                <RotatingRoles roles={roles} className="text-sm sm:text-base" />
              </motion.div>
            )}

            <motion.div
              variants={fadeUp}
              className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap"
            >
              <Button href={hero.ctaPrimary.href}>{hero.ctaPrimary.label}</Button>
              <Button variant="secondary" href={hero.ctaSecondary.href}>
                {hero.ctaSecondary.label}
              </Button>
              {site.resumeUrl && (
                <Button variant="ghost" href={site.resumeUrl} external>
                  Résumé
                </Button>
              )}
            </motion.div>
          </div>

          <motion.div
            className="relative order-1 mx-auto w-full max-w-sm lg:order-2 lg:col-span-5 lg:max-w-none"
            style={reduceMotion ? undefined : { y: imageY }}
          >
            <Parallax speed={0.3} className="hero-portrait-frame">
              {isLight && <div className="hero-portrait-glow" aria-hidden />}
              <TiltCard
                intensity={10}
                className={`relative z-10 overflow-hidden rounded-2xl border sm:rounded-3xl ${isLight ? 'glow-ring border-border/60' : 'hero-portrait-frame--dark border-accent/20'}`}
              >
                <img
                  src={about.image.src}
                  alt={about.image.alt}
                  width={480}
                  height={480}
                  className="aspect-[4/5] w-full object-cover sm:aspect-square"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </TiltCard>
              <span className="hero-corner hero-corner--tl" aria-hidden />
              <span className="hero-corner hero-corner--br" aria-hidden />
              <div className="hero-floating-card font-mono" aria-hidden>
                <span className="text-accent">6+</span> years
              </div>
            </Parallax>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-stats-dock mt-12 grid grid-cols-2 gap-2 sm:mt-16 sm:grid-cols-4 sm:gap-3"
          variants={staggerContainer}
          initial={reduceMotion ? false : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.2 }}
        >
          {about.highlights.map((h, i) => (
            <motion.div key={h.label} variants={fadeUp}>
              <GlassCard
                className={`hero-stat-card group p-3 text-center sm:p-4 ${i % 2 === 1 ? 'hero-stat-card--alt' : ''}`}
              >
                <p className="font-display text-xl font-bold text-accent transition-transform duration-300 group-hover:scale-110 sm:text-2xl">
                  {h.value}
                </p>
                <p className="mt-0.5 text-[10px] text-muted sm:text-xs">{h.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 flex justify-center sm:mt-12 lg:justify-start">
          <ScrollIndicator />
        </div>
      </Container>
    </section>
  )
}
