export const DE_CITIES = [
  "Berlin", "Hamburg", "München", "Munich", "Köln", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dusseldorf", "Dortmund", "Essen", "Leipzig",
  "Bremen", "Dresden", "Hannover", "Hanover", "Nürnberg", "Nuremberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Munster",
  "Karlsruhe", "Mannheim", "Augsburg", "Wiesbaden", "Mönchengladbach", "Gelsenkirchen", "Aachen", "Braunschweig", "Kiel", "Chemnitz", "Halle",
  "Magdeburg", "Freiburg", "Krefeld", "Mainz", "Lübeck", "Erfurt", "Oberhausen", "Rostock", "Kassel", "Hagen", "Potsdam", "Saarbrücken", "Hamm",
  "Ludwigshafen", "Oldenburg", "Mülheim", "Osnabrück", "Leverkusen", "Heidelberg", "Darmstadt", "Solingen", "Regensburg", "Herne", "Paderborn",
  "Neuss", "Ingolstadt", "Offenbach", "Fürth", "Würzburg", "Ulm", "Heilbronn", "Pforzheim", "Wolfsburg", "Göttingen", "Bottrop", "Reutlingen",
  "Koblenz", "Bremerhaven", "Erlangen", "Bergisch Gladbach", "Trier", "Jena", "Remscheid", "Siegen", "Hildesheim", "Salzgitter", "Gütersloh",
  "Kaiserslautern", "Schwerin", "Cottbus", "Witten", "Esslingen", "Gera", "Iserlohn", "Tübingen", "Flensburg", "Konstanz", "Walldorf", "Ratingen",
  "Eschborn", "Unterföhring", "Garching", "Herzogenaurach", "Gütersloh", "Lüneburg", "Bamberg", "Bayreuth", "Passau", "Landshut", "Rosenheim",
];

export const DE_STATES = [
  "Baden-Württemberg", "Bayern", "Bavaria", "Brandenburg", "Hessen", "Hesse", "Mecklenburg-Vorpommern", "Niedersachsen", "Lower Saxony",
  "Nordrhein-Westfalen", "North Rhine-Westphalia", "NRW", "Rheinland-Pfalz", "Rhineland-Palatinate", "Saarland", "Sachsen", "Saxony",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen", "Thuringia",
];

export const NL_CITIES = [
  "Amsterdam", "Rotterdam", "Utrecht", "The Hague", "Den Haag", "'s-Gravenhage", "Eindhoven", "Delft", "Leiden", "Haarlem", "Groningen", "Tilburg",
  "Breda", "Nijmegen", "Arnhem", "Enschede", "Maastricht", "Almere", "Amersfoort", "Zwolle", "Apeldoorn", "Zaandam", "Zaanstad", "Hilversum",
  "Den Bosch", "'s-Hertogenbosch", "Leeuwarden", "Dordrecht", "Zoetermeer", "Ede", "Emmen", "Venlo", "Deventer", "Alkmaar", "Hoofddorp",
  "Amstelveen", "Schiphol", "Rijswijk", "Diemen", "Capelle aan den IJssel", "Nieuwegein", "Veenendaal", "Helmond", "Oss", "Roosendaal", "Gouda",
  "Hengelo", "Purmerend", "Schiedam", "Lelystad", "Wageningen", "Heerlen", "Sittard", "Assen", "Veldhoven", "Best", "Houten", "Woerden",
];

export const NL_PROVINCES = [
  "Noord-Holland", "North Holland", "Zuid-Holland", "South Holland", "Utrecht", "Noord-Brabant", "North Brabant", "Gelderland", "Overijssel",
  "Limburg", "Friesland", "Fryslân", "Groningen", "Drenthe", "Flevoland", "Zeeland",
];

export type Country = "DE" | "NL" | "EU_REMOTE";
export type RemotePolicy = "ONSITE" | "HYBRID" | "REMOTE" | "UNKNOWN";

function re(words: string[]) {
  return new RegExp(`(?<![\\p{L}])(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")).join("|")})(?![\\p{L}])`, "iu");
}

