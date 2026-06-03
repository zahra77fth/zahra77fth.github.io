import { useTheme } from '../../context/ThemeContext'
import { resolveCanvasQuality, usePerformanceTier } from '../../hooks/usePerformanceTier'
import { THEME_CANVAS_CLEAR } from '../../lib/theme'
import { SceneCanvasShell } from './SceneCanvasShell'
import { SkyScene } from './sky/SkyScene'

/** Light mode — atmospheric procedural sky (SkyBackdrop) */
export function SkyCanvas() {
  const { theme } = useTheme()
  const quality = resolveCanvasQuality(usePerformanceTier())

  return (
    <SceneCanvasShell
      theme={theme}
      variant="sky"
      dpr={[1, 1.75]}
      style={{ width: '100%', height: '100%', background: THEME_CANVAS_CLEAR.light }}
    >
      <SkyScene quality={quality} />
    </SceneCanvasShell>
  )
}
