import type { Measurement } from "../src/render.js";
import type { ResolvedDocument } from "../src/resolve.js";
import type { Theme } from "../src/theme.js";

/** Only the fields verdict()/assess() read; 10pt on 13.5pt lines like theme.yaml. */
export const theme = { type: { size: { body: 10 }, lineHeight: { body: 1.35 } } } as unknown as Theme;

export const doc = (summaryId: string | undefined, warnings: string[] = []): ResolvedDocument =>
  ({ summaryId, summary: summaryId ? "text" : undefined, warnings }) as unknown as ResolvedDocument;

const base: Measurement = {
  available: 785.9,
  used: 0,
  overflow: 0,
  sections: [
    { id: "skills", height: 120 },
    { id: "experience", height: 300.5 },
    { id: "projects", height: 250 },
  ],
  items: [
    { id: "northwind", section: "experience", height: 150, withGap: 162 },
    { id: "ledger", section: "projects", height: 80, withGap: 90.5 },
  ],
  bullets: [
    { id: "northwind.payments", item: "northwind", height: 40.5, lines: 3 },
    { id: "andina_ta.students", item: "andina_ta", height: 27, lines: 2 },
    { id: "ledger.sync", item: "ledger", height: 13.5, lines: 1 },
  ],
  skillOverflows: [],
  summaries: [
    { id: "backend_platform", height: 54 },
    { id: "fullstack_product", height: 40.5 },
    { id: "data_ml", height: 27 },
    { id: "same_height", height: 53.8 },
  ],
};

export const fits: Measurement = { ...base, used: 770, overflow: -15.9 };
export const tight: Measurement = { ...base, used: 780, overflow: -5.9 };
export const over: Measurement = { ...base, used: 801.9, overflow: 16 };
export const wayOver: Measurement = { ...base, used: 985.9, overflow: 200 };
export const skillClipped: Measurement = { ...fits, skillOverflows: [{ label: "DevOps", overflow: 4.2 }] };

export const cases: Record<string, [ResolvedDocument, Measurement]> = {
  fits: [doc("backend_platform"), fits],
  tight: [doc("backend_platform"), tight],
  over: [doc("backend_platform"), over],
  "over-no-shorter-summary": [doc("data_ml"), over],
  "way-over": [doc(undefined, ["bullet \"x\" has no en text; fell back to another language"]), wayOver],
  "skill-clipped": [doc("backend_platform"), skillClipped],
};
