import { readdir, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadApplication, loadCatalog, ROOT } from "./catalog.js";
import { buildHtml } from "./html.js";
import { renderPdf, withSharedBrowser } from "./render.js";
import { resolveDocument } from "./resolve.js";
import type { TrackingEvent } from "./schema.js";
import { recordEvent } from "./tracking-file.js";
import { formatFunnel, formatPace, formatTable, formatTimeline } from "./tracking-report.js";
import { funnel, localToday, pace, parseStage, summarize, timeline, type TrackSummary } from "./tracking.js";
import { verdict } from "./validate.js";

const OUT = resolve(ROOT, "out");

async function applicationNames(): Promise<string[]> {
  const files = await readdir(resolve(ROOT, "applications"));
  return files.filter((f) => f.endsWith(".yaml")).map((f) => basename(f, ".yaml")).sort();
}

/** Exact name, or an error that suggests names containing what was typed. */
async function findApplication(input: string): Promise<string> {
  const wanted = basename(input, ".yaml");
  const names = await applicationNames();
  if (names.includes(wanted)) return wanted;
  const close = names.filter((name) => name.includes(wanted.toLowerCase()));
  throw new Error(
    `No application "${wanted}".${close.length > 0 ? ` Did you mean: ${close.join(", ")}?` : ""}`,
  );
}

function positiveInt(value: string, flag: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${flag} must be a positive integer, got "${value}"`);
  return number;
}

async function cmdStatus(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "stale-days": { type: "string", default: "21" },
      weeks: { type: "string", default: "8" },
    },
    allowPositionals: true,
  });
  const staleDays = positiveInt(values["stale-days"], "--stale-days");
  const weeks = positiveInt(values.weeks, "--weeks");
  const today = localToday();

  if (positionals[0]) {
    const name = await findApplication(positionals[0]);
    const app = await loadApplication(name);
    const events = timeline(app);
    const summary = summarize(name, app, today, staleDays);
    if (!events || !summary) {
      console.log(`${name} is a template or unsent draft: not tracked.`);
      return;
    }
    console.log(formatTimeline(summary, events));
    return;
  }

  const timelines: TrackingEvent[][] = [];
  const summaries: TrackSummary[] = [];
  for (const name of await applicationNames()) {
    const app = await loadApplication(name);
    const events = timeline(app);
    const summary = summarize(name, app, today, staleDays);
    if (!events || !summary) continue;
    timelines.push(events);
    summaries.push(summary);
  }
  summaries.sort((a, b) => a.daysSince - b.daysSince);

  console.log(formatPace(pace(timelines, today, weeks)));
  console.log("");
  console.log(formatFunnel(funnel(timelines, today, staleDays), staleDays));
  console.log("");
  console.log(formatTable(summaries));
}

async function cmdTrack(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: { date: { type: "string" }, note: { type: "string" } },
    allowPositionals: true,
  });
  const [input, stageArg] = positionals;
  if (!input || !stageArg) {
    throw new Error("Usage: cv track <application> <stage> [--date YYYY-MM-DD] [--note TEXT]");
  }
  const stage = parseStage(stageArg);
  const name = await findApplication(input);
  const today = localToday();
  const event: TrackingEvent = { date: values.date ?? today, stage, ...(values.note ? { note: values.note } : {}) };

  const events = await recordEvent(resolve(ROOT, "applications", `${name}.yaml`), event, today);
  const summary = summarize(name, await loadApplication(name), today, 21);
  console.log(`  ✓ ${name}: ${stage} on ${event.date} (${events.length} events, now ${summary?.state ?? "untracked"})`);
}

async function cmdRender(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      out: { type: "string" },
      html: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const name = positionals[0];
  if (!name) throw new Error("Usage: cv render <application> [--out FILE] [--html] [--force]");

  const catalog = await loadCatalog();
  const app = await loadApplication(name);
  const doc = resolveDocument(app, catalog);
  const html = await buildHtml(doc, catalog.theme);

  await mkdir(OUT, { recursive: true });
  const stem = basename(name, ".yaml");

  if (values.html) {
    const htmlPath = resolve(OUT, `${stem}.html`);
    await writeFile(htmlPath, html);
    console.log(`  html  ${htmlPath}`);
  }

  const { pdf, measurement } = await renderPdf(html, catalog.theme);
  const result = verdict(stem, doc, measurement, catalog.theme);
  console.log(result.report);

  if (!result.ok && !values.force) {
    console.log(`\n  ${"No PDF written."} Fix the above, or pass --force to write it anyway.`);
    process.exitCode = 1;
    return;
  }

  const pdfPath = values.out ? resolve(process.cwd(), values.out) : resolve(OUT, `${stem}.pdf`);
  await writeFile(pdfPath, pdf);
  console.log(`\n  ${pdfPath}`);
}

async function cmdValidate(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true });
  const names = positionals.length > 0 ? positionals : await applicationNames();

  const catalog = await loadCatalog();
  let failures = 0;

  await withSharedBrowser(async (render) => {
    for (const name of names) {
      const stem = basename(name, ".yaml");
      try {
        const app = await loadApplication(name);
        const doc = resolveDocument(app, catalog);
        const html = await buildHtml(doc, catalog.theme);
        const { measurement } = await render(html, catalog.theme);
        const result = verdict(stem, doc, measurement, catalog.theme);
        console.log(result.report);
        if (!result.ok) failures++;
      } catch (error) {
        console.log(`✗ ${stem}\n  ${error instanceof Error ? error.message : error}`);
        failures++;
      }
      console.log("");
    }
  });

  console.log(
    failures === 0
      ? `${names.length} application${names.length === 1 ? "" : "s"} fit on one page.`
      : `${failures} of ${names.length} need attention.`,
  );
  if (failures > 0) process.exitCode = 1;
}

async function cmdList() {
  const catalog = await loadCatalog();
  const names = await applicationNames();

  const counts: [string, number][] = [
    ["summaries", catalog.summaries.length],
    ["experiences", catalog.experiences.length],
    ["projects", catalog.projects.length],
    ["certifications", catalog.certifications.length],
    ["education", catalog.education.length],
    ["skills", catalog.skills.length],
    ["bullets", catalog.byId.bullets.size],
  ];

  console.log("catalog");
  for (const [label, count] of counts) console.log(`  ${label.padEnd(15)} ${count}`);
  console.log("\napplications");
  for (const name of names) console.log(`  ${name}`);
}

const USAGE = `vicversa - one catalog, many CVs

  cv render <application> [--out FILE] [--html] [--force]
  cv validate [application...]
  cv list
  cv status [application] [--stale-days N] [--weeks W]
  cv track <application> <stage> [--date YYYY-MM-DD] [--note TEXT]

  stages: applied, assessment, interview, offer, hired, rejected, withdrawn
`;

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "render": return cmdRender(rest);
    case "validate": return cmdValidate(rest);
    case "list": return cmdList();
    case "status": return cmdStatus(rest);
    case "track": return cmdTrack(rest);
    default:
      console.log(USAGE);
      if (command !== undefined && command !== "help") process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
