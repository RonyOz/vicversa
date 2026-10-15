import assert from "node:assert/strict";
import { copyFileSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { createUiServer } from "../src/ui/server.js";

const APPS = resolve(import.meta.dirname, "../applications");
const server = createUiServer({ today: () => "2026-10-14" });
let base = "";

before(async () => {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((done) => server.close(() => done())));

const post = (path: string, fields: Record<string, string>) =>
  fetch(`${base}${path}`, { method: "POST", body: new URLSearchParams(fields), redirect: "manual" });

test("the dashboard renders the funnel, pace and every tracked application", async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  const html = await response.text();
  assert.match(html, /Enviadas/);
  assert.match(html, /Ritmo/);
  assert.match(html, /2026-10-globex-desarrollador-sistemas-cuentas/);
  assert.doesNotMatch(html, /baseline-es/); // templates are not tracked
  // Every row says when it was sent, so time can be measured from there.
  assert.match(html, /aplicada 1 oct/); // Globex
  assert.match(html, /aplicada 23 sep<\/div><div[^>]*>rechazo 14 oct · 21d/); // Initech SWE: whole process
});

test("recording an event redirects back with a confirmation", async () => {
  const scratch = join(APPS, "zz-ui-test.yaml");
  copyFileSync(join(APPS, "2026-10-bluth-junior-python-developer.yaml"), scratch);
  try {
    const response = await post("/track", { name: "zz-ui-test", stage: "interview", date: "2026-10-13", note: "RH" });
    assert.equal(response.status, 303);
    assert.match(response.headers.get("location") ?? "", /^\/\?ok=/);
    assert.match(readFileSync(scratch, "utf8"), /stage: interview, note: "RH"/);

    const page = await (await fetch(`${base}${response.headers.get("location")}`)).text();
    assert.match(page, /zz-ui-test: interview/);
  } finally {
    rmSync(scratch, { force: true });
  }
});

test("an invalid event redirects back with the error and writes nothing", async () => {
  const response = await post("/track", { name: "2026-10-monarch-ai-fullstack-student", stage: "interview", date: "2099-01-01" });
  assert.equal(response.status, 303);
  const location = response.headers.get("location") ?? "";
  assert.match(decodeURIComponent(location), /error=.*in the future/);
});

test("unknown paths are 404", async () => {
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});
