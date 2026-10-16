import assert from "node:assert/strict";
import { test } from "node:test";
import { loadApplication, loadCatalog } from "../src/catalog.js";
import { pieceKey, piecesOf, usageIndex } from "../src/usage.js";

const catalog = await loadCatalog();
const globex = await loadApplication("2026-10-globex-desarrollador-fullstack");

test("piecesOf lists the summary, items with their bullets in render order, education and skills", () => {
  const pieces = piecesOf(globex, catalog);
  assert.equal(pieces.summary, "fullstack_product");
  assert.deepEqual(pieces.items.slice(0, 2), [
    { kind: "experience", id: "fabrikam", bullets: ["fabrikam.portal", "fabrikam.api", "fabrikam.a11y"] },
    { kind: "experience", id: "northwind", bullets: ["northwind.payments", "northwind.mentoring"] },
  ]);
  assert.deepEqual(
    pieces.items.filter((i) => i.kind !== "experience").map((i) => `${i.kind}:${i.id}`),
    ["project:ledger", "project:docsearch", "education:andina", "certification:aws_ccp", "certification:psm1"],
  );
  assert.deepEqual(pieces.skills.slice(0, 4), ["typescript", "java", "sql", "react"]);
});

test("a bare item id counts as the item with no bullets", () => {
  const app = { ...globex, content: { ...globex.content, experience: ["northwind"], projects: [], certifications: [], education: [] } };
  assert.deepEqual(piecesOf(app, catalog).items, [{ kind: "experience", id: "northwind", bullets: [] }]);
});

test("usageIndex maps every piece and bullet to the applications that use it", () => {
  const index = usageIndex({ globex: piecesOf(globex, catalog), other: piecesOf({ ...globex, content: { ...globex.content, summary: undefined } }, catalog) });
  assert.deepEqual(index.pieces[pieceKey("summary", "fullstack_product")], ["globex"]);
  assert.deepEqual(index.pieces[pieceKey("experience", "fabrikam")], ["globex", "other"]);
  assert.deepEqual(index.bullets["fabrikam.portal"], ["globex", "other"]);
  assert.deepEqual(index.pieces[pieceKey("skill", "typescript")], ["globex", "other"]);
});
