import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { assess, verdict } from "../src/validate.js";
import { cases, doc, fits, over, skillClipped, theme, wayOver } from "./verdict-fixtures.js";

// Snapshots of verdict() captured before assess() existed: the CLI text must not change.
for (const [name, [d, m]] of Object.entries(cases)) {
  test(`verdict text is unchanged: ${name}`, () => {
    const expected = readFileSync(resolve(import.meta.dirname, `fixtures/verdict-${name}.txt`), "utf8");
    const v = verdict(name, d, m, theme);
    assert.equal(`${v.ok}\n${v.report}\n`, expected);
  });
}

test("assess reports spare room when it fits", () => {
  const a = assess(doc("distributed_ai"), fits, theme);
  assert.equal(a.ok, true);
  assert.equal(a.overflow, -15.9);
  assert.ok(Math.abs(a.spare - 15.9) < 1e-9);
  assert.equal(a.spareLines.toFixed(1), "1.2");
  assert.deepEqual(a.cuts, []);
  assert.equal(a.smallestCut, null);
});

test("assess lists cuts cheapest first and the smallest one that is enough", () => {
  const a = assess(doc("distributed_ai"), over, theme);
  assert.equal(a.ok, false);
  assert.deepEqual(
    a.cuts.map((c) => `${c.kind}:${c.id}`),
    [
      "summary:cloud_architect", "bullet:routewise.arch", "summary:ux_architecture",
      "bullet:andina_monitor.students", "bullet:northwind.ddd", "item:routewise", "item:northwind",
    ],
  );
  assert.equal(a.smallestCut?.id, "ux_architecture");
  assert.equal(a.cuts.find((c) => c.id === "northwind.ddd")?.enough, true);
  assert.equal(a.cuts.find((c) => c.id === "routewise.arch")?.enough, false);
});

test("assess says no single cut is enough", () => {
  assert.equal(assess(doc(undefined), wayOver, theme).smallestCut, null);
});

test("assess: clipped skill rows make it not ok even when it fits", () => {
  const a = assess(doc("distributed_ai", ["w"]), skillClipped, theme);
  assert.equal(a.ok, false);
  assert.deepEqual(a.skillOverflows, [{ label: "DevOps", overflow: 4.2 }]);
  assert.deepEqual(a.warnings, ["w"]);
});
