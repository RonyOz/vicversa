import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { validateApplications } from "../src/ops.js";
import { DEMO_ROOT, TOOL_ROOT } from "../src/paths.js";
import { BUNDLED_TEMPLATES, loadTemplate } from "../src/templates/registry.js";

/** A throwaway data folder that reuses the demo's catalog and applications. */
function dataFolder(template: string): string {
  const dir = mkdtempSync(join(tmpdir(), "vicversa-data-"));
  symlinkSync(join(DEMO_ROOT, "catalog"), join(dir, "catalog"));
  symlinkSync(join(DEMO_ROOT, "applications"), join(dir, "applications"));
  writeFileSync(join(dir, "vicversa.yaml"), `template: ${template}\n`);
  return dir;
}

async function withData<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const saved = process.env["VICVERSA_HOME"];
  process.env["VICVERSA_HOME"] = dir;
  try {
    return await fn();
  } finally {
    process.env["VICVERSA_HOME"] = saved;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("bundled templates load with their own measurements", async () => {
  const harvard = await loadTemplate("harvard");
  assert.equal(harvard.source, "bundled");
  assert.equal(harvard.theme.page.width, 612); // US Letter
  assert.deepEqual(harvard.definition.fonts, ["Tinos"]);
  assert.equal((await loadTemplate("classic-ats")).theme.type.family.body, "Arimo");
});

test("an unknown template names the bundled ones and where to put your own", async () => {
  await assert.rejects(loadTemplate("nope"), /Unknown template "nope"\. Bundled: harvard, classic-ats; or add your own at .*templates\/nope\/template\.tsx/);
});

for (const id of BUNDLED_TEMPLATES) {
  test(`every demo CV fits on one page with ${id}`, async () => {
    const results = await withData(dataFolder(id), () => validateApplications());
    assert.equal(results.length, 15);
    assert.deepEqual(results.filter((r) => !r.ok).map((r) => r.name), []);
  });
}

test("your own template, outside the repo, is loaded and measured through the contract", async () => {
  const dir = dataFolder("mini");
  const own = join(dir, "templates", "mini");
  mkdirSync(own, { recursive: true });
  copyFileSync(resolve(TOOL_ROOT, "src/templates/classic-ats/theme.yaml"), join(own, "theme.yaml"));
  writeFileSync(
    join(own, "template.tsx"),
    `import { measure, SummaryProbes, type TemplateDefinition } from "vicversa/template";

const mini: TemplateDefinition = {
  id: "mini",
  name: "Mini",
  description: "Test template",
  ats: true,
  fonts: ["Arimo"],
  Page: ({ doc }) => (
    <div className="page">
      <div {...measure.content}>
        <h1>{doc.name}</h1>
        {doc.sections.map((s) => (
          <section key={s.id} {...measure.section(s.id)}>
            <h2>{s.title}</h2>
            {s.kind === "items" && s.items.map((i) => (
              <div key={i.id} {...measure.item(i.id)}>
                {i.lead}
                <ul>{i.bullets.map((b) => <li key={b.id} {...measure.bullet(b.id)}>{b.text}</li>)}</ul>
              </div>
            ))}
          </section>
        ))}
      </div>
      <SummaryProbes doc={doc} className="summary" />
    </div>
  ),
  styles: () => "h1 { margin: 0; }",
};
export default mini;
`,
  );
  const [result] = await withData(dir, async () => {
    const template = await loadTemplate("mini");
    assert.equal(template.source, "user");
    return validateApplications(["2026-10-globex-desarrollador-fullstack"]);
  });
  assert.equal(result!.error, undefined);
  assert.equal(result!.ok, true);
  assert.ok(result!.assessment!.sections.length >= 3, "sections were found through data-measure");
});
