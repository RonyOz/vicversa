import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT } from "./catalog.js";

type FontEntry = { family: string; weight: string; style: string; subset: string; file: string };

const FONT_DIR = resolve(ROOT, "assets/fonts");

let cached: string | undefined;

/**
 * Builds @font-face rules with the woff2 files inlined as data URIs.
 *
 * Inlining rather than linking is what makes renders reproducible: the page has
 * no external requests, so it cannot silently fall back to a system font when
 * a path resolves differently or the network is down. A fallback would shift
 * every line break, which changes the page height - the one thing this whole
 * project exists to control.
 */
export async function fontFaceCss(): Promise<string> {
  if (cached) return cached;

  const manifest: FontEntry[] = JSON.parse(
    await readFile(resolve(FONT_DIR, "manifest.json"), "utf8"),
  );

  const faces = await Promise.all(
    manifest.map(async (entry) => {
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

  cached = faces.join("\n");
  return cached;
}
