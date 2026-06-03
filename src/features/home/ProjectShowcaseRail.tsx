import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../../context/PortfolioContext'
import { Container } from '../../components/ui/Container'
import { Reveal } from '../../components/motion/Reveal'
import { cn } from '../../design-system'

export function ProjectShowcaseRail() {
  const { projects } = usePortfolio()
  const reduceMotion = useReducedMotion()
  const source = projects.items
  const items = reduceMotion ? source : [...source, ...source]

  return (
    <section className="showcase-rail" aria-label="Featured work preview">
      <Container>
        <Reveal>
          <header className="showcase-rail__header">
            <div className="showcase-rail__header-text">
              <p className="showcase-rail__eyebrow">Selected work</p>
              <h2 className="showcase-rail__title">Brands &amp; products</h2>
            </div>
            <Link to="/#projects" data-cursor="link" className="showcase-rail__cta">
              View all
              <span className="showcase-rail__cta-arrow" aria-hidden>
                →
              </span>
            </Link>
          </header>
        </Reveal>
      </Container>

      <div
        className={cn(
          reduceMotion ? 'showcase-rail__static' : 'showcase-rail__track-wrap',
        )}
      >
        <ul
          className={cn(
            'showcase-rail__track',
            !reduceMotion && 'showcase-rail__track--animate',
          )}
        >
          {items.map((project, i) => {
            const index = (i % source.length) + 1

            return (
              <li key={`${project.name}-${i}`} className="showcase-rail__item">
                <Link
                  to="/#projects"
                  data-cursor="project"
                  className="showcase-rail__card"
                >
                  <div className="showcase-rail__thumb">
                    <img
                      src={project.image}
                      alt=""
                      width={120}
                      height={80}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="showcase-rail__meta">
                    <span className="showcase-rail__index" aria-hidden>
                      {String(index).padStart(2, '0')}
                    </span>
                    <div className="showcase-rail__meta-body">
                      <h3 className="showcase-rail__name">{project.name}</h3>
                      <ul className="showcase-rail__tags" aria-label="Technologies">
                        {project.tags.slice(0, 2).map((tag) => (
                          <li key={tag}>
                            <span className="showcase-rail__tag">{tag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {project.featured ? (
                      <span className="showcase-rail__dot" title="Featured" aria-hidden />
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
