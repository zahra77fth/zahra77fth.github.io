import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { getPortfolioData } from '../lib/loadData'
import { AppProviders } from './providers'
import { Layout } from '../features/layout/Layout'
import { HashScroll } from '../components/HashScroll'
import { PageFallback } from '../components/ui/PageFallback'

const portfolioData = getPortfolioData()

const HomePage = lazy(() => import('../features/home/HomePage').then((m) => ({ default: m.HomePage })))
const ContactPage = lazy(() =>
  import('../features/contact/ContactPage').then((m) => ({ default: m.ContactPage })),
)

export default function App() {
  useEffect(() => {
    document.title = portfolioData.site.seo.title
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', portfolioData.site.seo.description)
  }, [])

  return (
    <AppProviders data={portfolioData}>
      <BrowserRouter>
        <HashScroll />
        <Routes>
          <Route element={<Layout />}>
            <Route
              index
              element={
                <Suspense fallback={<PageFallback />}>
                  <HomePage />
                </Suspense>
              }
            />
            <Route
              path="contact"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ContactPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}
