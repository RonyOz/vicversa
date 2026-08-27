import { themeToCssVars, type Theme } from "../theme.js";

/**
 * The print stylesheet.
 *
 * It contains no measurements. Every length, colour and weight arrives as a CSS
 * custom property generated from theme.yaml, so tuning the layout means editing
 * YAML - which is what makes the layout editable by something other than a
 * person writing CSS by hand.
 */
export function styles(theme: Theme): string {
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
  font-family: var(--font-sans);
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
  width: var(--page-width);
  height: var(--page-height);
  padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
  margin: 0 auto;
  overflow: hidden;
  background: #fff;
}

/* The validator measures this element. Nothing may add height outside it. */
.content { width: var(--content-width); }

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

.probe .summary { margin-top: 0; }

/* ---------- masthead ---------- */

.name {
  margin: 0;
  font-size: var(--size-name);
  font-weight: var(--weight-bold);
  line-height: var(--lh-heading);
  text-align: center;
}

.contact {
  margin: var(--space-after-name) 0 0;
  font-size: var(--size-contact);
  text-align: center;
}

.contact__sep { padding: 0 0.25em; }

.rule {
  border: 0;
  margin: 0;
  background: var(--color-rule);
}

.rule--header {
  height: var(--rule-header);
  margin-top: var(--space-contact-to-rule);
}

.rule--section {
  height: var(--rule-section);
  margin-top: var(--space-header-to-rule);
}

.summary {
  margin: var(--space-after-header-block) 0 0;
  font-size: var(--size-summary);
  font-style: italic;
  text-align: var(--text-align);
  hyphens: var(--text-hyphens);
}

/* ---------- sections ---------- */

.section { margin-top: var(--space-section); }

.section__title {
  margin: 0;
  padding-left: var(--space-section-title-indent);
  font-size: var(--size-section);
  font-weight: var(--weight-semibold);
  line-height: var(--lh-heading);
}

/*
 * Body copy is inset from the frame the rules define, on both sides. The rules
 * and the summary stay flush, which is what makes them read as the page edge.
 */
.section__body {
  margin-top: var(--space-after-header-rule);
  padding-left: var(--space-body-inset);
  padding-right: var(--space-body-inset);
}

/* ---------- items: projects, experience, certifications ---------- */

.item + .item { margin-top: var(--space-item); }

.item__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12pt;
  font-size: var(--size-item-title);
  font-weight: var(--weight-semibold);
}

/*
 * Only the lead segment is underlined - the repo link, the job title, the
 * certification name. The Canva original underlined the lead alone on some
 * blocks and the whole line on others; this picks the treatment that was
 * consistent across every project entry on all five pages.
 */
.item__lead {
  font-weight: var(--weight-medium);
  text-decoration: underline;
  text-underline-offset: 0.14em;
  color: var(--color-link);
}

.item__meta {
  flex: none;
  font-weight: var(--weight-medium);
  white-space: nowrap;
}

.bullets {
  margin: var(--space-after-item-title) 0 0;
  padding: 0;
  list-style: none;
}

.bullets li {
  position: relative;
  padding-left: var(--bullet-indent);
  text-align: var(--text-align);
  hyphens: var(--text-hyphens);
}

/* Drawn, not typed - see the note in theme.yaml under bullet.markerSize. */
.bullets li::before {
  content: "";
  position: absolute;
  left: var(--bullet-marker-inset);
  top: var(--bullet-marker-top);
  width: var(--bullet-marker-size);
  height: var(--bullet-marker-size);
  border-radius: 50%;
  background: currentColor;
}

/* ---------- skills ---------- */

/*
 * Two columns, not three. The label column is fixed so every value starts at
 * the same x - that alignment is what makes three rows read as one table,
 * and it was the arrow's real job. The colon rides with the label.
 */
.skill-row {
  display: grid;
  grid-template-columns: var(--skills-label-width) 1fr;
  align-items: baseline;
}

.skill-row + .skill-row { margin-top: var(--space-skill-row); }

.skill-row__label { font-size: var(--size-skill-label); }

.skill-row__value {
  font-family: var(--font-mono);
  font-size: var(--size-skill-value);
  font-weight: var(--weight-bold);
  /* A wrap here is a layout bug, not a reflow. The validator asserts against it. */
  white-space: nowrap;
  /*
   * Without this the grid track widens to fit the text and pushes the whole
   * page wider, which hides the problem instead of exposing it. Pinned at 0,
   * too-long content overflows the cell and scrollWidth reports by how much.
   */
  min-width: 0;
}

/* The parenthetical after a skill name is the one part set in regular. */
.skill__detail { font-weight: var(--weight-regular); }

/* ---------- education ---------- */

.edu + .edu { margin-top: var(--space-item); }

.edu__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12pt;
}

.edu__org { font-weight: var(--weight-semibold); }
.edu__program { font-style: italic; }
.edu__semester { font-style: italic; }
.edu__graduation { font-weight: var(--weight-semibold); white-space: nowrap; }
.edu__gpa { white-space: nowrap; }
.edu__range { color: var(--color-muted); }

/*
 * Distinctions ride the right end of the date line, so they cost no height,
 * and they borrow that line's own treatment - muted, italic, a step down in
 * size. That subordinates them to the degree and the GPA, which is the right
 * reading order: they qualify the entry rather than announcing themselves.
 */
.edu__honors {
  color: var(--color-muted);
  font-size: var(--size-honor);
  font-style: italic;
  text-align: right;
}
`.trim();
}
