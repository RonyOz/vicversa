import type { TrackingEvent } from "../schema.js";
import { daysBetween, weekStart, type Funnel, type State } from "../tracking.js";

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

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface CalendarDay {
  date: string;
  count: number;
  today: boolean;
  future: boolean;
}

export interface CalendarWeek {
  start: string;
  /** Day numbers, e.g. "22–28" or "29–5" across a month change. */
  range: string;
  /** Month name on the first week and on weeks that contain the 1st, else null. */
  month: string | null;
  total: number;
  /** Monday to Sunday. */
  days: CalendarDay[];
}

/**
 * "applied" events laid out as a calendar: one column per week (Monday
 * first), one cell per day, so every count sits on a findable date.
 */
export function calendarGrid(
  timelines: readonly (readonly TrackingEvent[])[],
  today: string,
  weeks: number,
): { weeks: CalendarWeek[]; max: number } {
  const counts = new Map<string, number>();
  for (const events of timelines) {
    for (const event of events) {
      if (event.stage === "applied") counts.set(event.date, (counts.get(event.date) ?? 0) + 1);
    }
  }
  const firstMonday = addDays(weekStart(today), -7 * (weeks - 1));
  const result: CalendarWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const start = addDays(firstMonday, 7 * w);
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, count: counts.get(date) ?? 0, today: date === today, future: date > today };
    });
    const end = days[6]!.date;
    const hasFirst = days.find((day) => day.date.endsWith("-01"));
    const monthOf = (date: string) => MONTHS[Number(date.slice(5, 7)) - 1]!;
    result.push({
      start,
      range: `${Number(start.slice(8))}–${Number(end.slice(8))}`,
      month: hasFirst ? monthOf(hasFirst.date) : w === 0 ? monthOf(start) : null,
      total: days.reduce((sum, day) => sum + day.count, 0),
      days,
    });
  }
  const max = Math.max(0, ...result.flatMap((week) => week.days.map((day) => day.count)));
  return { weeks: result, max };
}

/** Intensity step for a day's count: 0 none, 1, 2, 3–4, 5+. */
export function calendarLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}
