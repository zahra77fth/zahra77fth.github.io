import type { Theme } from '../../lib/theme'

/** @deprecated Canvas mounts eagerly; kept for compatibility. */
export function CanvasThemePlaceholder({ theme }: { theme: Theme }) {
  return (
    <div
      className={theme === 'dark' ? 'scene-fill scene-fill--dark' : 'scene-fill scene-fill--light'}
      aria-hidden
    />
  )
}
