import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { classifyLocation } from "@/core/discovery/location";
import { canonicalUrl, jobFingerprint, normalizeTitle } from "@/core/discovery/normalize";
import { parseRobots, robotsPathAllowed, htmlToText, politeFetch, setDomainMinInterval } from "@/core/discovery/http";
import { buildTitleFilter } from "@/core/discovery/types";
import { parsePersonioXml } from "@/core/discovery/sources/ats";
import { extractJsonLdJobs, jsonLdToRaw } from "@/core/discovery/sources/careersite";
import { boardFromUrl } from "@/core/discovery/registry";
import { findSkills } from "@/core/skills";
import { detectLanguage } from "@/core/discovery/ingest";

describe("location classification", () => {
  it.each([
    ["Berlin, Germany", "DE", "Berlin"],
    ["Munich", "DE", "München"],
    ["Hybrid - Köln", "DE", "Köln"],
    ["Amsterdam, Netherlands", "NL", "Amsterdam"],
    ["Den Haag", "NL", "The Hague"],
    ["Eindhoven; Remote", "NL", "Eindhoven"],
    ["Remote - Europe", "EU_REMOTE", null],
    ["Madrid, Comunidad de Madrid", null, null],
    ["Berlin, Connecticut, USA", null, null],
    ["London, UK", null, null],
  ])("%s → %s", (loc, country, city) => {
    const r = classifyLocation(loc);
    expect(r.country).toBe(country);
    expect(r.city).toBe(city);
  });

  it("uses ATS country codes and workplace hints", () => {
    expect(classifyLocation("Office", "", { countryCode: "nl" }).country).toBe("NL");
    expect(classifyLocation("Berlin", "", { workplaceType: "Hybrid" }).remotePolicy).toBe("HYBRID");
    expect(classifyLocation("Remote, Germany").remotePolicy).toBe("REMOTE");
  });
});

describe("normalization and dedup keys", () => {
  it("canonicalises URLs by dropping tracking params and fragments", () => {
    expect(canonicalUrl("http://www.Example.com/jobs/123/?utm_source=x&gh_src=abc&b=2&a=1#apply")).toBe("https://example.com/jobs/123?a=1&b=2");
  });
  it("produces the same fingerprint for the same job listed on two sources", () => {
    expect(jobFingerprint("Acme GmbH", "Frontend Developer (m/w/d)", "Berlin")).toBe(jobFingerprint("ACME", "Front-End Developer (all genders)", "berlin"));
    expect(jobFingerprint("Acme GmbH", "Frontend Developer", "Berlin")).not.toBe(jobFingerprint("Acme GmbH", "Frontend Developer", "Hamburg"));
    expect(normalizeTitle("Sr. Front-end Engineer (f/m/d)")).toBe("senior frontend engineer");
  });
});

describe("role relevance", () => {
  const f = buildTitleFilter();
  it.each([
    ["Frontend Developer", true],
    ["Senior Front-End Software Engineer", true],
    ["React Entwickler (m/w/d)", true],
    ["Frontend Ontwikkelaar", true],
    ["Webentwickler/in", true],
    ["Full Stack Developer (React/Node)", true],
    ["UI Engineer", true],
    ["Reactivation Marketing Manager", false],
    ["Account Executive DACH", false],
    ["Backend Engineer (Go)", false],
    ["Data Scientist", false],
  ])("%s → %s", (title, ok) => expect(f(title)).toBe(ok));
});

describe("skills dictionary", () => {
  it("uses boundaries so common words are not tech terms", () => {
    expect(findSkills("Reactivations and less effort, go to the rest of the team")).toEqual([]);
    expect(findSkills("We use React, Next.js, TypeScript and REST APIs; Go is a plus")).toEqual(expect.arrayContaining(["React", "Next.js", "TypeScript", "REST", "Go"]));
    expect(findSkills("JavaScript")).not.toContain("Java");
  });
});

