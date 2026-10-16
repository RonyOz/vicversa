import type { Language, Stage, TrackingEvent } from "../../schema.js";
import type { TrackSummary } from "../../tracking.js";

/** One tracked application as the list shows it (GET /api/dashboard rows). */
export type ListRow = TrackSummary & {
  events: TrackingEvent[];
  /** Date of the first "applied" event. */
  applied: string;
  language: Language;
  url: string | null;
};

export const TABS = ["active", "stale", "closed", "all"] as const;
export type Tab = (typeof TABS)[number];
export const SORTS = ["recent", "waiting", "applied", "company"] as const;
export type SortKey = (typeof SORTS)[number];

export interface ListQuery {
  tab: Tab;
  q: string;
  stage: Stage | null;
  language: Language | null;
  sort: SortKey;
}

const DEFAULTS: ListQuery = { tab: "active", q: "", stage: null, language: null, sort: "recent" };
const STAGE_VALUES = ["applied", "assessment", "interview", "offer", "hired", "rejected", "withdrawn"];
const pickFrom = <T extends string>(allowed: readonly string[], value: string | null, fallback: T): T =>
  value !== null && allowed.includes(value) ? (value as T) : fallback;

/** The list's state lives in the URL, so a reload or a shared link shows the same view. */
export function parseQuery(params: URLSearchParams): ListQuery {
  return {
    tab: pickFrom(TABS, params.get("tab"), DEFAULTS.tab),
    q: params.get("q") ?? "",
    stage: pickFrom<Stage | "">(STAGE_VALUES, params.get("stage"), "") || null,
    language: pickFrom<Language | "">(["es", "en"], params.get("lang"), "") || null,
    sort: pickFrom(SORTS, params.get("sort"), DEFAULTS.sort),
  };
}

/** Query string with defaults left out; "" when everything is default. */
export function toSearch(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.tab !== DEFAULTS.tab) params.set("tab", query.tab);
  if (query.q) params.set("q", query.q);
  if (query.stage) params.set("stage", query.stage);
  if (query.language) params.set("lang", query.language);
  if (query.sort !== DEFAULTS.sort) params.set("sort", query.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

const TAB_STATE: Record<Exclude<Tab, "all">, TrackSummary["state"]> = {
  active: "active",
  stale: "stale",
  closed: "closed",
};

const inTab = (row: ListRow, tab: Tab) => tab === "all" || row.state === TAB_STATE[tab];

export function tabCounts(rows: readonly ListRow[]): Record<Tab, number> {
  return {
    active: rows.filter((r) => inTab(r, "active")).length,
    stale: rows.filter((r) => inTab(r, "stale")).length,
    closed: rows.filter((r) => inTab(r, "closed")).length,
    all: rows.length,
  };
}

/** Lowercase, accents stripped: "América" and "america" match. */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const SORTERS: Record<SortKey, (a: ListRow, b: ListRow) => number> = {
  recent: (a, b) => a.daysSince - b.daysSince,
  waiting: (a, b) => b.daysSince - a.daysSince,
  applied: (a, b) => b.applied.localeCompare(a.applied),
  company: (a, b) => (a.company ?? a.name).localeCompare(b.company ?? b.name),
};

export function applyQuery(rows: readonly ListRow[], query: ListQuery): ListRow[] {
  const words = fold(query.q).split(/\s+/).filter(Boolean);
  return rows
    .filter((row) => inTab(row, query.tab))
    .filter((row) => !query.stage || row.stage === query.stage)
    .filter((row) => !query.language || row.language === query.language)
    .filter((row) => {
      if (words.length === 0) return true;
      const haystack = fold(`${row.name} ${row.company ?? ""} ${row.role ?? ""}`);
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => SORTERS[query.sort](a, b) || a.name.localeCompare(b.name));
}
