import { SceneBackground } from '../../components/background/SceneBackground'
import { SectionAnchorProvider } from '../../context/SectionAnchorContext'
import { CursorGlow } from '../../components/effects/CursorGlow'
import { InteractiveCursor } from '../../components/effects/InteractiveCursor'
import { AnimatedOutlet } from '../../components/layout/AnimatedOutlet'
import { ScrollProgress } from '../../components/ui/ScrollProgress'
import { usePortfolio } from '../../context/PortfolioContext'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { Footer } from './Footer'
import { Header } from './Header'
import { SectionNav } from './SectionNav'

export function Layout() {
  const { site } = usePortfolio()
  useKeyboardShortcuts({ resumeUrl: site.resumeUrl })

  return (
    <SectionAnchorProvider>
      <SceneBackground />
      <div className="relative flex min-h-screen flex-col overflow-x-hidden">
        <ScrollProgress />
        <CursorGlow />
        <InteractiveCursor />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <SectionNav />
        <main id="main" className="relative z-10 flex-1">
          <AnimatedOutlet />
        </main>
        <Footer />
      </div>
    </SectionAnchorProvider>
  )
}
