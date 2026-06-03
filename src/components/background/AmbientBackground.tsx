import { useTheme } from '../../context/ThemeContext'

/**
 * CSS-only atmosphere — light mode sky is fully handled by SkyCanvas (no overlay).
 */
export function AmbientBackground() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (isDark) {
    return null
  }

  return <div className="ambient-bg ambient-bg--light" aria-hidden />
}
