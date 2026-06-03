import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'
import { Section } from '../ui/Section'
import { GlassCard } from '../ui/GlassCard'
import { StaggerGrid, StaggerItem } from '../ui/StaggerGrid'

export function Skills() {
  const { skills } = usePortfolio()
  const reduceMotion = useReducedMotion()

  return (
    <Section
      id="skills"
      title={skills.title}
      subtitle={skills.subtitle}
      label="02 — Skills"
      className="bg-surface/30"
    >
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {skills.categories.map((cat, i) => (
          <StaggerItem key={cat.name}>
            <GlassCard className="h-full p-5 sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <motion.span
                  className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-[var(--color-accent-secondary)]/20 text-sm font-bold text-accent"
                  whileHover={reduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </motion.span>
                <h3 className="font-display text-base font-bold sm:text-lg">{cat.name}</h3>
              </div>
              <ul className="flex flex-wrap gap-2">
                {cat.items.map((item, j) => (
                  <motion.li
                    key={item}
                    className="rounded-lg border border-border/50 bg-surface-elevated/80 px-2.5 py-1 text-xs text-muted sm:px-3 sm:py-1.5 sm:text-sm"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: j * 0.03, type: 'spring', stiffness: 350, damping: 22 }}
                    whileHover={reduceMotion ? undefined : { scale: 1.08, y: -2, color: 'var(--color-foreground)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
            </GlassCard>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </Section>
  )
}
