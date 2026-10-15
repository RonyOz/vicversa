import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  findApplication, getApplication, getCatalog, getStatus, listApplications,
  renderApplication, trackEvent, validateApplications,
} from "../src/ops.js";

const APPS = resolve(import.meta.dirname, "../applications");
const today = "2026-10-14";

test("findApplication suggests close names", async () => {
  assert.equal(await findApplication("baseline-es.yaml"), "baseline-es");
  await assert.rejects(findApplication("initech"), /Did you mean: .*initech-sre-intern/);
});

test("listApplications filters by company or role and marks templates", async () => {
  const initech = await listApplications({ query: "initech", today });
  assert.equal(initech.length, 5);
  assert.ok(initech.every((a) => a.company === "Initech" && a.tracked));
  const all = await listApplications({ today });
  const template = all.find((a) => a.name === "baseline-es")!;
  assert.equal(template.tracked, false);
  assert.equal(template.state, null);
});

test("getApplication returns parsed data, timeline and path", async () => {
  const app = await getApplication("2026-10-globex-desarrollador-sistemas-cuentas", { today });
  assert.equal(app.application.metadata.company, "Globex");
  assert.deepEqual(app.timeline, [{ date: "2026-10-01", stage: "applied" }]);
  assert.equal(app.summary?.daysSince, 13);
  assert.ok(app.path.endsWith("applications/2026-10-globex-desarrollador-sistemas-cuentas.yaml"));
});

test("getCatalog returns only the parts asked for, collapsed to one language", async () => {
  const both = await getCatalog(["summaries"]);
  assert.deepEqual(Object.keys(both), ["summaries"]);
  const es = (await getCatalog(["summaries", "skills"], "es")) as {
    summaries: { id: string; text: unknown }[];
    skills: { skills: unknown[]; groups: unknown[] };
  };
  assert.ok(es.summaries.every((s) => typeof s.text === "string"));
  assert.ok(Array.isArray(es.skills.skills) && Array.isArray(es.skills.groups));
});

test("getStatus counts every tracked application once", async () => {
  const status = await getStatus({ today });
  const f = status.funnel;
  assert.equal(f.total, status.applications.length);
  assert.equal(f.waiting + f.silent + f.withdrawnSilent + f.responded, f.total);
  assert.equal(status.pace.weeks.length, 8);
});

test("validateApplications reports a bad name without aborting the batch", async () => {
  const results = await validateApplications(["baseline-es", "nope-not-here"]);
  assert.equal(results[0]!.ok, true);
  assert.equal(results[0]!.assessment?.fits, true);
  assert.equal(results[1]!.ok, false);
  assert.match(results[1]!.error!, /No application "nope-not-here"/);
});

test("renderApplication writes the PDF where asked", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vicversa-"));
  try {
    const out = join(dir, "cv.pdf");
    const result = await renderApplication("baseline-es", { out });
    assert.equal(result.written, true);
    assert.equal(result.pdfPath, out);
    assert.ok(existsSync(out));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("trackEvent records into the file and returns the new state", async () => {
  const scratch = join(APPS, "zz-ops-test.yaml");
  copyFileSync(join(APPS, "2026-10-bluth-junior-python-developer.yaml"), scratch);
  try {
    const result = await trackEvent("zz-ops-test", { stage: "interview", note: "RH" }, today);
    assert.deepEqual(result.event, { date: today, stage: "interview", note: "RH" });
    assert.equal(result.events.length, 2);
    assert.equal(result.summary?.stage, "interview");
    await assert.rejects(trackEvent("zz-ops-test", { stage: "ghosted" }, today), /Valid stages/);
  } finally {
    rmSync(scratch, { force: true });
  }
});
