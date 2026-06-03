import { usePortfolio } from '../../context/PortfolioContext'
import { MotionReveal } from '../ui/MotionReveal'
import { Section } from '../ui/Section'
import { GlassCard } from '../ui/GlassCard'

export function Education() {
  const { education } = usePortfolio()

  return (
    <Section id="education" title={education.title} subtitle={education.subtitle} label="05 — Education">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {education.items.map((item, i) => (
            <MotionReveal key={item.school} delay={i * 0.07} direction="left">
              <GlassCard className="p-6 sm:p-7">
                <h3 className="font-display font-bold">{item.degree}</h3>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {item.school} · {item.period}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
              </GlassCard>
            </MotionReveal>
          ))}
        </div>

        <MotionReveal direction="right">
          <h3 className="font-display mb-5 text-lg font-bold">Certifications</h3>
          <ul className="space-y-3">
            {education.certifications.map((cert, i) => (
              <MotionReveal key={cert.name} delay={i * 0.05}>
                <li>
                  <GlassCard className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-sm text-muted">{cert.issuer}</p>
                    </div>
                    <span className="font-display text-sm font-bold text-accent">{cert.year}</span>
                  </GlassCard>
                </li>
              </MotionReveal>
            ))}
          </ul>
        </MotionReveal>
      </div>
    </Section>
  )
}
