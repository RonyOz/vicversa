import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  CATALOG_PARTS, DEFAULT_STALE_DAYS, DEFAULT_WEEKS,
  getApplication, getCatalog, getStatus, listApplications, renderApplication, trackEvent, undoLastEvent,
  validateApplications,
} from "./ops.js";
import { LANGUAGES, STAGES } from "./schema.js";
import { formatFunnel, formatPace, formatTable, formatTimeline } from "./tracking-report.js";
import { localToday } from "./tracking.js";

// Output schemas: what a client can rely on. Deep catalog/application data stays
// loosely typed on purpose; its contract is SPEC.md §5, not this file.

const Stage = z.enum(STAGES);
const State = z.enum(["active", "stale", "closed"]);
const IsoDay = z.string().describe('"YYYY-MM-DD"');

const TrackingEvent = z.object({ date: IsoDay, stage: Stage, note: z.string().optional() });

const TrackSummary = z.object({
  name: z.string(),
  company: z.string().optional(),
  role: z.string().optional(),
  state: State,
  stage: Stage,
  counts: z.record(z.string(), z.number()),
  lastDate: IsoDay,
  daysSince: z.number(),
});

const Cut = z.object({
  kind: z.enum(["summary", "bullet", "item"]),
  id: z.string(),
  detail: z.string(),
  saves: z.number().describe("points of height freed"),
  enough: z.boolean().describe("this cut alone makes it fit"),
});

const Assessment = z.object({
  ok: z.boolean(),
  fits: z.boolean(),
  used: z.number(),
  available: z.number(),
  overflow: z.number().describe("points over one page; negative means room left"),
  spare: z.number(),
  spareLines: z.number(),
  overflowLines: z.number(),
  sections: z.array(z.object({ id: z.string(), height: z.number() })),
  cuts: z.array(Cut).describe("cheapest first; empty when it fits"),
  smallestCut: Cut.nullable(),
  skillOverflows: z.array(z.object({ label: z.string(), overflow: z.number() })),
  warnings: z.array(z.string()),
});

