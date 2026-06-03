import { cn } from '../../design-system'

type OrnamentVariant = 'default' | 'accent' | 'muted'

interface SectionOrnamentsProps {
  variant?: OrnamentVariant
  className?: string
}

export function SectionOrnaments({ variant = 'default', className }: SectionOrnamentsProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <svg
        className={cn('ds-ornament-ring absolute -right-16 top-8 h-48 w-48 opacity-30', variant === 'accent' && 'opacity-50')}
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" className="text-accent" />
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" className="text-accent-secondary" />
      </svg>
      <svg
        className="ds-ornament-dots absolute -left-8 bottom-12 h-32 w-32 opacity-20"
        viewBox="0 0 120 120"
        fill="currentColor"
      >
        {Array.from({ length: 25 }).map((_, i) => {
          const row = Math.floor(i / 5)
          const col = i % 5
          return <circle key={i} cx={12 + col * 24} cy={12 + row * 24} r="2" className="text-accent" />
        })}
      </svg>
      <div
        className={cn(
          'absolute left-1/2 top-0 h-px w-[min(90%,40rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/30 to-transparent',
          variant === 'muted' && 'via-border',
        )}
      />
    </div>
  )
}
