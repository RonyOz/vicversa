import assert from "node:assert/strict";
import { test } from "node:test";
import { loadApplication, loadCatalog } from "../src/catalog.js";
import { pieceKey, piecesOf, usageIndex } from "../src/usage.js";

const catalog = await loadCatalog();
const globex = await loadApplication("2026-10-globex-desarrollador-sistemas-cuentas");

test("piecesOf lists the summary, items with their bullets in render order, education and skills", () => {
  const pieces = piecesOf(globex, catalog);
  assert.equal(pieces.summary, "globex_cuentas_lifecycle");
  assert.deepEqual(pieces.items.slice(0, 2), [
    { kind: "experience", id: "northwind", bullets: ["northwind.ddd", "northwind.adapter", "northwind.toolchain"] },
    { kind: "experience", id: "andina_monitor", bullets: ["andina_monitor.students"] },
  ]);
  assert.deepEqual(
    pieces.items.filter((i) => i.kind !== "experience").map((i) => `${i.kind}:${i.id}`),
    ["project:ledger", "project:docsearch_microservices", "education:andina_software", "certification:andina_software_dev"],
  );
  assert.deepEqual(pieces.skills.slice(0, 4), ["java", "junit", "rest", "git"]);
});

test("a bare item id counts as the item with no bullets", () => {
  const app = { ...globex, content: { ...globex.content, experience: ["northwind"], projects: [], certifications: [], education: [] } };
  assert.deepEqual(piecesOf(app, catalog).items, [{ kind: "experience", id: "northwind", bullets: [] }]);
});

test("usageIndex maps every piece and bullet to the applications that use it", () => {
  const index = usageIndex({ globex: piecesOf(globex, catalog), other: piecesOf({ ...globex, content: { ...globex.content, summary: undefined } }, catalog) });
  assert.deepEqual(index.pieces[pieceKey("summary", "globex_cuentas_lifecycle")], ["globex"]);
  assert.deepEqual(index.pieces[pieceKey("experience", "northwind")], ["globex", "other"]);
  assert.deepEqual(index.bullets["northwind.ddd"], ["globex", "other"]);
  assert.deepEqual(index.pieces[pieceKey("skill", "java")], ["globex", "other"]);
});
