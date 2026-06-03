import type { ReactNode } from 'react'

/** Cloud layer container — no scroll-driven motion (keeps drift speed constant). */
export function SkyWorldGroup({ children }: { children: ReactNode }) {
  return <group>{children}</group>
}
