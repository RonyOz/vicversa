import { daysBetween, type Funnel, type State } from "../tracking.js";

/** Pure geometry for the panel's charts: no React, no I/O, testable. */

export type SegmentKey = "waiting" | "silent" | "withdrawn" | "rejected" | "advanced";

export interface Segment {
  key: SegmentKey;
  count: number;
  /** Fraction of all applications, 0–1. */
  share: number;
  /** Where the segment starts, as a fraction of the bar. */
  offset: number;
}

/**
 * The funnel as one part-to-whole bar. Order runs from "no result yet" to
 * "got an answer", so the eye reads waiting and silence before rejection.
 */
export function funnelSegments(f: Funnel): Segment[] {
  const counts: [SegmentKey, number][] = [
    ["waiting", f.waiting],
    ["silent", f.silent],
    ["withdrawn", f.withdrawnSilent],
    ["rejected", f.rejectedDirect],
    ["advanced", f.advancedTotal],
  ];
  let offset = 0;
  const segments: Segment[] = [];
  for (const [key, count] of counts) {
    if (count === 0 || f.total === 0) continue;
    const share = count / f.total;
    segments.push({ key, count, share, offset });
    offset += share;
  }
  return segments;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface TimeAxis {
  x: (date: string) => number;
  /** First day of every month inside the range. */
  ticks: { date: string; x: number; label: string }[];
}

export function timeAxis(start: string, end: string, width: number): TimeAxis {
  const span = Math.max(1, daysBetween(start, end));
  const x = (date: string) => (daysBetween(start, date) / span) * width;
  const ticks: TimeAxis["ticks"] = [];
  let [year, month] = start.split("-").map(Number) as [number, number];
  for (;;) {
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    if (date > end) break;
    ticks.push({ date, x: x(date), label: MONTHS[month - 1]! });
  }
  return { x, ticks };
}

const GROUP_ORDER: State[] = ["active", "stale", "closed"];

/** Rows grouped by state (active, no response, closed), most recently moved first. */
export function timelineGroups<T extends { state: State; daysSince: number }>(
  rows: T[],
): { state: State; rows: T[] }[] {
  return GROUP_ORDER.map((state) => ({
    state,
    rows: rows.filter((row) => row.state === state).sort((a, b) => a.daysSince - b.daysSince),
  })).filter((group) => group.rows.length > 0);
}
