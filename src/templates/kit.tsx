import { Fragment, type ReactElement } from "react";
import type { ResolvedDocument } from "../resolve.js";
import { themeToCssVars, type Theme } from "../theme.js";

/**
 * Everything a CV template needs, and the contract it must keep.
 *
 * A template decides how a CV looks. vicversa decides whether it fits: it lays
 * the page out in Chromium and measures what the template marks with
 * `data-measure`. Mark these and the template gets the one-page guarantee and
 * the "what to cut" report for free:
 *
 *   content        the block whose height must fit the page (exactly one)
 *   section        each section, with data-section={id}
 *   item           each experience/project/certification, with data-item={id}
 *   bullet         each bullet, with data-bullet={id}
 *   skill-row      each skills row, containing skill-label and skill-value
 *   summary-probe  rendered by <SummaryProbes>, to price summary swaps
 *
 * Your own template lives in `<data>/templates/<id>/template.tsx`, default-
 * exports a TemplateDefinition and imports helpers from "vicversa/template".
 */

export type { ResolvedDocument, ResolvedItem, ResolvedSection } from "../resolve.js";
export type { Theme } from "../theme.js";

export interface TemplateProps {
  doc: ResolvedDocument;
  theme: Theme;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  /** Single column, real text, standard headings: safe for applicant tracking systems. */
  ats: boolean;
  /** Font families to embed; each must be vendored in assets/fonts/. */
  fonts: string[];
  Page: (props: TemplateProps) => ReactElement;
  /** Template CSS. Lengths should come from the theme's CSS variables. */
  styles: (theme: Theme) => string;
}

/** Spread onto elements: `<section {...measure.section(s.id)}>`. */
export const measure = {
  content: { "data-measure": "content" },
  section: (id: string) => ({ "data-measure": "section", "data-section": id }),
  item: (id: string) => ({ "data-measure": "item", "data-item": id }),
  bullet: (id: string) => ({ "data-measure": "bullet", "data-bullet": id }),
  skillRow: { "data-measure": "skill-row" },
  skillLabel: { "data-measure": "skill-label" },
  skillValue: { "data-measure": "skill-value" },
} as const;

/**
 * Off-page copies of every catalog summary at the real column width, styled
 * like the template's own summary (pass its class). They never print; the
 * renderer measures them to price each summary swap.
 */
export function SummaryProbes({ doc, className }: { doc: ResolvedDocument; className: string }) {
  return (
    <div className="probe" aria-hidden="true">
      {doc.summaryProbes.map((probe) => (
        <p className={className} data-measure="summary-probe" data-summary={probe.id} key={probe.id}>
          {probe.text}
        </p>
      ))}
    </div>
  );
}

/** "Java (Spring), Python" — names joined by the theme's separators, details in a span. */
export function SkillList({ items, theme }: { items: { name: string; detail?: string }[]; theme: Theme }) {
  return (
    <>
      {items.map((skill, i) => (
        <Fragment key={`${skill.name}-${i}`}>
          {i > 0 && theme.skills.separator}
          {skill.name}
          {skill.detail && (
            <span className="skill__detail">
              {theme.skills.detailSeparator}({skill.detail})
            </span>
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * The part every template shares: theme variables, the page box at the exact
 * paper size, and the hidden probe area. Template styles come after it.
 */
export function baseStyles(theme: Theme): string {
  return `
:root {
${themeToCssVars(theme)}
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
}

body {
  font-family: var(--font-body);
  font-size: var(--size-body);
  font-weight: var(--weight-regular);
  line-height: var(--lh-body);
  color: var(--color-text);
  /* Chrome otherwise nudges glyph positions between screen and print. */
  text-rendering: geometricPrecision;
  font-kerning: normal;
}

/* Literal values: Chrome does not resolve var() inside @page size. */
@page {
  size: ${theme.page.width}pt ${theme.page.height}pt;
  margin: 0;
}

.page {
  position: relative;
  width: var(--page-width);
  height: var(--page-height);
  padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
  margin: 0 auto;
  overflow: hidden;
  background: #fff;
}

/* The validator measures this element. Nothing may add height outside it. */
[data-measure="content"] { width: var(--content-width); }

/*
 * Measurement-only copies of the summary variants. Positioned out of flow and
 * hidden so they contribute nothing to page height and never reach the PDF.
 */
.probe {
  position: absolute;
  visibility: hidden;
  top: 0;
  left: -10000pt;
  width: var(--content-width);
}

.probe > [data-measure="summary-probe"] { margin-top: 0; }
`.trim();
}
