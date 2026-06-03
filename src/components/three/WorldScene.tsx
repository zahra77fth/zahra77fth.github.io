import type { PerformanceTier } from '../../hooks/usePerformanceTier'
import { GalaxyScene } from './galaxy/GalaxyScene'
import { SkyScene } from './sky/SkyScene'

export type WorldMode = 'galaxy' | 'sky'

interface WorldSceneProps {
  quality: Exclude<PerformanceTier, 'lite'>
  mode: WorldMode
}

export function WorldScene({ quality, mode }: WorldSceneProps) {
  if (mode === 'galaxy') {
    return <GalaxyScene quality={quality} />
  }

  return <SkyScene quality={quality} />
}
