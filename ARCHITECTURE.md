# Architecture

Performance-first portfolio — no runtime animation library on the critical path.

## Layers

```
src/
  app/           Entry, providers, routing
  content/       (JSON lives in src/data/)
  features/      Route-level UI (home, contact, layout)
  components/    Shared UI, background, motion helpers
  context/       Portfolio data React context
  hooks/         Small reusable hooks
  lib/           Data loading
  types/         TypeScript contracts
```

## Performance rules

1. **No canvas/video loops** — background uses CSS gradients + `transform` only (compositor-friendly).
2. **No Framer Motion** — scroll reveals use `IntersectionObserver` + CSS transitions.
3. **Code splitting** — `HomePage`, each section below the fold, and `ContactPage` are lazy-loaded.
4. **JSON at build time** — `getPortfolioData()` imports `src/data/*.json` (no fetch waterfall).
5. **Scroll progress** — CSS `animation-timeline: scroll()` (zero JS).
6. **`prefers-reduced-motion`** — disables animations and marquee.

## Data flow

`src/data/*.json` → `getPortfolioData()` → `PortfolioProvider` → `usePortfolio()` in features.

## Customize

Edit JSON in `src/data/`, replace `public/avatar.svg`, add optional `public/video/ambient.mp4` only if you enable video later.
