import type { ReactNode } from 'react'
import { Reveal } from '../motion/Reveal'
import { Container } from './Container'
import { SectionOrnaments } from '../graphics/SectionOrnaments'
import { cn } from '../../design-system'

type SectionVariant = 'default' | 'panel' | 'inset'
type SectionAlign = 'left' | 'right'

interface SectionProps {
  id?: string
  title: string
  subtitle?: string
  label?: string
  children: ReactNode
  className?: string
  variant?: SectionVariant
  align?: SectionAlign
  decorations?: false | 'default' | 'accent' | 'muted'
}

function parseIndex(label: string) {
  const match = label.match(/^(\d+)/)
  return match?.[1] ?? null
}

export function Section({
  id,
  title,
  subtitle,
  label,
  children,
  className = '',
  variant = 'panel',
  align = 'left',
  decorations = false,
}: SectionProps) {
  const eyebrow = label ?? title
  const index = label ? parseIndex(label) : null
  const ornamentVariant = decorations === false ? undefined : decorations || 'default'

  return (
    <section
      id={id}
      className={cn('ds-section section-block relative scroll-mt-[calc(var(--header-height)+var(--ds-space-4))]', className)}
      aria-labelledby={id ? `${id}-heading` : undefined}
      data-section-index={index ?? undefined}
    >
      {ornamentVariant && <SectionOrnaments variant={ornamentVariant} />}

      {index && (
        <span className="section-watermark font-display" aria-hidden>
          {index}
        </span>
      )}

      <Container>
        <div className={cn('section-shell', `section-shell--${align}`)}>
          <Reveal className="section-shell__header">
            <div className="ds-stack ds-stack--sm max-w-2xl">
              {label && (
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  <span className="section-index-badge">{eyebrow}</span>
                </p>
              )}
              <h2
                id={id ? `${id}-heading` : undefined}
                className="section-title-wrap font-display text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-tight tracking-tight"
              >
                <span className="section-title-ghost font-display" aria-hidden>
                  {title}
                </span>
                <span className="section-title-text relative z-10">{title}</span>
              </h2>
              {subtitle && <p className="text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>}
            </div>
            <div className="section-divider mt-6 sm:mt-8" aria-hidden />
          </Reveal>

          <Reveal delay={80} className="section-shell__body">
            {variant === 'default' ? (
              children
            ) : (
              <div className={variant === 'inset' ? 'section-panel section-panel--inset' : 'section-panel'}>
                {children}
              </div>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

export type { SectionProps }
