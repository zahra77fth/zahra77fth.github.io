import { useMemo, useState } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { Reveal } from '../../components/motion/Reveal'
import { Section } from '../../components/ui/Section'
import type { ProjectItem } from '../../types'
import { ProjectCard } from './ProjectCard'
import { ProjectModal } from './ProjectModal'

export function ProjectsSection() {
  const { projects } = usePortfolio()
  const [active, setActive] = useState<ProjectItem | null>(null)

  const stats = useMemo(() => {
    const featured = projects.items.filter((p) => p.featured).length
    const live = projects.items.filter((p) => p.links.live.trim() !== '').length
    return {
      total: projects.items.length,
      featured,
      live,
    }
  }, [projects.items])

  const hero = projects.items.find((p) => p.featured) ?? projects.items[0]
  const gridItems = hero ? projects.items.filter((p) => p !== hero) : []

  return (
    <>
      <Section
        id="projects"
        title={projects.title}
        subtitle={projects.subtitle}
        label="04 — Projects"
        align="right"
        variant="panel"
        decorations="accent"
      >
        <div className="projects-section">
          <Reveal>
            <div className="projects-section__header">
              <p className="projects-section__intro">{projects.subtitle}</p>
              <dl className="projects-section__stats">
                <div className="projects-section__stat">
                  <dt>Projects</dt>
                  <dd>{stats.total}</dd>
                </div>
                {stats.featured > 0 ? (
                  <div className="projects-section__stat projects-section__stat--featured">
                    <dt>Featured</dt>
                    <dd>{stats.featured}</dd>
                  </div>
                ) : null}
                {stats.live > 0 ? (
                  <div className="projects-section__stat">
                    <dt>Live demos</dt>
                    <dd>{stats.live}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </Reveal>

          {hero ? (
            <Reveal delay={40}>
              <ProjectCard
                project={hero}
                featured
                index={projects.items.indexOf(hero) + 1}
                onOpen={setActive}
              />
            </Reveal>
          ) : null}

          {gridItems.length > 0 ? (
            <div className="projects-section__grid">
              {gridItems.map((project, i) => (
                <Reveal key={project.name} delay={80 + i * 50}>
                  <ProjectCard
                    project={project}
                    index={projects.items.indexOf(project) + 1}
                    onOpen={setActive}
                  />
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </Section>

      <ProjectModal
        project={active}
        index={active ? projects.items.indexOf(active) + 1 : undefined}
        onClose={() => setActive(null)}
      />
    </>
  )
}
