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

export type Cut = {
  kind: "summary" | "bullet" | "item";
  id: string;
  detail: string;
  /** Points of height this cut frees. */
  saves: number;
  /** Whether this cut alone makes the CV fit. */
  enough: boolean;
};

/** Everything verdict() reports, as data — what the MCP server and a UI consume. */
export type Assessment = {
  ok: boolean;
  fits: boolean;
  used: number;
  available: number;
  /** Positive means the CV does not fit on one page. */
  overflow: number;
  /** Room left when it fits, else 0; and the same in body lines. */
  spare: number;
  spareLines: number;
  overflowLines: number;
  sections: { id: string; height: number }[];
  /** Ways to make it fit, cheapest first. Empty when it already fits. */
  cuts: Cut[];
  /** The cheapest single cut that is enough, or null when none is. */
  smallestCut: Cut | null;
  skillOverflows: { label: string; overflow: number }[];
  warnings: string[];
};

/**
 * Decides whether a CV fits on one page, and if not, prices every way out.
 *
 * Failing rather than shrinking is deliberate. Auto-compacting to fit would
 * make every CV a slightly different density, and the drift would be invisible
 * until a recruiter got the illegible one. A hard stop keeps the typography
 * fixed and puts the editorial decision where it belongs.
 */
export function assess(doc: ResolvedDocument, measurement: Measurement, theme: Theme): Assessment {
  const lineHeight = theme.type.size.body * theme.type.lineHeight.body;
  const { overflow, used, available } = measurement;
  const fits = overflow <= 0;
  const ok = fits && measurement.skillOverflows.length === 0;

  let cuts: Cut[] = [];
  if (!fits) {
    // Swapping the summary loses no content, so it competes on price with the
    // cuts that do and is listed alongside them rather than as an afterthought.
    const currentSummary = measurement.summaries.find((s) => s.id === doc.summaryId);
    const summarySwaps = currentSummary
      ? measurement.summaries
          .filter((s) => s.id !== currentSummary.id && currentSummary.height - s.height > 0.5)
          .map((s) => ({
            kind: "summary" as const,
            id: s.id,
            detail: "swap, no content lost",
            saves: currentSummary.height - s.height,
          }))
      : [];

    cuts = [
      ...summarySwaps,
      ...measurement.bullets.map((b) => ({
        kind: "bullet" as const,
        id: b.id,
        detail: `${b.lines} line${b.lines === 1 ? "" : "s"}`,
        saves: b.height,
      })),
      ...measurement.items.map((i) => ({
        kind: "item" as const,
        id: i.id,
        detail: `whole entry, ${i.section}`,
        saves: i.withGap,
      })),
    ]
      .sort((a, b) => a.saves - b.saves)
      .map((cut) => ({ ...cut, enough: cut.saves >= overflow }));
  }

  const spare = fits ? -overflow : 0;
  return {
    ok,
    fits,
    used,
    available,
    overflow,
    spare,
    spareLines: spare / lineHeight,
    overflowLines: fits ? 0 : overflow / lineHeight,
    sections: [...measurement.sections].sort((a, b) => b.height - a.height),
    cuts,
    smallestCut: cuts.find((c) => c.enough) ?? null,
    skillOverflows: measurement.skillOverflows,
    warnings: doc.warnings,
  };
}

/** The human-readable report the CLI prints, built from assess(). */
export function verdict(
  name: string,
  doc: ResolvedDocument,
  measurement: Measurement,
  theme: Theme,
): Verdict {
  const a = assess(doc, measurement, theme);
  const lineHeight = theme.type.size.body * theme.type.lineHeight.body;
  const lines: string[] = [];

  if (a.ok) {
    lines.push(
      `${green("✓")} ${name}  ${dim(`${pt(a.used)} of ${pt(a.available)}`)}  ` +
        `${a.spare < lineHeight ? yellow(`${pt(a.spare)} to spare`) : `${pt(a.spare)} to spare`}` +
        dim(` (~${a.spareLines.toFixed(1)} lines)`),
    );
  } else {
    lines.push(`${red("✗")} ${name}`);
  }

  if (!a.fits) {
    lines.push("");
    lines.push(`  Over by ${red(pt(a.overflow))} — about ${a.overflowLines.toFixed(1)} body lines.`);
    lines.push(`  ${dim(`used ${pt(a.used)}, available ${pt(a.available)}`)}`);

    lines.push("");
    lines.push("  Where the height is:");
    for (const section of a.sections) {
      lines.push(`    ${section.id.padEnd(16)} ${pt(section.height).padStart(8)}`);
    }

    lines.push("");
    if (a.smallestCut) {
      const smallest = a.smallestCut;
      lines.push(
        `  Smallest single cut that fixes it: ${green(smallest.id)} ` +
          `${dim(`(${smallest.kind}, ${smallest.detail}, frees ${pt(smallest.saves)})`)}`,
      );
    } else {
      lines.push(`  ${yellow("No single cut is enough — you need at least two.")}`);
    }

    lines.push("");
    lines.push("  Options, cheapest first:");
    for (const cut of a.cuts.slice(0, 10)) {
      const enough = cut.enough ? green(" ✓") : "  ";
      lines.push(
        `   ${enough} ${cut.kind.padEnd(6)} ${cut.id.padEnd(28)} ` +
          `${pt(cut.saves).padStart(8)}  ${dim(cut.detail)}`,
      );
    }

    if (doc.summary && !a.cuts.some((cut) => cut.kind === "summary")) {
      lines.push("");
      lines.push(dim("  No shorter summary exists. Writing one is the only way to reclaim"));
      lines.push(dim("  height here without dropping content."));
    }
  }

  for (const problem of a.skillOverflows) {
    lines.push("");
    lines.push(
      `  ${red("Skill row overflows")} "${problem.label}" by ${pt(problem.overflow)} — ` +
        "it will be clipped. Drop a skill or shorten a detail.",
    );
  }

  for (const warning of a.warnings) {
    lines.push(`  ${yellow("!")} ${warning}`);
  }

  return { ok: a.ok, report: lines.join("\n") };
}
