import { motion, useReducedMotion } from 'framer-motion'
import type { ProjectItem } from '../../types'
import { cn } from '../../design-system'
import { tapScale } from '../../lib/motion'

interface ProjectCardProps {
  project: ProjectItem
  featured?: boolean
  index?: number
  onOpen: (project: ProjectItem) => void
}

export function ProjectCard({ project, featured, index, onOpen }: ProjectCardProps) {
  const reduceMotion = useReducedMotion()
  const hasLive = project.links.live.trim() !== ''
  const hasGithub = project.links.github.trim() !== ''

  return (
    <motion.article
      className={cn('project-card', featured && 'project-card--featured')}
      whileTap={reduceMotion ? undefined : tapScale}
    >
      <button
        type="button"
        data-cursor="project"
        onClick={() => onOpen(project)}
        className="project-card__trigger"
      >
        <div className="project-card__media">
          <img
            src={project.image}
            alt=""
            width={800}
            height={500}
            className="project-card__image"
            loading="lazy"
            decoding="async"
          />
          <div className="project-card__media-overlay" aria-hidden />
          {index != null ? (
            <span className="project-card__index" aria-hidden>
              {String(index).padStart(2, '0')}
            </span>
          ) : null}
          {project.featured ? (
            <span className="project-card__badge">Featured</span>
          ) : null}
        </div>

        <div className="project-card__body">
          <header className="project-card__head">
            <h3 className="project-card__title">{project.name}</h3>
            {(hasLive || hasGithub) && (
              <ul className="project-card__availability" aria-label="Project links">
                {hasLive ? (
                  <li>
                    <span className="project-card__link-pill">Live</span>
                  </li>
                ) : null}
                {hasGithub ? (
                  <li>
                    <span className="project-card__link-pill project-card__link-pill--muted">
                      Code
                    </span>
                  </li>
                ) : null}
              </ul>
            )}
          </header>

          <p className="project-card__description">{project.description}</p>

          <footer className="project-card__footer">
            <ul className="project-card__tags" aria-label="Technologies">
              {project.tags.map((tag) => (
                <li key={tag}>
                  <span className="project-tag">{tag}</span>
                </li>
              ))}
            </ul>
            <span className="project-card__cta">
              View details
              <span className="project-card__cta-arrow" aria-hidden>
                →
              </span>
            </span>
          </footer>
        </div>
      </button>
    </motion.article>
  )
}
