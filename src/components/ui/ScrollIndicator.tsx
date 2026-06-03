import { useReducedMotion } from 'framer-motion'

export function ScrollIndicator() {
  const reduceMotion = useReducedMotion()

  return (
    <a
      href="#about"
      className="scroll-indicator group"
      aria-label="Scroll to about section"
    >
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.35em] text-muted transition-colors group-hover:text-accent">
        Scroll
      </span>
      <span className="scroll-indicator__line" aria-hidden>
        {!reduceMotion && <span className="scroll-indicator__dot" />}
      </span>
    </a>
  )
}
