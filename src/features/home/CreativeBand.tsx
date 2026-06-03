import { usePortfolio } from '../../context/PortfolioContext'

export function CreativeBand() {
  const { site } = usePortfolio()
  const phrase = `${site.name} — ${site.title} — `
  const track = Array.from({ length: 12 }, () => phrase)

  return (
    <div className="creative-band" aria-hidden>
      <div className="creative-band__row creative-band__row--a">
        <div className="creative-band__track">
          {track.map((t, i) => (
            <span key={`a-${i}`} className="creative-band__text">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="creative-band__row creative-band__row--b">
        <div className="creative-band__track creative-band__track--reverse">
          {track.map((t, i) => (
            <span key={`b-${i}`} className="creative-band__text creative-band__text--outline">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
