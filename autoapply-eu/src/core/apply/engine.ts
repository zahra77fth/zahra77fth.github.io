import type { Page } from "playwright";
import type { ManualReason } from "@prisma/client";
import { mapField, type FieldDescriptor, type MapContext, type Mapped } from "./fields";

export interface Adapter {
  kind: string;
  matches(url: URL): boolean;
  supported: boolean;
  unsupportedReason?: { reason: ManualReason; detail: string };
  /** Brings the browser to the first step of the application form. */
  open(page: Page, applyUrl: string): Promise<void>;
  formSelector: string;
}

async function gotoAndSettle(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function clickApplyIfPresent(page: Page) {
  const btn = page.getByRole("button", { name: /^(apply( now| for this job)?|jetzt bewerben|bewerben|solliciteer( nu)?|apply to this job)$/i }).or(page.getByRole("link", { name: /^(apply( now| for this job)?|jetzt bewerben|bewerben|solliciteer( nu)?)$/i }));
  if (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  }
}

export const ADAPTERS: Adapter[] = [
  {
    kind: "greenhouse",
    supported: true,
    matches: (u) => /(^|\.)greenhouse\.io$/.test(u.hostname),
    formSelector: "form#application-form, form#application_form, form[action*='applications'], form",
    async open(page, url) {
      await gotoAndSettle(page, url);
      await clickApplyIfPresent(page);
    },
  },
  {
    kind: "lever",
    supported: true,
    matches: (u) => /^jobs(\.eu)?\.lever\.co$/.test(u.hostname),
    formSelector: "form#application-form, form[action*='apply'], form",
    async open(page, url) {
      await gotoAndSettle(page, /\/apply\/?$/.test(new URL(url).pathname) ? url : `${url.replace(/\/$/, "")}/apply`);
    },
  },
  {
    kind: "ashby",
    supported: true,
    matches: (u) => u.hostname === "jobs.ashbyhq.com",
    formSelector: "form, [class*='application-form']",
    async open(page, url) {
      await gotoAndSettle(page, /\/application\/?$/.test(new URL(url).pathname) ? url : `${url.replace(/\/$/, "")}/application`);
    },
  },
  {
    kind: "recruitee",
    supported: true,
    matches: (u) => /\.recruitee\.com$/.test(u.hostname),
    formSelector: "form",
    async open(page, url) {
      await gotoAndSettle(page, url);
      await clickApplyIfPresent(page);
    },
  },
  {
    kind: "personio",
    supported: true,
    matches: (u) => /\.jobs\.personio\.(de|com)$/.test(u.hostname),
    formSelector: "form",
    async open(page, url) {
      await gotoAndSettle(page, url);
      await clickApplyIfPresent(page);
    },
  },
  {
    kind: "workday",
    supported: false,
    unsupportedReason: { reason: "LOGIN_REQUIRED", detail: "Workday requires creating a candidate account with email verification for each employer." },
    matches: (u) => /myworkdayjobs\.com$|myworkday\.com$/.test(u.hostname),
    formSelector: "form",
    open: async () => undefined,
  },
  {
    kind: "smartrecruiters",
    supported: false,
    unsupportedReason: { reason: "UNSUPPORTED_ATS", detail: "SmartRecruiters applications run in a protected one-click flow that is not automated." },
    matches: (u) => /smartrecruiters\.com$/.test(u.hostname),
    formSelector: "form",
    open: async () => undefined,
  },
  {
    kind: "aggregator",
    supported: false,
    unsupportedReason: { reason: "UNSUPPORTED_ATS", detail: "Listing is on a job board; the employer's own application form must be opened manually." },
    matches: (u) => /(arbeitnow\.com|arbeitsagentur\.de|linkedin\.com|indeed\.|stepstone\.|xing\.com|glassdoor\.|welcometothejungle\.com|wellfound\.com)$/.test(u.hostname),
    formSelector: "form",
    open: async () => undefined,
  },
];

export const GENERIC: Adapter = {
  kind: "generic",
  supported: true,
  matches: () => true,
  formSelector: "form",
  async open(page, url) {
    await gotoAndSettle(page, url);
    await clickApplyIfPresent(page);
  },
};

export function adapterFor(url: string): Adapter {
  const u = new URL(url);
  return ADAPTERS.find((a) => a.matches(u)) ?? GENERIC;
}

export type Blocker = { reason: ManualReason; detail: string } | null;

export async function detectBlocker(page: Page): Promise<Blocker> {
  const frames = page.frames().map((f) => f.url());
  const visibleChallenge = await page
    .locator("iframe[src*='recaptcha/api2/bframe'], iframe[src*='recaptcha/enterprise/bframe'], iframe[src*='hcaptcha.com'][src*='challenge'], iframe[src*='challenges.cloudflare.com'], .g-recaptcha:not([data-size='invisible']), .h-captcha, [data-sitekey]:not([data-size='invisible'])")
    .first()
    .isVisible()
    .catch(() => false);
  if (visibleChallenge || frames.some((f) => /challenges\.cloudflare\.com|captcha-delivery|perimeterx|px-captcha/.test(f))) return { reason: "CAPTCHA", detail: "A CAPTCHA / human-verification challenge is shown. It is never bypassed." };
  const body = (await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")).slice(0, 20_000);
  if (/verify (that )?you are (a )?human|are you a robot|checking your browser|ich bin kein roboter|access denied/i.test(body)) return { reason: "HUMAN_VERIFICATION", detail: "The site requires human verification." };
  if (/verification code|one-time (pass)?code|two-factor|2fa|bestätigungscode|verificatiecode/i.test(body) && (await page.locator("input[autocomplete='one-time-code'], input[name*='otp' i], input[name*='code' i]").count()) > 0) return { reason: "MFA", detail: "The site asks for a verification code (MFA)." };
  const pwd = await page.locator("input[type='password']").first().isVisible().catch(() => false);
  if (pwd) return { reason: "LOGIN_REQUIRED", detail: "The application requires signing in or creating an account." };
  return null;
}

/** Collects visible form controls, tagging each with a stable data attribute for later filling. */
export async function collectFields(page: Page, formSelector: string): Promise<FieldDescriptor[]> {
  return page.evaluate((sel) => {
    const forms = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
    const root = forms.sort((a, b) => b.querySelectorAll("input,select,textarea").length - a.querySelectorAll("input,select,textarea").length)[0] ?? document.body;
    const visible = (el: Element) => {
      const h = el as HTMLElement;
      if (h.getAttribute("type") === "file") return true;
      const r = h.getBoundingClientRect();
      const st = getComputedStyle(h);
      return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
    };
    const labelFor = (el: HTMLElement): string => {
      const id = el.id;
      const parts: string[] = [];
      if (id) {
        const l = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (l) parts.push(l.textContent ?? "");
      }
      const wrap = el.closest("label");
      if (wrap && !parts.length) parts.push(wrap.textContent ?? "");
      const al = el.getAttribute("aria-label");
      if (al) parts.push(al);
      const lb = el.getAttribute("aria-labelledby");
      if (lb) parts.push(lb.split(/\s+/).map((x) => document.getElementById(x)?.textContent ?? "").join(" "));
      if (!parts.join("").trim()) {
        const fs = el.closest("fieldset")?.querySelector("legend");
        if (fs) parts.push(fs.textContent ?? "");
      }
      if (!parts.join("").trim()) {
        const container = el.closest("div, li, p");
        const lab = container?.querySelector("label, .label, [class*='label']");
        if (lab) parts.push(lab.textContent ?? "");
      }
      if (!parts.join("").trim() && el.getAttribute("placeholder")) parts.push(el.getAttribute("placeholder") ?? "");
      return parts.join(" ").replace(/\s+/g, " ").trim();
    };
    const out: {
      key: string;
      tag: "input" | "select" | "textarea";
      type: string;
      label: string;
      name: string;
      required: boolean;
      options: string[];
      autocomplete: string;
      accept?: string;
    }[] = [];
    const radioGroups = new Set<string>();
    let n = 0;
    for (const el of Array.from(root.querySelectorAll("input, select, textarea")) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[]) {
      const type = (el.getAttribute("type") || (el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : "text")).toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;
      if (!visible(el) && type !== "radio" && type !== "checkbox") continue;
      if (el.disabled) continue;
      const name = el.getAttribute("name") || el.id || "";
      if (type === "radio") {
        if (radioGroups.has(name)) continue;
        radioGroups.add(name);
        const group = Array.from(root.querySelectorAll(`input[type=radio][name="${CSS.escape(name)}"]`)) as HTMLInputElement[];
        const key = `aa-${n++}`;
        group.forEach((r, i) => r.setAttribute("data-aa", `${key}-${i}`));
        const legend = el.closest("fieldset")?.querySelector("legend")?.textContent ?? el.closest("[role=radiogroup]")?.getAttribute("aria-label") ?? "";
        const groupLabel = (legend || el.closest("div")?.parentElement?.querySelector("label, .label")?.textContent || name).replace(/\s+/g, " ").trim();
        out.push({
          key,
          tag: "input",
          type: "radio",
          label: groupLabel,
          name,
          required: group.some((r) => r.required || r.getAttribute("aria-required") === "true") || /\*/.test(groupLabel),
          options: group.map((r) => labelFor(r) || r.value),
          autocomplete: "",
        });
        continue;
      }
      const key = `aa-${n++}`;
      el.setAttribute("data-aa", key);
      const label = labelFor(el);
      out.push({
        key,
        tag: el.tagName.toLowerCase() as "input" | "select" | "textarea",
        type,
        label,
        name,
        required: el.required || el.getAttribute("aria-required") === "true" || /\*\s*$|\*\s/.test(label),
        options: el.tagName === "SELECT" ? Array.from((el as HTMLSelectElement).options).filter((o) => o.value !== "").map((o) => o.textContent?.trim() ?? "") : [],
        autocomplete: el.getAttribute("autocomplete") || "",
        accept: el.getAttribute("accept") || undefined,
      });
    }
    return out;
  }, formSelector);
}

export async function fillField(page: Page, f: FieldDescriptor, m: Mapped) {
  if (m.kind === "skip" || m.kind === "unknown") return;
  if (m.kind === "radio") {
    const idx = f.options.indexOf(m.value);
    await page.locator(`[data-aa="${f.key}-${idx}"]`).check({ force: true });
    return;
  }
  const loc = page.locator(`[data-aa="${f.key}"]`);
  if (m.kind === "file") await loc.setInputFiles(m.value);
  else if (m.kind === "select") await loc.selectOption({ label: m.value });
  else if (m.kind === "checkbox") await loc.check({ force: true });
  else if (f.type === "date") await loc.fill(m.value.slice(0, 10));
  else await loc.fill(m.value);
}

const NEXT = /^(next|continue|weiter|volgende|verder|save (and|&) continue|nächster schritt|fortfahren)$/i;
const SUBMIT = /^(submit( application)?|send( application)?|apply|apply now|bewerbung (absenden|senden|abschicken)|absenden|jetzt bewerben|solliciteer|verstuur|versturen|verzenden|sollicitatie versturen)$/i;

async function findButton(page: Page, re: RegExp) {
  const candidates = page.locator("button, input[type=submit], [role=button]");
  const count = await candidates.count();
  for (let i = 0; i < count; i++) {
    const el = candidates.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const text = ((await el.innerText().catch(() => "")) || (await el.getAttribute("value")) || (await el.getAttribute("aria-label")) || "").trim();
    if (re.test(text)) return el;
  }
  return null;
}

const CONFIRM_TEXT = /(thank(s| you) for (your )?appl(ying|ication)|application (has been |was )?(received|submitted|sent)|we('ve| have) received your application|successfully (submitted|applied)|vielen dank für ihre bewerbung|ihre bewerbung (wurde|ist) (erfolgreich )?(eingegangen|übermittelt|versendet)|bedankt voor (je|uw) sollicitatie|(je|uw) sollicitatie is (verzonden|ontvangen))/i;
const CONFIRM_URL = /(confirmation|thank[-_]?you|success|submitted|bestaetigung|bedankt)/i;
const REF = /(?:reference|application|bewerbungs|referentie)[\s-]*(?:id|number|nummer|nr\.?|#)\s*[:#]?\s*([A-Z0-9-]{4,})/i;

export interface Evidence {
  url: string;
  confirmationText: string | null;
  urlMatched: boolean;
  reference: string | null;
  formStillPresent: boolean;
  validationErrors: string[];
}

export async function inspectOutcome(page: Page, formSelector: string, startUrl: string): Promise<Evidence> {
  const body = (await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")).slice(0, 50_000);
  const confirmation = body.match(CONFIRM_TEXT)?.[0] ?? null;
  const url = page.url();
  const formStillPresent = (await page.locator(`${formSelector.split(",")[0]} input[type=file], ${formSelector.split(",")[0]} input[type=email]`).count().catch(() => 0)) > 0;
  const validationErrors = await page
    .locator("[aria-invalid='true'], .error:visible, .field-error:visible, [role=alert]:visible, .invalid-feedback:visible")
    .allInnerTexts()
    .catch(() => [] as string[]);
  return {
    url,
    confirmationText: confirmation,
    urlMatched: url !== startUrl && CONFIRM_URL.test(new URL(url).pathname + new URL(url).search),
    reference: body.match(REF)?.[1] ?? null,
    formStillPresent,
    validationErrors: validationErrors.map((t) => t.trim()).filter(Boolean).slice(0, 10),
  };
}

export type EngineOutcome =
  | { outcome: "SUBMITTED"; evidence: Evidence; log: StepLog[] }
  | { outcome: "UNCERTAIN"; evidence: Evidence; log: StepLog[]; detail: string }
  | { outcome: "READY_NOT_SUBMITTED"; log: StepLog[] }
  | { outcome: "BLOCKED"; reason: ManualReason; detail: string; log: StepLog[]; unknownQuestions?: { label: string; reason: string; options: string[] }[]; submitAttempted?: boolean }
  | { outcome: "ERROR"; detail: string; log: StepLog[]; submitAttempted: boolean };

export interface StepLog {
  step: number;
  fields: { label: string; type: string; required: boolean; filled: boolean; source?: string; reason?: string }[];
  action: string;
}

export interface EngineOptions {
  page: Page;
  applyUrl: string;
  ctx: MapContext;
  autoSubmit: boolean;
  /** Persists that a submit click is about to happen; must resolve before the click. */
  beforeSubmitClick: () => Promise<void>;
  shouldStop: () => Promise<boolean>;
  maxSteps?: number;
}

export async function runApplication(o: EngineOptions): Promise<EngineOutcome> {
  const { page } = o;
  const adapter = adapterFor(o.applyUrl);
  const log: StepLog[] = [];
  if (!adapter.supported) return { outcome: "BLOCKED", reason: adapter.unsupportedReason!.reason, detail: adapter.unsupportedReason!.detail, log };
  let submitAttempted = false;
  try {
    await adapter.open(page, o.applyUrl);
    const startUrl = page.url();
    for (let step = 1; step <= (o.maxSteps ?? 10); step++) {
      const blocker = await detectBlocker(page);
      if (blocker) return { outcome: "BLOCKED", ...blocker, log };
      const fields = await collectFields(page, adapter.formSelector);
      if (!fields.length && step === 1) return { outcome: "BLOCKED", reason: "UNSUPPORTED_ATS", detail: "No application form found on the page.", log };
      const entry: StepLog = { step, fields: [], action: "" };
      log.push(entry);
      const unknown: { label: string; reason: string; options: string[] }[] = [];
      for (const f of fields) {
        const m = mapField(f, o.ctx);
        if (m.kind === "unknown") {
          if (f.required) unknown.push({ label: f.label || f.name, reason: m.reason, options: f.options });
          entry.fields.push({ label: f.label, type: f.type, required: f.required, filled: false, reason: m.reason });
          continue;
        }
        await fillField(page, f, m);
        entry.fields.push({ label: f.label, type: f.type, required: f.required, filled: m.kind !== "skip", source: m.source });
      }
      if (unknown.length) {
        entry.action = "stopped: unanswered required questions";
        const missingFacts = unknown.filter((u) => /not in your verified profile|not confirmed in profile/.test(u.reason));
        return {
          outcome: "BLOCKED",
          reason: missingFacts.length === unknown.length ? "MISSING_CANDIDATE_INFO" : "UNKNOWN_SCREENING_QUESTION",
          detail: `Unanswered required question(s): ${unknown.map((u) => u.label).join("; ")}`,
          unknownQuestions: unknown,
          log,
        };
      }
      const next = await findButton(page, NEXT);
      if (next) {
        entry.action = "next step";
        await next.click();
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
        await page.waitForTimeout(300);
        continue;
      }
      const submit = await findButton(page, SUBMIT);
      if (!submit) return { outcome: "BLOCKED", reason: "AUTOMATION_FAILURE", detail: "Could not find the submit button.", log };
      const invalid = await page.locator(`[data-aa][required]`).evaluateAll((els) => els.filter((e) => !(e as HTMLInputElement).checkValidity()).map((e) => e.getAttribute("name") || e.id));
      if (invalid.length) return { outcome: "BLOCKED", reason: "AUTOMATION_FAILURE", detail: `Form validation failed before submit: ${invalid.join(", ")}`, log };
      if (!o.autoSubmit) {
        entry.action = "ready; automatic submission disabled";
        return { outcome: "READY_NOT_SUBMITTED", log };
      }
      if (await o.shouldStop()) return { outcome: "BLOCKED", reason: "AUTOMATION_FAILURE", detail: "Emergency stop engaged before submission.", log };
      await o.beforeSubmitClick();
      submitAttempted = true;
      entry.action = "submit clicked";
      await Promise.all([page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined), submit.click()]);
      await page.waitForTimeout(1500);
      const evidence = await inspectOutcome(page, adapter.formSelector, startUrl);
      if (evidence.confirmationText || (evidence.urlMatched && !evidence.formStillPresent)) return { outcome: "SUBMITTED", evidence, log };
      const after = await detectBlocker(page);
      if (after) return { outcome: "BLOCKED", ...after, detail: `${after.detail} Appeared after clicking submit; the form was not confirmed.`, log, submitAttempted: true };
      if (evidence.formStillPresent && evidence.validationErrors.length) return { outcome: "BLOCKED", reason: "AUTOMATION_FAILURE", detail: `Form rejected submission: ${evidence.validationErrors.join("; ")}`, log, submitAttempted: true };
      return { outcome: "UNCERTAIN", evidence, log, detail: "Submit was clicked but no confirmation page or message was detected." };
    }
    return { outcome: "BLOCKED", reason: "AUTOMATION_FAILURE", detail: "Too many form steps.", log };
  } catch (e) {
    return { outcome: "ERROR", detail: e instanceof Error ? e.message.split("\n")[0] : String(e), log, submitAttempted };
  }
}
