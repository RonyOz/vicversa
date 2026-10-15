import {
  IsoDate, STAGES, TERMINAL_STAGES, trackingProblem,
  type Application, type Stage, type TrackingEvent,
} from "./schema.js";

const DAY_MS = 86_400_000;

/** Today where the user is. `toISOString()` is UTC: a day ahead every evening in UTC-5. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function utc(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year!, month! - 1, day!);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

export function isTerminal(stage: Stage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function parseStage(value: string): Stage {
  if ((STAGES as readonly string[]).includes(value)) return value as Stage;
  throw new Error(`Unknown stage "${value}". Valid stages: ${STAGES.join(", ")}`);
}

/**
 * The events that count for tracking. Applications sent before tracking
 * existed only have `date_submitted`, which stands for one "applied" event.
 * With neither, the file is a template or an unsent draft: `null`.
 */
export function timeline(app: Application): TrackingEvent[] | null {
  if (app.tracking) return app.tracking;
  const submitted = app.metadata.date_submitted;
  if (submitted === undefined) return null;
  if (!IsoDate.safeParse(submitted).success) {
    throw new Error(`metadata.date_submitted "${submitted}" is not "YYYY-MM-DD"`);
  }
  return [{ date: submitted, stage: "applied" }];
}

export type State = "active" | "stale" | "closed";

export interface TrackSummary {
  name: string;
  company?: string;
  role?: string;
  state: State;
  /** Stage of the last event. */
  stage: Stage;
  counts: Partial<Record<Stage, number>>;
  lastDate: string;
  daysSince: number;
}

export function summarize(name: string, app: Application, today: string, staleDays: number): TrackSummary | null {
  const events = timeline(app);
  if (!events) return null;
  const last = events.at(-1)!;
  const counts: Partial<Record<Stage, number>> = {};
  for (const event of events) counts[event.stage] = (counts[event.stage] ?? 0) + 1;
  const daysSince = daysBetween(last.date, today);
  const state: State = isTerminal(last.stage) ? "closed" : daysSince >= staleDays ? "stale" : "active";
  return {
    name, company: app.metadata.company, role: app.metadata.role,
    state, stage: last.stage, counts, lastDate: last.date, daysSince,
  };
}

/**
 * Adds an event where its date puts it, not only at the end: logging late
 * ("the test was on Tuesday") is the normal case. Ties go after existing
 * events of the same date. `index` is where the event landed.
 */
export function insertEvent(
  events: readonly TrackingEvent[],
  event: TrackingEvent,
  today: string,
): { events: TrackingEvent[]; index: number } {
  if (!IsoDate.safeParse(event.date).success) throw new Error(`Date "${event.date}" is not "YYYY-MM-DD"`);
  if (event.date > today) {
    throw new Error(`${event.date} is in the future (today is ${today}). Only events that already happened are recorded.`);
  }
  const last = events.at(-1);
  if (last && isTerminal(last.stage) && event.date >= last.date) {
    throw new Error(`This application is already closed: ${last.stage} on ${last.date}.`);
  }
  let index = events.length;
  while (index > 0 && events[index - 1]!.date > event.date) index--;
  const next = [...events.slice(0, index), event, ...events.slice(index)];
  const problem = trackingProblem(next);
  if (problem) throw new Error(`Cannot record ${event.stage} on ${event.date}: ${problem}.`);
  return { events: next, index };
}