describe("robots.txt", () => {
  it("applies the most specific rule", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/jobs\nDisallow: /*?session=\n");
    expect(robotsPathAllowed(rules, "/jobs/1")).toBe(true);
    expect(robotsPathAllowed(rules, "/private/x")).toBe(false);
    expect(robotsPathAllowed(rules, "/private/jobs/1")).toBe(true);
    expect(robotsPathAllowed(rules, "/a?session=1")).toBe(false);
  });
});

describe("source parsers", () => {
  it("parses Personio XML feeds", () => {
    const xml = `<?xml version="1.0"?><workzag-jobs><position><id>123</id><subcompany>Acme</subcompany><office>Hamburg</office><name>Frontend Developer (m/w/d)</name><createdAt>2026-10-01T10:00:00+00:00</createdAt><jobDescriptions><jobDescription><name>Your tasks</name><value><![CDATA[<p>Build <b>React</b> apps</p>]]></value></jobDescription></jobDescriptions></position></workzag-jobs>`;
    const [j] = parsePersonioXml(xml, "acme");
    expect(j).toMatchObject({ externalId: "123", company: "Acme", title: "Frontend Developer (m/w/d)", locationRaw: "Hamburg" });
    expect(j.descriptionText).toContain("Build React apps");
    expect(j.applyUrl).toContain("acme.jobs.personio.de/job/123");
  });

  it("extracts schema.org JobPosting JSON-LD, including @graph", () => {
    const html = `<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"X"},{"@type":"JobPosting","title":"React Developer","identifier":{"value":"R-9"},"hiringOrganization":{"name":"Beta B.V."},"jobLocation":{"address":{"addressLocality":"Utrecht","addressCountry":"NL"}},"description":"<p>TypeScript</p>","datePosted":"2026-10-20"}]}</script></html>`;
    const [j] = extractJsonLdJobs(html);
    const raw = jsonLdToRaw(j, "https://careers.beta.nl/jobs/r-9", "careersite:beta");
    expect(raw).toMatchObject({ title: "React Developer", company: "Beta B.V.", externalId: "R-9", locationRaw: "Utrecht, NL" });
    expect(classifyLocation(raw.locationRaw).country).toBe("NL");
  });

  it("recognises ATS boards in URLs", () => {
    expect(boardFromUrl("https://job-boards.greenhouse.io/acme/jobs/1")).toEqual({ kind: "greenhouse", slug: "acme" });
    expect(boardFromUrl("https://jobs.lever.co/acme/abc/apply")).toEqual({ kind: "lever", slug: "acme" });
    expect(boardFromUrl("https://jobs.ashbyhq.com/acme/uuid")).toEqual({ kind: "ashby", slug: "acme" });
    expect(boardFromUrl("https://acme.recruitee.com/o/frontend")).toEqual({ kind: "recruitee", slug: "acme" });
    expect(boardFromUrl("https://acme.jobs.personio.de/job/1")).toEqual({ kind: "personio", slug: "acme" });
    expect(boardFromUrl("https://example.com/careers")).toBeNull();
  });

  it("converts HTML to text and detects posting language", () => {
    expect(htmlToText("<ul><li>React</li><li>CSS &amp; HTML</li></ul>")).toBe("• React\n• CSS & HTML");
    expect(detectLanguage("Wir suchen eine Person mit Erfahrung und Leidenschaft für die Entwicklung, die bei uns im Team mit React arbeitet und für unsere Kunden")).toBe("de");
    expect(detectLanguage("Wij zoeken een developer voor ons team die met React werkt en van het bouwen houdt bij onze klanten")).toBe("nl");
    expect(detectLanguage("We are looking for a developer to join our team and work with React for our customers")).toBe("en");
  });
});

describe("polite HTTP client", () => {
  let server: http.Server;
  let base = "";
  let hits = 0;
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits++;
      if (req.url === "/flaky" && hits < 3) {
        res.writeHead(503).end();
        return;
      }
      if (req.url?.startsWith("/page")) {
        const page = Number(new URL(req.url, "http://x").searchParams.get("p"));
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data: page < 3 ? [page] : [], next: page < 3 }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }).end("{}");
    });
    await new Promise<void>((r) => server.listen(0, r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    setDomainMinInterval(0);
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("retries 5xx with backoff", async () => {
    hits = 0;
    const res = await politeFetch(`${base}/flaky`, { retries: 3 });
    expect(res.status).toBe(200);
    expect(hits).toBe(3);
  });

  it("follows pagination until exhausted", async () => {
    const all: number[] = [];
    for (let p = 1; ; p++) {
      const body = (await (await politeFetch(`${base}/page?p=${p}`)).json()) as { data: number[]; next: boolean };
      all.push(...body.data);
      if (!body.next) break;
    }
    expect(all).toEqual([1, 2]);
  });

  it("throttles requests per domain", async () => {
    setDomainMinInterval(200);
    const t = Date.now();
    await Promise.all([politeFetch(`${base}/a`), politeFetch(`${base}/b`), politeFetch(`${base}/c`)]);
    expect(Date.now() - t).toBeGreaterThanOrEqual(380);
    setDomainMinInterval(0);
  });
});
