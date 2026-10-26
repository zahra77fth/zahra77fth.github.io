import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { TailoredCv } from "./tailor";
import type { CoverLetter } from "./coverLetter";

const LABELS = {
  en: { summary: "Profile", skills: "Skills", core: "Relevant", other: "Additional", experience: "Experience", projects: "Projects", education: "Education", certs: "Certifications", langs: "Languages" },
  de: { summary: "Profil", skills: "Kenntnisse", core: "Relevant", other: "Weitere", experience: "Berufserfahrung", projects: "Projekte", education: "Ausbildung", certs: "Zertifikate", langs: "Sprachen" },
  nl: { summary: "Profiel", skills: "Vaardigheden", core: "Relevant", other: "Overig", experience: "Werkervaring", projects: "Projecten", education: "Opleiding", certs: "Certificaten", langs: "Talen" },
};

function pdfToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 56, right: 56 }, info: { Producer: "AutoApply EU" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

export async function cvPdf(cv: TailoredCv, lang: keyof typeof LABELS = "en"): Promise<Buffer> {
  const L = LABELS[lang];
  return pdfToBuffer((doc) => {
    const heading = (t: string) => {
      doc.moveDown(0.6).font("Helvetica-Bold").fontSize(11.5).fillColor("#0f172a").text(t.toUpperCase(), { characterSpacing: 0.6 });
      const y = doc.y + 1;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).lineWidth(0.6).strokeColor("#94a3b8").stroke();
      doc.moveDown(0.35);
    };
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text(cv.fullName);
    if (cv.headline) doc.font("Helvetica").fontSize(11.5).fillColor("#334155").text(cv.headline);
    doc.moveDown(0.2).font("Helvetica").fontSize(9).fillColor("#475569").text(cv.contact.join("  |  "));
    if (cv.summary) {
      heading(L.summary);
      doc.font("Helvetica").fontSize(10).fillColor("#1e293b").text(cv.summary, { align: "left" });
    }
    if (cv.skills.primary.length || cv.skills.other.length) {
      heading(L.skills);
      if (cv.skills.primary.length) doc.font("Helvetica-Bold").fontSize(10).text(`${L.core}: `, { continued: true }).font("Helvetica").text(cv.skills.primary.join(", "));
      if (cv.skills.other.length) doc.font("Helvetica-Bold").fontSize(10).text(`${L.other}: `, { continued: true }).font("Helvetica").text(cv.skills.other.join(", "));
    }
    if (cv.experience.length) {
      heading(L.experience);
      for (const e of cv.experience) {
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a").text([e.title, e.company].filter(Boolean).join(" — "));
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#475569").text([e.period, e.location].filter(Boolean).join(" · "));
        doc.font("Helvetica").fontSize(10).fillColor("#1e293b");
        for (const b of e.bullets) doc.text(`•  ${b}`, { indent: 8 });
        doc.moveDown(0.4);
      }
    }
    if (cv.projects.length) {
      heading(L.projects);
      for (const p of cv.projects) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(p.name, { continued: !!p.url }).font("Helvetica").fillColor("#475569").text(p.url ? `  ${p.url}` : "");
        if (p.description) doc.font("Helvetica").fontSize(10).fillColor("#1e293b").text(p.description);
        doc.moveDown(0.3);
      }
    }
    if (cv.education.length) {
      heading(L.education);
      for (const e of cv.education) doc.font("Helvetica-Bold").fontSize(10).text(e.degree, { continued: true }).font("Helvetica").text([e.institution, e.period].filter(Boolean).map((s) => ` — ${s}`).join(""));
    }
    if (cv.certifications.length) {
      heading(L.certs);
      doc.font("Helvetica").fontSize(10).text(cv.certifications.join("; "));
    }
    if (cv.languages.length) {
      heading(L.langs);
      doc.font("Helvetica").fontSize(10).text(cv.languages.join(", "));
    }
  });
}

const p = (text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
  new Paragraph({ children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 21, color: opts.color })], spacing: { after: 60 } });

