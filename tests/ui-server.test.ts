import assert from "node:assert/strict";
import { copyFileSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { createUiServer } from "../src/ui/server.js";

const APPS = resolve(import.meta.dirname, "../applications");
const server = await createUiServer({ today: () => "2026-10-14", vite: false });
let base = "";

before(async () => {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((done) => server.close(() => done())));

const postJson = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const withScratch = async (name: string, fn: (path: string) => Promise<void>) => {
  const scratch = join(APPS, `${name}.yaml`);
  copyFileSync(join(APPS, "2026-10-bluth-junior-python-developer.yaml"), scratch);
  try {
    await fn(scratch);
  } finally {
    rmSync(scratch, { force: true });
  }
};

test("GET /api/dashboard returns rows with send date, language and posting url", async () => {
  const response = await fetch(`${base}/api/dashboard`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.today, "2026-10-14");
  assert.equal(data.funnel.total, data.rows.length);
  const globex = data.rows.find((r: { name: string }) => r.name === "2026-10-globex-desarrollador-sistemas-cuentas");
  assert.equal(globex.applied, "2026-10-01");
  assert.equal(globex.language, "es");
  assert.ok("url" in globex);
  assert.ok(!data.rows.some((r: { name: string }) => r.name === "baseline-es")); // templates are not tracked
});

test("GET /api/applications/:name returns metadata notes and timeline", async () => {
  const data = await (await fetch(`${base}/api/applications/2026-10-globex-desarrollador-sistemas-cuentas`)).json();
  assert.equal(data.application.metadata.company, "Globex");
  assert.match(data.application.metadata.notes, /posting/);
  assert.deepEqual(data.timeline[0], { date: "2026-10-01", stage: "applied" });
});

test("GET /api/cv/:name.html serves the CV page itself", async () => {
  const response = await fetch(`${base}/api/cv/baseline-es.html`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await response.text(), /<!doctype html>/i);
});

test("POST /api/track records and POST /api/undo removes it", async () => {
  await withScratch("zz-ui-api", async (scratch) => {
    const tracked = await postJson("/api/track", { name: "zz-ui-api", stage: "interview", date: "2026-10-13", note: "RH" });
    assert.equal(tracked.status, 200);
    assert.equal((await tracked.json()).summary.stage, "interview");
    assert.match(readFileSync(scratch, "utf8"), /stage: interview, note: "RH"/);

    const undone = await postJson("/api/undo", { name: "zz-ui-api" });
    assert.equal(undone.status, 200);
    assert.equal((await undone.json()).removed.stage, "interview");
    assert.doesNotMatch(readFileSync(scratch, "utf8"), /stage: interview/);
  });
});

test("expected failures are 400 with the actionable message", async () => {
  const future = await postJson("/api/track", { name: "2026-10-monarch-ai-fullstack-student", stage: "interview", date: "2099-01-01" });
  assert.equal(future.status, 400);
  assert.match((await future.json()).error, /in the future/);
  const missing = await fetch(`${base}/api/applications/initech`);
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /Did you mean/);
});

test("unknown API routes are 404", async () => {
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
});

test("GET /api/cvs lists every CV, templates included", async () => {
  const data = await (await fetch(`${base}/api/cvs`)).json();
  assert.equal(data.cvs.length, 38);
  const template = data.cvs.find((c: { name: string }) => c.name === "baseline-es");
  assert.equal(template.tracked, false);
  assert.equal(template.applied, null);
  const globex = data.cvs.find((c: { name: string }) => c.name === "2026-10-globex-desarrollador-sistemas-cuentas");
  assert.equal(globex.applied, "2026-10-01");
  assert.equal(globex.summaryId, "globex_cuentas_lifecycle");
});

test("GET /api/cvs/:name returns its pieces and tracking", async () => {
  const data = await (await fetch(`${base}/api/cvs/2026-10-globex-desarrollador-sistemas-cuentas`)).json();
  assert.equal(data.pieces.summary, "globex_cuentas_lifecycle");
  assert.equal(data.pieces.items[0].id, "northwind");
  assert.equal(data.tracking.state, "active");
});

test("GET /api/catalog returns every part with usage", async () => {
  const data = await (await fetch(`${base}/api/catalog`)).json();
  assert.ok(Array.isArray(data.catalog.experiences) && data.catalog.skills.skills.length > 0);
  assert.ok(data.usage.pieces["summary:globex_cuentas_lifecycle"].includes("2026-10-globex-desarrollador-sistemas-cuentas"));
  assert.equal(data.apps["baseline-es"].tracked, false);
});

test("GET /api/fit measures every CV once and then serves the cache", async () => {
  const first = await (await fetch(`${base}/api/fit`)).json();
  assert.equal(Object.keys(first.fit).length, 38);
  assert.equal(first.fit["baseline-es"].ok, true);
  assert.equal(typeof first.fit["baseline-es"].spareLines, "number");
  const started = Date.now();
  const second = await (await fetch(`${base}/api/fit`)).json();
  assert.ok(Date.now() - started < 500, "second call should be cached");
  assert.deepEqual(second, first);
});
