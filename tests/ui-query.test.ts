import assert from "node:assert/strict";
import { test } from "node:test";
import type { ListRow } from "../src/ui/client/query.js";
import { applyQuery, parseQuery, tabCounts, toSearch } from "../src/ui/client/query.js";
import { monthMatrix, quickDates, shiftMonth } from "../src/ui/client/dates.js";

const row = (name: string, extra: Partial<ListRow>): ListRow => ({
  name,
  company: name.toUpperCase(),
  role: "Dev",
  state: "active",
  stage: "applied",
  counts: { applied: 1 },
  lastDate: "2026-10-01",
  daysSince: 5,
  events: [{ date: "2026-10-01", stage: "applied" }],
  applied: "2026-10-01",
  language: "es",
  url: null,
  ...extra,
});

const rows: ListRow[] = [
  row("stark-sre", { company: "Stark", role: "SRE Intern", state: "closed", stage: "rejected", daysSince: 1, applied: "2026-09-26", language: "en" }),
  row("globex", { company: "Globex", role: "Desarrollador de Software", daysSince: 14, applied: "2026-10-01" }),
  row("acme", { company: "Acme", role: "Backend Engineer", state: "stale", daysSince: 23, applied: "2026-09-22", language: "en" }),
  row("hooli", { company: "Hooli", role: "Latin América Internship", stage: "interview", daysSince: 20, applied: "2026-08-27", language: "en" }),
];

test("parseQuery fills defaults and ignores junk", () => {
  assert.deepEqual(parseQuery(new URLSearchParams("")), { tab: "activas", q: "", stage: null, language: null, sort: "reciente" });
  assert.deepEqual(
    parseQuery(new URLSearchParams("tab=todas&q=sez&etapa=interview&idioma=en&orden=empresa")),
    { tab: "todas", q: "sez", stage: "interview", language: "en", sort: "empresa" },
  );
  assert.equal(parseQuery(new URLSearchParams("tab=nope&orden=x&etapa=ghosted")).tab, "activas");
});

test("toSearch omits defaults so clean URLs stay clean", () => {
  assert.equal(toSearch(parseQuery(new URLSearchParams(""))), "");
  assert.equal(toSearch({ tab: "todas", q: "sez", stage: null, language: "en", sort: "reciente" }), "?tab=todas&q=sez&idioma=en");
});

test("tabCounts counts every state and the total", () => {
  assert.deepEqual(tabCounts(rows), { activas: 2, "sin-respuesta": 1, cerradas: 1, todas: 4 });
});

test("search ignores case and accents and needs every word", () => {
  const q = { ...parseQuery(new URLSearchParams("")), tab: "todas" as const };
  assert.deepEqual(applyQuery(rows, { ...q, q: "AMERICA" }).map((r) => r.name), ["hooli"]);
  assert.deepEqual(applyQuery(rows, { ...q, q: "globex desarrollador" }).map((r) => r.name), ["globex"]);
  assert.deepEqual(applyQuery(rows, { ...q, q: "globex backend" }), []);
});

test("filters by tab, stage and language", () => {
  const base = parseQuery(new URLSearchParams(""));
  assert.deepEqual(applyQuery(rows, base).map((r) => r.name), ["globex", "hooli"]);
  assert.deepEqual(applyQuery(rows, { ...base, stage: "interview" }).map((r) => r.name), ["hooli"]);
  assert.deepEqual(applyQuery(rows, { ...base, tab: "todas", language: "en" }).map((r) => r.name).sort(), ["acme", "hooli", "stark-sre"]);
});

test("sorts by recency, waiting time, application date or company", () => {
  const all = { ...parseQuery(new URLSearchParams("")), tab: "todas" as const };
  assert.deepEqual(applyQuery(rows, all).map((r) => r.name), ["stark-sre", "globex", "hooli", "acme"]);
  assert.deepEqual(applyQuery(rows, { ...all, sort: "dias" }).map((r) => r.name), ["acme", "hooli", "globex", "stark-sre"]);
  assert.deepEqual(applyQuery(rows, { ...all, sort: "aplicada" }).map((r) => r.name), ["globex", "stark-sre", "acme", "hooli"]);
  assert.deepEqual(applyQuery(rows, { ...all, sort: "empresa" }).map((r) => r.name), ["acme", "globex", "hooli", "stark-sre"]);
});

test("monthMatrix: Monday-first weeks, padded with nulls", () => {
  const weeks = monthMatrix("2026-10");
  assert.equal(weeks[0]!.join(","), ",,,2026-10-01,2026-10-02,2026-10-03,2026-10-04");
  assert.equal(weeks.at(-1)!.join(","), "2026-10-26,2026-10-27,2026-10-28,2026-10-29,2026-10-30,2026-10-31,");
  assert.ok(weeks.every((w) => w.length === 7));
});

test("shiftMonth crosses years", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("quickDates offers today, yesterday, a week ago and the last event, deduplicated", () => {
  assert.deepEqual(quickDates("2026-10-15", "2026-10-14"), [
    { label: "Hoy", date: "2026-10-15" },
    { label: "Ayer", date: "2026-10-14" },
    { label: "Hace 1 semana", date: "2026-10-08" },
  ]);
  assert.deepEqual(quickDates("2026-10-15", "2026-09-26").at(-1), { label: "Último evento", date: "2026-09-26" });
});

test("placeTooltip centers above, flips below near the top, clamps to the viewport", async () => {
  const { placeTooltip } = await import("../src/ui/client/tooltip-place.js");
  const viewport = { width: 1000, height: 800 };
  const size = { width: 100, height: 30 };
  // Centered above a 20px-wide target at x=500.
  assert.deepEqual(placeTooltip({ left: 490, right: 510, top: 300, bottom: 320 }, size, viewport), { left: 450, top: 262, place: "top" });
  // No room above: goes below.
  assert.deepEqual(placeTooltip({ left: 490, right: 510, top: 20, bottom: 40 }, size, viewport), { left: 450, top: 48, place: "bottom" });
  // Near the right edge: clamped 8px inside.
  assert.equal(placeTooltip({ left: 980, right: 995, top: 300, bottom: 320 }, size, viewport).left, 892);
  // Near the left edge.
  assert.equal(placeTooltip({ left: 0, right: 10, top: 300, bottom: 320 }, size, viewport).left, 8);
});
