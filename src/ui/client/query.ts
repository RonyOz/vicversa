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

export const TABS = ["activas", "sin-respuesta", "cerradas", "todas"] as const;
export type Tab = (typeof TABS)[number];
export const SORTS = ["reciente", "dias", "aplicada", "empresa"] as const;
export type SortKey = (typeof SORTS)[number];

export interface ListQuery {
  tab: Tab;
  q: string;
  stage: Stage | null;
  language: Language | null;
  sort: SortKey;
}

const DEFAULTS: ListQuery = { tab: "activas", q: "", stage: null, language: null, sort: "reciente" };
const STAGE_VALUES = ["applied", "assessment", "interview", "offer", "hired", "rejected", "withdrawn"];
const pickFrom = <T extends string>(allowed: readonly string[], value: string | null, fallback: T): T =>
  value !== null && allowed.includes(value) ? (value as T) : fallback;

/** The list's state lives in the URL, so a reload or a shared link shows the same view. */
export function parseQuery(params: URLSearchParams): ListQuery {
  return {
    tab: pickFrom(TABS, params.get("tab"), DEFAULTS.tab),
    q: params.get("q") ?? "",
    stage: pickFrom<Stage | "">(STAGE_VALUES, params.get("etapa"), "") || null,
    language: pickFrom<Language | "">(["es", "en"], params.get("idioma"), "") || null,
    sort: pickFrom(SORTS, params.get("orden"), DEFAULTS.sort),
  };
}

/** Query string with defaults left out; "" when everything is default. */
export function toSearch(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.tab !== DEFAULTS.tab) params.set("tab", query.tab);
  if (query.q) params.set("q", query.q);
  if (query.stage) params.set("etapa", query.stage);
  if (query.language) params.set("idioma", query.language);
  if (query.sort !== DEFAULTS.sort) params.set("orden", query.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

const TAB_STATE: Record<Exclude<Tab, "todas">, TrackSummary["state"]> = {
  activas: "active",
  "sin-respuesta": "stale",
  cerradas: "closed",
};

const inTab = (row: ListRow, tab: Tab) => tab === "todas" || row.state === TAB_STATE[tab];

export function tabCounts(rows: readonly ListRow[]): Record<Tab, number> {
  return {
    activas: rows.filter((r) => inTab(r, "activas")).length,
    "sin-respuesta": rows.filter((r) => inTab(r, "sin-respuesta")).length,
    cerradas: rows.filter((r) => inTab(r, "cerradas")).length,
    todas: rows.length,
  };
}

/** Lowercase, accents stripped: "América" and "america" match. */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const SORTERS: Record<SortKey, (a: ListRow, b: ListRow) => number> = {
  reciente: (a, b) => a.daysSince - b.daysSince,
  dias: (a, b) => b.daysSince - a.daysSince,
  aplicada: (a, b) => b.applied.localeCompare(a.applied),
  empresa: (a, b) => (a.company ?? a.name).localeCompare(b.company ?? b.name, "es"),
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
