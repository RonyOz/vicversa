import assert from "node:assert/strict";
import { test } from "node:test";
import type { TrackingEvent } from "../src/schema.js";
import { funnel, pace, type TrackSummary } from "../src/tracking.js";
import { formatFunnel, formatPace, formatTable, formatTimeline } from "../src/tracking-report.js";

const ev = (date: string, stage: TrackingEvent["stage"], note?: string): TrackingEvent =>
  note === undefined ? { date, stage } : { date, stage, note };

test("pace shows one bar per week and the average", () => {
  const out = formatPace(pace([[ev("2026-10-13", "applied")], [ev("2026-10-14", "applied")]], "2026-10-14", 2));
  assert.match(out, /oct 05\s+0/);
  assert.match(out, /oct 12 ██\s+2/);
  assert.match(out, /average 1\.0\/week over 2 weeks/);
});

test("funnel always shows its denominators", () => {
  const f = funnel(
    [
      [ev("2026-10-20", "applied")],
      [ev("2026-09-01", "applied")],
      [ev("2026-09-01", "applied"), ev("2026-09-05", "interview")],
    ],
    "2026-10-22",
    21,
  );
  const out = formatFunnel(f, 21);
  assert.match(out, /^3 sent/);
  assert.match(out, /1 waiting \(<21 days\)/);
  assert.match(out, /1 no response \(21\+ days\)/);
  assert.match(out, /1 responded \(1 of 2 past the waiting window\)/);
  assert.match(out, /reached interview: 1 ongoing/);
});

const summary = (name: string, state: TrackSummary["state"], extra: Partial<TrackSummary> = {}): TrackSummary => ({
  name, company: "Acme", role: "Dev", state, stage: "applied", counts: { applied: 1 },
  lastDate: "2026-10-01", daysSince: 3, ...extra,
});

test("table groups by state and shows repeat counts", () => {
  const out = formatTable([
    summary("b", "stale", { daysSince: 30 }),
    summary("a", "active", { stage: "interview", counts: { applied: 1, interview: 2 } }),
  ]);
  assert.ok(out.indexOf("Active (1)") < out.indexOf("No response (1)"));
  assert.match(out, /interview ×2/);
  assert.match(out, /30d/);
});

test("timeline shows notes and days between events", () => {
  const out = formatTimeline(summary("a", "active", { stage: "interview", daysSince: 2 }), [
    ev("2026-10-01", "applied"),
    ev("2026-10-05", "interview", "RH"),
  ]);
  assert.match(out, /2026-10-05 {2}interview\s+RH\s+\+4d/);
  assert.match(out, /active · 2 days since last event/);
});
