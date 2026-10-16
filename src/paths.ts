import { isAbsolute, resolve } from "node:path";

/**
 * Where the tool lives versus where your data lives.
 *
 * The tool (code, bundled templates, fonts, the demo) is this repository. Your
 * data — catalog, applications, your own templates, rendered PDFs — lives in a
 * folder of its own, pointed to by VICVERSA_HOME, so it never has to sit next
 * to (or be committed with) the tool. Unset, the bundled demo is used, which is
 * what makes a fresh clone work with `pnpm ui`.
 */

export const TOOL_ROOT = resolve(import.meta.dirname, "..");
export const DEMO_ROOT = resolve(TOOL_ROOT, "examples/demo");

/** Read on every call so tests (and a long-running server) see the current value. */
export function dataRoot(): string {
  const home = process.env["VICVERSA_HOME"];
  if (!home) return DEMO_ROOT;
  return isAbsolute(home) ? home : resolve(TOOL_ROOT, home);
}

export const catalogDir = () => resolve(dataRoot(), "catalog");
export const applicationsDir = () => resolve(dataRoot(), "applications");
export const outDir = () => resolve(dataRoot(), "out");
export const userTemplatesDir = () => resolve(dataRoot(), "templates");
