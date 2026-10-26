import { describe, expect, it } from "vitest";
import { SettingsSchema } from "@/lib/settings";
import { candidateYears, evaluateJob, parseSalaryRange } from "@/core/matching/match";
import { tailorCv, unsupportedClaims } from "@/core/documents/tailor";
import { chooseLanguage, composeCoverLetter } from "@/core/documents/coverLetter";
import { cvDocx, cvPdf, letterPdf } from "@/core/documents/render";
import { findSkills } from "@/core/skills";
import { sampleProfile } from "../fixtures/sampleCv";

const settings = SettingsSchema.parse({});
const job = (over: Partial<Parameters<typeof evaluateJob>[0]> = {}) => ({
  title: "Frontend Developer (m/w/d)",
  company: "Acme GmbH",
  descriptionText: "You will build our web app with React, TypeScript and Next.js. Experience with Jest is a plus. We care about accessibility.",
  descriptionLang: "en",
  remotePolicy: "HYBRID",
  country: "DE",
  techStack: [] as string[],
  ...over,
});

describe("matching and eligibility", () => {
  const p = sampleProfile();

  it("computes experience from dated roles", () => {
    expect(candidateYears(p, new Date(2026, 9, 1))).toBeCloseTo(7.3, 0);
  });

  it("scores a strong frontend match as eligible with an explanation", () => {
    const r = evaluateJob(job(), p, settings);
    expect(r.status).toBe("ELIGIBLE");
    expect(r.score).toBeGreaterThan(70);
    expect(r.matchedSkills).toEqual(expect.arrayContaining(["React", "TypeScript", "Next.js", "Jest"]));
    expect(r.reasons.join(" ")).toMatch(/Matches/);
  });

  it("keeps low-score but eligible jobs eligible (score orders, it does not exclude)", () => {
    const r = evaluateJob(job({ descriptionText: "We use Angular, RxJS, Kotlin and AWS." }), p, settings);
    expect(r.status).toBe("ELIGIBLE");
    expect(r.score).toBeLessThan(60);
  });

  it("excludes unrelated roles and settings-based exclusions", () => {
    expect(evaluateJob(job({ title: "Backend Engineer (Java)" }), p, settings).status).toBe("EXCLUDED");
    expect(evaluateJob(job({ title: "Principal Frontend Engineer" }), p, settings).exclusion).toMatch(/principal/i);
    expect(evaluateJob(job({ title: "Werkstudent Frontend" }), p, settings).status).toBe("EXCLUDED");
    expect(evaluateJob(job({ remotePolicy: "ONSITE" }), p, SettingsSchema.parse({ remotePreferences: ["REMOTE"] })).status).toBe("EXCLUDED");
    expect(evaluateJob(job({ descriptionText: "React. Salary: €40.000 - €48.000" }), p, SettingsSchema.parse({ minSalaryEur: 60000 })).status).toBe("EXCLUDED");
  });

  it("applies language requirements against verified levels", () => {
    const dutchReq = job({ descriptionText: "React developer. Fluent Dutch is required." });
    expect(evaluateJob(dutchReq, p, settings).status).toBe("EXCLUDED");
    const germanReq = job({ descriptionText: "React developer. Sehr gute Deutschkenntnisse erforderlich." });
    expect(evaluateJob(germanReq, p, settings).status).toBe("ELIGIBLE");
    const noLangs = sampleProfile({ languages: [] });
    expect(evaluateJob(dutchReq, noLangs, settings).status).toBe("NEEDS_CLARIFICATION");
    expect(evaluateJob(job({ descriptionLang: "nl" }), p, settings).status).toBe("NEEDS_CLARIFICATION");
  });

  it("flags work-authorization requirements when status is unknown", () => {
    const unknown = sampleProfile({ workAuthorization: { DE: "", NL: "", requiresSponsorship: null, source: "unknown" } });
    const r = evaluateJob(job({ descriptionText: "React. Unfortunately we cannot offer visa sponsorship." }), unknown, settings);
    expect(r.status).toBe("NEEDS_CLARIFICATION");
    const needs = sampleProfile({ workAuthorization: { DE: "", NL: "", requiresSponsorship: true, source: "user" } });
    expect(evaluateJob(job({ descriptionText: "React. We do not sponsor visas." }), needs, settings).status).toBe("EXCLUDED");
  });

  it("parses salary ranges", () => {
    expect(parseSalaryRange("€55,000 - €70,000 per year")).toEqual({ min: 55000, max: 70000 });
    expect(parseSalaryRange("60k–75k EUR")).toEqual({ min: 60000, max: 75000 });
    expect(parseSalaryRange("no salary here")).toBeNull();
  });
});

