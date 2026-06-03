import { createContext, useContext, type ReactNode } from 'react'
import type { PortfolioData } from '../types'

const PortfolioContext = createContext<PortfolioData | null>(null)

export function PortfolioProvider({
  data,
  children,
}: {
  data: PortfolioData
  children: ReactNode
}) {
  return <PortfolioContext.Provider value={data}>{children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}
