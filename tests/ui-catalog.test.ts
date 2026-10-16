import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogEntries, filterEntries, pick, yearMonth, type Explorer } from "../src/ui/client/catalog-view.js";

const explorer = {
  catalog: {
    summaries: [
      { id: "short", tags: [], text: { es: "Corto", en: "Short" } },
      { id: "unused", tags: [], text: "Same in both" },
    ],
    experiences: [
      {
        id: "northwind", org: "Northwind", role: { es: "Desarrollador", en: "Developer" }, start: "2025-12", end: null,
        bullets: [
          { id: "northwind.ddd", tags: [], text: { es: "Modernicé", en: "Modernized" } },
          { id: "northwind.idle", tags: [], text: "Never used" },
        ],
      },
    ],
    projects: [], certifications: [], education: [],
    skills: {
      groups: [{ id: "software", label: { es: "Software", en: "Software" } }],
      skills: [{ id: "java", name: "Java", detail: "SpringBoot", tags: ["backend"] }, { id: "cobol", name: "COBOL", tags: [] }],
    },
  },
  usage: {
    pieces: { "summary:short": ["a", "b"], "experience:northwind": ["a"], "skill:java": ["a", "b", "c"] },
    bullets: { "northwind.ddd": ["a"] },
  },
  apps: {},
} as unknown as Explorer;

test("pick prefers the language asked and falls back to the other", () => {
  assert.equal(pick({ es: "Hola", en: "Hi" }, "en"), "Hi");
  assert.equal(pick({ es: "Solo español" }, "en"), "Solo español");
  assert.equal(pick("Igual", "es"), "Igual");
});

test("yearMonth formats in Spanish, null as present", () => {
  assert.equal(yearMonth("2025-12"), "dic 2025");
  assert.equal(yearMonth(null), "actual");
});

test("catalogEntries: summaries with text in the chosen language and usage counts", () => {
  const entries = catalogEntries(explorer, "summary", "en");
  assert.deepEqual(entries.map((e) => [e.id, e.text, e.count]), [["short", "Short", 2], ["unused", "Same in both", 0]]);
});

test("catalogEntries: items carry their bullets with their own counts", () => {
  const [northwind] = catalogEntries(explorer, "experience", "es");
  assert.equal(northwind!.title, "Northwind");
  assert.equal(northwind!.subtitle, "Desarrollador · dic 2025 – actual");
  assert.deepEqual(northwind!.bullets.map((b) => [b.id, b.text, b.count]), [["northwind.ddd", "Modernicé", 1], ["northwind.idle", "Never used", 0]]);
});

test("catalogEntries: skills show their group and detail", () => {
  const skills = catalogEntries(explorer, "skill", "es");
  assert.deepEqual(skills.map((s) => [s.id, s.title, s.subtitle, s.count]), [["java", "Java", "SpringBoot", 3], ["cobol", "COBOL", "", 0]]);
});

test("filterEntries: search over every text, and unused means the piece and none of its bullets", () => {
  const summaries = catalogEntries(explorer, "summary", "es");
  assert.deepEqual(filterEntries(summaries, "corto", false).map((e) => e.id), ["short"]);
  assert.deepEqual(filterEntries(summaries, "", true).map((e) => e.id), ["unused"]);
  const items = catalogEntries(explorer, "experience", "es");
  assert.deepEqual(filterEntries(items, "never", false).map((e) => e.id), ["northwind"]); // matched through a bullet
  assert.deepEqual(filterEntries(items, "", true).map((e) => e.id), []); // used item
});
