import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { MotionReveal } from '../ui/MotionReveal'

export function ContactCTA() {
  const { site } = usePortfolio()
  const reduceMotion = useReducedMotion()

  return (
    <section className="section-padding pb-24 sm:pb-28">
      <Container>
        <MotionReveal>
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-border/60 p-8 text-center sm:rounded-3xl sm:p-12 md:p-16"
            whileHover={reduceMotion ? undefined : { scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <motion.div
              className="absolute inset-0 animate-gradient bg-gradient-to-br from-accent/25 via-transparent to-[var(--color-accent-secondary)]/20"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }
              }
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 200%' }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-surface/50 backdrop-blur-xl" aria-hidden />
            <div className="relative">
              <motion.p
                className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent"
                animate={reduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Let&apos;s collaborate
              </motion.p>
              <h2 className="font-display mt-4 text-[clamp(1.75rem,6vw,3rem)] font-extrabold leading-tight">
                Ready to build something{' '}
                <span className="text-gradient">great?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:mt-5 sm:text-lg">
                {site.availability}. Let&apos;s discuss your next product, audit, or team engagement.
              </p>
              <motion.div
                className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row sm:mt-10 sm:gap-4"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, type: 'spring' }}
              >
                <Button href="/contact">Contact me</Button>
                <Button variant="secondary" href={`mailto:${site.email}`} external>
                  Email directly
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </MotionReveal>
      </Container>
    </section>
  )
}
