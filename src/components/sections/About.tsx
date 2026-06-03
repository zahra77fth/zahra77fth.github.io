import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'
import { MotionReveal } from '../ui/MotionReveal'
import { Section } from '../ui/Section'
import { GlassCard } from '../ui/GlassCard'

export function About() {
  const { profile } = usePortfolio()
  const { about } = profile
  const reduceMotion = useReducedMotion()

  return (
    <Section id="about" title={about.title} subtitle={about.subtitle} label="01 — About">
      <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
        <div className="space-y-5 leading-relaxed text-muted lg:col-span-3">
          {about.paragraphs.map((p, i) => (
            <MotionReveal key={p.slice(0, 48)} delay={i * 0.08} direction={i % 2 === 0 ? 'left' : 'right'}>
              <p className="text-base sm:text-lg">{p}</p>
            </MotionReveal>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-4 lg:col-span-2">
          {about.highlights.map((h, i) => (
            <MotionReveal key={h.label} delay={i * 0.06} direction="scale">
              <li>
                <GlassCard className="group relative overflow-hidden p-5">
                  <motion.div
                    className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-accent/10"
                    animate={reduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                    aria-hidden
                  />
                  <p className="font-display relative text-3xl font-bold text-accent">{h.value}</p>
                  <p className="relative mt-1 text-sm text-muted">{h.label}</p>
                </GlassCard>
              </li>
            </MotionReveal>
          ))}
        </ul>
      </div>
    </Section>
  )
}
