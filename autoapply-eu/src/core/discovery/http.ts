const USER_AGENT = "AutoApplyEU/0.1 (personal job search assistant; respects robots.txt)";

const lastHit = new Map<string, number>();
let minIntervalMs = 1500;

export function setDomainMinInterval(ms: number) {
  minIntervalMs = ms;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle(host: string) {
  // Reserve the slot synchronously so concurrent callers queue behind each other.
  const now = Date.now();
  const prev = lastHit.get(host) ?? 0;
  const at = Math.max(now, prev + minIntervalMs);
  lastHit.set(host, at);
  if (at > now) await sleep(at - now);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`HTTP ${status} for ${new URL(url).host}${new URL(url).pathname}`);
  }
}

export interface FetchOpts extends RequestInit {
  retries?: number;
  timeoutMs?: number;
  checkRobots?: boolean;
}

export async function politeFetch(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { retries = 3, timeoutMs = 30_000, checkRobots = false, ...init } = opts;
  const u = new URL(url);
  if (checkRobots && !(await robotsAllowed(url))) throw new RobotsDisallowedError(url);
  let attempt = 0;
  for (;;) {
    await throttle(u.host);
    let res: Response | undefined;
    let err: unknown;
    try {
      res = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, accept: "application/json, text/html;q=0.9, */*;q=0.5", ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      err = e;
    }
    const retriable = !res || res.status === 429 || res.status >= 500;
    if (res && !retriable) {
      if (!res.ok) throw new HttpError(res.status, url);
      return res;
    }
    if (attempt >= retries) {
      if (res) throw new HttpError(res.status, url);
      throw err instanceof Error ? err : new Error(String(err));
    }
    const retryAfter = Number(res?.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt + Math.random() * 250;
    await sleep(Math.min(backoff, 60_000));
    attempt++;
  }
}

export async function getJson<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  return (await (await politeFetch(url, opts)).json()) as T;
}

export class RobotsDisallowedError extends Error {
  constructor(public url: string) {
    super(`robots.txt disallows ${url}`);
  }
}

const robotsCache = new Map<string, { rules: { allow: boolean; path: string }[]; at: number }>();

export function parseRobots(txt: string, agent = "autoapplyeu"): { allow: boolean; path: string }[] {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split("\n")) {
    const line = rawLine.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m;
    const key = k.toLowerCase();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === "allow" || key === "disallow")) cur.rules.push({ allow: key === "allow", path: v });
    }
  }
  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && agent.includes(a)));
  return (specific ?? groups.find((g) => g.agents.includes("*")))?.rules ?? [];
}

export function robotsPathAllowed(rules: { allow: boolean; path: string }[], pathname: string): boolean {
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!r.path) continue;
    const re = new RegExp("^" + r.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(pathname) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) best = { allow: r.allow, len: r.path.length };
  }
  return best ? best.allow : true;
}

export async function robotsAllowed(url: string): Promise<boolean> {
  const u = new URL(url);
  const cached = robotsCache.get(u.origin);
  let rules = cached && Date.now() - cached.at < 6 * 3600_000 ? cached.rules : undefined;
  if (!rules) {
    try {
      const res = await fetch(`${u.origin}/robots.txt`, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
      rules = res.ok ? parseRobots(await res.text()) : [];
    } catch {
      rules = [];
    }
    robotsCache.set(u.origin, { rules, at: Date.now() });
  }
  return robotsPathAllowed(rules, u.pathname + u.search);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}
