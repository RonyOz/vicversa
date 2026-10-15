import type { TrackingEvent } from "./schema.js";
import { daysBetween, REACH, type Funnel, type Pace, type State, type TrackSummary } from "./tracking.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${MONTHS[Number(month) - 1]} ${day}`;
}

export function formatPace(p: Pace): string {
  const widest = Math.max(1, ...p.weeks.map((week) => week.count));
  const lines = ["Pace (applications per week, weeks start Monday)"];
  for (const week of p.weeks) {
    lines.push(`  ${shortDate(week.start)} ${"█".repeat(week.count).padEnd(widest)} ${week.count}`);
  }
  lines.push(`  average ${p.average.toFixed(1)}/week over ${p.weeks.length} weeks`);
  return lines.join("\n");
}

export function formatFunnel(f: Funnel, staleDays: number): string {
  const width = String(f.total).length;
  const n = (value: number) => String(value).padStart(width);
  const lines = [
    `${f.total} sent`,
    `├─ ${n(f.waiting)} waiting (<${staleDays} days)`,
    `├─ ${n(f.silent)} no response (${staleDays}+ days)`,
    `├─ ${n(f.withdrawnSilent)} withdrawn before any response`,
    `└─ ${n(f.responded)} responded (${f.responded} of ${f.resolved} past the waiting window)`,
    `     ├─ ${f.rejectedDirect} rejected directly`,
    `     └─ ${f.advancedTotal} advanced`,
  ];
  for (const reach of REACH) {
    const parts = Object.entries(f.advanced[reach])
      .filter(([, count]) => count > 0)
      .map(([outcome, count]) => `${count} ${outcome}`);
    if (parts.length > 0) lines.push(`          · reached ${reach}: ${parts.join(", ")}`);
  }
  return lines.join("\n");
}

const STATE_TITLES: Record<State, string> = { active: "Active", stale: "No response", closed: "Closed" };

function stageLabel(summary: TrackSummary): string {
  const count = summary.counts[summary.stage] ?? 1;
  return count > 1 ? `${summary.stage} ×${count}` : summary.stage;
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function formatTable(summaries: TrackSummary[]): string {
  const rows = summaries.map((s) => ({
    state: s.state,
    cells: [s.name, s.company ?? "", truncate(s.role ?? "", 40), stageLabel(s), `${s.daysSince}d`],
  }));
  const widths = [0, 1, 2, 3].map((i) => Math.max(0, ...rows.map((row) => row.cells[i]!.length)));
  const blocks: string[] = [];
  for (const state of ["active", "stale", "closed"] as const) {
    const group = rows.filter((row) => row.state === state);
    if (group.length === 0) continue;
    const lines = group.map(
      (row) => `  ${row.cells.map((cell, i) => (i < 4 ? cell.padEnd(widths[i]!) : cell)).join("  ")}`,
    );
    blocks.push(`${STATE_TITLES[state]} (${group.length})\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

export function formatTimeline(summary: TrackSummary, events: readonly TrackingEvent[]): string {
  const title = [summary.company, summary.role].filter(Boolean).join(" — ");
  const stageWidth = Math.max(...events.map((event) => event.stage.length));
  const noteWidth = Math.max(0, ...events.map((event) => (event.note ?? "").length));
  const lines = [`${summary.name}${title ? `  ${title}` : ""}`];
  events.forEach((event, i) => {
    const gap = i === 0 ? "" : `+${daysBetween(events[i - 1]!.date, event.date)}d`;
    lines.push(`  ${event.date}  ${event.stage.padEnd(stageWidth)}  ${(event.note ?? "").padEnd(noteWidth)}  ${gap}`.trimEnd());
  });
  lines.push(`  ${summary.state} · ${summary.daysSince} days since last event`);
  return lines.join("\n");
}
