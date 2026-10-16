import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TOOL_ROOT } from "./paths.js";

type FontEntry = { family: string; weight: string; style: string; subset: string; file: string };

const FONT_DIR = resolve(TOOL_ROOT, "assets/fonts");

const cache = new Map<string, Promise<string>>();

/**
 * Builds @font-face rules with the woff2 files inlined as data URIs.
 *
 * Inlining rather than linking is what makes renders reproducible: the page has
 * no external requests, so it cannot silently fall back to a system font when
 * a path resolves differently or the network is down. A fallback would shift
 * every line break, which changes the page height - the one thing this whole
 * project exists to control.
 */
export function fontFaceCss(families: readonly string[]): Promise<string> {
  const key = families.join("|");
  let css = cache.get(key);
  if (!css) {
    css = buildFaces(families);
    cache.set(key, css);
  }
  return css;
}

/** Only the families a template asks for, so a CV page never carries fonts it does not use. */
async function buildFaces(families: readonly string[]): Promise<string> {
  const manifest: FontEntry[] = JSON.parse(
    await readFile(resolve(FONT_DIR, "manifest.json"), "utf8"),
  );
  const missing = families.filter((family) => !manifest.some((entry) => entry.family === family));
  if (missing.length > 0) {
    throw new Error(`Font not vendored in assets/fonts: ${missing.join(", ")}. Add it to scripts/fetch-fonts.ts and run pnpm fonts.`);
  }

  const faces = await Promise.all(
    manifest
      .filter((entry) => families.includes(entry.family))
      .map(async (entry) => {
        const bytes = await readFile(resolve(FONT_DIR, entry.file));
        return [
          "@font-face {",
          `  font-family: "${entry.family}";`,
          `  font-style: ${entry.style};`,
          `  font-weight: ${entry.weight};`,
          "  font-display: block;",
          `  src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2");`,
          "}",
        ].join("\n");
      }),
  );
  return faces.join("\n");
}
