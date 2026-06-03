import { useMemo } from 'react'
import { usePortfolio } from '../../../context/PortfolioContext'
import { Reveal } from '../../../components/motion/Reveal'
import { Section } from '../../../components/ui/Section'
import { cn } from '../../../design-system'

function parseLocation(location: string) {
  const parts = location.split('·').map((s) => s.trim())
  return {
    place: parts[0] ?? location,
    sector: parts[1],
  }
}

function isCurrentRole(period: string) {
  return /present/i.test(period)
}

export function Experience() {
  const { experience } = usePortfolio()

  const stats = useMemo(() => {
    const companies = new Set(experience.items.map((item) => item.company))
    const active = experience.items.filter((item) => isCurrentRole(item.period)).length
    return {
      roles: experience.items.length,
      companies: companies.size,
      active,
    }
  }, [experience.items])

  return (
    <Section
      id="experience"
      title={experience.title}
      subtitle={experience.subtitle}
      label="03 — Experience"
      align="left"
      variant="panel"
      decorations="muted"
    >
      <div className="experience-section">
        <Reveal>
          <div className="experience-section__header">
            <p className="experience-section__intro">{experience.subtitle}</p>
            <dl className="experience-section__stats">
              <div className="experience-section__stat">
                <dt>Roles</dt>
                <dd>{stats.roles}</dd>
              </div>
              <div className="experience-section__stat">
                <dt>Companies</dt>
                <dd>{stats.companies}</dd>
              </div>
              {stats.active > 0 ? (
                <div className="experience-section__stat experience-section__stat--active">
                  <dt>Current</dt>
                  <dd>{stats.active}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Reveal>

        <ol className="experience-section__timeline">
          <div className="experience-section__spine" aria-hidden />
          {experience.items.map((item, i) => {
            const { place, sector } = parseLocation(item.location)
            const current = isCurrentRole(item.period)

            return (
              <Reveal key={`${item.company}-${item.period}-${i}`} delay={50 + i * 55}>
                <li
                  className={cn(
                    'experience-entry',
                    current && 'experience-entry--current',
                    i === experience.items.length - 1 && 'experience-entry--last',
                  )}
                >
                  <div className="experience-entry__marker" aria-hidden>
                    <span className="experience-entry__index">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <article className="experience-entry__card">
                    <header className="experience-entry__head">
                      <div className="experience-entry__meta">
                        <time className="experience-entry__period" dateTime={item.period}>
                          {item.period}
                        </time>
                        {current ? (
                          <span className="experience-entry__badge">Current</span>
                        ) : null}
                      </div>
                      <h3 className="experience-entry__role">{item.role}</h3>
                      <p className="experience-entry__org">
                        <span className="experience-entry__company">{item.company}</span>
                        <span className="experience-entry__sep" aria-hidden>
                          ·
                        </span>
                        <span className="experience-entry__location">{place}</span>
                        {sector ? (
                          <>
                            <span className="experience-entry__sep" aria-hidden>
                              ·
                            </span>
                            <span className="experience-entry__sector">{sector}</span>
                          </>
                        ) : null}
                      </p>
                    </header>

                    <p className="experience-entry__summary">{item.description}</p>

                    {item.achievements.length > 0 ? (
                      <ul className="experience-entry__highlights">
                        {item.achievements.map((achievement) => (
                          <li key={achievement} className="experience-entry__highlight">
                            <span className="experience-entry__bullet" aria-hidden />
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {item.technologies.length > 0 ? (
                      <ul className="experience-entry__stack" aria-label="Technologies">
                        {item.technologies.map((tech) => (
                          <li key={tech}>
                            <span className="experience-tech">{tech}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                </li>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}
