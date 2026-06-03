import { lazy, Suspense } from 'react'
import { SectionBridge } from '../../components/ui/SectionBridge'
import { CreativeBand } from './CreativeBand'
import { Hero } from './Hero'
import { ProjectShowcaseRail } from './ProjectShowcaseRail'
import { TechMarquee } from '../../components/ui/TechMarquee'
import { PageFallback } from '../../components/ui/PageFallback'
import { SectionSkeleton } from '../../components/ui/SectionSkeleton'

const About = lazy(() => import('./sections/About').then((m) => ({ default: m.About })))
const Skills = lazy(() => import('./sections/Skills').then((m) => ({ default: m.Skills })))
const Experience = lazy(() => import('./sections/Experience').then((m) => ({ default: m.Experience })))
const Projects = lazy(() => import('./sections/Projects').then((m) => ({ default: m.Projects })))
const Education = lazy(() => import('./sections/Education').then((m) => ({ default: m.Education })))
const Testimonials = lazy(() => import('./sections/Testimonials').then((m) => ({ default: m.Testimonials })))
const ContactCTA = lazy(() => import('./sections/ContactCTA').then((m) => ({ default: m.ContactCTA })))

export function HomePage() {
  return (
    <div className="page-flow">
      <Hero />
      <TechMarquee />
      <ProjectShowcaseRail />
      <CreativeBand />
      <SectionBridge />
      <Suspense fallback={<SectionSkeleton />}>
        <About />
      </Suspense>
      <SectionBridge label="Skills" />
      <Suspense fallback={<SectionSkeleton />}>
        <Skills />
      </Suspense>
      <SectionBridge label="Experience" />
      <Suspense fallback={<SectionSkeleton />}>
        <Experience />
      </Suspense>
      <SectionBridge label="Work" />
      <Suspense fallback={<SectionSkeleton />}>
        <Projects />
      </Suspense>
      <CreativeBand />
      <SectionBridge />
      <Suspense fallback={<SectionSkeleton />}>
        <Education />
      </Suspense>
      <SectionBridge label="Writing" />
      <Suspense fallback={<SectionSkeleton />}>
        <Testimonials />
      </Suspense>
      <SectionBridge label="Contact" />
      <Suspense fallback={<PageFallback />}>
        <ContactCTA />
      </Suspense>
    </div>
  )
}
