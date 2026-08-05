import { chromium, type Browser } from "playwright";
import { contentHeight, type Theme } from "./theme.js";

export type Measurement = {
  /** Vertical space one page offers, in points. */
  available: number;
  /** Vertical space the content actually takes, in points. */
  used: number;
  /** Positive means the CV does not fit on one page. */
  overflow: number;
  sections: { id: string; height: number }[];
  /** `withGap` includes the margin that disappears along with the item. */
  items: { id: string; section: string; height: number; withGap: number }[];
  bullets: { id: string; item: string; height: number; lines: number }[];
  /** Skill rows whose text is too wide for the column, in points. */
  skillOverflows: { label: string; overflow: number }[];
  /** Height each catalog summary would occupy, measured off-page. */
  summaries: { id: string; height: number }[];
};

export type RenderResult = { pdf: Buffer; measurement: Measurement };

/**
 * Measures the laid-out page and prints it to PDF in a single browser pass.
 *
 * Measuring in the same engine that produces the PDF is the whole point:
 * character counts and font metrics tables both lie about where a justified
 * line actually breaks, and a wrong line break is a wrong page height.
 */
export async function renderPdf(html: string, theme: Theme): Promise<RenderResult> {
  const browser = await launch();
  try {
    return await withPage(browser, html, theme);
  } finally {
    await browser.close();
  }
}

let shared: Browser | undefined;

/** Reuses one browser across a batch, so rendering N CVs pays startup once. */
export async function withSharedBrowser<T>(fn: (render: (html: string, theme: Theme) => Promise<RenderResult>) => Promise<T>): Promise<T> {
  shared ??= await launch();
  try {
    return await fn((html, theme) => withPage(shared!, html, theme));
  } finally {
    await shared.close();
    shared = undefined;
  }
}

function launch(): Promise<Browser> {
  return chromium.launch({ args: ["--font-render-hinting=none"] });
}

async function withPage(browser: Browser, html: string, theme: Theme): Promise<RenderResult> {
  const page = await browser.newPage({
    viewport: { width: Math.ceil(theme.page.width * (4 / 3)), height: Math.ceil(theme.page.height * (4 / 3)) },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(html, { waitUntil: "load" });

    // tsx compiles with esbuild's keepNames, which wraps nested functions in a
    // `__name` helper. page.evaluate ships a function to the browser by
    // stringifying it, so that helper travels along and is undefined there.
    // Passing a raw string sidesteps compilation entirely.
    await page.evaluate("globalThis.__name ??= (fn) => fn;");

    // Embedded fonts still load asynchronously. Measuring before they are ready
    // measures a fallback font, and every line break would be wrong.
    await page.evaluate(() => document.fonts.ready);

    const raw = await page.evaluate(measureInPage, {
      lineHeightPt: theme.type.size.body * theme.type.lineHeight.body,
    });

    // page.pdf() accepts px/in/cm/mm but not pt, so convert at 72pt to the inch.
    const pdf = await page.pdf({
      width: `${theme.page.width / 72}in`,
      height: `${theme.page.height / 72}in`,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
      preferCSSPageSize: false,
    });

    const available = contentHeight(theme);
    return {
      pdf,
      measurement: {
        ...raw,
        available,
        overflow: round(raw.used - available),
      },
    };
  } finally {
    await page.close();
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Runs inside the browser. Keep it self-contained: it is serialized to get there. */
function measureInPage({ lineHeightPt }: { lineHeightPt: number }) {
  const PX_TO_PT = 0.75;
  const pt = (px: number) => Math.round(px * PX_TO_PT * 100) / 100;

  const content = document.querySelector<HTMLElement>(".content");
  if (!content) throw new Error("No .content element to measure");

  const sections = [...document.querySelectorAll<HTMLElement>(".section")].map((el) => ({
    id: el.dataset.section ?? "?",
    height: pt(el.getBoundingClientRect().height + parseFloat(getComputedStyle(el).marginTop)),
  }));

  const items = [...document.querySelectorAll<HTMLElement>(".item")].map((el) => {
    const height = el.getBoundingClientRect().height;
    const gap = parseFloat(getComputedStyle(el).marginTop) || 0;
    return {
      id: el.dataset.item ?? "?",
      section: el.closest<HTMLElement>(".section")?.dataset.section ?? "?",
      height: pt(height),
      withGap: pt(height + gap),
    };
  });

  const bullets = [...document.querySelectorAll<HTMLElement>(".bullets li")].map((el) => {
    const height = pt(el.getBoundingClientRect().height);
    return {
      id: el.dataset.bullet ?? "?",
      item: el.closest<HTMLElement>(".item")?.dataset.item ?? "?",
      height,
      lines: Math.round(height / lineHeightPt),
    };
  });

  const skillOverflows = [...document.querySelectorAll<HTMLElement>(".skill-row")]
    .map((row) => {
      const value = row.querySelector<HTMLElement>(".skill-row__value")!;
      return {
        label: row.querySelector<HTMLElement>(".skill-row__label")?.textContent ?? "?",
        overflow: pt(value.scrollWidth - value.clientWidth),
      };
    })
    .filter((row) => row.overflow > 0.5);

  const summaries = [...document.querySelectorAll<HTMLElement>(".probe [data-summary]")].map((el) => ({
    id: el.dataset.summary ?? "?",
    height: pt(el.getBoundingClientRect().height),
  }));

  return {
    used: pt(content.getBoundingClientRect().height),
    sections,
    items,
    bullets,
    skillOverflows,
    summaries,
  };
}
