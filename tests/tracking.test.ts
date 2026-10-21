import assert from "node:assert/strict";
import { test } from "node:test";
import type { Application, TrackingEvent } from "../src/schema.js";
import {
  daysBetween, insertEvent, localToday, parseStage, summarize, timeline,
} from "../src/tracking.js";

const app = (extra: Partial<Application> & { date_submitted?: string } = {}): Application => ({
  metadata: { language: "es", company: "Acme", role: "Dev", date_submitted: extra.date_submitted },
  content: {
    sections: [], section_titles: {}, skills: [],
    projects: [], experience: [], certifications: [], education: [],
  },
  ...(extra.tracking ? { tracking: extra.tracking } : {}),
});
const ev = (date: string, stage: TrackingEvent["stage"], note?: string): TrackingEvent =>
  note === undefined ? { date, stage } : { date, stage, note };

test("localToday uses the local calendar day, not UTC", () => {
  process.env.TZ = "America/Bogota";
  // 20:30 in Bogotá is already the next day in UTC.
  assert.equal(localToday(new Date(Date.UTC(2026, 9, 15, 1, 30))), "2026-10-14");
});

test("daysBetween counts calendar days", () => {
  assert.equal(daysBetween("2026-10-01", "2026-10-22"), 21);
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
});

test("parseStage rejects unknown stages with the valid list", () => {
  assert.equal(parseStage("interview"), "interview");
  assert.throws(() => parseStage("ghosted"), /Valid stages: applied, assessment/);
});

test("timeline: explicit, implicit from date_submitted, or template", () => {
  assert.deepEqual(timeline(app({ tracking: [ev("2026-10-02", "applied")] })), [ev("2026-10-02", "applied")]);
  assert.deepEqual(timeline(app({ date_submitted: "2026-10-01" })), [ev("2026-10-01", "applied")]);
  assert.equal(timeline(app()), null);
  assert.throws(() => timeline(app({ date_submitted: "Oct 1" })), /not "YYYY-MM-DD"/);
});

test("explicit tracking wins over date_submitted", () => {
  const result = timeline(app({ date_submitted: "2026-09-01", tracking: [ev("2026-10-02", "applied")] }));
  assert.deepEqual(result, [ev("2026-10-02", "applied")]);
});

test("summarize derives state at the stale boundary", () => {
  const a = app({ date_submitted: "2026-10-01" });
  assert.equal(summarize("a", a, "2026-10-21", 21)?.state, "active"); // 20 days
  assert.equal(summarize("a", a, "2026-10-22", 21)?.state, "stale"); // exactly 21
  assert.equal(summarize("t", app(), "2026-10-22", 21), null);
});

test("summarize: closed, current stage, counts, days since", () => {
  const a = app({ tracking: [ev("2026-10-01", "applied"), ev("2026-10-03", "interview"), ev("2026-10-05", "interview")] });
  assert.deepEqual(summarize("a", a, "2026-10-10", 21), {
    name: "a", company: "Acme", role: "Dev", state: "active", stage: "interview",
    counts: { applied: 1, interview: 2 }, lastDate: "2026-10-05", daysSince: 5,
  });
  const closed = app({ tracking: [ev("2026-10-01", "applied"), ev("2026-10-02", "rejected")] });
  assert.equal(summarize("c", closed, "2027-01-01", 21)?.state, "closed");
});

test("insertEvent appends, inserts in date order, and puts ties last", () => {
  const base = [ev("2026-10-01", "applied"), ev("2026-10-05", "interview")];
  assert.deepEqual(insertEvent(base, ev("2026-10-09", "interview"), "2026-10-10").index, 2);
  const middle = insertEvent(base, ev("2026-10-03", "assessment"), "2026-10-10");
  assert.equal(middle.index, 1);
  assert.deepEqual(middle.events.map((e) => e.stage), ["applied", "assessment", "interview"]);
  assert.equal(insertEvent(base, ev("2026-10-05", "assessment"), "2026-10-10").index, 2);
});

test("insertEvent refuses future dates", () => {
  assert.throws(
    () => insertEvent([ev("2026-10-01", "applied")], ev("2026-10-11", "interview"), "2026-10-10"),
    /in the future \(today is 2026-10-10\)/,
  );
});

test("insertEvent allows before a terminal, refuses on or after it", () => {
  const closed = [ev("2026-10-01", "applied"), ev("2026-10-10", "rejected")];
  assert.equal(insertEvent(closed, ev("2026-10-05", "interview"), "2026-10-20").index, 1);
  assert.throws(() => insertEvent(closed, ev("2026-10-10", "interview"), "2026-10-20"), /already closed: rejected on 2026-10-10/);
  assert.throws(() => insertEvent(closed, ev("2026-10-12", "offer"), "2026-10-20"), /already closed/);
});

test("insertEvent refuses a terminal that would not be last", () => {
  const base = [ev("2026-10-01", "applied"), ev("2026-10-10", "interview")];
  assert.throws(() => insertEvent(base, ev("2026-10-05", "rejected"), "2026-10-20"), /nothing but reopened can follow a terminal stage/);
});

test("summarize: interactions keep the stage, reopened makes it active again", () => {
  const postponed = app({ tracking: [ev("2026-10-01", "applied"), ev("2026-10-05", "interview"), ev("2026-10-15", "interaction", "Postponed")] });
  const summary = summarize("p", postponed, "2026-10-20", 21);
  assert.equal(summary?.stage, "interview");
  assert.equal(summary?.daysSince, 5);
  const reopened = app({ tracking: [ev("2026-09-01", "applied"), ev("2026-09-05", "rejected"), ev("2026-10-15", "reopened")] });
  assert.deepEqual([summarize("r", reopened, "2026-10-20", 21)?.state, summarize("r", reopened, "2026-10-20", 21)?.stage], ["active", "reopened"]);
});

test("insertEvent: only reopened may follow a terminal, and only right after one", () => {
  const closed = [ev("2026-10-01", "applied"), ev("2026-10-10", "rejected")];
  const reopened = insertEvent(closed, ev("2026-10-15", "reopened"), "2026-10-20").events;
  assert.equal(insertEvent(reopened, ev("2026-10-18", "interview"), "2026-10-20").index, 3);
  assert.throws(() => insertEvent(closed, ev("2026-10-15", "interaction"), "2026-10-20"), /already closed/);
  assert.throws(
    () => insertEvent([ev("2026-10-01", "applied")], ev("2026-10-05", "reopened"), "2026-10-20"),
    /must come right after a terminal stage/,
  );
  assert.throws(() => insertEvent(reopened, ev("2026-10-12", "interview"), "2026-10-20"), /nothing but reopened/);
});
