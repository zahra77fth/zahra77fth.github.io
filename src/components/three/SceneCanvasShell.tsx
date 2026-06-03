import { Canvas, type CanvasProps } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { cn } from '../../design-system/utils/cn'
import { THEME_CANVAS_CLEAR, type Theme } from '../../lib/theme'

interface SceneCanvasShellProps extends Omit<CanvasProps, 'className' | 'onCreated'> {
  theme: Theme
  variant: 'galaxy' | 'sky'
  children: ReactNode
}

/** Full-viewport WebGL layer — always paints (no opacity gate / demand frameloop). */
export function SceneCanvasShell({
  theme,
  variant,
  children,
  ...canvasProps
}: SceneCanvasShellProps) {
  return (
    <div
      className={cn('three-bg', variant === 'galaxy' ? 'three-bg--galaxy' : 'three-bg--sky')}
      aria-hidden
    >
      <Canvas
        key={theme}
        {...canvasProps}
        frameloop="always"
        className="three-bg__canvas"
        onCreated={(state) => {
          state.gl.setClearColor(THEME_CANVAS_CLEAR[theme], 1)
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          ...canvasProps.gl,
        }}
      >
        {children}
      </Canvas>
    </div>
  )
}
