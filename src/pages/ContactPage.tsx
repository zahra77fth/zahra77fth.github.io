import { motion, useReducedMotion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { MotionReveal } from '../components/ui/MotionReveal'

export function ContactPage() {
  const { contact } = usePortfolio()
  const [submitted, setSubmitted] = useState(false)
  const reduceMotion = useReducedMotion()
  const { form } = contact

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    console.info('Contact form (connect to your backend):', Object.fromEntries(data.entries()))
    setSubmitted(true)
    e.currentTarget.reset()
  }

  const fieldMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      }

  return (
    <div className="section-padding">
      <Container>
        <MotionReveal className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{contact.title}</h1>
          <p className="mt-4 text-lg text-muted">{contact.subtitle}</p>
        </MotionReveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-5">
          <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-3" noValidate>
            <motion.div {...fieldMotion} transition={{ ...fieldMotion.transition, delay: 0 }}>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {form.nameLabel}
              </label>
              <input id="name" name="name" type="text" required autoComplete="name" className="input-field" />
            </motion.div>

            <motion.div {...fieldMotion} transition={{ ...fieldMotion.transition, delay: 0.05 }}>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                {form.emailLabel}
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className="input-field" />
            </motion.div>

            <motion.div {...fieldMotion} transition={{ ...fieldMotion.transition, delay: 0.1 }}>
              <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">
                {form.subjectLabel}
              </label>
              <select id="topic" name="topic" required className="input-field" defaultValue="">
                <option value="" disabled>
                  Select a topic
                </option>
                {form.topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </motion.div>

            <motion.div {...fieldMotion} transition={{ ...fieldMotion.transition, delay: 0.15 }}>
              <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                {form.messageLabel}
              </label>
              <textarea id="message" name="message" required rows={5} className="input-field resize-y" />
            </motion.div>

            <motion.div {...fieldMotion} transition={{ ...fieldMotion.transition, delay: 0.2 }}>
              <Button type="submit">{form.submitLabel}</Button>
            </motion.div>

            {submitted && (
              <p
                role="status"
                className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm"
              >
                {form.successMessage}
              </p>
            )}
          </form>

          <aside className="space-y-8 lg:col-span-2">
            <MotionReveal>
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold">Contact info</h2>
                <ul className="mt-4 space-y-4">
                  {contact.info.map((item) => (
                    <li key={item.label}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="mt-0.5 hover:text-accent">
                          {item.value}
                        </a>
                      ) : (
                        <p className="mt-0.5">{item.value}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </MotionReveal>

            <MotionReveal delay={0.1}>
              <h2 className="mb-4 text-lg font-semibold">FAQ</h2>
              <div className="space-y-4">
                {contact.faq.map((item) => (
                  <details key={item.question} className="rounded-xl border border-border bg-surface p-4">
                    <summary className="cursor-pointer font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                      {item.question}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
                  </details>
                ))}
              </div>
            </MotionReveal>
          </aside>
        </div>
      </Container>
    </div>
  )
}
