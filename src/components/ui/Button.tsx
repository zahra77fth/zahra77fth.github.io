import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-foreground shadow-md shadow-accent/20 hover:brightness-110 focus-visible:ring-accent',
  secondary:
    'border border-border/80 bg-surface/90 text-foreground hover:border-accent/40 hover:bg-surface-elevated',
  ghost: 'text-foreground hover:bg-surface-elevated/80',
}

type CursorHint = 'link' | 'close'

interface ButtonProps {
  variant?: Variant
  href?: string
  external?: boolean
  className?: string
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: () => void
  cursorHint?: CursorHint
}

export function Button({
  variant = 'primary',
  href,
  external,
  className = '',
  children,
  type = 'button',
  disabled,
  onClick,
  cursorHint = 'link',
}: ButtonProps) {
  const base =
    'touch-target inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-[transform,box-shadow,background] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50'

  const classes = `${base} ${variants[variant]} ${className}`

  if (href) {
    const isInternal = href.startsWith('/') && !external
    if (isInternal) {
      return (
        <Link to={href} className={classes} data-cursor="link">
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        className={classes}
        data-cursor="link"
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    )
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes} data-cursor={cursorHint}>
      {children}
    </button>
  )
}
