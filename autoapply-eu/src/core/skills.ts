export interface SkillDef {
  name: string;
  aliases?: string[];
  category: "language" | "frontend" | "framework" | "styling" | "testing" | "tooling" | "backend" | "cloud" | "data" | "design" | "practice";
  frontendWeight?: number;
}

export const SKILLS: SkillDef[] = [
  { name: "JavaScript", aliases: ["ecmascript", "es6", "es2015", "vanilla js"], category: "language", frontendWeight: 3 },
  { name: "TypeScript", aliases: ["ts"], category: "language", frontendWeight: 3 },
  { name: "HTML", aliases: ["html5"], category: "frontend", frontendWeight: 2 },
  { name: "CSS", aliases: ["css3"], category: "styling", frontendWeight: 2 },
  { name: "Sass", aliases: ["scss"], category: "styling", frontendWeight: 1 },
  { name: "Less", category: "styling" },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"], category: "styling", frontendWeight: 2 },
  { name: "styled-components", category: "styling", frontendWeight: 1 },
  { name: "Emotion", category: "styling" },
  { name: "CSS Modules", category: "styling" },
  { name: "Bootstrap", category: "styling" },
  { name: "Material UI", aliases: ["mui", "material-ui"], category: "styling", frontendWeight: 1 },
  { name: "Chakra UI", category: "styling" },
  { name: "shadcn/ui", aliases: ["shadcn"], category: "styling" },
  { name: "React", aliases: ["react.js", "reactjs"], category: "framework", frontendWeight: 3 },
  { name: "Next.js", aliases: ["nextjs", "next js"], category: "framework", frontendWeight: 3 },
  { name: "React Native", category: "framework", frontendWeight: 1 },
  { name: "Redux", aliases: ["redux toolkit", "rtk"], category: "framework", frontendWeight: 2 },
  { name: "Zustand", category: "framework", frontendWeight: 1 },
  { name: "MobX", category: "framework" },
  { name: "React Query", aliases: ["tanstack query"], category: "framework", frontendWeight: 1 },
  { name: "React Router", category: "framework", frontendWeight: 1 },
  { name: "Vue.js", aliases: ["vue", "vuejs", "vue 3", "vue3"], category: "framework", frontendWeight: 3 },
  { name: "Nuxt", aliases: ["nuxt.js", "nuxtjs"], category: "framework", frontendWeight: 2 },
  { name: "Angular", aliases: ["angularjs"], category: "framework", frontendWeight: 3 },
  { name: "Svelte", aliases: ["sveltekit"], category: "framework", frontendWeight: 2 },
  { name: "Remix", category: "framework" },
  { name: "Gatsby", category: "framework" },
  { name: "Astro", category: "framework" },
  { name: "jQuery", category: "framework" },
  { name: "Three.js", aliases: ["threejs", "react three fiber", "r3f"], category: "frontend", frontendWeight: 1 },
  { name: "Framer Motion", category: "frontend", frontendWeight: 1 },
  { name: "D3.js", aliases: ["d3"], category: "frontend" },
  { name: "WebGL", category: "frontend" },
  { name: "Storybook", category: "tooling", frontendWeight: 1 },
  { name: "Webpack", category: "tooling", frontendWeight: 1 },
  { name: "Vite", category: "tooling", frontendWeight: 1 },
  { name: "Babel", category: "tooling" },
  { name: "ESLint", category: "tooling" },
  { name: "Prettier", category: "tooling" },
  { name: "npm", category: "tooling" },
  { name: "Yarn", category: "tooling" },
  { name: "pnpm", category: "tooling" },
  { name: "Git", aliases: ["github", "gitlab", "bitbucket"], category: "tooling" },
  { name: "Jest", category: "testing", frontendWeight: 1 },
  { name: "Vitest", category: "testing", frontendWeight: 1 },
  { name: "React Testing Library", aliases: ["testing library", "rtl"], category: "testing", frontendWeight: 1 },
  { name: "Cypress", category: "testing", frontendWeight: 1 },
  { name: "Playwright", category: "testing", frontendWeight: 1 },
  { name: "Selenium", category: "testing" },
  { name: "Node.js", aliases: ["nodejs", "node"], category: "backend", frontendWeight: 1 },
  { name: "Express", aliases: ["express.js", "expressjs"], category: "backend" },
  { name: "NestJS", aliases: ["nest.js"], category: "backend" },
  { name: "GraphQL", aliases: ["apollo"], category: "backend", frontendWeight: 1 },
  { name: "REST", aliases: ["rest api", "restful", "rest apis"], category: "backend", frontendWeight: 1 },
  { name: "WebSockets", aliases: ["websocket", "socket.io"], category: "backend" },
  { name: "Python", category: "language" },
  { name: "Java", category: "language" },
  { name: "Kotlin", category: "language" },
  { name: "Go", aliases: ["golang"], category: "language" },
  { name: "PHP", category: "language" },
  { name: "Ruby", aliases: ["ruby on rails", "rails"], category: "language" },
  { name: "C#", aliases: [".net", "dotnet"], category: "language" },
  { name: "Swift", category: "language" },
  { name: "Dart", aliases: ["flutter"], category: "language" },
  { name: "SQL", aliases: ["postgresql", "postgres", "mysql"], category: "data" },
  { name: "MongoDB", category: "data" },
  { name: "Redis", category: "data" },
  { name: "Firebase", category: "cloud" },
  { name: "Supabase", category: "cloud" },
  { name: "AWS", aliases: ["amazon web services"], category: "cloud" },
  { name: "Google Cloud", aliases: ["gcp"], category: "cloud" },
  { name: "Azure", category: "cloud" },
  { name: "Vercel", category: "cloud" },
  { name: "Netlify", category: "cloud" },
  { name: "Docker", category: "cloud" },
  { name: "Kubernetes", aliases: ["k8s"], category: "cloud" },
  { name: "CI/CD", aliases: ["github actions", "gitlab ci", "jenkins", "circleci"], category: "tooling" },
  { name: "Figma", category: "design", frontendWeight: 1 },
  { name: "Sketch", category: "design" },
  { name: "Adobe XD", category: "design" },
  { name: "Accessibility", aliases: ["a11y", "wcag", "aria", "barrierefreiheit", "toegankelijkheid"], category: "practice", frontendWeight: 2 },
  { name: "Responsive Design", aliases: ["responsive", "mobile-first", "mobile first"], category: "practice", frontendWeight: 2 },
  { name: "Web Performance", aliases: ["core web vitals", "lighthouse", "performance optimization"], category: "practice", frontendWeight: 2 },
  { name: "SEO", category: "practice" },
  { name: "PWA", aliases: ["progressive web app", "service worker"], category: "practice" },
  { name: "Micro Frontends", aliases: ["micro-frontends", "module federation"], category: "practice", frontendWeight: 1 },
  { name: "Design Systems", aliases: ["design system", "component library"], category: "practice", frontendWeight: 2 },
  { name: "Server-Side Rendering", aliases: ["ssr", "server side rendering"], category: "practice", frontendWeight: 1 },
  { name: "Agile", aliases: ["scrum", "kanban"], category: "practice" },
  { name: "TDD", aliases: ["test-driven development"], category: "practice" },
  { name: "i18n", aliases: ["internationalization", "localization"], category: "practice" },
];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// Terms that are also common English words only count when capitalised as a proper noun.
const CASE_SENSITIVE = new Set(["Go", "ts", "node", "REST", "Less", "Emotion", "Remix", "Astro", "Swift", "Sketch", "rtl", "Agile", "Dart", "Ruby", "rails", "Java", "SEO", "Git", "npm", "Yarn"]);

