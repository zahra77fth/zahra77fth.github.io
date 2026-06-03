export interface SiteData {
  name: string
  title: string
  tagline: string
  email: string
  location: string
  availability: string
  domain: string
  resumeUrl: string
  social: {
    github: string
    linkedin: string
    twitter: string
    dribbble: string
  }
  navigation: { label: string; href: string }[]
  seo: {
    title: string
    description: string
    keywords: string
    ogImage: string
  }
}

export interface ProfileData {
  hero: {
    greeting: string
    rotatingRoles?: string[]
    headline: string
    ctaPrimary: { label: string; href: string }
    ctaSecondary: { label: string; href: string }
  }
  about: {
    title: string
    subtitle: string
    paragraphs: string[]
    highlights: { label: string; value: string }[]
    image: { src: string; alt: string }
  }
}

export interface SkillsData {
  title: string
  subtitle: string
  categories: { name: string; items: string[] }[]
}

export interface ExperienceItem {
  role: string
  company: string
  period: string
  location: string
  description: string
  achievements: string[]
  technologies: string[]
}

export interface ExperienceData {
  title: string
  subtitle: string
  items: ExperienceItem[]
}

export interface ProjectItem {
  name: string
  description: string
  image: string
  tags: string[]
  links: { live: string; github: string }
  featured: boolean
}

export interface ProjectsData {
  title: string
  subtitle: string
  items: ProjectItem[]
}

export interface EducationData {
  title: string
  subtitle: string
  items: {
    degree: string
    school: string
    period: string
    description: string
  }[]
  certifications: { name: string; issuer: string; year: string }[]
}

export interface ArticleItem {
  title: string
  excerpt: string
  image: string
  url: string
  tags: string[]
  readTime?: string
}

export interface TestimonialsData {
  title: string
  subtitle: string
  items: ArticleItem[]
}

export interface ContactData {
  title: string
  subtitle: string
  form: {
    nameLabel: string
    emailLabel: string
    subjectLabel: string
    messageLabel: string
    submitLabel: string
    successMessage: string
    topics: string[]
  }
  info: { label: string; value: string; href: string }[]
  faq: { question: string; answer: string }[]
}

export interface PortfolioData {
  site: SiteData
  profile: ProfileData
  skills: SkillsData
  experience: ExperienceData
  projects: ProjectsData
  education: EducationData
  testimonials: TestimonialsData
  contact: ContactData
}
