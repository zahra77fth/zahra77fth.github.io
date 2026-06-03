import { usePortfolio } from '../../../context/PortfolioContext'
import { Reveal } from '../../../components/motion/Reveal'
import { Section } from '../../../components/ui/Section'
import { ArticleCarousel } from '../../../components/ui/ArticleCarousel'

export function Testimonials() {
  const { testimonials } = usePortfolio()

  return (
    <Section
      id="writing"
      title={testimonials.title}
      subtitle={testimonials.subtitle}
      label="06 — Writing"
      align="right"
      variant="panel"
      className="overflow-hidden bg-surface/20"
      decorations="accent"
    >
      <Reveal>
        <ArticleCarousel items={testimonials.items} />
      </Reveal>
    </Section>
  )
}