describe("tailored CV", () => {
  const p = sampleProfile();
  const j = { company: "Acme", title: "React Engineer", descriptionText: "Cypress and Jest testing. React, Next.js. Accessibility.", descriptionLang: "en", city: "Berlin", country: "DE" };

  it("only reorders verified facts and never adds skills", () => {
    const cv = tailorCv(p, j);
    const all = [...cv.skills.primary, ...cv.skills.other];
    expect(new Set(all)).toEqual(new Set(p.skills));
    expect(cv.skills.primary.slice(0, 2)).toEqual(expect.arrayContaining(["React"]));
    expect(cv.experience.map((e) => e.company)).toEqual(p.experience.map((e) => e.company));
    for (const [i, e] of cv.experience.entries()) for (const b of e.bullets) expect(p.experience[i].bullets).toContain(b);
    expect(cv.experience[0].bullets[0]).toMatch(/Jest|Cypress/);
  });

  it("guards generated prose against invented technologies and figures", () => {
    expect(unsupportedClaims("I have 10 years of Angular experience and cut costs by 40%", p, j)).toEqual(expect.arrayContaining(['technology "Angular"', 'figure "40%"']));
    expect(unsupportedClaims("I built a design system in React used by 4 product teams.", p, j)).toEqual([]);
  });

  it("renders valid PDF and DOCX files", async () => {
    const cv = tailorCv(p, j);
    const pdf = await cvPdf(cv);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const docx = await cvDocx(cv);
    expect(docx.subarray(0, 2).toString()).toBe("PK");
  });
});

describe("cover letters", () => {
  const p = sampleProfile();
  const j = { company: "Beta B.V.", title: "Frontend Engineer", descriptionText: "• Strong experience with React and TypeScript\n• Testing with Cypress\n• You enjoy coffee", descriptionLang: "en", city: "Amsterdam", country: "NL" };

  it("is specific to company and role and uses only verified facts", async () => {
    const l = composeCoverLetter(p, j, "en");
    expect(l.body).toContain("Beta B.V.");
    expect(l.body).toContain("Frontend Engineer");
    expect(l.body).toContain("Shopwave GmbH");
    expect(l.body).toContain("Strong experience with React and TypeScript");
    const verified = findSkills(JSON.stringify(p));
    for (const s of findSkills(l.body)) expect(verified).toContain(s);
    expect(unsupportedClaims(l.body, p, j)).toEqual([]);
    const pdf = await letterPdf(l, { name: p.fullName, contact: [p.email] }, { company: j.company, city: j.city });
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("differs between jobs", () => {
    const a = composeCoverLetter(p, j, "en").body;
    const b = composeCoverLetter(p, { ...j, company: "Gamma", title: "UI Developer", descriptionText: "• Sass and HTML expertise\n• Figma collaboration" }, "en").body;
    expect(a).not.toBe(b);
  });

  it("chooses German/Dutch only when verified level and preference allow", () => {
    const deJob = { ...j, descriptionLang: "de" };
    expect(chooseLanguage(deJob, p, SettingsSchema.parse({ coverLetterLanguages: ["en"] }))).toBe("en");
    expect(chooseLanguage(deJob, p, SettingsSchema.parse({ coverLetterLanguages: ["en", "de"] }))).toBe("de");
    expect(chooseLanguage({ ...j, descriptionLang: "nl" }, p, SettingsSchema.parse({ coverLetterLanguages: ["en", "nl"] }))).toBe("en");
    expect(composeCoverLetter(p, deJob, "de").body).toMatch(/Mit freundlichen Grüßen/);
  });
});
