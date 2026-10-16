import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { loadApplication, loadCatalog } from "./catalog.js";
import { applicationsDir, catalogDir, dataRoot, DEMO_ROOT, outDir } from "./paths.js";
import { homedir } from "node:os";
import { buildHtml } from "./html.js";
import { pick } from "./i18n.js";
import { renderPdf, withSharedBrowser } from "./render.js";
import { resolveDocument } from "./resolve.js";
import type { Application, Language, Stage, TrackingEvent } from "./schema.js";
import { recordEvent, removeLastEvent } from "./tracking-file.js";
import {
  funnel, pace, parseStage, summarize, timeline,
  type Funnel, type Pace, type State, type TrackSummary,
} from "./tracking.js";
import { piecesOf, usageIndex, type AppPieces, type UsageIndex } from "./usage.js";
import { assess, verdict, type Assessment } from "./validate.js";

/**
 * Every operation vicversa offers, returning data. The CLI prints it and the
 * MCP server returns it; neither adds logic. Nothing here writes to stdout,
 * because over stdio stdout belongs to the MCP protocol.
 */

export const DEFAULT_STALE_DAYS = 21;
export const DEFAULT_WEEKS = 8;

/** Runs the functions passed to it one at a time, in call order. */
function serialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(fn, fn);
    tail = run.catch(() => undefined);
    return run;
  };
}

/**
 * MCP calls can overlap. Chromium work runs one at a time because
 * withSharedBrowser keeps a module-level browser two calls would close under
 * each other; file edits run one at a time because each is read-modify-write,
 * and two at once would silently drop an event.
 */
const exclusive = serialQueue();
const exclusiveWrite = serialQueue();

export async function applicationNames(): Promise<string[]> {
  const files = await readdir(applicationsDir());
  return files.filter((f) => f.endsWith(".yaml")).map((f) => basename(f, ".yaml")).sort();
}

/** Exact name, or an error that suggests names containing what was typed. */
export async function findApplication(input: string): Promise<string> {
  const wanted = basename(input, ".yaml");
  const names = await applicationNames();
  if (names.includes(wanted)) return wanted;
  const close = names.filter((name) => name.includes(wanted.toLowerCase()));
  throw new Error(
    `No application "${wanted}".${close.length > 0 ? ` Did you mean: ${close.join(", ")}?` : ""}`,
  );
}

export function applicationPath(name: string): string {
  return resolve(applicationsDir(), `${name}.yaml`);
}

/** A name from applications/, or (CLI only) a path to a YAML file elsewhere. */
async function openApplication(input: string): Promise<{ name: string; app: Application }> {
  if (input.includes("/")) return { name: basename(input, ".yaml"), app: await loadApplication(input) };
  const name = await findApplication(input);
  return { name, app: await loadApplication(name) };
}

export interface ApplicationListing {
  name: string;
  company: string | null;
  role: string | null;
  language: Language;
  /** False for templates and unsent drafts. */
  tracked: boolean;
  state: State | null;
  stage: Stage | null;
  daysSince: number | null;
}

export async function listApplications(options: {
  query?: string;
  today: string;
  staleDays?: number;
}): Promise<ApplicationListing[]> {
  const query = options.query?.toLowerCase();
  const listings: ApplicationListing[] = [];
  for (const name of await applicationNames()) {
    const app = await loadApplication(name);
    const { company, role, language } = app.metadata;
    if (query && ![name, company ?? "", role ?? ""].some((text) => text.toLowerCase().includes(query))) continue;
    const summary = summarize(name, app, options.today, options.staleDays ?? DEFAULT_STALE_DAYS);
    listings.push({
      name, company: company ?? null, role: role ?? null, language,
      tracked: summary !== null,
      state: summary?.state ?? null,
      stage: summary?.stage ?? null,
      daysSince: summary?.daysSince ?? null,
    });
  }
  return listings;
}

export async function getApplication(
  input: string,
  options: { today: string; staleDays?: number },
): Promise<{
  name: string;
  path: string;
  application: Application;
  timeline: TrackingEvent[] | null;
  summary: TrackSummary | null;
}> {
  const name = await findApplication(input);
  const application = await loadApplication(name);
  return {
    name,
    path: applicationPath(name),
    application,
    timeline: timeline(application),
    summary: summarize(name, application, options.today, options.staleDays ?? DEFAULT_STALE_DAYS),
  };
}

