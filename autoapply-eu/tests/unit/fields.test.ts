import { describe, expect, it } from "vitest";
import { mapField, pickOption, questionKey, type FieldDescriptor, type MapContext } from "@/core/apply/fields";
import { sampleProfile } from "../fixtures/sampleCv";

const f = (label: string, over: Partial<FieldDescriptor> = {}): FieldDescriptor => ({ key: "k", tag: "input", type: "text", label, name: "", required: true, options: [], autocomplete: "", ...over });
const ctx = (over: Partial<MapContext> = {}): MapContext => ({
  profile: sampleProfile(),
  job: { company: "Acme", title: "Frontend Developer", country: "DE" },
  resumePath: "/tmp/cv.pdf",
  coverPath: "/tmp/cl.pdf",
  coverText: "Dear team",
  savedAnswers: new Map(),
  acceptPrivacyNotices: false,
  ...over,
});

describe("form field mapping", () => {
  it("maps contact fields in English, German and Dutch", () => {
    expect(mapField(f("First Name *"), ctx())).toMatchObject({ kind: "text", value: "Alex" });
    expect(mapField(f("Nachname"), ctx())).toMatchObject({ kind: "text", value: "Example" });
    expect(mapField(f("Voornaam"), ctx())).toMatchObject({ value: "Alex" });
    expect(mapField(f("Email", { type: "email" }), ctx())).toMatchObject({ value: "alex.example@example.com" });
    expect(mapField(f("Telefonnummer"), ctx())).toMatchObject({ value: "+49 151 2345 6789" });
    expect(mapField(f("Full name", { name: "name" }), ctx())).toMatchObject({ value: "Alex Example" });
    expect(mapField(f("LinkedIn Profile"), ctx())).toMatchObject({ value: "linkedin.com/in/alex-example" });
  });

  it("uploads tailored CV and cover letter to the right inputs", () => {
    expect(mapField(f("Resume/CV", { type: "file" }), ctx())).toMatchObject({ kind: "file", value: "/tmp/cv.pdf" });
    expect(mapField(f("Anschreiben", { type: "file", required: false }), ctx())).toMatchObject({ kind: "file", value: "/tmp/cl.pdf" });
    expect(mapField(f("Cover letter", { tag: "textarea", type: "textarea", required: false }), ctx())).toMatchObject({ kind: "text", value: "Dear team" });
  });

  it("answers work authorization only from verified facts", () => {
    const radio = f("Are you legally authorized to work in Germany?", { type: "radio", options: ["Yes", "No"] });
    expect(mapField(radio, ctx())).toMatchObject({ kind: "radio", value: "Yes" });
    const unknown = sampleProfile({ workAuthorization: { DE: "", NL: "", requiresSponsorship: null, source: "unknown" } });
    expect(mapField(radio, ctx({ profile: unknown }))).toMatchObject({ kind: "unknown" });
    expect(mapField(f("Will you now or in the future require visa sponsorship?", { tag: "select", type: "select", options: ["Yes", "No"] }), ctx())).toMatchObject({ kind: "select", value: "No" });
    expect(mapField(f("Do you have a work permit for the Netherlands?", { type: "radio", options: ["Yes", "No"] }), ctx())).toMatchObject({ kind: "unknown" });
  });

  it("never fabricates answers to unknown required questions, but uses saved verified answers", () => {
    const q = f("What is your favourite design pattern?", { tag: "textarea", type: "textarea" });
    expect(mapField(q, ctx())).toMatchObject({ kind: "unknown" });
    expect(mapField({ ...q, required: false }, ctx())).toMatchObject({ kind: "skip" });
    expect(mapField(q, ctx({ savedAnswers: new Map([[questionKey(q.label), "Composition"]]) }))).toMatchObject({ kind: "text", value: "Composition", source: "saved verified answer" });
    expect(mapField(f("Salary expectations"), ctx())).toMatchObject({ kind: "unknown" });
  });

  it("handles consent and voluntary diversity questions conservatively", () => {
    const privacy = f("I agree to the processing of my data according to the privacy policy", { type: "checkbox" });
    expect(mapField(privacy, ctx())).toMatchObject({ kind: "unknown" });
    expect(mapField(privacy, ctx({ acceptPrivacyNotices: true }))).toMatchObject({ kind: "checkbox" });
    expect(mapField(f("Add me to your talent pool for future opportunities (consent)", { type: "checkbox", required: false }), ctx({ acceptPrivacyNotices: true }))).toMatchObject({ kind: "skip" });
    expect(mapField(f("Gender", { tag: "select", type: "select", options: ["Male", "Female", "Decline to self-identify"], required: false }), ctx())).toMatchObject({ value: "Decline to self-identify" });
  });

  it("picks options across languages", () => {
    expect(pickOption(["Ja", "Nein"], "Yes")).toBe("Ja");
    expect(pickOption(["Nee", "Ja"], "No")).toBe("Nee");
    expect(pickOption(["Yes, I am", "No, I am not"], "yes")).toBe("Yes, I am");
    expect(pickOption(["A", "B"], "C")).toBeNull();
  });
});
