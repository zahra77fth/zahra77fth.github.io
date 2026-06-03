import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { fadeUp, staggerContainer } from '../../lib/motion'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { GlassCard } from '../ui/GlassCard'
import { TiltCard } from '../ui/TiltCard'
import { FloatingOrbs } from '../effects/FloatingOrbs'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'

export function Hero() {
  const { site, profile } = usePortfolio()
  const { hero, about } = profile
  const reduceMotion = useReducedMotion()
  const tier = usePerformanceTier()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const textY = useTransform(scrollYProgress, [0, 1], [0, 40])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3])

  return (
    <section
      ref={ref}
      className="relative overflow-hidden pb-6 pt-4 sm:pb-12 sm:pt-10 lg:min-h-[min(92vh,900px)] lg:pb-16"
    >
      {tier === 'full' && <FloatingOrbs />}
      <Container className="relative">
        <motion.div
          className="grid items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-16"
          variants={staggerContainer}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          style={reduceMotion ? undefined : { y: textY, opacity }}
        >
          <div className="order-2 lg:order-1">
            <motion.div variants={fadeUp} className="mb-5 inline-flex flex-wrap items-center gap-2 sm:mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <motion.span
                className="rounded-full border border-border/80 bg-surface/60 px-3 py-1.5 text-xs font-medium text-muted backdrop-blur-sm"
                whileHover={{ scale: 1.03, borderColor: 'var(--color-accent)' }}
              >
                {site.availability}
              </motion.span>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm sm:tracking-[0.25em]"
            >
              {hero.greeting}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="font-display mt-3 text-[clamp(2rem,8vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight sm:mt-4"
            >
              <span className="text-gradient animate-gradient bg-[length:200%_auto]">{site.name}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-2 text-lg font-medium text-muted sm:text-xl lg:text-2xl">
              {site.title}
            </motion.p>

            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
              {hero.headline}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap sm:mt-10">
              <Button href={hero.ctaPrimary.href}>{hero.ctaPrimary.label}</Button>
              <Button variant="secondary" href={hero.ctaSecondary.href}>
                {hero.ctaSecondary.label}
              </Button>
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="relative order-1 mx-auto w-full max-w-[min(100%,22rem)] sm:max-w-md lg:order-2 lg:max-w-lg"
            style={reduceMotion ? undefined : { y: imageY }}
          >
            <motion.div
              className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent/35 via-transparent to-[var(--color-accent-secondary)]/25 blur-2xl sm:-inset-6"
              animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], rotate: [0, 2, 0, -2, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <TiltCard className="glow-ring relative overflow-hidden rounded-[1.5rem] border border-border/60 sm:rounded-[2rem]">
              <motion.img
                src={about.image.src}
                alt={about.image.alt}
                width={480}
                height={480}
                className="aspect-square w-full object-cover"
                loading="eager"
                fetchPriority="high"
                whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                transition={{ duration: 0.5 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            </TiltCard>

            <motion.div
              className="absolute -bottom-3 left-0 right-0 mx-auto w-[calc(100%-2rem)] sm:-bottom-4 sm:left-auto sm:right-auto sm:w-auto sm:max-w-[200px] md:-left-4"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 22 }}
            >
              <GlassCard className="px-4 py-3">
                <p className="text-xs text-muted">Based in</p>
                <p className="font-display text-sm font-semibold">{site.location}</p>
              </GlassCard>
            </motion.div>

            <motion.div
              className="absolute -right-1 top-6 hidden sm:block md:-right-2"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: 'spring' }}
            >
              <GlassCard className="flex items-center gap-2 px-4 py-3">
                <motion.span
                  className="font-display text-2xl font-bold text-accent"
                  animate={reduceMotion ? undefined : { scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  6+
                </motion.span>
                <span className="text-xs leading-tight text-muted">
                  years
                  <br />
                  experience
                </span>
              </GlassCard>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-10 grid grid-cols-2 gap-2 sm:mt-14 sm:grid-cols-4 sm:gap-3 lg:hidden"
        >
          {about.highlights.map((h, i) => (
            <motion.div
              key={h.label}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
            >
              <GlassCard className="p-3 text-center sm:p-4">
                <p className="font-display text-xl font-bold text-accent sm:text-2xl">{h.value}</p>
                <p className="mt-0.5 text-[10px] text-muted sm:text-xs">{h.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-6 hidden gap-3 sm:grid-cols-4 lg:mt-10 lg:grid"
        >
          {about.highlights.map((h) => (
            <GlassCard key={h.label} className="p-4 text-center">
              <p className="font-display text-2xl font-bold text-accent">{h.value}</p>
              <p className="mt-1 text-xs text-muted">{h.label}</p>
            </GlassCard>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
