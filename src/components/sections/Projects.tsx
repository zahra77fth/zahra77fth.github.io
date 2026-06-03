import { motion, useReducedMotion } from 'framer-motion'
import { usePortfolio } from '../../context/PortfolioContext'
import type { ProjectItem } from '../../types'
import { MotionReveal } from '../ui/MotionReveal'
import { Section } from '../ui/Section'
import { GlassCard } from '../ui/GlassCard'
import { TiltCard } from '../ui/TiltCard'

function ProjectCard({ project }: { project: ProjectItem }) {
  const reduceMotion = useReducedMotion()
  const hasLive = project.links.live.trim() !== ''
  const hasGithub = project.links.github.trim() !== ''

  return (
    <TiltCard className={`h-full ${project.featured ? 'md:col-span-2' : ''}`} intensity={8}>
      <GlassCard className="group flex h-full flex-col overflow-hidden p-0 transition-none hover:translate-y-0">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-elevated">
          <motion.img
            src={project.image}
            alt=""
            width={800}
            height={500}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            whileHover={reduceMotion ? undefined : { scale: 1.1 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"
            initial={{ opacity: 0.75 }}
            whileHover={{ opacity: 0.95 }}
          />
          {project.featured && (
            <motion.span
              className="absolute left-3 top-3 rounded-full border border-accent/40 bg-accent/95 px-3 py-1 text-xs font-semibold text-accent-foreground backdrop-blur-sm sm:left-4 sm:top-4"
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              Featured
            </motion.span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-7">
          <h3 className="font-display text-lg font-bold sm:text-xl">{project.name}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border/40 bg-surface-elevated/60 px-2 py-0.5 text-[11px] text-muted sm:text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-border/60 pt-4 sm:mt-5">
            {hasLive && (
              <motion.a
                href={project.links.live}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target text-sm font-semibold text-accent"
                whileHover={{ x: 6 }}
                whileTap={{ scale: 0.95 }}
              >
                Live demo →
              </motion.a>
            )}
            {hasGithub && (
              <motion.a
                href={project.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target text-sm font-medium text-muted"
                whileHover={{ x: 6, color: 'var(--color-foreground)' }}
                whileTap={{ scale: 0.95 }}
              >
                Source →
              </motion.a>
            )}
          </div>
        </div>
      </GlassCard>
    </TiltCard>
  )
}

export function Projects() {
  const { projects } = usePortfolio()

  return (
    <Section
      id="projects"
      title={projects.title}
      subtitle={projects.subtitle}
      label="04 — Projects"
      className="bg-surface/30"
    >
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {projects.items.map((project, i) => (
          <MotionReveal key={project.name} delay={i * 0.06} direction={i % 2 === 0 ? 'up' : 'rotate'}>
            <ProjectCard project={project} />
          </MotionReveal>
        ))}
      </div>
    </Section>
  )
}
