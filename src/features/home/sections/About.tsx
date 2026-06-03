import { useMemo } from 'react'
import { usePortfolio } from '../../../context/PortfolioContext'
import { Reveal } from '../../../components/motion/Reveal'
import { Button } from '../../../components/ui/Button'
import { Section } from '../../../components/ui/Section'
import { cn } from '../../../design-system'

export function About() {
  const { profile, site } = usePortfolio()
  const { about } = profile

  const focusAreas = about.subtitle
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)

  const stats = useMemo(
    () => ({
      experience: about.highlights.find((h) => /years/i.test(h.label))?.value ?? '6+',
      focusCount: focusAreas.length,
    }),
    [about.highlights, focusAreas.length],
  )

  return (
    <Section
      id="about"
      title={about.title}
      subtitle={about.subtitle}
      label="01 — About"
      align="left"
      variant="panel"
      decorations="muted"
    >
      <div className="about-section">
        <Reveal>
          <div className="about-section__header">
            <p className="about-section__intro">{site.tagline}</p>
            <dl className="about-section__stats">
              <div className="about-section__stat">
                <dt>Experience</dt>
                <dd>{stats.experience}</dd>
              </div>
              <div className="about-section__stat">
                <dt>Focus areas</dt>
                <dd>{stats.focusCount}</dd>
              </div>
            </dl>
          </div>
        </Reveal>

        <div className="about-section__grid">
          <aside className="about-section__aside">
            <Reveal>
              <figure className="about-portrait">
                <div className="about-portrait__frame">
                  <img
                    src={about.image.src}
                    alt={about.image.alt}
                    width={280}
                    height={280}
                    className="about-portrait__img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className="about-portrait__caption">
                  <span className="about-portrait__name">{site.name}</span>
                  <span className="about-portrait__role">{site.title}</span>
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={60}>
              <div className="about-details">
                <div className="about-details__row">
                  <span className="about-details__label">Location</span>
                  <span className="about-details__value">{site.location}</span>
                </div>
                <div className="about-details__row">
                  <span className="about-details__label">Availability</span>
                  <span className="about-details__value about-details__value--accent">
                    {site.availability}
                  </span>
                </div>
                {site.resumeUrl ? (
                  <Button variant="secondary" href={site.resumeUrl} className="about-details__cta w-full">
                    Download résumé
                  </Button>
                ) : null}
              </div>
            </Reveal>
          </aside>

          <div className="about-section__main">
            {focusAreas.length > 0 && (
              <Reveal>
                <div className="about-section__block">
                  <h3 className="about-section__label">Expertise</h3>
                  <ul className="about-focus" aria-label="Focus areas">
                    {focusAreas.map((area) => (
                      <li key={area}>
                        <span className="about-focus__pill">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            {about.paragraphs[0] && (
              <Reveal delay={40}>
                <div className="about-section__block">
                  <h3 className="about-section__label">Summary</h3>
                  <p className="about-lead">{about.paragraphs[0]}</p>
                </div>
              </Reveal>
            )}

            {about.paragraphs.length > 1 && (
              <div className="about-copy">
                {about.paragraphs.slice(1).map((paragraph, i) => (
                  <Reveal key={paragraph.slice(0, 48)} delay={70 + i * 45}>
                    <p>{paragraph}</p>
                  </Reveal>
                ))}
              </div>
            )}

            <Reveal delay={140}>
              <div className="about-cta">
                <Button variant="primary" href="/#projects">
                  View selected work
                </Button>
                <Button variant="ghost" href="/contact">
                  Start a conversation
                </Button>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal delay={90}>
          <div className="about-section__footer">
            <h3 className="about-section__label">Career highlights</h3>
            <ul className="about-metrics" aria-label="Career highlights">
              {about.highlights.map((highlight, i) => (
                <li
                  key={highlight.label}
                  className={cn('about-metrics__item', i === 0 && 'about-metrics__item--featured')}
                >
                  <article className="about-metric">
                    <p className="about-metric__value">{highlight.value}</p>
                    <p className="about-metric__label">{highlight.label}</p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
