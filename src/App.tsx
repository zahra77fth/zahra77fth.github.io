import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PortfolioProvider } from './context/PortfolioContext'
import { getPortfolioData } from './lib/loadData'
import { Layout } from './components/layout/Layout'
import { HashScroll } from './components/HashScroll'
import { LoadingScreen } from './components/LoadingScreen'
import { HomePage } from './pages/HomePage'

const portfolioData = getPortfolioData()

const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })),
)

function AppContent() {
  useEffect(() => {
    document.title = portfolioData.site.seo.title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', portfolioData.site.seo.description)
  }, [])

  return (
    <PortfolioProvider data={portfolioData}>
      <BrowserRouter>
        <HashScroll />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route
              path="contact"
              element={
                <Suspense fallback={<LoadingScreen />}>
                  <ContactPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortfolioProvider>
  )
}

export default function App() {
  return <AppContent />
}
