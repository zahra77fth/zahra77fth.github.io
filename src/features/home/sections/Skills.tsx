import { useMemo } from 'react'
import { usePortfolio } from '../../../context/PortfolioContext'
import { Reveal } from '../../../components/motion/Reveal'
import { Section } from '../../../components/ui/Section'
import { cn } from '../../../design-system'

const CATEGORY_HINTS: Record<string, string> = {
  Languages: 'Core languages and web fundamentals',
  'Frameworks & UI': 'Interfaces, design systems, and app frameworks',
  'State, data & real-time': 'Client state, APIs, and live product flows',
  'Quality & delivery': 'Testing, CI/CD, performance, and accessibility',
}

export function Skills() {
  const { skills } = usePortfolio()

  const totalSkills = useMemo(
    () => skills.categories.reduce((sum, cat) => sum + cat.items.length, 0),
    [skills.categories],
  )

  return (
    <Section
      id="skills"
      title={skills.title}
      subtitle={skills.subtitle}
      label="02 — Skills"
      align="right"
      variant="panel"
      decorations="default"
    >
      <div className="skills-section">
        <Reveal>
          <div className="skills-section__header">
            <p className="skills-section__intro">{skills.subtitle}</p>
            <dl className="skills-section__stats">
              <div className="skills-section__stat">
                <dt>Domains</dt>
                <dd>{skills.categories.length}</dd>
              </div>
              <div className="skills-section__stat">
                <dt>Technologies</dt>
                <dd>{totalSkills}</dd>
              </div>
            </dl>
          </div>
        </Reveal>

        <div className="skills-section__grid">
          {skills.categories.map((cat, i) => (
            <Reveal key={cat.name} delay={60 + i * 45}>
              <article
                className={cn('skills-category', i === 0 && 'skills-category--lead')}
              >
                <header className="skills-category__head">
                  <span className="skills-category__index" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="skills-category__titles">
                    <h3 className="skills-category__name">{cat.name}</h3>
                    <p className="skills-category__hint">
                      {CATEGORY_HINTS[cat.name] ?? 'Tools and practices in production'}
                    </p>
                  </div>
                </header>
                <ul className="skills-category__list">
                  {cat.items.map((item) => (
                    <li key={item}>
                      <span className="skills-chip">{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