const DE_NAME_RE = re(["Germany", "Deutschland", "Duitsland", "Allemagne", ...DE_STATES.filter((s) => s !== "NRW")]);
const NL_NAME_RE = re(["Netherlands", "The Netherlands", "Nederland", "Niederlande", ...NL_PROVINCES.filter((p) => p !== "Utrecht" && p !== "Groningen" && p !== "Limburg")]);
const DE_CODE_RE = /(?<![\p{L}])(DE|DEU|NRW)(?![\p{L}])/u;
const NL_CODE_RE = /(?<![\p{L}])(NL|NLD)(?![\p{L}])/u;
const DE_RE = { test: (s: string) => DE_NAME_RE.test(s) || DE_CODE_RE.test(s) };
const NL_RE = { test: (s: string) => NL_NAME_RE.test(s) || NL_CODE_RE.test(s) };
const DE_CITY_RE = re(DE_CITIES);
const NL_CITY_RE = re(NL_CITIES);
const EU_REMOTE_RE = /\b(remote|anywhere)\b[^,;]*\b(europe|emea|eu|european union|cet|cest)\b|\b(europe|emea|eu)\b[^,;]*\bremote\b/i;
// Locations that clearly belong elsewhere even though a DE/NL city name collides.
const FOREIGN_RE = /\b(USA|United States|U\.S\.|Canada|Ontario|Texas|Brazil|India|Michigan|Pennsylvania|Kentucky|Minnesota|Arkansas|Belgium|Belgique|Limburg, BE)\b/i;

export interface LocationInfo {
  country: Country | null;
  city: string | null;
  remotePolicy: RemotePolicy;
}

export function classifyLocation(locationRaw: string, extra = "", hints: { countryCode?: string | null; remote?: boolean | null; workplaceType?: string | null } = {}): LocationInfo {
  const loc = locationRaw || "";
  const cc = hints.countryCode?.toUpperCase();
  let country: Country | null = null;
  if (cc === "DE" || cc === "DEU") country = "DE";
  else if (cc === "NL" || cc === "NLD") country = "NL";

  const deCity = loc.match(DE_CITY_RE)?.[1] ?? null;
  const nlCity = loc.match(NL_CITY_RE)?.[1] ?? null;
  const foreign = FOREIGN_RE.test(loc);
  if (!country) {
    if (DE_RE.test(loc) || (deCity && !foreign)) country = "DE";
    else if (NL_RE.test(loc) || (nlCity && !foreign)) country = "NL";
  }
  // A list like "Berlin, London, Paris" still counts; cross-check both countries.
  if (!country && !cc && EU_REMOTE_RE.test(loc)) country = "EU_REMOTE";

  const blob = `${loc} ${hints.workplaceType ?? ""} ${extra.slice(0, 3000)}`;
  let remotePolicy: RemotePolicy = "UNKNOWN";
  const wt = (hints.workplaceType ?? "").toLowerCase();
  if (wt.includes("hybrid")) remotePolicy = "HYBRID";
  else if (wt.includes("remote") || hints.remote === true) remotePolicy = "REMOTE";
  else if (wt.includes("on") && wt.includes("site")) remotePolicy = "ONSITE";
  else if (/\bhybrid\b|hybride/i.test(blob)) remotePolicy = "HYBRID";
  else if (/\b(fully remote|100% remote|remote[- ]first|remote only|vollständig remote|volledig op afstand)\b/i.test(blob) || /\bremote\b/i.test(loc)) remotePolicy = "REMOTE";
  else if (/\b(on[- ]?site|in[- ]office|vor ort|op kantoor)\b/i.test(blob)) remotePolicy = "ONSITE";

  const city = country === "DE" ? deCity : country === "NL" ? nlCity : null;
  return { country, city: city ? canonicalCity(city) : null, remotePolicy };
}

function canonicalCity(c: string): string {
  const map: Record<string, string> = { munich: "München", cologne: "Köln", dusseldorf: "Düsseldorf", nuremberg: "Nürnberg", hanover: "Hannover", munster: "Münster", "den haag": "The Hague", "'s-gravenhage": "The Hague", "'s-hertogenbosch": "Den Bosch" };
  return map[c.toLowerCase()] ?? c;
}
