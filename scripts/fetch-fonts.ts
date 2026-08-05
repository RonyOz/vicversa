/**
 * Vendors the exact webfonts the template needs into assets/fonts/.
 *
 * Fonts are committed to the repo on purpose: the renderer embeds them as data
 * URIs so a PDF built on any machine, with or without network, is byte-stable.
 * Relying on system fonts is how "it looked fine on my laptop" happens.
 *
 * Run: pnpm fonts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const FONT_DIR = resolve(import.meta.dirname, "../assets/fonts");

/** Only these subsets are kept. Spanish and English need nothing else. */
const SUBSETS = new Set(["latin", "latin-ext"]);

/** Google's CSS2 endpoint returns woff2 only when it believes we are Chrome. */
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CSS_URL =
  "https://fonts.googleapis.com/css2" +
  "?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400" +
  "&family=JetBrains+Mono:wght@400;700" +
  "&display=block";

type FontFace = {
  family: string;
  weight: string;
  style: string;
  subset: string;
  file: string;
};

/**
 * Google emits one @font-face per (family, weight, style, subset), each
 * preceded by a `/* subset *\/` comment that is the only place the subset name
 * appears. So we split on those comments rather than parsing the CSS properly.
 */
function parseFaces(css: string): Array<Omit<FontFace, "file"> & { url: string }> {
  const out: Array<Omit<FontFace, "file"> & { url: string }> = [];
  const chunks = css.split(/\/\*\s*([\w-]+)\s*\*\//).slice(1);

  for (let i = 0; i < chunks.length; i += 2) {
    const subset = chunks[i]!;
    const block = chunks[i + 1] ?? "";
    if (!SUBSETS.has(subset)) continue;

    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const url = /src:\s*url\(([^)]+)\)/.exec(block)?.[1];
    if (!family || !url) continue;

    out.push({
      family,
      weight: /font-weight:\s*(\d+)/.exec(block)?.[1] ?? "400",
      style: /font-style:\s*(\w+)/.exec(block)?.[1] ?? "normal",
      subset,
      url,
    });
  }
  return out;
}

async function main() {
  await mkdir(FONT_DIR, { recursive: true });

  const cssRes = await fetch(CSS_URL, { headers: { "User-Agent": UA } });
  if (!cssRes.ok) throw new Error(`Google Fonts CSS: ${cssRes.status} ${cssRes.statusText}`);
  const css = await cssRes.text();

  const faces = parseFaces(css);
  if (faces.length === 0) throw new Error("No @font-face blocks matched the wanted subsets.");

  const manifest: FontFace[] = [];

  for (const face of faces) {
    const slug = face.family.replace(/\s+/g, "");
    const file = `${slug}-${face.weight}-${face.style}-${face.subset}.woff2`;

    const res = await fetch(face.url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${file}: ${res.status} ${res.statusText}`);
    const bytes = Buffer.from(await res.arrayBuffer());

    await writeFile(resolve(FONT_DIR, file), bytes);
    manifest.push({ ...face, file });

    console.log(`  ${file.padEnd(46)} ${(bytes.length / 1024).toFixed(1)} KB`);
  }

  await writeFile(
    resolve(FONT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`\n${manifest.length} font files vendored into assets/fonts/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
