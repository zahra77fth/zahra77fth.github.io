import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ProjectItem } from '../../types'
import { Button } from '../../components/ui/Button'

interface ProjectModalProps {
  project: ProjectItem | null
  index?: number
  onClose: () => void
}

export function ProjectModal({ project, index, onClose }: ProjectModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!project) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [project, onClose])

  if (!project || typeof document === 'undefined') return null

  const hasLive = project.links.live.trim() !== ''
  const hasGithub = project.links.github.trim() !== ''

  return createPortal(
    <div
      className="project-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label="Close project details"
        data-cursor="close"
        onClick={onClose}
      />

      <div className="project-modal__panel">
        <div className="project-modal__accent" aria-hidden />

        <header className="project-modal__toolbar">
          <div className="project-modal__toolbar-start">
            {index != null ? (
              <span className="project-modal__index" aria-hidden>
                {String(index).padStart(2, '0')}
              </span>
            ) : null}
            <div className="project-modal__toolbar-text">
              <span className="project-modal__eyebrow">Case study</span>
              <span className="project-modal__toolbar-title">{project.name}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            data-cursor="close"
            onClick={onClose}
            className="project-modal__close"
            aria-label="Close dialog"
          >
            <span className="project-modal__close-icon" aria-hidden>
              ×
            </span>
            <span className="project-modal__close-label">Close</span>
            <kbd className="project-modal__kbd">Esc</kbd>
          </button>
        </header>

        <div className="project-modal__main">
          <div className="project-modal__hero">
            <img
              src={project.image}
              alt=""
              className="project-modal__image"
              width={960}
              height={480}
            />
            <div className="project-modal__hero-overlay" aria-hidden />
            <div className="project-modal__hero-caption">
              {project.featured ? (
                <span className="project-modal__badge">Featured</span>
              ) : null}
              {hasLive ? (
                <span className="project-modal__badge project-modal__badge--live">Live</span>
              ) : null}
            </div>
          </div>

          <div className="project-modal__body">
            <h2 id="project-modal-title" className="project-modal__title">
              {project.name}
            </h2>

            <div className="project-modal__sections">
              <section
                className="project-modal__section project-modal__section--card"
                aria-labelledby="project-modal-overview"
              >
                <h3 id="project-modal-overview" className="project-modal__section-label">
                  Overview
                </h3>
                <p className="project-modal__description">{project.description}</p>
              </section>

              <section
                className="project-modal__section project-modal__section--card"
                aria-labelledby="project-modal-stack"
              >
                <h3 id="project-modal-stack" className="project-modal__section-label">
                  Tech stack
                </h3>
                <ul className="project-modal__tags">
                  {project.tags.map((tag) => (
                    <li key={tag}>
                      <span className="project-modal__tag">{tag}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <footer className="project-modal__footer">
              <div className="project-modal__actions">
                {hasLive ? (
                  <Button href={project.links.live} external>
                    Live demo
                  </Button>
                ) : null}
                {hasGithub ? (
                  <Button variant="secondary" href={project.links.github} external>
                    Source code
                  </Button>
                ) : null}
                <Button variant="ghost" cursorHint="close" onClick={onClose}>
                  Dismiss
                </Button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