const Outcomes = z.object({ ongoing: z.number(), rejected: z.number(), withdrawn: z.number(), hired: z.number() });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/** Expected failures (bad name, future date, closed process…) come back as tool errors the agent can act on. */
async function run<T extends Record<string, unknown>>(
  work: () => Promise<{ data: T; text: string }>,
): Promise<CallToolResult> {
  try {
    const { data, text } = await work();
    return { content: [{ type: "text", text }], structuredContent: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!(error instanceof Error)) console.error(error);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "vicversa", version: "0.3.0" },
    {
      instructions:
        "vicversa: one YAML catalog of professional data, many one-page CVs, plus a tracker for job " +
        "applications. Use list_applications to find an application by company or role before acting on " +
        "it; when several match, ask the user which one. Record only events that already happened. When " +
        "reporting status, always give the funnel with its denominators and never call waiting or silence " +
        "a rejection.",
    },
  );

  server.registerTool(
    "list_applications",
    {
      title: "List applications",
      description:
        "Every CV application with company, role, language and tracking state. `query` filters by name, " +
        "company or role (case-insensitive). Templates and unsent drafts have tracked=false.",
      inputSchema: { query: z.string().optional() },
      outputSchema: {
        applications: z.array(
          z.object({
            name: z.string(),
            company: z.string().nullable(),
            role: z.string().nullable(),
            language: z.enum(LANGUAGES),
            tracked: z.boolean(),
            state: State.nullable(),
            stage: Stage.nullable(),
            daysSince: z.number().nullable(),
          }),
        ),
      },
      annotations: READ_ONLY,
    },
    ({ query }) =>
      run(async () => {
        const applications = await listApplications({ query, today: localToday() });
        const lines = applications.map(
          (a) => `${a.name}  ${a.company ?? ""} — ${a.role ?? ""}  ${a.tracked ? `${a.state} · ${a.stage} · ${a.daysSince}d` : "not tracked"}`,
        );
        return { data: { applications }, text: lines.join("\n") || "No application matches." };
      }),
  );

  server.registerTool(
    "get_application",
    {
      title: "Get application",
      description:
        "One application parsed (metadata, content selections, tracking), its effective timeline and state, " +
        "and the file path to edit it.",
      inputSchema: { name: z.string().describe("file name without .yaml, e.g. 2026-10-globex-desarrollador-fullstack") },
      outputSchema: {
        name: z.string(),
        path: z.string(),
        application: z.record(z.string(), z.unknown()),
        timeline: z.array(TrackingEvent).nullable(),
        summary: TrackSummary.nullable(),
      },
      annotations: READ_ONLY,
    },
    ({ name }) =>
      run(async () => {
        const result = await getApplication(name, { today: localToday() });
        const text =
          result.timeline && result.summary
            ? formatTimeline(result.summary, result.timeline)
            : `${result.name} is a template or unsent draft: not tracked.`;
        return { data: { ...result }, text: `${text}\n\n${result.path}` };
      }),
  );

  server.registerTool(
    "get_catalog",
    {
      title: "Get catalog",
      description:
        "The source-of-truth CV catalog, by parts. It is large (~100 KB): ask only for the parts you need. " +
        "With `language`, every bilingual text is reduced to that language.",
      inputSchema: {
        parts: z.array(z.enum(CATALOG_PARTS)).min(1),
        language: z.enum(LANGUAGES).optional(),
      },
      outputSchema: { catalog: z.record(z.string(), z.unknown()) },
      annotations: READ_ONLY,
    },
    ({ parts, language }) =>
      run(async () => {
        const catalog = await getCatalog(parts, language);
        return { data: { catalog }, text: JSON.stringify(catalog) };
      }),
  );

  server.registerTool(
    "get_status",
    {
      title: "Application status",
      description:
        "Weekly application pace, the response funnel (waiting / no response / responded, with denominators) " +
        "and every tracked application by state.",
      inputSchema: {
        stale_days: z.number().int().min(1).optional().describe(`default ${DEFAULT_STALE_DAYS}`),
        weeks: z.number().int().min(1).optional().describe(`default ${DEFAULT_WEEKS}`),
      },
      outputSchema: {
        today: IsoDay,
        staleDays: z.number(),
        pace: z.object({
          weeks: z.array(z.object({ start: IsoDay, count: z.number() })),
          average: z.number(),
        }),
        funnel: z.object({
          total: z.number(),
          waiting: z.number(),
          silent: z.number(),
          withdrawnSilent: z.number(),
          rejectedDirect: z.number(),
          advanced: z.object({ assessment: Outcomes, interview: Outcomes, offer: Outcomes, hired: Outcomes }),
          advancedTotal: z.number(),
          responded: z.number(),
          resolved: z.number(),
        }),
        applications: z.array(TrackSummary),
      },
      annotations: READ_ONLY,
    },
    ({ stale_days, weeks }) =>
      run(async () => {
        const status = await getStatus({ today: localToday(), staleDays: stale_days, weeks });
        const text = [
          formatPace(status.pace),
          formatFunnel(status.funnel, status.staleDays),
          formatTable(status.applications),
        ].join("\n\n");
        return { data: { ...status }, text };
      }),
  );

  server.registerTool(
    "validate",
    {
      title: "Validate one-page fit",
      description:
        "Lays out each CV in Chromium and checks it fits on one page. Without `names`, checks all. When one " +
        "does not fit, `cuts` prices every way out, cheapest first. Use after editing an application YAML.",
      inputSchema: { names: z.array(z.string()).optional() },
      outputSchema: {
        results: z.array(
          z.object({
            name: z.string(),
            ok: z.boolean(),
            error: z.string().optional(),
            report: z.string().optional(),
            assessment: Assessment.optional(),
          }),
        ),
      },
      annotations: READ_ONLY,
    },
    ({ names }) =>
      run(async () => {
        const results = await validateApplications(names);
        const failures = results.filter((r) => !r.ok).length;
        const text = [
          ...results.map((r) => r.report ?? `✗ ${r.name}\n  ${r.error}`),
          failures === 0 ? `${results.length} fit on one page.` : `${failures} of ${results.length} need attention.`,
        ].join("\n\n");
        return { data: { results }, text };
      }),
  );

  server.registerTool(
    "render",
    {
      title: "Render PDF",
      description:
        "Builds the one-page PDF into out/. If it does not fit, nothing is written (written=false) unless " +
        "`force` is set. `html` also writes the HTML next to it for debugging.",
      inputSchema: {
        name: z.string(),
        force: z.boolean().optional(),
        html: z.boolean().optional(),
      },
      outputSchema: {
        name: z.string(),
        ok: z.boolean(),
        written: z.boolean(),
        pdfPath: z.string().optional(),
        htmlPath: z.string().optional(),
        report: z.string(),
        assessment: Assessment,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    ({ name, force, html }) =>
      run(async () => {
        const result = await renderApplication(name, { force, html });
        const tail = result.written ? `\n\n${result.pdfPath}` : "\n\nNo PDF written. Fix the above, or pass force.";
        return { data: { ...result }, text: `${result.report}${tail}` };
      }),
  );

  server.registerTool(
    "track",
    {
      title: "Record application event",
      description:
        "Records something that already happened in an application's process. Stages: applied, assessment " +
        "(any test), interview (any interview), offer, hired, rejected, withdrawn (candidate withdrew or " +
        "declined). Date defaults to today and cannot be in the future; late events are inserted in date order.",
      inputSchema: {
        name: z.string(),
        stage: Stage,
        date: IsoDay.optional(),
        note: z.string().optional().describe('one short line, e.g. "RH", "técnica con líder"'),
      },
      outputSchema: {
        name: z.string(),
        event: TrackingEvent,
        events: z.array(TrackingEvent),
        summary: TrackSummary.nullable(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ name, stage, date, note }) =>
      run(async () => {
        const result = await trackEvent(name, { stage, date, note }, localToday());
        const text =
          `✓ ${result.name}: ${result.event.stage} on ${result.event.date} ` +
          `(${result.events.length} events, now ${result.summary?.state ?? "untracked"})`;
        return { data: { ...result }, text };
      }),
  );

  server.registerTool(
    "undo_last_event",
    {
      title: "Undo last application event",
      description:
        "Removes the most recently recorded event of an application: reopens one closed by mistake, or " +
        "fixes a wrong stage/date (undo, then track again). The first applied event is never removed. " +
        "Confirm with the user which event will be removed before calling.",
      inputSchema: { name: z.string() },
      outputSchema: {
        name: z.string(),
        removed: TrackingEvent,
        events: z.array(TrackingEvent),
        summary: TrackSummary.nullable(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    ({ name }) =>
      run(async () => {
        const result = await undoLastEvent(name, localToday());
        const text =
          `✓ ${result.name}: removed ${result.removed.stage} on ${result.removed.date} ` +
          `(${result.events.length} events, now ${result.summary?.state ?? "untracked"})`;
        return { data: { ...result }, text };
      }),
  );

  return server;
}
