import assert from "node:assert/strict";
import { test } from "node:test";
import type { TrackingEvent } from "../src/schema.js";
import { funnel, pace, weekStart } from "../src/tracking.js";

const ev = (date: string, stage: TrackingEvent["stage"]): TrackingEvent => ({ date, stage });

test("weekStart returns the Monday, Sunday belongs to the previous week", () => {
  assert.equal(weekStart("2026-10-12"), "2026-10-12"); // Monday
  assert.equal(weekStart("2026-10-18"), "2026-10-12"); // Sunday
  assert.equal(weekStart("2026-10-19"), "2026-10-19"); // next Monday
});

test("pace counts applied events per week, oldest first, with empty weeks", () => {
  const result = pace(
    [
      [ev("2026-09-22", "applied"), ev("2026-09-25", "interview")],
      [ev("2026-09-27", "applied")], // Sunday, same week as 09-22
      [ev("2026-10-13", "applied")],
      [ev("2026-08-01", "applied")], // outside the window
    ],
    "2026-10-14",
    4,
  );
  assert.deepEqual(result.weeks, [
    { start: "2026-09-21", count: 2 },
    { start: "2026-09-28", count: 0 },
    { start: "2026-10-05", count: 0 },
    { start: "2026-10-12", count: 1 },
  ]);
  assert.equal(result.average, 0.75);
});

test("funnel puts each application in exactly one bucket", () => {
  const today = "2026-10-30";
  const f = funnel(
    [
      [ev("2026-10-20", "applied")], // waiting
      [ev("2026-10-09", "applied")], // silent: exactly 21 days
      [ev("2026-09-01", "applied"), ev("2026-09-10", "withdrawn")], // withdrawn, no response
      [ev("2026-09-01", "applied"), ev("2026-09-05", "rejected")], // rejected directly
      [ev("2026-09-01", "applied"), ev("2026-09-05", "assessment")], // advanced, ongoing
      [ev("2026-09-01", "applied"), ev("2026-09-05", "interview"), ev("2026-09-08", "interview"), ev("2026-09-20", "rejected")],
      [ev("2026-09-01", "applied"), ev("2026-09-05", "interview"), ev("2026-09-20", "offer"), ev("2026-09-25", "withdrawn")],
    ],
    today,
    21,
  );
  assert.equal(f.total, 7);
  assert.equal(f.waiting, 1);
  assert.equal(f.silent, 1);
  assert.equal(f.withdrawnSilent, 1);
  assert.equal(f.rejectedDirect, 1);
  assert.equal(f.advancedTotal, 3);
  assert.equal(f.advanced.assessment.ongoing, 1);
  assert.equal(f.advanced.interview.rejected, 1);
  assert.equal(f.advanced.offer.withdrawn, 1);
  assert.equal(f.responded, 4);
  assert.equal(f.resolved, 6);
  assert.equal(f.waiting + f.silent + f.withdrawnSilent + f.responded, f.total);
});

test("funnel: interactions are not responses, reopened processes count by where they are now", () => {
  const today = "2026-10-30";
  const f = funnel(
    [
      [ev("2026-10-01", "applied"), ev("2026-10-25", "interaction")], // waiting: the interaction resets the clock
      // Reopened after reaching interview: still counts the reach, ongoing.
      [ev("2026-09-01", "applied"), ev("2026-09-05", "interview"), ev("2026-09-10", "rejected"), ev("2026-10-20", "reopened")],
      // Reopened after a direct rejection: waiting again, not a rejection.
      [ev("2026-09-01", "applied"), ev("2026-09-05", "rejected"), ev("2026-10-20", "reopened")],
      // Rejected again after reopening: a direct rejection once more.
      [ev("2026-09-01", "applied"), ev("2026-09-05", "rejected"), ev("2026-09-20", "reopened"), ev("2026-09-25", "rejected")],
    ],
    today,
    21,
  );
  assert.equal(f.waiting, 2);
  assert.equal(f.advanced.interview.ongoing, 1);
  assert.equal(f.rejectedDirect, 1);
  assert.equal(f.waiting + f.silent + f.withdrawnSilent + f.responded, f.total);
});
