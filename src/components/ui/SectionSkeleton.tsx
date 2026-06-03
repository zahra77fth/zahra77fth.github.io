import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../design-system/utils/cn'

/** Placeholder while a home section chunk loads — mirrors section layout. */
export function SectionSkeleton() {
  const isDark = useTheme().theme === 'dark'

  return (
    <div
      className={cn(
        'section-skeleton ds-section',
        isDark ? 'section-skeleton--dark' : 'section-skeleton--light',
      )}
      aria-hidden
    >
      <div className="ds-container section-skeleton__inner">
        <div className="section-skeleton__eyebrow skeleton-block" />
        <div className="section-skeleton__title skeleton-block" />
        <div className="section-skeleton__subtitle skeleton-block" />
        <div className="section-skeleton__body">
          <div className="section-skeleton__line section-skeleton__line--long skeleton-block" />
          <div className="section-skeleton__line section-skeleton__line--medium skeleton-block" />
          <div className="section-skeleton__line section-skeleton__line--short skeleton-block" />
        </div>
        <div className="section-skeleton__cards">
          <div className="section-skeleton__card skeleton-block" />
          <div className="section-skeleton__card skeleton-block" />
          <div className="section-skeleton__card skeleton-block section-skeleton__card--hide-sm" />
        </div>
      </div>
    </div>
  )
}
