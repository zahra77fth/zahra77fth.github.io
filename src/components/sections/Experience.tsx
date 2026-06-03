import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'
import { MotionReveal } from '../ui/MotionReveal'
import { Section } from '../ui/Section'
import { GlassCard } from '../ui/GlassCard'

export function Experience() {
  const { experience } = usePortfolio()
  const reduceMotion = useReducedMotion()

  return (
    <Section id="experience" title={experience.title} subtitle={experience.subtitle} label="03 — Experience">
      <ol className="relative space-y-8 sm:space-y-10">
        <motion.div
          className="absolute left-[11px] top-3 hidden h-[calc(100%-1.5rem)] w-0.5 sm:left-5 sm:block"
          style={{
            background: 'linear-gradient(to bottom, var(--color-accent), var(--color-border), transparent)',
          }}
          initial={reduceMotion ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />

        {experience.items.map((item, i) => (
          <MotionReveal key={`${item.company}-${item.period}`} delay={i * 0.07} direction={i % 2 === 0 ? 'left' : 'right'}>
            <li className="relative pl-9 sm:pl-14">
              <motion.span
                className="absolute left-0 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-background shadow-lg shadow-accent/25 sm:left-2"
                whileInView={reduceMotion ? undefined : { scale: [0, 1.3, 1] }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, duration: 0.45 }}
                aria-hidden
              >
                <motion.span
                  className="h-2 w-2 rounded-full bg-accent"
                  animate={reduceMotion ? undefined : { scale: [1, 1.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
              </motion.span>

              <GlassCard className="p-5 sm:p-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
                  <h3 className="font-display text-base font-bold sm:text-lg">{item.role}</h3>
                  <time className="w-fit rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {item.period}
                  </time>
                </div>
                <p className="mt-2 text-sm font-medium text-muted">
                  {item.company} · {item.location}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{item.description}</p>
                <ul className="mt-4 space-y-2 border-l-2 border-accent/25 pl-4">
                  {item.achievements.map((a, j) => (
                    <motion.li
                      key={a}
                      className="text-sm text-muted"
                      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + j * 0.05 }}
                    >
                      {a}
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
                  {item.technologies.map((t) => (
                    <motion.span
                      key={t}
                      className="rounded-md border border-border/50 bg-surface-elevated/80 px-2 py-0.5 text-[11px] font-medium sm:text-xs"
                      whileHover={reduceMotion ? undefined : { scale: 1.05, borderColor: 'var(--color-accent)' }}
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </GlassCard>
            </li>
          </MotionReveal>
        ))}
      </ol>
    </Section>
  )
}