export const CATALOG_PARTS = [
  "profile", "summaries", "sections", "experiences", "projects", "certifications", "education", "skills",
] as const;
export type CatalogPart = (typeof CATALOG_PARTS)[number];

const isLocalized = (value: object): value is { es?: string; en?: string } => {
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.every(([key, text]) => (key === "es" || key === "en") && typeof text === "string")
  );
};

/** Replaces every bilingual {es, en} leaf with one language's text; leaves the rest alone. */
function inLanguage(value: unknown, language: Language): unknown {
  if (Array.isArray(value)) return value.map((item) => inLanguage(item, language));
  if (value === null || typeof value !== "object") return value;
  if (isLocalized(value)) return pick(value, language);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, inLanguage(item, language)]));
}

/** The catalog is ~100 KB; asking for parts (and one language) keeps an agent's context small. */
export async function getCatalog(
  parts: readonly CatalogPart[],
  language?: Language,
): Promise<Partial<Record<CatalogPart, unknown>>> {
  const catalog = await loadCatalog();
  const all: Record<CatalogPart, unknown> = {
    profile: catalog.profile,
    summaries: catalog.summaries,
    sections: catalog.sections,
    experiences: catalog.experiences,
    projects: catalog.projects,
    certifications: catalog.certifications,
    education: catalog.education,
    skills: { skills: catalog.skills, groups: catalog.skillGroups },
  };
  const result: Partial<Record<CatalogPart, unknown>> = {};
  for (const part of parts) result[part] = language ? inLanguage(all[part], language) : all[part];
  return result;
}

export interface Status {
  today: string;
  staleDays: number;
  pace: Pace;
  funnel: Funnel;
  /** Tracked applications, most recently moved first. */
  applications: TrackSummary[];
}

export async function getStatus(options: { today: string; staleDays?: number; weeks?: number }): Promise<Status> {
  const { rows, ...status } = await getDashboard(options);
  return status;
}

export interface Dashboard extends Status {
  /** Each tracked application with its full timeline, same order as `applications`. */
  rows: (TrackSummary & { events: TrackingEvent[]; applied: string; language: Language; url: string | null })[];
}

/** Status plus every timeline: what the panel draws. */
export async function getDashboard(options: { today: string; staleDays?: number; weeks?: number }): Promise<Dashboard> {
  const staleDays = options.staleDays ?? DEFAULT_STALE_DAYS;
  const rows: Dashboard["rows"] = [];
  for (const name of await applicationNames()) {
    const app = await loadApplication(name);
    const events = timeline(app);
    const summary = summarize(name, app, options.today, staleDays);
    if (!events || !summary) continue;
    rows.push({
      ...summary,
      events,
      applied: (events.find((event) => event.stage === "applied") ?? events[0]!).date,
      language: app.metadata.language,
      url: app.metadata.url ?? null,
    });
  }
  rows.sort((a, b) => a.daysSince - b.daysSince);
  const timelines = rows.map((row) => row.events);
  return {
    today: options.today,
    staleDays,
    pace: pace(timelines, options.today, options.weeks ?? DEFAULT_WEEKS),
    funnel: funnel(timelines, options.today, staleDays),
    applications: rows.map(({ events, applied, language, url, ...summary }) => summary),
    rows,
  };
}

export interface ValidationEntry {
  name: string;
  ok: boolean;
  /** Set when the application could not be loaded or resolved at all. */
  error?: string;
  /** The CLI's human-readable report. */
  report?: string;
  assessment?: Assessment;
}

