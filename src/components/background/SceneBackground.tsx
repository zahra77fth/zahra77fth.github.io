import { useTheme } from '../../context/ThemeContext'
import { GalaxyCanvas } from '../three/GalaxyCanvas'
import { SkyCanvas } from '../three/SkyCanvas'
import { AmbientBackground } from './AmbientBackground'

/**
 * Full-viewport background stack (fixed z-0). Content sits above at z-10.
 * Canvas is imported eagerly (preloaded from main) — no flat-color Suspense flash.
 */
export function SceneBackground() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={isDark ? 'scene-bg scene-bg--dark' : 'scene-bg scene-bg--light'}
      aria-hidden
    >
      <AmbientBackground />
      {isDark ? <GalaxyCanvas /> : <SkyCanvas />}
    </div>
  )
}
