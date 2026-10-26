import type { Profile } from "../profile/schema";
import { languageLevel } from "../profile/schema";

export interface FieldDescriptor {
  key: string;
  tag: "input" | "select" | "textarea";
  type: string;
  label: string;
  name: string;
  required: boolean;
  options: string[];
  autocomplete: string;
  accept?: string;
}

export interface MapContext {
  profile: Profile;
  job: { company: string; title: string; country: string | null };
  resumePath: string;
  coverPath: string | null;
  coverText: string | null;
  savedAnswers: Map<string, string>;
  acceptPrivacyNotices: boolean;
}

export type Mapped =
  | { kind: "text" | "select" | "radio" | "checkbox" | "file" | "skip"; value: string; source: string }
  | { kind: "unknown"; reason: string };

export function questionKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 200);
}

const YES = ["yes", "ja", "oui", "true"];
const NO = ["no", "nein", "nee", "false"];

/** Resolves an answer to one of the available options, tolerating language and wording differences. */
export function pickOption(options: string[], answer: string): string | null {
  const a = answer.trim().toLowerCase();
  const exact = options.find((o) => o.trim().toLowerCase() === a);
  if (exact) return exact;
  const group = YES.includes(a) ? YES : NO.includes(a) ? NO : null;
  if (group) {
    const hit = options.find((o) => group.some((g) => new RegExp(`^\\s*${g}\\b`, "i").test(o)));
    if (hit) return hit;
  }
  const contains = options.filter((o) => o.toLowerCase().includes(a) || a.includes(o.toLowerCase()));
  return contains.length === 1 ? contains[0] : null;
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { first: parts.slice(0, -1).join(" ") || parts[0] || "", last: parts.length > 1 ? parts[parts.length - 1] : "" };
}

function yn(v: boolean | null | undefined): string | null {
  return v === true ? "Yes" : v === false ? "No" : null;
}

function choose(f: FieldDescriptor, answer: string | null, source: string): Mapped {
  if (answer === null || answer === "") return { kind: "unknown", reason: "No verified answer" };
  if (f.tag === "select" || f.type === "radio") {
    const opt = pickOption(f.options, answer);
    if (!opt) return { kind: "unknown", reason: `Verified answer "${answer}" does not match any option` };
    return { kind: f.tag === "select" ? "select" : "radio", value: opt, source };
  }
  if (f.type === "checkbox") {
    if (YES.includes(answer.toLowerCase())) return { kind: "checkbox", value: "true", source };
    if (NO.includes(answer.toLowerCase())) return { kind: "skip", value: "", source };
    return { kind: "unknown", reason: "Checkbox needs a yes/no answer" };
  }
  return { kind: "text", value: answer, source };
}

