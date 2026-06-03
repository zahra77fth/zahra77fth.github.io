import { OrthographicCamera } from '@react-three/drei'
import type { PerformanceTier } from '../../../hooks/usePerformanceTier'
import { Birds } from './Birds'
import { CloudLayer } from './CloudLayer'
import { Kite } from './Kite'
import { SkyWorldGroup } from './SkyWorldGroup'
import { SkyBackdrop } from './SkyBackdrop'
import { SkyFlightRig } from './SkyFlightRig'
import { SkyInteractionRig } from './SkyInteractionRig'
import { SkySparkles } from './SkySparkles'

interface SkySceneProps {
  quality: Exclude<PerformanceTier, 'lite'>
}

/** Light mode — atmospheric sky, soft clouds, birds & kite. */
export function SkyScene({ quality }: SkySceneProps) {
  const isFull = quality === 'full'

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 10]} near={0.1} far={50} />
      <SkyInteractionRig />
      <SkyFlightRig />
      <SkyBackdrop />
      <SkySparkles count={isFull ? 32 : 16} />
      <SkyWorldGroup>
        <CloudLayer count={isFull ? 11 : 6} layer="far" />
        <CloudLayer count={isFull ? 9 : 5} layer="near" />
      </SkyWorldGroup>
      <Kite />
      <Birds count={isFull ? 16 : 10} />
    </>
  )
}
