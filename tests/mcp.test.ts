import assert from "node:assert/strict";
import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/mcp-server.js";
import { applicationsDir } from "../src/paths.js";

const APPS = applicationsDir();
const client = new Client({ name: "test", version: "0.0.0" });

before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  await client.connect(clientSide);
});
after(() => client.close());

type Result = Awaited<ReturnType<typeof client.callTool>>;
const text = (result: Result) => (result.content as { type: string; text: string }[]).map((c) => c.text).join("\n");
const data = (result: Result) => result.structuredContent as Record<string, any>;

test("exposes every tool with honest annotations", async () => {
  const { tools } = await client.listTools();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  assert.deepEqual(
    [...byName.keys()].sort(),
    ["get_application", "get_catalog", "get_status", "list_applications", "render", "track", "undo_last_event", "validate"],
  );
  assert.equal(byName.get("undo_last_event")!.annotations?.destructiveHint, true);
  for (const name of ["get_application", "get_catalog", "get_status", "list_applications", "validate"]) {
    assert.equal(byName.get(name)!.annotations?.readOnlyHint, true, name);
  }
  assert.equal(byName.get("track")!.annotations?.readOnlyHint, false);
  assert.equal(byName.get("track")!.annotations?.idempotentHint, false);
  assert.equal(byName.get("render")!.annotations?.idempotentHint, true);
  assert.ok(tools.every((tool) => tool.outputSchema && tool.description));
});

test("get_status returns the funnel as data and the CLI report as text", async () => {
  const result = await client.callTool({ name: "get_status", arguments: {} });
  assert.notEqual(result.isError, true);
  const f = data(result).funnel;
  assert.equal(f.waiting + f.silent + f.withdrawnSilent + f.responded, f.total);
  assert.match(text(result), /sent\n├─/);
});

test("list_applications narrows by query", async () => {
  const result = await client.callTool({ name: "list_applications", arguments: { query: "initech" } });
  assert.equal(data(result).applications.length, 2);
});

test("get_catalog collapses to one language", async () => {
  const result = await client.callTool({
    name: "get_catalog",
    arguments: { parts: ["summaries"], language: "en" },
  });
  const summaries = data(result).catalog.summaries as { text: unknown }[];
  assert.ok(summaries.length > 0 && summaries.every((s) => typeof s.text === "string"));
});

test("a misspelled name is a tool error with suggestions", async () => {
  const result = await client.callTool({ name: "get_application", arguments: { name: "initech" } });
  assert.equal(result.isError, true);
  assert.match(text(result), /Did you mean: .*initech/);
});

test("validate measures in Chromium and returns the assessment", async () => {
  const result = await client.callTool({ name: "validate", arguments: { names: ["baseline-es", "nope"] } });
  const [good, bad] = data(result).results;
  assert.equal(good.ok, true);
  assert.equal(good.assessment.fits, true);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /No application "nope"/);
});

test("track records an event on a scratch copy", async () => {
  const scratch = join(APPS, "zz-mcp-test.yaml");
  copyFileSync(join(APPS, "2026-10-contoso-backend-engineer.yaml"), scratch);
  try {
    const result = await client.callTool({
      name: "track",
      arguments: { name: "zz-mcp-test", stage: "rejected", date: "2026-10-14", note: "correo" },
    });
    assert.notEqual(result.isError, true, text(result));
    assert.equal(data(result).events.length, 2);
    assert.equal(data(result).summary.state, "closed");
    const again = await client.callTool({ name: "track", arguments: { name: "zz-mcp-test", stage: "interview" } });
    assert.equal(again.isError, true);
    assert.match(text(again), /already closed: rejected on 2026-10-14/);
    const undo = await client.callTool({ name: "undo_last_event", arguments: { name: "zz-mcp-test" } });
    assert.notEqual(undo.isError, true, text(undo));
    assert.equal(data(undo).removed.stage, "rejected");
    assert.equal(data(undo).summary.state, "active");
  } finally {
    rmSync(scratch, { force: true });
  }
});
