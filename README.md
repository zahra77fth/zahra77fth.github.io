# Portfolio Pro

A modern, performance-minded developer portfolio for **Zahra Fattahi** — built with React 19, TypeScript, Tailwind CSS 4, and immersive 3D backgrounds. Content lives in JSON so you can update copy, projects, and experience without touching component code.

[![Live demo](https://img.shields.io/badge/demo-GitHub Pages-0ea5e9?style=flat-square)](https://github.com/zahra77fth/portfolio)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)

## Highlights

- **JSON-driven content** — Profile, skills, experience, projects, education, testimonials, and site metadata in `src/data/`
- **Immersive backgrounds** — Light-mode sky (clouds, birds, kite) and dark-mode galaxy via React Three Fiber
- **Polished sections** — Hero, selected-work rail, About, Skills, Experience, Projects (modal details), Education, Writing, Contact
- **Motion & accessibility** — Framer Motion with `prefers-reduced-motion` respect; lazy-loaded below-the-fold sections
- **Theme system** — Light/dark mode with persisted preference and design tokens
- **SPA-ready** — React Router, hash anchors, and Vercel rewrites for clean URLs

## Tech stack

| Layer | Tools |
|--------|--------|
| Build | [Vite](https://vite.dev) 8, TypeScript |
| UI | [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com) 4 |
| Motion | [Framer Motion](https://www.framer.com/motion) |
| 3D | [Three.js](https://threejs.org), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei) |
| Routing | [React Router](https://reactrouter.com) 7 |

## Quick start

```bash
git clone https://github.com/zahra77fth/portfolio.git
cd portfolio
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Typecheck and production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Customize content

Edit the JSON files under `src/data/` — the dev server hot-reloads on save.

| File | What to change |
|------|----------------|
| `site.json` | Name, title, email, social links, navigation, SEO |
| `profile.json` | Hero copy, about text, stats, avatar path |
| `skills.json` | Skill categories and items |
| `experience.json` | Roles, companies, highlights |
| `projects.json` | Titles, tags, thumbnails; leave `github` or `live` empty to hide links |
| `education.json` | Degrees and certifications |
| `testimonials.json` | Quotes and attributions |
| `contact.json` | Contact page copy and FAQ |

**Assets:** Replace images in `public/` (avatar, project thumbs, OG image). Add a résumé at `public/resume.pdf` and point `resumeUrl` in `site.json` if needed.

Only non-empty URLs render as links — useful when a project has no public repo yet.

## Project structure

```
src/
  app/              App shell, providers, routing
  features/         Home, contact, layout, project UI
  components/       Shared UI, 3D sky/galaxy, effects (cursor)
  data/             Portfolio JSON (source of truth)
  design-system/    Tokens and theme variables
  hooks/            Reusable React hooks
  lib/              Data loading helpers
  types/            TypeScript contracts
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for performance conventions (lazy sections, build-time JSON, reduced motion).

## Git workflow

Branching and commit conventions: [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md).

- `main` — production / deploy
- `develop` — integration; branch features from here

## Publish to GitHub (no Homebrew)

GitHub CLI is bundled under `.tools/`. From the project root:

```bash
./scripts/publish-to-github.sh
```

The script runs `gh auth login` if needed, then creates `portfolio-pro` on your account and pushes `main`. Or use the website: [create a new repo](https://github.com/new) (empty, no README), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/portfolio-pro.git
git push -u origin main
```

## Deploy

### Vercel (recommended)

```bash
npm run build
npx vercel
```

`vercel.json` rewrites all routes to `index.html` for client-side routing.

**Build settings:** Build command `npm run build`, output directory `dist`.

### Other hosts

Any static host works: run `npm run build` and publish the `dist` folder. Configure SPA fallback to `index.html` for `/contact` and deep links.

## Contact form

The contact UI is front-end only in development (submissions log to the console). Wire it to [Formspree](https://formspree.io), Netlify Forms, or your API before going live.

## Lighthouse

```bash
npm run build && npm run preview
```

Run Lighthouse in Chrome DevTools (Incognito). For top scores: compress images (WebP/AVIF), limit third-party scripts, and connect a real form backend.

## Author

**Zahra Fattahi** — Frontend developer (React, Next.js, design systems, performance)

- GitHub: [@zahra-hsb](https://github.com/zahra-hsb)
- LinkedIn: [Zahra HB](https://www.linkedin.com/in/zahra-hb-713760241/)
- Email: zafth98@gmail.com

## License

MIT — free to use for personal and commercial portfolios. Attribution appreciated but not required.
