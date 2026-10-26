export interface RawJob {
  sourceId: string;
  externalId: string;
  url: string;
  applyUrl: string | null;
  company: string;
  title: string;
  locationRaw: string;
  descriptionText: string;
  postedAt: Date | null;
  atsKind: string | null;
  countryCode?: string | null;
  remote?: boolean | null;
  workplaceType?: string | null;
}

export interface DiscoveryContext {
  searchTerms: string[];
  isRelevantTitle: (title: string) => boolean;
  log: (msg: string, data?: Record<string, unknown>) => void;
  shouldStop: () => Promise<boolean>;
}

export interface SourceResult {
  jobs: RawJob[];
  fetched: number;
  coverage: "OK" | "PARTIAL" | "BLOCKED" | "ERROR" | "EMPTY";
  notes?: string;
}

export interface SourceAdapter {
  id: string;
  kind: string;
  name: string;
  discover(ctx: DiscoveryContext): Promise<SourceResult>;
}

const STRONG = [
  /front[\s-]?end/i,
  /\breact(?:\.?js)?\b(?!ivat)/i,
  /\bnext\.?js\b/i,
  /\bvue(?:\.?js)?\b/i,
  /\bangular\b/i,
  /\bsvelte\b/i,
  /\btypescript\b/i,
  /\bjavascript\b/i,
  /\bweb\s?(developer|engineer|entwickler(?:\/?in)?|ontwikkelaar|application)/i,
  /\bwebentwickler/i,
  /\bwebontwikkelaar/i,
  /\bui\s?(engineer|developer|entwickler|ontwikkelaar)/i,
  /\bfull[\s-]?stack/i,
  /\bdesign systems? engineer/i,
];

const NEGATIVE = /\b(sales|account (executive|manager)|recruit|marketing|designer|product manager|data scientist|analyst|accountant|legal|counsel|hr\b|people partner|customer success|support specialist)\b/i;

/** Broad relevance gate applied at discovery. Matching applies the precise eligibility rules later. */
export function buildTitleFilter(extraTerms: string[] = []) {
  const extra = extraTerms
    .map((t) => t.trim())
    .filter((t) => t.length > 3)
    .map((t) => new RegExp(`(?<![\\p{L}])${t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(/\s+/g, "[\\s-]?")}(?![\\p{L}])`, "iu"));
  return (title: string) => {
    if (NEGATIVE.test(title) && !/engineer|developer|entwickler|ontwikkelaar/i.test(title)) return false;
    return STRONG.some((r) => r.test(title)) || extra.some((r) => r.test(title));
  };
}

export const DEFAULT_SEARCH_TERMS = ["frontend", "front end", "react", "typescript", "javascript", "web developer", "full stack", "vue", "angular", "frontend entwickler", "webentwickler", "frontend ontwikkelaar"];
