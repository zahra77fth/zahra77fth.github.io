import { usePortfolio } from '../../context/PortfolioContext'

/** CSS-only marquee — no JS animation loop. */
export function TechMarquee() {
  const { skills } = usePortfolio()
  const items = skills.categories.flatMap((c) => c.items).slice(0, 12)
  const track = [...items, ...items]

  return (
    <div className="marquee border-y border-border/40 bg-surface/40 py-3" aria-hidden>
      <div className="marquee__track">
        {track.map((item, i) => (
          <span key={`${item}-${i}`} className="marquee__item">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
