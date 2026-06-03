import { About } from '../components/sections/About'
import { ContactCTA } from '../components/sections/ContactCTA'
import { Education } from '../components/sections/Education'
import { Experience } from '../components/sections/Experience'
import { Hero } from '../components/sections/Hero'
import { Projects } from '../components/sections/Projects'
import { Skills } from '../components/sections/Skills'
import { Testimonials } from '../components/sections/Testimonials'
import { TechMarquee } from '../components/effects/TechMarquee'

export function HomePage() {
  return (
    <>
      <Hero />
      <TechMarquee />
      <About />
      <Skills />
      <Experience />
      <Projects />
      <Education />
      <Testimonials />
      <ContactCTA />
    </>
  )
}
