import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { isMap, isSeq, parse, parseDocument } from "yaml";
import { formatIssues } from "./catalog.js";
import { Application, type TrackingEvent } from "./schema.js";
import { insertEvent, timeline } from "./tracking.js";

/** One event as a one-line flow map. Notes are JSON-quoted, which is valid YAML for any text. */
export function formatEvent(event: TrackingEvent): string {
  const note = event.note === undefined ? "" : `, note: ${JSON.stringify(event.note)}`;
  return `{ date: "${event.date}", stage: ${event.stage}${note} }`;
}

const sameEvents = (a: readonly TrackingEvent[], b: readonly TrackingEvent[]) =>
  JSON.stringify(a.map((e) => [e.date, e.stage, e.note ?? null])) ===
  JSON.stringify(b.map((e) => [e.date, e.stage, e.note ?? null]));

/**
 * Returns `text` with `event` recorded. Never re-serializes the document:
 * yaml's toString() refolds `>-` notes and reflows lists in every existing
 * application. Instead the parsed node ranges give the offset where one new
 * line goes, and everything else stays byte for byte.
 */
export function addEventToText(
  text: string,
  event: TrackingEvent,
  today: string,
  file = "application",
): { text: string; events: TrackingEvent[] } {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`${file}: ${doc.errors[0]!.message}`);
  const parsed = Application.safeParse(doc.toJS());
  if (!parsed.success) throw new Error(formatIssues(file, parsed.error));

  const current = timeline(parsed.data);
  if (current === null && event.stage !== "applied") {
    throw new Error(
      `${file} is a template (no tracking and no metadata.date_submitted). Record "applied" first.`,
    );
  }
  const { events, index } = insertEvent(current ?? [], event, today);

  let next: string;
  const node = doc.get("tracking", true);
  if (node === undefined) {
    // Also writes out the implicit "applied" from date_submitted, if there was one.
    const lines = events.map((e) => `  - ${formatEvent(e)}\n`).join("");
    next = `${text}${text.endsWith("\n") ? "" : "\n"}\ntracking:\n${lines}`;
  } else {
    if (!isSeq(node) || node.flow) {
      throw new Error(`${file}: tracking must be a block list ("- { ... }" per line) for cv track to edit it.`);
    }
    const items = node.items;
    if (!items.every((item) => isMap(item) && item.flow && item.range)) {
      throw new Error(`${file}: tracking entries must be one line each, like - { date: "…", stage: … }.`);
    }
    const anchor = items[Math.min(index, items.length - 1)] as { range: [number, number, number] };
    const lineStart = text.lastIndexOf("\n", anchor.range[0] - 1) + 1;
    const prefix = text.slice(lineStart, anchor.range[0]);
    if (!/^\s*-\s+$/.test(prefix)) {
      throw new Error(`${file}: tracking entries must be one line each, like - { date: "…", stage: … }.`);
    }
    const line = `${prefix}${formatEvent(event)}\n`;
    if (index < items.length) {
      next = text.slice(0, lineStart) + line + text.slice(lineStart);
    } else {
      const lineEnd = text.indexOf("\n", anchor.range[1]);
      next = lineEnd === -1 ? `${text}\n${line}` : text.slice(0, lineEnd + 1) + line + text.slice(lineEnd + 1);
    }
  }

  const check = Application.safeParse(parse(next));
  if (!check.success || !sameEvents(check.data.tracking ?? [], events)) {
    throw new Error(`${file}: the edited file did not read back as expected; nothing was written.`);
  }
  return { text: next, events };
}

/**
 * Returns `text` without its last recorded event: the undo for a mistaken
 * `track` (e.g. reopening an application closed by error). Splices out one
 * line, like addEventToText splices one in. The first "applied" event stays.
 */
export function removeLastEventFromText(
  text: string,
  file = "application",
): { text: string; removed: TrackingEvent; events: TrackingEvent[] } {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`${file}: ${doc.errors[0]!.message}`);
  const parsed = Application.safeParse(doc.toJS());
  if (!parsed.success) throw new Error(formatIssues(file, parsed.error));

  const current = parsed.data.tracking;
  const node = doc.get("tracking", true);
  if (!current || node === undefined) throw new Error(`${file}: nothing to undo, no events were recorded.`);
  if (current.length < 2) throw new Error(`${file}: only the "applied" event is left; nothing to undo.`);
  if (!isSeq(node) || node.flow || !node.items.every((item) => isMap(item) && item.flow && item.range)) {
    throw new Error(`${file}: tracking entries must be one line each, like - { date: "…", stage: … }.`);
  }

  const last = node.items.at(-1) as { range: [number, number, number] };
  const lineStart = text.lastIndexOf("\n", last.range[0] - 1) + 1;
  const lineEnd = text.indexOf("\n", last.range[1]);
  const next =
    lineEnd === -1 ? text.slice(0, Math.max(0, lineStart - 1)) : text.slice(0, lineStart) + text.slice(lineEnd + 1);

  const events = current.slice(0, -1);
  const check = Application.safeParse(parse(next));
  if (!check.success || !sameEvents(check.data.tracking ?? [], events)) {
    throw new Error(`${file}: the edited file did not read back as expected; nothing was written.`);
  }
  return { text: next, removed: current.at(-1)!, events };
}

export async function removeLastEvent(path: string): Promise<{ removed: TrackingEvent; events: TrackingEvent[] }> {
  const text = await readFile(path, "utf8");
  const result = removeLastEventFromText(text, basename(path));
  await writeFile(path, result.text);
  return { removed: result.removed, events: result.events };
}

export async function recordEvent(path: string, event: TrackingEvent, today: string): Promise<TrackingEvent[]> {
  const text = await readFile(path, "utf8");
  const result = addEventToText(text, event, today, basename(path));
  await writeFile(path, result.text);
  return result.events;
}
