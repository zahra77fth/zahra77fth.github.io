import { Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import { ProfileSchema, type Profile } from "@/core/profile/schema";

/** A fictional candidate used only in tests. */
export const SAMPLE_CV_TEXT = `Alex Example
Frontend Developer
Berlin, Germany | alex.example@example.com | +49 151 2345 6789
linkedin.com/in/alex-example | github.com/alex-example | alex-example.dev

Summary
Frontend developer building accessible React and TypeScript applications for e-commerce and SaaS products.

Experience
Frontend Developer at Shopwave GmbH
03/2021 – Present
• Built a design system in React and TypeScript used by 4 product teams
• Migrated the storefront from Create React App to Next.js, improving Lighthouse performance score from 62 to 91
• Wrote unit tests with Jest and React Testing Library and end-to-end tests with Cypress
Junior Web Developer | Pixelhaus Agency
06/2019 – 02/2021
• Developed responsive marketing sites with HTML, CSS, Sass and JavaScript
• Integrated REST APIs and maintained a Vue.js customer portal

Education
B.Sc. Computer Science, Technische Universität Berlin
10/2015 – 04/2019

Skills
JavaScript, TypeScript, React, Next.js, Redux, HTML, CSS, Sass, Tailwind CSS, Jest, Cypress, Git, Figma, Accessibility

Projects
Recipe Finder – A Next.js app with TypeScript and Tailwind CSS for searching recipes
Portfolio – personal site built with React and Three.js

Languages
English (C1), German (B2), Persian (Native)
`;

export function sampleProfile(overrides: Partial<Profile> = {}): Profile {
  return ProfileSchema.parse({
    fullName: "Alex Example",
    email: "alex.example@example.com",
    phone: "+49 151 2345 6789",
    location: "Berlin, Germany",
    headline: "Frontend Developer",
    summary: "Frontend developer building accessible React and TypeScript applications for e-commerce and SaaS products.",
    links: { github: "github.com/alex-example", linkedin: "linkedin.com/in/alex-example", portfolio: "alex-example.dev", other: [] },
    experience: [
      {
        title: "Frontend Developer",
        company: "Shopwave GmbH",
        start: "03/2021",
        end: "Present",
        current: true,
        bullets: [
          "Built a design system in React and TypeScript used by 4 product teams",
          "Migrated the storefront from Create React App to Next.js, improving Lighthouse performance score from 62 to 91",
          "Wrote unit tests with Jest and React Testing Library and end-to-end tests with Cypress",
        ],
      },
      { title: "Junior Web Developer", company: "Pixelhaus Agency", start: "06/2019", end: "02/2021", bullets: ["Developed responsive marketing sites with HTML, CSS, Sass and JavaScript", "Integrated REST APIs and maintained a Vue.js customer portal"] },
    ],
    education: [{ degree: "B.Sc. Computer Science", institution: "Technische Universität Berlin", start: "10/2015", end: "04/2019" }],
    skills: ["JavaScript", "TypeScript", "React", "Next.js", "Redux", "HTML", "CSS", "Sass", "Tailwind CSS", "Jest", "Cypress", "Git", "Figma", "Accessibility", "React Testing Library", "Vue.js", "REST"],
    projects: [{ name: "Recipe Finder", description: "A Next.js app with TypeScript and Tailwind CSS for searching recipes", technologies: ["Next.js", "TypeScript", "Tailwind CSS"] }],
    languages: [
      { language: "English", level: "C1" },
      { language: "German", level: "B2" },
    ],
    workAuthorization: { DE: "Yes - EU Blue Card", NL: "", requiresSponsorship: false, source: "user" },
    ...overrides,
  });
}

export async function sampleCvDocx(): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: SAMPLE_CV_TEXT.split("\n").map((l) => new Paragraph({ children: [new TextRun(l)] })) }] });
  return Packer.toBuffer(doc);
}

export function sampleCvPdf(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.font("Helvetica").fontSize(10);
    for (const line of SAMPLE_CV_TEXT.split("\n")) doc.text(line || " ");
    doc.end();
  });
}