const sectionHeading = (t: string) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 23 })], spacing: { before: 200, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8", space: 2 } } });

export async function cvDocx(cv: TailoredCv, lang: keyof typeof LABELS = "en"): Promise<Buffer> {
  const L = LABELS[lang];
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: cv.fullName, bold: true, size: 40 })] }),
    ...(cv.headline ? [p(cv.headline, { size: 23, color: "334155" })] : []),
    p(cv.contact.join("  |  "), { size: 18, color: "475569" }),
  ];
  if (cv.summary) children.push(sectionHeading(L.summary), p(cv.summary));
  if (cv.skills.primary.length || cv.skills.other.length) {
    children.push(sectionHeading(L.skills));
    if (cv.skills.primary.length) children.push(new Paragraph({ children: [new TextRun({ text: `${L.core}: `, bold: true, size: 21 }), new TextRun({ text: cv.skills.primary.join(", "), size: 21 })] }));
    if (cv.skills.other.length) children.push(new Paragraph({ children: [new TextRun({ text: `${L.other}: `, bold: true, size: 21 }), new TextRun({ text: cv.skills.other.join(", "), size: 21 })] }));
  }
  if (cv.experience.length) {
    children.push(sectionHeading(L.experience));
    for (const e of cv.experience) {
      children.push(p([e.title, e.company].filter(Boolean).join(" — "), { bold: true }), p([e.period, e.location].filter(Boolean).join(" · "), { italics: true, size: 18, color: "475569" }));
      for (const b of e.bullets) children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: b, size: 21 })] }));
    }
  }
  if (cv.projects.length) {
    children.push(sectionHeading(L.projects));
    for (const pr of cv.projects) children.push(p(pr.url ? `${pr.name} — ${pr.url}` : pr.name, { bold: true }), ...(pr.description ? [p(pr.description)] : []));
  }
  if (cv.education.length) {
    children.push(sectionHeading(L.education));
    for (const e of cv.education) children.push(p([e.degree, e.institution, e.period].filter(Boolean).join(" — ")));
  }
  if (cv.certifications.length) children.push(sectionHeading(L.certs), p(cv.certifications.join("; ")));
  if (cv.languages.length) children.push(sectionHeading(L.langs), p(cv.languages.join(", ")));
  return Packer.toBuffer(new Document({ creator: "AutoApply EU", title: `${cv.fullName} CV`, sections: [{ children }] }));
}

export function cvText(cv: TailoredCv): string {
  return [
    cv.fullName,
    cv.headline,
    cv.contact.join(" | "),
    "",
    cv.summary,
    "",
    `Skills: ${[...cv.skills.primary, ...cv.skills.other].join(", ")}`,
    "",
    ...cv.experience.flatMap((e) => [[e.title, e.company, e.period].filter(Boolean).join(" — "), ...e.bullets.map((b) => `• ${b}`), ""]),
    ...cv.projects.map((pr) => `${pr.name}: ${pr.description}`),
    ...cv.education.map((e) => [e.degree, e.institution, e.period].filter(Boolean).join(" — ")),
    cv.languages.join(", "),
  ].join("\n");
}

export async function letterPdf(letter: CoverLetter, sender: { name: string; contact: string[] }, recipient: { company: string; city: string | null }): Promise<Buffer> {
  const date = new Date().toLocaleDateString(letter.language === "de" ? "de-DE" : letter.language === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return pdfToBuffer((doc) => {
    doc.font("Helvetica-Bold").fontSize(12).text(sender.name);
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text(sender.contact.join("  |  "));
    doc.moveDown(1.5).fillColor("#0f172a").fontSize(10.5).text(recipient.company);
    if (recipient.city) doc.text(recipient.city);
    doc.moveDown(1).text(date, { align: "right" });
    doc.moveDown(1).font("Helvetica-Bold").text(letter.subject);
    doc.moveDown(0.8).font("Helvetica").fontSize(10.5).text(letter.body, { lineGap: 2 });
  });
}

export async function letterDocx(letter: CoverLetter, sender: { name: string; contact: string[] }, recipient: { company: string; city: string | null }): Promise<Buffer> {
  const children = [
    p(sender.name, { bold: true, size: 24 }),
    p(sender.contact.join("  |  "), { size: 18, color: "475569" }),
    p(""),
    p(recipient.company),
    ...(recipient.city ? [p(recipient.city)] : []),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: new Date().toISOString().slice(0, 10), size: 21 })] }),
    p(letter.subject, { bold: true }),
    p(""),
    ...letter.body.split("\n").map((line) => p(line)),
  ];
  return Packer.toBuffer(new Document({ creator: "AutoApply EU", sections: [{ children }] }));
}

export function safeName(s: string) {
  return s.normalize("NFKD").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "x";
}

export async function writeFile(dir: string, name: string, data: Buffer | string): Promise<string> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const full = path.join(dir, name);
  await fs.writeFile(full, data, { mode: 0o600 });
  return full;
}
