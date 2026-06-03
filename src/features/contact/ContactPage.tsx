import { useState, type FormEvent } from 'react'
import { usePortfolio } from '../../context/PortfolioContext'
import { Reveal } from '../../components/motion/Reveal'
import { Button } from '../../components/ui/Button'
import { Container } from '../../components/ui/Container'
import { GlassCard } from '../../components/ui/GlassCard'
import { Select } from '../../components/ui/Select'

export function ContactPage() {
  const { contact } = usePortfolio()
  const [submitted, setSubmitted] = useState(false)
  const [topic, setTopic] = useState('')
  const { form } = contact

  const topicOptions = form.topics.map((t) => ({ value: t, label: t }))

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.info('Contact form:', Object.fromEntries(new FormData(e.currentTarget).entries()))
    setSubmitted(true)
    setTopic('')
    e.currentTarget.reset()
  }

  return (
    <div className="section-padding">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{contact.title}</h1>
          <p className="mt-4 text-lg text-muted">{contact.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-5 lg:gap-12">
          <Reveal className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="ds-stack ds-stack--md" noValidate>
              <div>
                <label htmlFor="name" className="ds-field-label">
                  {form.nameLabel}
                </label>
                <input id="name" name="name" type="text" required autoComplete="name" className="input-field" />
              </div>
              <div>
                <label htmlFor="email" className="ds-field-label">
                  {form.emailLabel}
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" className="input-field" />
              </div>
              <Select
                id="topic"
                name="topic"
                label={form.subjectLabel}
                placeholder="Select a topic"
                options={topicOptions}
                value={topic}
                onChange={setTopic}
                required
              />
              <div>
                <label htmlFor="message" className="ds-field-label">
                  {form.messageLabel}
                </label>
                <textarea id="message" name="message" required rows={5} className="input-field resize-y" />
              </div>
              <Button type="submit">{form.submitLabel}</Button>
              {submitted && (
                <p role="status" className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
                  {form.successMessage}
                </p>
              )}
            </form>
          </Reveal>

          <aside className="ds-stack ds-stack--lg lg:col-span-2">
            <Reveal delay={80}>
              <GlassCard className="p-5 sm:p-6">
                <h2 className="font-display text-lg font-bold">Contact info</h2>
                <ul className="mt-4 ds-stack ds-stack--md">
                  {contact.info.map((item) => (
                    <li key={item.label}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="mt-0.5 hover:text-accent" data-cursor="link">
                          {item.value}
                        </a>
                      ) : (
                        <p className="mt-0.5">{item.value}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </Reveal>
            <Reveal delay={120}>
              <h2 className="font-display mb-4 text-lg font-bold">FAQ</h2>
              <div className="ds-stack ds-stack--sm">
                {contact.faq.map((item) => (
                  <details key={item.question} className="ds-accordion glass-card">
                    <summary className="ds-accordion__summary">{item.question}</summary>
                    <p className="ds-accordion__content">{item.answer}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </aside>
        </div>
      </Container>
    </div>
  )
}
