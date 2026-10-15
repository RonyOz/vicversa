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
