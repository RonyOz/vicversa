import { z } from "zod";

const Margin = z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() });

export const Theme = z.object({
  page: z.object({ width: z.number(), height: z.number(), margin: Margin }),
  color: z.object({ text: z.string(), muted: z.string(), rule: z.string(), link: z.string() }),
  type: z.object({
    /** `body` is the main family (serif or sans); `fallback` only matters if embedding ever fails. */
    family: z.object({ body: z.string(), mono: z.string(), fallback: z.enum(["serif", "sans-serif"]).default("sans-serif") }),
    weight: z.object({
      regular: z.number(), medium: z.number(), semibold: z.number(), bold: z.number(),
    }),
    size: z.object({
      name: z.number(), contact: z.number(), summary: z.number(), section: z.number(),
      body: z.number(), itemTitle: z.number(), skillLabel: z.number(),
      skillValue: z.number(), honor: z.number(),
    }),
    lineHeight: z.object({ body: z.number(), heading: z.number() }),
  }),
  space: z.object({
    section: z.number(), afterHeaderRule: z.number(), headerToRule: z.number(),
    item: z.number(), afterItemTitle: z.number(), skillRow: z.number(),
    bodyInset: z.number(), sectionTitleIndent: z.number(),
    afterName: z.number(), contactToRule: z.number(), afterHeaderBlock: z.number(),
  }),
  rule: z.object({ header: z.number(), section: z.number() }),
  honor: z.object({ separator: z.string() }),
  bullet: z.object({
    indent: z.number(), markerInset: z.number(), markerSize: z.number(), markerTop: z.number(),
  }),
  skills: z.object({
    labelWidth: z.number(), labelSuffix: z.string(),
    separator: z.string(), detailSeparator: z.string(),
  }),
  text: z.object({ align: z.string(), hyphens: z.boolean() }),
});
export type Theme = z.infer<typeof Theme>;

/** Vertical space a single page has for content, in points. */
export function contentHeight(theme: Theme): number {
  return theme.page.height - theme.page.margin.top - theme.page.margin.bottom;
}

export function contentWidth(theme: Theme): number {
  return theme.page.width - theme.page.margin.left - theme.page.margin.right;
}

/**
 * Flattens the theme into CSS custom properties.
 *
 * Everything the stylesheet needs comes through here, so the stylesheet holds
 * no measurements of its own. That's what keeps theme.yaml editable by a future
 * UI without anyone having to touch CSS.
 */
export function themeToCssVars(theme: Theme): string {
  const pt = (n: number) => `${n}pt`;
  const vars: Record<string, string> = {
    "page-width": pt(theme.page.width),
    "page-height": pt(theme.page.height),
    "margin-top": pt(theme.page.margin.top),
    "margin-right": pt(theme.page.margin.right),
    "margin-bottom": pt(theme.page.margin.bottom),
    "margin-left": pt(theme.page.margin.left),
    "content-width": pt(contentWidth(theme)),

    "color-text": theme.color.text,
    "color-muted": theme.color.muted,
    "color-rule": theme.color.rule,
    "color-link": theme.color.link,

    "font-body": `"${theme.type.family.body}", ${theme.type.family.fallback}`,
    "font-mono": `"${theme.type.family.mono}", monospace`,

    "weight-regular": String(theme.type.weight.regular),
    "weight-medium": String(theme.type.weight.medium),
    "weight-semibold": String(theme.type.weight.semibold),
    "weight-bold": String(theme.type.weight.bold),

    "size-name": pt(theme.type.size.name),
    "size-contact": pt(theme.type.size.contact),
    "size-summary": pt(theme.type.size.summary),
    "size-section": pt(theme.type.size.section),
    "size-body": pt(theme.type.size.body),
    "size-item-title": pt(theme.type.size.itemTitle),
    "size-skill-label": pt(theme.type.size.skillLabel),
    "size-skill-value": pt(theme.type.size.skillValue),
    "size-honor": pt(theme.type.size.honor),

    "lh-body": String(theme.type.lineHeight.body),
    "lh-heading": String(theme.type.lineHeight.heading),

    "space-section": pt(theme.space.section),
    "space-after-header-rule": pt(theme.space.afterHeaderRule),
    "space-header-to-rule": pt(theme.space.headerToRule),
    "space-item": pt(theme.space.item),
    "space-after-item-title": pt(theme.space.afterItemTitle),
    "space-skill-row": pt(theme.space.skillRow),
    "space-body-inset": pt(theme.space.bodyInset),
    "space-section-title-indent": pt(theme.space.sectionTitleIndent),
    "space-after-name": pt(theme.space.afterName),
    "space-contact-to-rule": pt(theme.space.contactToRule),
    "space-after-header-block": pt(theme.space.afterHeaderBlock),

    "rule-header": pt(theme.rule.header),
    "rule-section": pt(theme.rule.section),

    "bullet-indent": pt(theme.bullet.indent),
    "bullet-marker-inset": pt(theme.bullet.markerInset),
    "bullet-marker-size": pt(theme.bullet.markerSize),
    "bullet-marker-top": pt(theme.bullet.markerTop),

    "skills-label-width": pt(theme.skills.labelWidth),

    "text-align": theme.text.align,
    "text-hyphens": theme.text.hyphens ? "auto" : "manual",
  };

  return Object.entries(vars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
}
