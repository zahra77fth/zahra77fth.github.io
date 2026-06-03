import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../../context/PortfolioContext'
import { Button } from '../../../components/ui/Button'
import { Container } from '../../../components/ui/Container'
import { fadeUp, staggerContainer, viewportOnce } from '../../../lib/motion'

export function ContactCTA() {
  const { site } = usePortfolio()
  const reduceMotion = useReducedMotion()

  return (
    <section className="ds-section relative overflow-hidden pb-24 sm:pb-28">
      <Container>
        <motion.div
          className="cta-creative relative overflow-hidden rounded-2xl sm:rounded-3xl"
          variants={staggerContainer}
          initial={reduceMotion ? false : 'hidden'}
          whileInView={reduceMotion ? undefined : 'visible'}
          viewport={viewportOnce}
        >
          <div className="cta-creative__glow" aria-hidden />
          <p className="cta-creative__ghost font-display" aria-hidden>
            Let&apos;s talk
          </p>

          <div className="cta-creative__inner relative z-10 p-8 text-center sm:p-12 md:p-16">
            <motion.p variants={fadeUp} className="font-mono text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">
              Available for hire
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-display mt-4 text-[clamp(2rem,7vw,3.5rem)] font-bold leading-[1.1] tracking-tight"
            >
              Let&apos;s ship something
              <br />
              <span className="text-gradient">memorable.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-lg text-base text-muted sm:text-lg">
              {site.availability}
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-9 flex flex-col justify-center gap-3 min-[420px]:flex-row sm:mt-10"
            >
              <Button href="/contact">Start a conversation</Button>
              <Button variant="secondary" href={`mailto:${site.email}`} external>
                {site.email}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
