import type { PortfolioData } from '../types'
import contact from '../data/contact.json'
import education from '../data/education.json'
import experience from '../data/experience.json'
import profile from '../data/profile.json'
import projects from '../data/projects.json'
import site from '../data/site.json'
import skills from '../data/skills.json'
import testimonials from '../data/testimonials.json'

/** Portfolio content loaded from JSON (edit files in src/data/). */
export function getPortfolioData(): PortfolioData {
  return {
    site: site as PortfolioData['site'],
    profile: profile as PortfolioData['profile'],
    skills: skills as PortfolioData['skills'],
    experience: experience as PortfolioData['experience'],
    projects: projects as PortfolioData['projects'],
    education: education as PortfolioData['education'],
    testimonials: testimonials as PortfolioData['testimonials'],
    contact: contact as PortfolioData['contact'],
  }
}
