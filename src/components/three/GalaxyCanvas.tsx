import { useTheme } from '../../context/ThemeContext'
import { resolveCanvasQuality, usePerformanceTier } from '../../hooks/usePerformanceTier'
import { THEME_CANVAS_CLEAR } from '../../lib/theme'
import { GalaxyScene } from './galaxy/GalaxyScene'
import { SceneCanvasShell } from './SceneCanvasShell'

/** Dark mode only — deep space, stars, light beams */
export function GalaxyCanvas() {
  const { theme } = useTheme()
  const quality = resolveCanvasQuality(usePerformanceTier())

  return (
    <SceneCanvasShell
      theme={theme}
      variant="galaxy"
      camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 50 }}
      dpr={[1, 1.75]}
      style={{ width: '100%', height: '100%', background: THEME_CANVAS_CLEAR.dark }}
    >
      <GalaxyScene quality={quality} />
    </SceneCanvasShell>
  )
}
