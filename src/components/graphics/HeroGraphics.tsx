export function HeroGraphics() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="hero-graphic hero-graphic--arc absolute right-0 top-1/4 h-64 w-64 text-accent/20" viewBox="0 0 200 200" fill="none">
        <path
          d="M 180 20 A 160 160 0 0 1 20 180"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="8 12"
        />
      </svg>
      <svg className="hero-graphic hero-graphic--float absolute bottom-1/4 left-0 h-40 w-40 text-accent-secondary/25" viewBox="0 0 100 100">
        <polygon points="50,5 95,75 5,75" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div className="hero-graphic hero-graphic--pulse absolute left-1/3 top-1/3 h-2 w-2 rounded-full bg-accent shadow-[0_0_20px_var(--color-accent)]" />
    </div>
  )
}
