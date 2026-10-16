/**
 * Renders the brand images the README and GitHub use, from the same vendored
 * fonts and the bundled demo, so they can be regenerated whenever the panel
 * changes:
 *
 *   docs/brand/wordmark-dark.png, wordmark-light.png   README header
 *   docs/brand/social-preview.png                      GitHub social preview (1280×640)
 *   docs/screenshots/*.png                             panel views, demo data
 *
 * Run: pnpm brand
 */
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright";

process.env["VICVERSA_HOME"] = "examples/demo";
const { TOOL_ROOT } = await import("../src/paths.js");
const { createUiServer } = await import("../src/ui/server.js");

const BRAND = resolve(TOOL_ROOT, "docs/brand");
const SHOTS = resolve(TOOL_ROOT, "docs/screenshots");
// Inlined: a page built with setContent may not load file:// URLs.
const font = async (file: string) =>
  `data:font/woff2;base64,${(await readFile(resolve(TOOL_ROOT, "assets/fonts", file))).toString("base64")}`;

const PALETTE = {
  dark: { page: "#13151b", ink: "#ece9e1", muted: "#8a8f9b" },
  light: { page: "#ffffff", ink: "#1a1d24", muted: "#767b88" },
};

/** Same construction as the panel's .wordmark: "CV" in the serif, over a highlighter stroke. */
async function brandCss(): Promise<string> {
  return `
@font-face { font-family: Montserrat; font-weight: 500; src: url("${await font("Montserrat-500-normal-latin.woff2")}"); }
@font-face { font-family: Montserrat; font-weight: 600; src: url("${await font("Montserrat-600-normal-latin.woff2")}"); }
@font-face { font-family: "Instrument Serif"; font-style: normal; src: url("${await font("InstrumentSerif-400-normal-latin.woff2")}"); }
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url("${await font("InstrumentSerif-400-italic-latin.woff2")}"); }
@font-face { font-family: "JetBrains Mono"; src: url("${await font("JetBrainsMono-400-normal-latin.woff2")}"); }
* { margin: 0; box-sizing: border-box; }
.wordmark { font: 600 1em/1 Montserrat; letter-spacing: -0.02em; display: inline-flex; align-items: baseline; }
.wordmark em {
  position: relative; z-index: 0; color: #1b1e26;
  font-family: "Instrument Serif"; font-style: italic; font-weight: 400; font-size: 1.28em; letter-spacing: 0.01em;
  padding: 0 0.16em 0 0.1em; margin: 0 0.06em 0 0.05em;
}
.wordmark em::before {
  content: ""; position: absolute; z-index: -1; left: -0.02em; right: 0; top: 0.08em; bottom: 0.04em;
  background: #f2d54a; transform: skewX(-8deg) rotate(-1.5deg); border-radius: 2px 6px 3px 7px;
}`;
}

const wordmark = `<span class="wordmark"><span>vi</span><em>CV</em><span>ersa</span></span>`;

async function render(page: Page, html: string, path: string, size: { width: number; height: number }, selector?: string) {
  await page.setViewportSize(size);
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await (selector ? page.locator(selector) : page).screenshot({ path, omitBackground: !!selector });
}

await mkdir(BRAND, { recursive: true });
await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

for (const mode of ["dark", "light"] as const) {
  const c = PALETTE[mode];
  await render(
    page,
    `<style>${await brandCss()} body { padding: 24px 32px; background: transparent; color: ${c.ink}; font-size: 64px; display: inline-block; }</style>${wordmark}`,
    resolve(BRAND, `wordmark-${mode}.png`),
    { width: 520, height: 140 },
    "body",
  );
}

await render(
  page,
  `<style>${await brandCss()}
body { width: 1280px; height: 640px; background: ${PALETTE.dark.page}; color: ${PALETTE.dark.ink}; padding: 88px 96px; display: grid; align-content: space-between; font-family: Montserrat; }
.top { font-size: 112px; }
h1 { font: 400 52px/1.12 "Instrument Serif"; max-width: 18ch; margin-top: 36px; }
.foot { display: flex; justify-content: space-between; align-items: flex-end; font: 500 22px Montserrat; color: ${PALETTE.dark.muted}; }
.foot code { font: 22px "JetBrains Mono"; color: ${PALETTE.dark.ink}; }
.diff { font: 22px/1.6 "JetBrains Mono"; color: ${PALETTE.dark.muted}; text-align: right; }
.diff b { color: #f2d54a; font-weight: 400; }
</style>
<div><div class="top">${wordmark}</div><h1>One catalog. Many one&#8209;page CVs. An honest tracker for where each one went.</h1></div>
<div class="foot"><span>Your career, under version control. <code>pnpm ui</code></span>
<span class="diff"><b>+</b> northwind.payments<br><b>+</b> ledger.sync<br>− kanban_cli.tui</span></div>`,
  resolve(BRAND, "social-preview.png"),
  { width: 1280, height: 640 },
);
await page.close();

// Panel screenshots from the demo, both themes for the hero.
const server = await createUiServer({ today: () => "2026-10-14" });
await new Promise<void>((done) => server.listen(4799, "127.0.0.1", done));
const base = "http://127.0.0.1:4799";
const views: [string, string, string][] = [
  ["summary", "/", ".cal .cell"],
  ["applications", "/applications?tab=all", ".row"],
  ["application", "/applications/2026-09-hooli-software-engineer", ".timeline li"],
  ["cv", "/cvs/2026-10-globex-desarrollador-fullstack", ".diff .piece"],
  ["catalog", "/catalog?kind=experience", ".catalog-row"],
];
for (const scheme of ["dark", "light"] as const) {
  const shot = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
  for (const [name, path, ready] of views) {
    if (scheme === "light" && name !== "summary") continue;
    await shot.goto(base + path);
    await shot.waitForSelector(ready);
    await shot.waitForTimeout(1200); // fonts, the funnel's draw-in, CV iframes
    await shot.screenshot({ path: resolve(SHOTS, `${name}-${scheme}.png`) });
  }
  await shot.close();
}
await browser.close();
server.close();
console.log(`brand images → docs/brand/, screenshots → docs/screenshots/`);
process.exit(0);