function termRegex(term: string): RegExp {
  // Lookarounds instead of \b so terms like "C#", ".NET" and "Next.js" match.
  const body = `(?<![A-Za-z0-9])${escapeRe(term)}(?![A-Za-z0-9])`;
  if (CASE_SENSITIVE.has(term)) {
    const exact = term === "ts" ? "TS" : term === "node" ? "Node" : term === "rtl" ? "RTL" : term === "rails" ? "Rails" : term;
    return new RegExp(`(?<![A-Za-z0-9])${escapeRe(exact)}(?![A-Za-z0-9])`);
  }
  return new RegExp(body, "i");
}

const COMPILED = SKILLS.map((s) => ({
  def: s,
  res: [s.name, ...(s.aliases ?? [])].map(termRegex),
}));

export function findSkills(text: string): string[] {
  const out: string[] = [];
  for (const { def, res } of COMPILED) {
    if (res.some((r) => r.test(text))) out.push(def.name);
  }
  return out;
}

export function countSkillMentions(text: string, skill: string): number {
  const entry = COMPILED.find((c) => c.def.name.toLowerCase() === skill.toLowerCase());
  const regexes = entry ? entry.res : [termRegex(skill)];
  let n = 0;
  for (const r of regexes) {
    const g = new RegExp(r.source, r.flags.includes("g") ? r.flags : r.flags + "g");
    n += (text.match(g) ?? []).length;
  }
  return n;
}

export function canonicalSkill(raw: string): string {
  const t = raw.trim().toLowerCase();
  for (const s of SKILLS) {
    if (s.name.toLowerCase() === t || s.aliases?.some((a) => a.toLowerCase() === t)) return s.name;
  }
  return raw.trim();
}

export function skillDef(name: string): SkillDef | undefined {
  return SKILLS.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
