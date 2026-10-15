import { parseArgs } from "node:util";
import { loadCatalog } from "./catalog.js";
import {
  applicationNames, getApplication, getStatus, renderApplication, trackEvent, validateApplications,
} from "./ops.js";
import { formatFunnel, formatPace, formatTable, formatTimeline } from "./tracking-report.js";
import { localToday } from "./tracking.js";

/**
 * The secondary interface: a thin printer over src/ops.ts. Agents use the MCP
 * server (src/mcp.ts); this stays for debugging, hooks and humans.
 */

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

  const result = await renderApplication(name, { force: values.force, html: values.html, out: values.out });
  if (result.htmlPath) console.log(`  html  ${result.htmlPath}`);
  console.log(result.report);

  if (!result.written) {
    console.log(`\n  ${"No PDF written."} Fix the above, or pass --force to write it anyway.`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n  ${result.pdfPath}`);
}

async function cmdValidate(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true });
  const results = await validateApplications(positionals);

  for (const result of results) {
    console.log(result.report ?? `✗ ${result.name}\n  ${result.error}`);
    console.log("");
  }

  const failures = results.filter((result) => !result.ok).length;
  console.log(
    failures === 0
      ? `${results.length} application${results.length === 1 ? "" : "s"} fit on one page.`
      : `${failures} of ${results.length} need attention.`,
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
    const { name, timeline, summary } = await getApplication(positionals[0], { today, staleDays });
    if (!timeline || !summary) {
      console.log(`${name} is a template or unsent draft: not tracked.`);
      return;
    }
    console.log(formatTimeline(summary, timeline));
    return;
  }

  const status = await getStatus({ today, staleDays, weeks });
  console.log(formatPace(status.pace));
  console.log("");
  console.log(formatFunnel(status.funnel, staleDays));
  console.log("");
  console.log(formatTable(status.applications));
}

async function cmdTrack(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: { date: { type: "string" }, note: { type: "string" } },
    allowPositionals: true,
  });
  const [input, stage] = positionals;
  if (!input || !stage) {
    throw new Error("Usage: cv track <application> <stage> [--date YYYY-MM-DD] [--note TEXT]");
  }
  const result = await trackEvent(input, { stage, date: values.date, note: values.note }, localToday());
  console.log(
    `  ✓ ${result.name}: ${result.event.stage} on ${result.event.date} ` +
      `(${result.events.length} events, now ${result.summary?.state ?? "untracked"})`,
  );
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
