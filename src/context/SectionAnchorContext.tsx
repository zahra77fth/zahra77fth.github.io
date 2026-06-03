import { createContext, useContext, type ReactNode } from 'react'
import { useSectionAnchors, type ViewportAnchor } from '../hooks/useSectionAnchors'

interface SectionAnchorContextValue {
  activeSectionId: string
  anchor: ViewportAnchor
  isHome: boolean
}

const SectionAnchorContext = createContext<SectionAnchorContextValue | null>(null)

export function SectionAnchorProvider({ children }: { children: ReactNode }) {
  const value = useSectionAnchors()
  return <SectionAnchorContext.Provider value={value}>{children}</SectionAnchorContext.Provider>
}

export function useSectionAnchor() {
  const ctx = useContext(SectionAnchorContext)
  if (!ctx) {
    return {
      activeSectionId: 'about',
      anchor: { x: 0.55, y: 0.2 } satisfies ViewportAnchor,
      isHome: true,
    }
  }
  return ctx
}
