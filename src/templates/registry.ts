import { createHash } from "node:crypto";
import { cp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";
import { TOOL_ROOT, userTemplatesDir } from "../paths.js";
import { Theme } from "../theme.js";
import type { TemplateDefinition } from "./kit.js";

/**
 * Finds the active template: bundled ones ship in src/templates/<id>/, your own
 * live in <data>/templates/<id>/ (a template.tsx plus its theme.yaml).
 */

export interface LoadedTemplate {
  definition: TemplateDefinition;
  theme: Theme;
  /** Folder holding template.tsx/index and theme.yaml: part of the fit cache key. */
  dir: string;
  source: "bundled" | "user";
}

const BUNDLED: Record<string, () => Promise<{ default: TemplateDefinition }>> = {
  harvard: () => import("./harvard/template.js"),
  "classic-ats": () => import("./classic-ats/template.js"),
};

export const BUNDLED_TEMPLATES = Object.keys(BUNDLED);

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

async function loadTheme(dir: string): Promise<Theme> {
  const file = join(dir, "theme.yaml");
  const result = Theme.safeParse(parse(await readFile(file, "utf8")));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`${file} is not valid:\n${lines.join("\n")}`);
  }
  return result.data;
}

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)).sort();
}

/**
 * Your template sits outside this repository, where `react` and
 * "vicversa/template" cannot be resolved. So it is copied into a cache folder
 * inside the tool (keyed by its content, so an edit is never served stale) and
 * imported from there. TSX files get the automatic JSX runtime pragma, since
 * this repo's tsconfig does not cover the cache.
 */
async function importUserTemplate(dir: string): Promise<TemplateDefinition> {
  const files = await filesUnder(dir);
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update(await readFile(file));
  const cached = resolve(TOOL_ROOT, ".vicversa-cache/templates", hash.digest("hex").slice(0, 16));
  if (!(await exists(cached))) {
    await cp(dir, cached, { recursive: true });
    for (const file of await filesUnder(cached)) {
      if (!file.endsWith(".tsx")) continue;
      const source = await readFile(file, "utf8");
      await writeFile(file, `/** @jsxRuntime automatic */\n/** @jsxImportSource react */\n${source}`);
    }
  }
  const module = (await import(pathToFileURL(join(cached, "template.tsx")).href)) as { default?: TemplateDefinition };
  if (!module.default?.Page) throw new Error(`${join(dir, "template.tsx")} must default-export a TemplateDefinition`);
  return module.default;
}

export async function loadTemplate(id: string): Promise<LoadedTemplate> {
  const userDir = resolve(userTemplatesDir(), id);
  if (await exists(join(userDir, "template.tsx"))) {
    return { definition: await importUserTemplate(userDir), theme: await loadTheme(userDir), dir: userDir, source: "user" };
  }
  const bundled = BUNDLED[id];
  if (!bundled) {
    throw new Error(
      `Unknown template "${id}". Bundled: ${BUNDLED_TEMPLATES.join(", ")}; or add your own at ${userDir}/template.tsx`,
    );
  }
  const dir = resolve(import.meta.dirname, id);
  return { definition: (await bundled()).default, theme: await loadTheme(dir), dir, source: "bundled" };
}
