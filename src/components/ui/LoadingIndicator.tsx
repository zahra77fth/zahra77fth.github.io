import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../design-system/utils/cn'

export interface LoadingIndicatorProps {
  variant?: 'page' | 'inline'
  label?: string
  className?: string
}

/** Theme-aware loader — orbital glow (dark) or sun rays (light). */
export function LoadingIndicator({
  variant = 'page',
  label = 'Loading',
  className,
}: LoadingIndicatorProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={cn(
        'loader',
        variant === 'page' ? 'loader--page' : 'loader--inline',
        isDark ? 'loader--dark' : 'loader--light',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loader__mark" aria-hidden>
        {isDark ? (
          <>
            <span className="loader__core" />
            <span className="loader__orbit loader__orbit--1" />
            <span className="loader__orbit loader__orbit--2" />
            <span className="loader__orbit loader__orbit--3" />
            <span className="loader__spark loader__spark--1" />
            <span className="loader__spark loader__spark--2" />
          </>
        ) : (
          <>
            <span className="loader__sun" />
            <span className="loader__ray loader__ray--1" />
            <span className="loader__ray loader__ray--2" />
            <span className="loader__ray loader__ray--3" />
            <span className="loader__cloud loader__cloud--1" />
            <span className="loader__cloud loader__cloud--2" />
          </>
        )}
      </div>
      {label ? <p className="loader__label">{label}</p> : null}
      <span className="sr-only">{label}</span>
    </div>
  )
}
