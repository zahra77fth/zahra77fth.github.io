import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { pageTransition } from '../../lib/motion'
import { BackgroundScene } from '../effects/BackgroundScene'
import { CursorGlow } from '../effects/CursorGlow'
import { ScrollProgress } from '../effects/ScrollProgress'
import { Footer } from './Footer'
import { Header } from './Header'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'

export function Layout() {
  const location = useLocation()
  const tier = usePerformanceTier()

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <ScrollProgress />
      <BackgroundScene />
      {tier === 'full' && <CursorGlow />}
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
