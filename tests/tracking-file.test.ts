import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import type { TrackingEvent } from "../src/schema.js";
import { addEventToText } from "../src/tracking-file.js";

const ev = (date: string, stage: TrackingEvent["stage"], note?: string): TrackingEvent =>
  note === undefined ? { date, stage } : { date, stage, note };

const header = `# why this CV
metadata:
  company: Acme
  language: es
  notes: >-
    A long folded note that yaml would happily
    reflow if we ever re-serialized it.

content:
  sections: [skills, experience]
`;

test("materializes the implicit applied event and appends the new one", () => {
  const text = header.replace("  language: es\n", '  date_submitted: "2026-10-01"\n  language: es\n');
  const result = addEventToText(text, ev("2026-10-05", "interview", "RH"), "2026-10-10");
  assert.equal(
    result.text,
    `${text}\ntracking:\n  - { date: "2026-10-01", stage: applied }\n  - { date: "2026-10-05", stage: interview, note: "RH" }\n`,
  );
});

test("templates accept only applied", () => {
  assert.throws(() => addEventToText(header, ev("2026-10-05", "interview"), "2026-10-10"), /template/);
  const result = addEventToText(header, ev("2026-10-05", "applied"), "2026-10-10");
  assert.equal(result.text, `${header}\ntracking:\n  - { date: "2026-10-05", stage: applied }\n`);
});

test("file without trailing newline still gets the block on its own lines", () => {
  const text = `${header.trimEnd()}`.replace("  language: es\n", '  date_submitted: "2026-10-01"\n  language: es\n');
  const result = addEventToText(text, ev("2026-10-05", "interview"), "2026-10-10");
  assert.ok(result.text.startsWith(`${text}\n\ntracking:\n`));
});

const tracked = `${header}
tracking:
  - { date: "2026-10-01", stage: applied } # sent from LinkedIn
  # recruiter called first
  - { date: "2026-10-08", stage: interview, note: "RH" }
`;

test("inserts in the middle, keeping comments and every other byte", () => {
  const result = addEventToText(tracked, ev("2026-10-04", "assessment"), "2026-10-10");
  assert.equal(
    result.text,
    tracked.replace(
      "  # recruiter called first\n",
      '  # recruiter called first\n  - { date: "2026-10-04", stage: assessment }\n',
    ),
  );
});

test("appends after the last item", () => {
  const result = addEventToText(tracked, ev("2026-10-09", "rejected"), "2026-10-10");
  assert.equal(result.text, `${tracked}  - { date: "2026-10-09", stage: rejected }\n`);
});

test("notes with quotes, colons, hashes and accents round-trip", () => {
  const note = 'técnica: "live coding" #2 — 1h';
  const result = addEventToText(tracked, ev("2026-10-09", "interview", note), "2026-10-10");
  assert.equal(parse(result.text).tracking.at(-1).note, note);
});

test("refuses flow-style tracking and multi-line entries", () => {
  const flow = `${header}tracking: [{ date: "2026-10-01", stage: applied }]\n`;
  assert.throws(() => addEventToText(flow, ev("2026-10-05", "interview"), "2026-10-10"), /block list/);
  const block = `${header}tracking:\n  - date: "2026-10-01"\n    stage: applied\n`;
  assert.throws(() => addEventToText(block, ev("2026-10-05", "interview"), "2026-10-10"), /one line each/);
});

test("every real application only gains lines at the end", () => {
  const dir = resolve(import.meta.dirname, "../applications");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const text = readFileSync(resolve(dir, file), "utf8");
    const data = parse(text);
    const isTemplate = !data.tracking && !data.metadata.date_submitted;
    const last = data.tracking?.at(-1);
    if (last && ["hired", "rejected", "withdrawn"].includes(last.stage)) {
      // Closed: a late event goes before the terminal one, inside the block.
      const result = addEventToText(text, ev(data.tracking[0].date, "interview"), "2099-01-01", file);
      const head = text.slice(0, text.indexOf("\ntracking:"));
      assert.ok(result.text.startsWith(head), `${file} changed outside the tracking block`);
      continue;
    }
    const event = ev("2099-01-01", isTemplate ? "applied" : "interview");
    const result = addEventToText(text, event, "2099-01-01", file);
    assert.ok(result.text.startsWith(text), `${file} changed outside the tracking block`);
  }
});
