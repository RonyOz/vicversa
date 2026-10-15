import assert from "node:assert/strict";
import { test } from "node:test";
import { Application, trackingProblem } from "../src/schema.js";

const base = { metadata: { language: "es" }, content: { sections: [] } };
const withTracking = (tracking: unknown) => Application.safeParse({ ...base, tracking });
const messages = (result: ReturnType<typeof withTracking>) =>
  result.success ? [] : result.error.issues.map((i) => i.message).join("\n");

test("tracking is optional", () => {
  assert.equal(Application.safeParse(base).success, true);
});

test("stages repeat and need no fixed order", () => {
  const result = withTracking([
    { date: "2026-10-01", stage: "applied" },
    { date: "2026-10-03", stage: "interview", note: "RH" },
    { date: "2026-10-03", stage: "interview" },
    { date: "2026-10-09", stage: "assessment" },
    { date: "2026-10-12", stage: "rejected" },
  ]);
  assert.equal(result.success, true);
});

test("rejects dates out of order", () => {
  const result = withTracking([
    { date: "2026-10-05", stage: "applied" },
    { date: "2026-10-01", stage: "interview" },
  ]);
  assert.match(String(messages(result)), /date order/);
});

test("rejects anything after a terminal stage", () => {
  const result = withTracking([
    { date: "2026-10-01", stage: "applied" },
    { date: "2026-10-02", stage: "rejected" },
    { date: "2026-10-03", stage: "interview" },
  ]);
  assert.match(String(messages(result)), /terminal stage: rejected on 2026-10-02/);
});

test("rejects an empty list, a bad date and an unknown stage", () => {
  assert.equal(withTracking([]).success, false);
  assert.equal(withTracking([{ date: "2026-1-5", stage: "applied" }]).success, false);
  assert.equal(withTracking([{ date: "2026-10-01", stage: "ghosted" }]).success, false);
});

test("trackingProblem returns null for a valid timeline", () => {
  assert.equal(trackingProblem([{ date: "2026-10-01", stage: "applied" }]), null);
});
