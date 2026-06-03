import type { PerformanceTier } from '../../../hooks/usePerformanceTier'
import { SkyInteractionRig } from '../sky/SkyInteractionRig'
import { GalaxyDiscGroup } from './GalaxyDiscGroup'
import { GalaxyDiveRig } from './GalaxyDiveRig'
import { GalaxyNebula } from './GalaxyNebula'
import { LivingGalaxy } from './LivingGalaxy'

interface GalaxySceneProps {
  quality: Exclude<PerformanceTier, 'lite'>
}

/** Living galaxy — 60° tilt, scroll dive, dense star connections. */
export function GalaxyScene({ quality }: GalaxySceneProps) {
  const isFull = quality === 'full'

  return (
    <>
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 16, 45]} />
      <ambientLight intensity={0.08} />

      <SkyInteractionRig />
      <GalaxyDiveRig />
      <GalaxyDiscGroup>
        <GalaxyNebula />
        <LivingGalaxy
          starCount={isFull ? 2400 : 1200}
          linkDistance={isFull ? 3.8 : 3.4}
          maxLinks={isFull ? 1100 : 550}
          maxLinksPerStar={isFull ? 6 : 5}
        />
      </GalaxyDiscGroup>
    </>
  )
}
