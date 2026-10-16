import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { loadConfig } from "../src/config.js";
import { dataRoot, TOOL_ROOT } from "../src/paths.js";

test("dataRoot follows VICVERSA_HOME and falls back to the bundled demo", () => {
  const saved = process.env["VICVERSA_HOME"];
  try {
    process.env["VICVERSA_HOME"] = "/tmp/somewhere";
    assert.equal(dataRoot(), "/tmp/somewhere");
    process.env["VICVERSA_HOME"] = "examples/demo";
    assert.equal(dataRoot(), resolve(TOOL_ROOT, "examples/demo"));
    delete process.env["VICVERSA_HOME"];
    assert.equal(dataRoot(), resolve(TOOL_ROOT, "examples/demo"));
  } finally {
    if (saved === undefined) delete process.env["VICVERSA_HOME"];
    else process.env["VICVERSA_HOME"] = saved;
  }
});

test("loadConfig defaults to the harvard template and validates the file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vicversa-config-"));
  try {
    assert.deepEqual(await loadConfig(dir), { template: "harvard" });
    writeFileSync(join(dir, "vicversa.yaml"), "template: classic-ats\n");
    assert.deepEqual(await loadConfig(dir), { template: "classic-ats" });
    writeFileSync(join(dir, "vicversa.yaml"), "template: 42\n");
    await assert.rejects(loadConfig(dir), /vicversa.yaml is not valid/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
