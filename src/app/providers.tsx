import type { ReactNode } from 'react'
import { PortfolioProvider } from '../context/PortfolioContext'
import { ThemeProvider } from '../context/ThemeContext'
import type { PortfolioData } from '../types'

export function AppProviders({ data, children }: { data: PortfolioData; children: ReactNode }) {
  return (
    <ThemeProvider>
      <PortfolioProvider data={data}>{children}</PortfolioProvider>
    </ThemeProvider>
  )
}