/** Every application (or the ones named) measured in one shared browser. One bad file never stops the batch. */
export async function validateApplications(names?: readonly string[]): Promise<ValidationEntry[]> {
  const targets = names && names.length > 0 ? [...names] : await applicationNames();
  const catalog = await loadCatalog();
  return exclusive(() =>
    withSharedBrowser(async (render) => {
      const results: ValidationEntry[] = [];
      for (const input of targets) {
        const fallbackName = basename(input, ".yaml");
        try {
          const { name, app } = await openApplication(input);
          const doc = resolveDocument(app, catalog);
          const html = await buildHtml(doc, catalog.template);
          const { measurement } = await render(html, catalog.theme);
          const assessment = assess(doc, measurement, catalog.theme);
          const { report } = verdict(name, doc, measurement, catalog.theme);
          results.push({ name, ok: assessment.ok, report, assessment });
        } catch (error) {
          results.push({ name: fallbackName, ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      return results;
    }),
  );
}

export interface RenderOutcome {
  name: string;
  ok: boolean;
  /** False when it does not fit and `force` was not set: nothing is written. */
  written: boolean;
  pdfPath?: string;
  htmlPath?: string;
  report: string;
  assessment: Assessment;
}

export async function renderApplication(
  input: string,
  options: { force?: boolean; html?: boolean; out?: string } = {},
): Promise<RenderOutcome> {
  const { name, app } = await openApplication(input);
  const catalog = await loadCatalog();
  const doc = resolveDocument(app, catalog);
  const html = await buildHtml(doc, catalog.template);

  await mkdir(outDir(), { recursive: true });
  let htmlPath: string | undefined;
  if (options.html) {
    htmlPath = resolve(outDir(), `${name}.html`);
    await writeFile(htmlPath, html);
  }

  const { pdf, measurement } = await exclusive(() => renderPdf(html, catalog.theme));
  const assessment = assess(doc, measurement, catalog.theme);
  const { report } = verdict(name, doc, measurement, catalog.theme);
  const outcome: RenderOutcome = { name, ok: assessment.ok, written: false, report, assessment };
  if (htmlPath) outcome.htmlPath = htmlPath;
  if (!assessment.ok && !options.force) return outcome;

  const pdfPath = options.out ? resolve(process.cwd(), options.out) : resolve(outDir(), `${name}.pdf`);
  await writeFile(pdfPath, pdf);
  return { ...outcome, written: true, pdfPath };
}

export async function trackEvent(
  input: string,
  options: { stage: string; date?: string; note?: string },
  today: string,
): Promise<{ name: string; event: TrackingEvent; events: TrackingEvent[]; summary: TrackSummary | null }> {
  const stage = parseStage(options.stage);
  const name = await findApplication(input);
  const event: TrackingEvent = {
    date: options.date ?? today,
    stage,
    ...(options.note !== undefined && options.note !== "" ? { note: options.note } : {}),
  };
  const { events, summary } = await exclusiveWrite(async () => ({
    events: await recordEvent(applicationPath(name), event, today),
    summary: summarize(name, await loadApplication(name), today, DEFAULT_STALE_DAYS),
  }));
  return { name, event, events, summary };
}

/** Removes the last recorded event: reopens a closed application or fixes a mistaken entry. */
export async function undoLastEvent(
  input: string,
  today: string,
): Promise<{ name: string; removed: TrackingEvent; events: TrackingEvent[]; summary: TrackSummary | null }> {
  const name = await findApplication(input);
  return exclusiveWrite(async () => {
    const { removed, events } = await removeLastEvent(applicationPath(name));
    const summary = summarize(name, await loadApplication(name), today, DEFAULT_STALE_DAYS);
    return { name, removed, events, summary };
  });
}

/** The CV page exactly as the PDF is printed from it: what the panel shows in an iframe. */
export async function getCvHtml(input: string): Promise<{ name: string; html: string }> {
  const { name, app } = await openApplication(input);
  const catalog = await loadCatalog();
  return { name, html: await buildHtml(resolveDocument(app, catalog), catalog.template) };
}

export interface CvListing {
  name: string;
  company: string | null;
  role: string | null;
  language: Language;
  /** False for templates and unsent drafts. */
  tracked: boolean;
  state: State | null;
  stage: Stage | null;
  /** Date of the "applied" event, null when not tracked. */
  applied: string | null;
  summaryId: string | null;
}

/** Every CV in applications/, templates included: the panel's gallery. */
export async function getCvList(today: string): Promise<CvListing[]> {
  const list: CvListing[] = [];
  for (const name of await applicationNames()) {
    const app = await loadApplication(name);
    const events = timeline(app);
    const summary = summarize(name, app, today, DEFAULT_STALE_DAYS);
    list.push({
      name,
      company: app.metadata.company ?? null,
      role: app.metadata.role ?? null,
      language: app.metadata.language,
      tracked: summary !== null,
      state: summary?.state ?? null,
      stage: summary?.stage ?? null,
      applied: events ? (events.find((e) => e.stage === "applied") ?? events[0]!).date : null,
      summaryId: app.content.summary ?? null,
    });
  }
  return list;
}

/** One CV with the catalog pieces it uses and its tracking state. */
export async function getCvDetail(
  input: string,
  today: string,
): Promise<{ name: string; path: string; application: Application; pieces: AppPieces; tracking: TrackSummary | null }> {
  const name = await findApplication(input);
  const [application, catalog] = await Promise.all([loadApplication(name), loadCatalog()]);
  return {
    name,
    path: applicationPath(name),
    application,
    pieces: piecesOf(application, catalog),
    tracking: summarize(name, application, today, DEFAULT_STALE_DAYS),
  };
}

/** The whole catalog plus who uses each piece: the panel's explorer. */
export async function getCatalogExplorer(today: string): Promise<{
  catalog: Partial<Record<CatalogPart, unknown>>;
  usage: UsageIndex;
  apps: Record<string, { company: string | null; role: string | null; language: Language; tracked: boolean; state: State | null }>;
}> {
  const loaded = await loadCatalog();
  const byApp: Record<string, AppPieces> = {};
  const apps: Awaited<ReturnType<typeof getCatalogExplorer>>["apps"] = {};
  for (const name of await applicationNames()) {
    const app = await loadApplication(name);
    byApp[name] = piecesOf(app, loaded);
    const summary = summarize(name, app, today, DEFAULT_STALE_DAYS);
    apps[name] = {
      company: app.metadata.company ?? null,
      role: app.metadata.role ?? null,
      language: app.metadata.language,
      tracked: summary !== null,
      state: summary?.state ?? null,
    };
  }
  return { catalog: await getCatalog(CATALOG_PARTS), usage: usageIndex(byApp), apps };
}

export interface FitEntry {
  ok: boolean;
  fits: boolean;
  used: number;
  available: number;
  spareLines: number;
  overflowLines: number;
  error?: string;
}

/** Fingerprint of everything that changes a layout: any edit invalidates the fit cache. */
async function layoutFingerprint(): Promise<string> {
  const { template } = await loadCatalog();
  const files: string[] = [resolve(dataRoot(), "vicversa.yaml")];
  for (const dir of [catalogDir(), applicationsDir(), template.dir]) {
    const names = await readdir(dir, { recursive: true });
    files.push(...names.map((n) => resolve(dir, n)));
  }
  const stamps = await Promise.all(
    files.map(async (file) => `${file}:${await stat(file).then((s) => (s.isFile() ? s.mtimeMs : 0), () => "none")}`),
  );
  return stamps.sort().join("|");
}

let fitCache: { key: string; fit: Promise<Record<string, FitEntry>> } | null = null;

/**
 * One-page fit of every CV. Measuring all of them takes seconds in Chromium,
 * so the result is kept until a YAML or the theme changes.
 */
export async function getFit(): Promise<Record<string, FitEntry>> {
  const key = await layoutFingerprint();
  if (fitCache?.key !== key) {
    const fit = validateApplications().then((results) =>
      Object.fromEntries(
        results.map((r): [string, FitEntry] => [
          r.name,
          r.assessment
            ? {
                ok: r.assessment.ok,
                fits: r.assessment.fits,
                used: r.assessment.used,
                available: r.assessment.available,
                spareLines: r.assessment.spareLines,
                overflowLines: r.assessment.overflowLines,
              }
            : { ok: false, fits: false, used: 0, available: 0, spareLines: 0, overflowLines: 0, error: r.error },
        ]),
      ),
    );
    fitCache = { key, fit };
    fit.catch(() => {
      if (fitCache?.fit === fit) fitCache = null;
    });
  }
  return fitCache.fit;
}

/** Where the data comes from and which template renders it: shown in the panel's sidebar. */
export async function getInfo(): Promise<{ dataRoot: string; demo: boolean; template: { id: string; name: string; source: "bundled" | "user" } }> {
  const root = dataRoot();
  const { template } = await loadCatalog();
  const home = homedir();
  return {
    dataRoot: root.startsWith(home) ? `~${root.slice(home.length)}` : root,
    demo: root === DEMO_ROOT,
    template: { id: template.definition.id, name: template.definition.name, source: template.source },
  };
}
