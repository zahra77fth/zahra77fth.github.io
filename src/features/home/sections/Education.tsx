import { useMemo } from 'react'
import { usePortfolio } from '../../../context/PortfolioContext'
import { Reveal } from '../../../components/motion/Reveal'
import { Section } from '../../../components/ui/Section'
import { cn } from '../../../design-system'

function isInProgress(period: string) {
  return /present/i.test(period)
}

export function Education() {
  const { education } = usePortfolio()

  const stats = useMemo(() => {
    const active = education.items.filter((item) => isInProgress(item.period)).length
    return {
      degrees: education.items.length,
      languages: education.certifications.length,
      active,
    }
  }, [education.items, education.certifications])

  return (
    <Section
      id="education"
      title={education.title}
      subtitle={education.subtitle}
      label="05 — Education"
      align="left"
      variant="panel"
      decorations="muted"
    >
      <div className="education-section">
        <Reveal>
          <div className="education-section__header">
            <p className="education-section__intro">{education.subtitle}</p>
            <dl className="education-section__stats">
              <div className="education-section__stat">
                <dt>Degrees</dt>
                <dd>{stats.degrees}</dd>
              </div>
              <div className="education-section__stat">
                <dt>Languages</dt>
                <dd>{stats.languages}</dd>
              </div>
              {stats.active > 0 ? (
                <div className="education-section__stat education-section__stat--active">
                  <dt>In progress</dt>
                  <dd>{stats.active}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Reveal>

        <div className="education-section__layout">
          <div className="education-section__degrees">
            <Reveal>
              <h3 className="education-section__label">Academic background</h3>
            </Reveal>
            <ol className="education-degrees">
              {education.items.map((item, i) => {
                const active = isInProgress(item.period)

                return (
                  <Reveal key={`${item.degree}-${item.period}`} delay={50 + i * 55}>
                    <li
                      className={cn(
                        'education-degree',
                        active && 'education-degree--active',
                        i === education.items.length - 1 && 'education-degree--last',
                      )}
                    >
                      <div className="education-degree__marker" aria-hidden>
                        <span className="education-degree__index">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <article className="education-degree__card">
                        <header className="education-degree__head">
                          <div className="education-degree__meta">
                            <time className="education-degree__period" dateTime={item.period}>
                              {item.period}
                            </time>
                            {active ? (
                              <span className="education-degree__badge">In progress</span>
                            ) : null}
                          </div>
                          <h4 className="education-degree__title">{item.degree}</h4>
                          <p className="education-degree__school">{item.school}</p>
                        </header>
                        <p className="education-degree__summary">{item.description}</p>
                      </article>
                    </li>
                  </Reveal>
                )
              })}
            </ol>
          </div>

          <aside className="education-section__aside">
            <Reveal delay={80}>
              <h3 className="education-section__label">Languages & proficiency</h3>
            </Reveal>
            <ul className="education-credentials">
              {education.certifications.map((cert, i) => (
                <Reveal key={cert.name} delay={100 + i * 40}>
                  <li className="education-credential">
                    <span className="education-credential__monogram" aria-hidden>
                      {cert.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="education-credential__body">
                      <p className="education-credential__name">{cert.name}</p>
                      {cert.year !== '—' ? (
                        <p className="education-credential__level">{cert.issuer}</p>
                      ) : null}
                    </div>
                    {cert.year !== '—' ? (
                      <span className="education-credential__year">{cert.year}</span>
                    ) : (
                      <span className="education-credential__level-pill">{cert.issuer}</span>
                    )}
                  </li>
                </Reveal>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </Section>
  )
}