export function mapField(f: FieldDescriptor, ctx: MapContext): Mapped {
  const p = ctx.profile;
  const text = `${f.label} ${f.name} ${f.autocomplete}`.toLowerCase();
  const has = (re: RegExp) => re.test(text);
  const saved = ctx.savedAnswers.get(questionKey(f.label));

  if (f.type === "hidden" || f.type === "submit" || f.type === "button") return { kind: "skip", value: "", source: "n/a" };

  if (f.type === "file") {
    if (has(/cover|anschreiben|motivation|motivatie|begeleidende/)) return ctx.coverPath ? { kind: "file", value: ctx.coverPath, source: "generated cover letter" } : { kind: "skip", value: "", source: "no cover letter" };
    if (has(/resume|cv|lebenslauf|curriculum|résumé/) || (f.required && !has(/photo|foto|image|portfolio|transcript|zeugnis|certificate/))) return { kind: "file", value: ctx.resumePath, source: "tailored CV" };
    return f.required ? { kind: "unknown", reason: "Unrecognised required file upload" } : { kind: "skip", value: "", source: "optional upload" };
  }

  if (saved !== undefined) return choose(f, saved, "saved verified answer");

  const { first, last } = splitName(p.fullName);
  if (has(/given[-_ ]?name|first[-_ ]?name|vorname|voornaam|\bfname\b/)) return choose(f, first, "profile.fullName");
  if (has(/family[-_ ]?name|last[-_ ]?name|surname|nachname|achternaam|\blname\b/)) return choose(f, last, "profile.fullName");
  if (has(/^\s*(full )?name\b|\bfull[-_ ]?name|your name|vollständiger name|volledige naam|^name\s/) || f.name === "name" || f.autocomplete === "name") return choose(f, p.fullName, "profile.fullName");
  if (has(/e-?mail/) && f.type !== "checkbox") return choose(f, p.email, "profile.email");
  if (has(/phone|telefon|mobile|handy|mobiel|telefoonnummer|\btel\b/)) return choose(f, p.phone, "profile.phone");
  if (has(/linkedin/)) return p.links.linkedin ? choose(f, p.links.linkedin, "profile.links.linkedin") : optional(f);
  if (has(/github/)) return p.links.github ? choose(f, p.links.github, "profile.links.github") : optional(f);
  if (has(/portfolio|website|personal site|homepage|\burl\b/)) return p.links.portfolio || p.links.github ? choose(f, p.links.portfolio || p.links.github, "profile.links") : optional(f);
  if (has(/cover letter|anschreiben|motivation|motivatie|why do you want|warum möchten|waarom wil/) && f.tag === "textarea") return ctx.coverText ? { kind: "text", value: ctx.coverText, source: "generated cover letter" } : optional(f);
  if (has(/current (company|employer)|aktueller arbeitgeber|huidige werkgever|\borg\b|organi[sz]ation/)) return p.experience[0]?.current ? choose(f, p.experience[0].company, "profile.experience[0]") : optional(f);
  if (has(/(current )?(location|city|wohnort|stadt|woonplaats|address|adresse)/) && f.type !== "checkbox") return p.location ? choose(f, p.location, "profile.location") : optional(f);
  if (has(/salary|gehalt|salaris|compensation|vergütung/)) return p.salaryExpectationEur ? choose(f, String(p.salaryExpectationEur), "profile.salaryExpectationEur") : optional(f);
  if (has(/notice period|kündigungsfrist|opzegtermijn/)) return p.noticePeriod ? choose(f, p.noticePeriod, "profile.noticePeriod") : optional(f);
  if (has(/start date|earliest start|eintrittstermin|startdatum|available from|verfügbar ab/)) return p.earliestStart ? choose(f, p.earliestStart, "profile.earliestStart") : optional(f);
  if (has(/sponsor/)) return choose(f, yn(p.workAuthorization.requiresSponsorship), "profile.workAuthorization.requiresSponsorship");
  if (has(/authori[sz]ed to work|right to work|work permit|arbeitserlaubnis|werkvergunning|legally (allowed|eligible)|eligible to work/)) {
    const country = /netherlands|nederland|\bnl\b/.test(text) ? "NL" : /germany|deutschland|\bde\b/.test(text) ? "DE" : ctx.job.country === "NL" ? "NL" : "DE";
    const stated = p.workAuthorization.source !== "unknown" ? p.workAuthorization[country as "DE" | "NL"] : "";
    if (!stated) return { kind: "unknown", reason: `Work authorization for ${country} not confirmed in profile` };
    const answer = /^(yes|ja|true|eu citizen|eu-bürger|citizen|permanent|blue card|blaue karte|unrestricted)/i.test(stated) ? "Yes" : /^(no|nein|nee|false)/i.test(stated) ? "No" : null;
    return answer ? choose(f, answer, "profile.workAuthorization") : { kind: "unknown", reason: "Work authorization statement is not a clear yes/no" };
  }
  if (has(/relocat|umzug|verhuizen/)) return choose(f, yn(p.willingToRelocate), "profile.willingToRelocate");
  if (has(/(german|deutsch).*(level|proficien|kenntnisse|niveau)|(level|proficien|niveau).*(german|deutsch)/)) return languageAnswer(f, p, "german");
  if (has(/(english|englisch).*(level|proficien|kenntnisse|niveau)|(level|proficien|niveau).*(english|englisch)/)) return languageAnswer(f, p, "english");
  if (has(/(dutch|nederlands).*(level|proficien|niveau)|(level|proficien|niveau).*(dutch|nederlands)/)) return languageAnswer(f, p, "dutch");
  if (has(/how did you (hear|find)|wie sind sie|hoe heb je|source/)) {
    const opt = f.options.find((o) => /career|website|company site|karriere|homepage|job board|online/i.test(o));
    if (f.options.length) return opt ? { kind: f.tag === "select" ? "select" : "radio", value: opt, source: "discovery channel" } : optional(f);
    return { kind: "text", value: "Company careers website", source: "discovery channel" };
  }
  if (has(/gender|geschlecht|geslacht|race|ethnic|veteran|disabilit|hispanic|pronoun|sexual orientation|diversity/)) {
    const decline = f.options.find((o) => /decline|prefer not|don.?t wish|keine angabe|zeg ik liever niet|not to (say|disclose)|i don.?t want/i.test(o));
    if (decline) return { kind: f.tag === "select" ? "select" : "radio", value: decline, source: "voluntary self-identification declined" };
    return optional(f);
  }
  if (f.type === "checkbox" && has(/privacy|datenschutz|gdpr|dsgvo|avg|data processing|consent|einwillig|terms|agree|akkoord|zustimm/)) {
    if (has(/talent (pool|community)|future (roles|opportunities)|marketing|newsletter|keep me|zukünftige/)) return { kind: "skip", value: "", source: "optional marketing consent not given" };
    return ctx.acceptPrivacyNotices ? { kind: "checkbox", value: "true", source: "authorized: accept applicant privacy notices" } : { kind: "unknown", reason: "Privacy-notice consent requires your authorization (Settings → Automatic submission)" };
  }
  return f.required ? { kind: "unknown", reason: "No verified answer for this question" } : { kind: "skip", value: "", source: "optional, unanswered" };
}

function optional(f: FieldDescriptor): Mapped {
  return f.required ? { kind: "unknown", reason: "Required, but this fact is not in your verified profile" } : { kind: "skip", value: "", source: "optional, not in profile" };
}

function languageAnswer(f: FieldDescriptor, p: Profile, lang: string): Mapped {
  const entry = p.languages.find((l) => languageLevel({ ...p, languages: [l] }, lang) >= 0);
  if (!entry?.level) return optional(f);
  if (f.options.length) {
    const opt = pickOption(f.options, entry.level) ?? f.options.find((o) => o.toLowerCase().includes(entry.level.toLowerCase()));
    return opt ? { kind: f.tag === "select" ? "select" : "radio", value: opt, source: "profile.languages" } : { kind: "unknown", reason: `Language level "${entry.level}" does not match options` };
  }
  return { kind: "text", value: entry.level, source: "profile.languages" };
}
