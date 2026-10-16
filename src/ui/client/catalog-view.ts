import type {
  Certification, Education, Experience, Language, Localized, Project, Skill, SkillGroup, Summary,
} from "../../schema.js";
import type { State } from "../../tracking.js";
import type { PieceKind, UsageIndex } from "../../usage.js";
import type { MessageKey } from "./i18n.js";

/** GET /api/catalog, typed for the client. */
export interface Explorer {
  catalog: {
    summaries: Summary[];
    experiences: Experience[];
    projects: Project[];
    certifications: Certification[];
    education: Education[];
    skills: { skills: Skill[]; groups: SkillGroup[] };
  };
  usage: UsageIndex;
  apps: Record<string, { company: string | null; role: string | null; language: Language; tracked: boolean; state: State | null }>;
}

export interface CatalogEntry {
  kind: PieceKind;
  id: string;
  title: string;
  subtitle: string;
  text: string;
  /** How many CVs use this piece. */
  count: number;
  bullets: { id: string; text: string; count: number }[];
}

export const pick = (value: Localized | undefined, language: Language): string =>
  value === undefined ? "" : typeof value === "string" ? value : value[language] ?? value[language === "es" ? "en" : "es"] ?? "";

const MONTHS: Record<Language, string[]> = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const PRESENT: Record<Language, string> = { es: "actual", en: "present" };

export const yearMonth = (value: string | null | undefined, language: Language = "es") =>
  value ? `${MONTHS[language][Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}` : PRESENT[language];

/** Every piece of one kind, readable in one language, with usage counts. */
export function catalogEntries(explorer: Explorer, kind: PieceKind, language: Language): CatalogEntry[] {
  const { catalog, usage } = explorer;
  const span = (start: string, end: string | null) => `${yearMonth(start, language)} – ${yearMonth(end, language)}`;
  const count = (id: string) => usage.pieces[`${kind}:${id}`]?.length ?? 0;
  const bullets = (list: { id: string; text: Localized }[]) =>
    list.map((b) => ({ id: b.id, text: pick(b.text, language), count: usage.bullets[b.id]?.length ?? 0 }));
  const entry = (id: string, title: string, subtitle: string, text = "", items: CatalogEntry["bullets"] = []): CatalogEntry => ({
    kind, id, title, subtitle, text, count: count(id), bullets: items,
  });

  switch (kind) {
    case "summary":
      return catalog.summaries.map((s) => entry(s.id, s.id, s.tags.join(" · "), pick(s.text, language)));
    case "experience":
      return catalog.experiences.map((e) =>
        entry(e.id, pick(e.org, language), `${pick(e.role, language)} · ${span(e.start, e.end)}`, "", bullets(e.bullets)));
    case "project":
      return catalog.projects.map((p) => entry(p.id, pick(p.name, language), [p.label, ...p.tech].join(" · "), "", bullets(p.bullets)));
    case "certification":
      return catalog.certifications.map((c) =>
        entry(c.id, pick(c.name, language), `${pick(c.issuer, language)} · ${yearMonth(c.date, language)}`, "", bullets(c.bullets)));
    case "education":
      return catalog.education.map((e) =>
        entry(e.id, pick(e.program, language), `${pick(e.org, language)} · ${span(e.start, e.end)}`, e.honors.map((h) => pick(h, language)).join(" · ")));
    case "skill":
      return catalog.skills.skills.map((s) => entry(s.id, s.name, s.detail ?? ""));
  }
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Search across title, subtitle, text and bullets; `unused` keeps only pieces no CV uses. */
export function filterEntries(entries: readonly CatalogEntry[], query: string, unused: boolean): CatalogEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (unused && e.count > 0) return false;
    if (words.length === 0) return true;
    const haystack = fold([e.id, e.title, e.subtitle, e.text, ...e.bullets.map((b) => `${b.id} ${b.text}`)].join(" "));
    return words.every((w) => haystack.includes(w));
  });
}

/** URL slugs for each kind. */
export const KIND_SLUGS: Record<PieceKind, string> = {
  summary: "summaries",
  experience: "experience",
  project: "projects",
  certification: "certifications",
  education: "education",
  skill: "skills",
};
export const KIND_KEYS: Record<PieceKind, MessageKey> = {
  summary: "kind.summary",
  experience: "kind.experience",
  project: "kind.project",
  certification: "kind.certification",
  education: "kind.education",
  skill: "kind.skill",
};
export const kindFromSlug = (slug: string | undefined): PieceKind =>
  ((Object.entries(KIND_SLUGS).find(([, s]) => s === slug)?.[0]) as PieceKind | undefined) ?? "summary";

export const pieceHref = (kind: PieceKind, id: string) => `/catalog/${KIND_SLUGS[kind]}/${encodeURIComponent(id)}`;
