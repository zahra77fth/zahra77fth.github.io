import { usePortfolio } from '../../context/PortfolioContext'
import { Section } from '../ui/Section'
import { ArticleCarousel } from '../ui/ArticleCarousel'

export function Testimonials() {
  const { testimonials } = usePortfolio()

  return (
    <Section
      id="writing"
      title={testimonials.title}
      subtitle={testimonials.subtitle}
      label="06 — Writing"
      className="overflow-hidden bg-surface/30"
    >
      <ArticleCarousel items={testimonials.items} />
    </Section>
  )
}
