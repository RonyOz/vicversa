import assert from "node:assert/strict";
import { test } from "node:test";
import type { TrackingEvent } from "../src/schema.js";
import { funnel } from "../src/tracking.js";
import { funnelSegments, timeAxis, timelineGroups } from "../src/ui/layout.js";

const ev = (date: string, stage: TrackingEvent["stage"]): TrackingEvent => ({ date, stage });

test("funnelSegments: shares of the total, fixed order, empty buckets dropped", () => {
  const f = funnel(
    [
      [ev("2026-10-10", "applied")],
      [ev("2026-09-01", "applied")],
      [ev("2026-09-01", "applied")],
      [ev("2026-09-01", "applied"), ev("2026-09-05", "rejected")],
    ],
    "2026-10-14",
    21,
  );
  const segments = funnelSegments(f);
  assert.deepEqual(segments.map((s) => [s.key, s.count]), [["waiting", 1], ["silent", 2], ["rejected", 1]]);
  assert.equal(segments.reduce((sum, s) => sum + s.share, 0), 1);
  assert.deepEqual(segments.map((s) => s.offset), [0, 0.25, 0.75]);
});

test("timeAxis maps dates linearly and gives month ticks", () => {
  const axis = timeAxis("2026-08-27", "2026-10-14", 480);
  assert.equal(axis.x("2026-08-27"), 0);
  assert.equal(axis.x("2026-10-14"), 480);
  assert.equal(axis.x("2026-09-20"), 240);
  assert.deepEqual(axis.ticks.map((t) => t.label), ["sep", "oct"]);
});

test("timelineGroups: active, then no response, then closed; most recent movement first", () => {
  const groups = timelineGroups(
    [
      { name: "a", state: "stale", daysSince: 30, events: [ev("2026-09-14", "applied")] },
      { name: "b", state: "closed", daysSince: 0, events: [ev("2026-09-01", "applied"), ev("2026-10-14", "rejected")] },
      { name: "c", state: "active", daysSince: 2, events: [ev("2026-10-12", "applied")] },
      { name: "d", state: "stale", daysSince: 22, events: [ev("2026-09-22", "applied")] },
    ],
  );
  assert.deepEqual(groups.map((g) => [g.state, g.rows.map((r) => r.name)]), [
    ["active", ["c"]],
    ["stale", ["d", "a"]],
    ["closed", ["b"]],
  ]);
});

test("calendarGrid: one column per week, Monday first, daily applied counts", async () => {
  const { calendarGrid } = await import("../src/ui/layout.js");
  const grid = calendarGrid(
    [
      [ev("2026-09-22", "applied"), ev("2026-09-25", "interview")],
      [ev("2026-09-22", "applied")],
      [ev("2026-10-13", "applied")],
    ],
    "2026-10-14",
    4,
  );
  assert.deepEqual(grid.weeks.map((w) => w.range), ["21–27", "28–4", "5–11", "12–18"]);
  assert.deepEqual(grid.weeks.map((w) => w.month), ["sep", "oct", null, null]);
  assert.deepEqual(grid.weeks.map((w) => w.total), [2, 0, 0, 1]);
  const tuesday = grid.weeks[0]!.days[1]!;
  assert.deepEqual([tuesday.date, tuesday.count], ["2026-09-22", 2]);
  const last = grid.weeks[3]!.days;
  assert.equal(last[2]!.today, true); // Wed 14 oct
  assert.equal(last[3]!.future, true); // Thu 15 oct
  assert.equal(grid.max, 2);
});

test("calendarLevel buckets counts into 0–4", async () => {
  const { calendarLevel } = await import("../src/ui/layout.js");
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map(calendarLevel), [0, 1, 2, 3, 3, 4, 4]);
});

test("calendarGrid: offset shows earlier weeks, today stays today", async () => {
  const { calendarGrid } = await import("../src/ui/layout.js");
  const grid = calendarGrid([[ev("2026-09-22", "applied")]], "2026-10-14", 2, undefined, 4);
  assert.deepEqual(grid.weeks.map((w) => w.start), ["2026-09-07", "2026-09-14"]);
  assert.equal(grid.weeks.some((w) => w.days.some((d) => d.today || d.future)), false);
});

test("calendarPages: how many windows back reach the first application", async () => {
  const { calendarPages } = await import("../src/ui/layout.js");
  const today = "2026-10-14"; // week of 12 oct
  assert.equal(calendarPages([], today, 8), 0);
  assert.equal(calendarPages([[ev("2026-08-24", "applied")]], today, 8), 0); // 7 weeks back: on screen
  assert.equal(calendarPages([[ev("2026-08-17", "applied")]], today, 8), 1); // 8 weeks back
  assert.equal(calendarPages([[ev("2026-06-29", "applied")], [ev("2026-10-01", "applied")]], today, 8), 1); // 15 back
  assert.equal(calendarPages([[ev("2026-06-22", "applied")]], today, 8), 2); // 16 back
});
