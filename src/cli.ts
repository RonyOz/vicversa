import { readdir, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadApplication, loadCatalog, ROOT } from "./catalog.js";
import { buildHtml } from "./html.js";
import { renderPdf, withSharedBrowser } from "./render.js";
import { resolveDocument } from "./resolve.js";
import { verdict } from "./validate.js";

const OUT = resolve(ROOT, "out");

async function applicationNames(): Promise<string[]> {
  const files = await readdir(resolve(ROOT, "applications"));
  return files.filter((f) => f.endsWith(".yaml")).map((f) => basename(f, ".yaml")).sort();
}

async function cmdRender(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      out: { type: "string" },
      html: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const name = positionals[0];
  if (!name) throw new Error("Usage: cv render <application> [--out FILE] [--html] [--force]");

  const catalog = await loadCatalog();
  const app = await loadApplication(name);
  const doc = resolveDocument(app, catalog);
  const html = await buildHtml(doc, catalog.theme);

  await mkdir(OUT, { recursive: true });
  const stem = basename(name, ".yaml");

  if (values.html) {
    const htmlPath = resolve(OUT, `${stem}.html`);
    await writeFile(htmlPath, html);
    console.log(`  html  ${htmlPath}`);
  }

  const { pdf, measurement } = await renderPdf(html, catalog.theme);
  const result = verdict(stem, doc, measurement, catalog.theme);
  console.log(result.report);

  if (!result.ok && !values.force) {
    console.log(`\n  ${"No PDF written."} Fix the above, or pass --force to write it anyway.`);
    process.exitCode = 1;
    return;
  }

  const pdfPath = values.out ? resolve(process.cwd(), values.out) : resolve(OUT, `${stem}.pdf`);
  await writeFile(pdfPath, pdf);
  console.log(`\n  ${pdfPath}`);
}

async function cmdValidate(args: string[]) {
  const { positionals } = parseArgs({ args, allowPositionals: true });
  const names = positionals.length > 0 ? positionals : await applicationNames();

  const catalog = await loadCatalog();
  let failures = 0;

  await withSharedBrowser(async (render) => {
    for (const name of names) {
      const stem = basename(name, ".yaml");
      try {
        const app = await loadApplication(name);
        const doc = resolveDocument(app, catalog);
        const html = await buildHtml(doc, catalog.theme);
        const { measurement } = await render(html, catalog.theme);
        const result = verdict(stem, doc, measurement, catalog.theme);
        console.log(result.report);
        if (!result.ok) failures++;
      } catch (error) {
        console.log(`✗ ${stem}\n  ${error instanceof Error ? error.message : error}`);
        failures++;
      }
      console.log("");
    }
  });

  console.log(
    failures === 0
      ? `${names.length} application${names.length === 1 ? "" : "s"} fit on one page.`
      : `${failures} of ${names.length} need attention.`,
  );
  if (failures > 0) process.exitCode = 1;
}

async function cmdList() {
  const catalog = await loadCatalog();
  const names = await applicationNames();

  const counts: [string, number][] = [
    ["summaries", catalog.summaries.length],
    ["experiences", catalog.experiences.length],
    ["projects", catalog.projects.length],
    ["certifications", catalog.certifications.length],
    ["education", catalog.education.length],
    ["skills", catalog.skills.length],
    ["bullets", catalog.byId.bullets.size],
  ];

  console.log("catalog");
  for (const [label, count] of counts) console.log(`  ${label.padEnd(15)} ${count}`);
  console.log("\napplications");
  for (const name of names) console.log(`  ${name}`);
}

const USAGE = `vicversa - one catalog, many CVs

  cv render <application> [--out FILE] [--html] [--force]
  cv validate [application...]
  cv list
`;

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "render": return cmdRender(rest);
    case "validate": return cmdValidate(rest);
    case "list": return cmdList();
    default:
      console.log(USAGE);
      if (command !== undefined && command !== "help") process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
