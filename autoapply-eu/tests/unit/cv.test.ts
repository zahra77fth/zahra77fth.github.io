import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractText, factSupported, heuristicExtract, verifyProfileAgainstText } from "@/core/cv/parse";
import { desktopDirectories, findCvFiles } from "@/core/cv/locate";
import { SAMPLE_CV_TEXT, sampleCvDocx, sampleCvPdf } from "../fixtures/sampleCv";

describe("CV discovery on Desktop", () => {
  it("finds PDF and DOCX files, ranking CV-like names first", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "desk-"));
    await fs.writeFile(path.join(dir, "notes.pdf"), "x");
    await fs.writeFile(path.join(dir, "Alex_Example_CV.docx"), "x");
    await fs.mkdir(path.join(dir, "Jobs"));
    await fs.writeFile(path.join(dir, "Jobs", "Lebenslauf.pdf"), "x");
    await fs.writeFile(path.join(dir, "image.png"), "x");
    const { dirs } = await desktopDirectories(dir);
    expect(dirs[0]).toBe(dir);
    const found = await findCvFiles([dir]);
    expect(found.map((f) => f.name).sort()).toEqual(["Alex_Example_CV.docx", "Lebenslauf.pdf", "notes.pdf"]);
    expect(found[0].likelyCv).toBe(true);
    expect(found.find((f) => f.name === "notes.pdf")!.likelyCv).toBe(false);
  });
});

describe("CV parsing", () => {
  it("extracts text from real DOCX and PDF files", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cv-"));
    const docx = path.join(dir, "cv.docx");
    const pdf = path.join(dir, "cv.pdf");
    await fs.writeFile(docx, await sampleCvDocx());
    await fs.writeFile(pdf, await sampleCvPdf());
    for (const f of [docx, pdf]) {
      const text = await extractText(f);
      expect(text).toContain("Alex Example");
      expect(text).toContain("Shopwave GmbH");
    }
  });

  it("extracts contact facts, experience, education, skills and languages", () => {
    const { profile, missing } = heuristicExtract(SAMPLE_CV_TEXT);
    expect(profile.fullName).toBe("Alex Example");
    expect(profile.email).toBe("alex.example@example.com");
    expect(profile.phone.replace(/\s/g, "")).toBe("+4915123456789");
    expect(profile.location).toContain("Berlin");
    expect(profile.links.github).toContain("github.com/alex-example");
    expect(profile.links.linkedin).toContain("linkedin.com/in/alex-example");
    expect(profile.experience).toHaveLength(2);
    expect(profile.experience[0]).toMatchObject({ title: "Frontend Developer", company: "Shopwave GmbH", start: "03/2021", current: true });
    expect(profile.experience[0].bullets).toHaveLength(3);
    expect(profile.experience[1]).toMatchObject({ title: "Junior Web Developer", company: "Pixelhaus Agency", end: "02/2021" });
    expect(profile.education[0].degree).toContain("B.Sc. Computer Science");
    expect(profile.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "Next.js", "Jest", "Cypress", "Accessibility"]));
    expect(profile.skills).not.toContain("Angular");
    expect(profile.languages).toEqual(expect.arrayContaining([{ language: "English", level: "C1" }, { language: "German", level: "B2" }]));
    expect(profile.workAuthorization.source).toBe("unknown");
    expect(missing).toContain("workAuthorization");
  });

  it("never treats undocumented facts as supported", () => {
    const { profile } = heuristicExtract(SAMPLE_CV_TEXT);
    expect(verifyProfileAgainstText(profile, SAMPLE_CV_TEXT)).toEqual([]);
    const tampered = { ...profile, skills: [...profile.skills, "Angular"], experience: [{ ...profile.experience[0], company: "Google" }, profile.experience[1]] };
    const issues = verifyProfileAgainstText(tampered, SAMPLE_CV_TEXT);
    expect(issues.some((i) => i.includes("Angular"))).toBe(true);
    expect(issues.some((i) => i.includes("Google"))).toBe(true);
    expect(verifyProfileAgainstText(tampered, SAMPLE_CV_TEXT, new Set(["skills", "experience[0].company"]))).toEqual([]);
    expect(factSupported("Technische Universität Berlin", SAMPLE_CV_TEXT)).toBe(true);
    expect(factSupported("Stanford University", SAMPLE_CV_TEXT)).toBe(false);
  });
});
