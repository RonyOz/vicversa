import type { Measurement } from "./render.js";
import type { ResolvedDocument } from "./resolve.js";
import type { Theme } from "./theme.js";

export type Verdict = { ok: boolean; report: string };

const useColor = process.env["NO_COLOR"] === undefined && process.stdout.isTTY;
const paint = (code: string) => (s: string) => (useColor ? `[${code}m${s}[0m` : s);
const red = paint("31");
const green = paint("32");
const yellow = paint("33");
const dim = paint("2");

const pt = (n: number) => `${n.toFixed(1)}pt`;

/**
 * Decides whether a CV fits on one page, and if not, says what to cut.
 *
 * Failing rather than shrinking is deliberate. Auto-compacting to fit would
 * make every CV a slightly different density, and the drift would be invisible
 * until a recruiter got the illegible one. A hard stop keeps the typography
 * fixed and puts the editorial decision where it belongs.
 */
export function verdict(
  name: string,
  doc: ResolvedDocument,
  measurement: Measurement,
  theme: Theme,
): Verdict {
  const lines: string[] = [];
  const lineHeight = theme.type.size.body * theme.type.lineHeight.body;
  const { overflow, used, available } = measurement;

  const fits = overflow <= 0;
  const skillProblems = measurement.skillOverflows;
  const ok = fits && skillProblems.length === 0;

  if (ok) {
    const slack = -overflow;
    lines.push(
      `${green("✓")} ${name}  ${dim(`${pt(used)} of ${pt(available)}`)}  ` +
        `${slack < lineHeight ? yellow(`${pt(slack)} to spare`) : `${pt(slack)} to spare`}` +
        dim(` (~${(slack / lineHeight).toFixed(1)} lines)`),
    );
  } else {
    lines.push(`${red("✗")} ${name}`);
  }

  if (!fits) {
    lines.push("");
    lines.push(`  Over by ${red(pt(overflow))} — about ${(overflow / lineHeight).toFixed(1)} body lines.`);
    lines.push(`  ${dim(`used ${pt(used)}, available ${pt(available)}`)}`);

    lines.push("");
    lines.push("  Where the height is:");
    for (const section of [...measurement.sections].sort((a, b) => b.height - a.height)) {
      lines.push(`    ${section.id.padEnd(16)} ${pt(section.height).padStart(8)}`);
    }

    // Swapping the summary loses no content, so it competes on price with the
    // cuts that do and is listed alongside them rather than as an afterthought.
    const currentSummary = measurement.summaries.find((s) => s.id === doc.summaryId);
    const summarySwaps = currentSummary
      ? measurement.summaries
          .filter((s) => s.id !== currentSummary.id && currentSummary.height - s.height > 0.5)
          .map((s) => ({
            kind: "summary",
            id: s.id,
            detail: "swap, no content lost",
            saves: currentSummary.height - s.height,
          }))
      : [];

    const cuts = [
      ...summarySwaps,
      ...measurement.bullets.map((b) => ({
        kind: "bullet",
        id: b.id,
        detail: `${b.lines} line${b.lines === 1 ? "" : "s"}`,
        saves: b.height,
      })),
      ...measurement.items.map((i) => ({
        kind: "item",
        id: i.id,
        detail: `whole entry, ${i.section}`,
        saves: i.withGap,
      })),
    ].sort((a, b) => a.saves - b.saves);

    const smallest = cuts.find((c) => c.saves >= overflow);

    lines.push("");
    if (smallest) {
      lines.push(
        `  Smallest single cut that fixes it: ${green(smallest.id)} ` +
          `${dim(`(${smallest.kind}, ${smallest.detail}, frees ${pt(smallest.saves)})`)}`,
      );
    } else {
      lines.push(`  ${yellow("No single cut is enough — you need at least two.")}`);
    }

    lines.push("");
    lines.push("  Options, cheapest first:");
    for (const cut of cuts.slice(0, 10)) {
      const enough = cut.saves >= overflow ? green(" ✓") : "  ";
      lines.push(
        `   ${enough} ${cut.kind.padEnd(6)} ${cut.id.padEnd(28)} ` +
          `${pt(cut.saves).padStart(8)}  ${dim(cut.detail)}`,
      );
    }

    if (doc.summary && summarySwaps.length === 0) {
      lines.push("");
      lines.push(dim("  No shorter summary exists. Writing one is the only way to reclaim"));
      lines.push(dim("  height here without dropping content."));
    }
  }

  for (const problem of skillProblems) {
    lines.push("");
    lines.push(
      `  ${red("Skill row overflows")} "${problem.label}" by ${pt(problem.overflow)} — ` +
        "it will be clipped. Drop a skill or shorten a detail.",
    );
  }

  for (const warning of doc.warnings) {
    lines.push(`  ${yellow("!")} ${warning}`);
  }

  return { ok, report: lines.join("\n") };
}
