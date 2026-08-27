import type { LoadedCatalog } from "./catalog.js";
import { formatMonth, formatRange, isFallback, ordinal, pick } from "./i18n.js";
import type { Application, Language, Localized, SectionId } from "./schema.js";

export type ResolvedItem = {
  id: string;
  /** The underlined lead-in: a repo link, a job title, a certification name. */
  lead: string;
  href?: string;
  /** Everything after the lead on the same line, e.g. " - Andina University". */
  rest?: string;
  /** Right-aligned on the title line: a date or a date range. */
  meta?: string;
  /** Ids travel with the text so the overflow report can name what to cut. */
  bullets: { id: string; text: string }[];
};

export type ResolvedSection =
  | { kind: "skills"; id: SectionId; title: string; rows: { label: string; items: { name: string; detail?: string }[] }[] }
  | { kind: "items"; id: SectionId; title: string; items: ResolvedItem[] }
  | {
      kind: "education";
      id: SectionId;
      title: string;
      entries: {
        id: string;
        org: string;
        program: string;
        graduation?: string;
        semester?: string;
        gpa?: string;
        honors: string[];
        range: string;
      }[];
    };

export type ResolvedDocument = {
  lang: Language;
  name: string;
  contact: { text: string; href?: string }[];
  summary?: string;
  summaryId?: string;
  /**
   * Every summary in the catalog, rendered off-page at the real column width so
   * the renderer can measure them all in one pass. Swapping the summary is the
   * only way to reclaim height without dropping content, which makes "how much
   * would each alternative save?" the first question worth answering when a CV
   * overflows.
   */
  summaryProbes: { id: string; text: string }[];
  sections: ResolvedSection[];
  /** Content that fell back to another language. Surfaced, never silent. */
  warnings: string[];
};

/**
 * Expands a flat list of ids into items with their selected bullets.
 *
 * Selections are bullet ids, in render order. The owning item is derived and
 * items appear in the order their first bullet does, so ordering a CV means
 * ordering one list instead of keeping two lists in sync. A bare item id
 * includes the item's header with no bullets under it.
 */
function resolveItems(
  ids: string[],
  owners: Map<string, { id: string; bullets: { id: string; text: Localized }[] }>,
  catalog: LoadedCatalog,
  lang: Language,
  sectionName: string,
  build: (owner: any, bullets: string[]) => ResolvedItem,
  warnings: string[],
): ResolvedItem[] {
  const order: string[] = [];
  const selected = new Map<string, string[]>();

  const start = (ownerId: string) => {
    if (!selected.has(ownerId)) {
      selected.set(ownerId, []);
      order.push(ownerId);
    }
  };

  for (const id of ids) {
    const found = catalog.byId.bullets.get(id);

    if (found) {
      if (!owners.has(found.ownerId)) {
        throw new Error(
          `"${id}" belongs to "${found.ownerId}", which is not a ${sectionName}. ` +
            `Move it to the section that owns it.`,
        );
      }
      start(found.ownerId);
      selected.get(found.ownerId)!.push(id);
      if (isFallback(found.bullet.text, lang)) {
        warnings.push(`bullet "${id}" has no ${lang} text; fell back to another language`);
      }
      continue;
    }

    if (owners.has(id)) {
      start(id);
      continue;
    }

    throw new Error(`Unknown id "${id}" in ${sectionName}. It is neither a bullet nor an item.`);
  }

  return order.map((ownerId) => build(owners.get(ownerId)!, selected.get(ownerId)!));
}

export function resolveDocument(app: Application, catalog: LoadedCatalog): ResolvedDocument {
  const lang = app.metadata.language;
  const warnings: string[] = [];
  const t = (value: Localized) => pick(value, lang);
  const label = (key: keyof typeof catalog.labels) => t(catalog.labels[key]);

  const sectionTitle = (id: SectionId): string => {
    const override = app.content.section_titles[id];
    if (override) return t(override);
    const section = catalog.byId.sections.get(id);
    if (!section) throw new Error(`No title defined for section "${id}" in catalog/sections.yaml`);
    return t(section.title);
  };

  const bulletText = (id: string) => t(catalog.byId.bullets.get(id)!.bullet.text);

  // --- contact ------------------------------------------------------------
  const contactIds = app.content.contact ?? catalog.profile.contact.map((c) => c.id);
  const contact = contactIds.map((id) => {
    const item = catalog.profile.contact.find((c) => c.id === id);
    if (!item) throw new Error(`Unknown contact id "${id}"`);
    return { text: t(item.text), href: item.href };
  });

  // --- summary ------------------------------------------------------------
  let summary: string | undefined;
  if (app.content.summary) {
    const found = catalog.byId.summaries.get(app.content.summary);
    if (!found) throw new Error(`Unknown summary id "${app.content.summary}"`);
    summary = t(found.text);
    if (isFallback(found.text, lang)) {
      warnings.push(`summary "${found.id}" has no ${lang} text; fell back to another language`);
    }
  }

  // --- sections -----------------------------------------------------------
  const sections: ResolvedSection[] = app.content.sections.map((id): ResolvedSection => {
    const title = sectionTitle(id);

    switch (id) {
      case "skills": {
        const rows = app.content.skills.map((row) => {
          const group = catalog.byId.skillGroups.get(row.group);
          if (!group) throw new Error(`Unknown skill group "${row.group}"`);
          return {
            label: row.label ? t(row.label) : t(group.label),
            items: row.items.map((skillId) => {
              const skill = catalog.byId.skills.get(skillId);
              if (!skill) throw new Error(`Unknown skill "${skillId}"`);
              return { name: skill.name, detail: skill.detail };
            }),
          };
        });
        return { kind: "skills", id, title, rows };
      }

      case "projects": {
        const items = resolveItems(
          app.content.projects, catalog.byId.projects, catalog, lang, "project",
          (project, bullets) => ({
            id: project.id,
            lead: project.label,
            href: project.href,
            rest: ` - ${t(project.name)}`,
            bullets: bullets.map((bulletId) => ({ id: bulletId, text: bulletText(bulletId) })),
          }),
          warnings,
        );
        return { kind: "items", id, title, items };
      }

      case "experience": {
        const items = resolveItems(
          app.content.experience, catalog.byId.experiences, catalog, lang, "experience",
          (job, bullets) => ({
            id: job.id,
            lead: t(job.role),
            rest: ` - ${t(job.org)}`,
            meta: formatRange(job.start, job.end, lang, label("present")),
            bullets: bullets.map((bulletId) => ({ id: bulletId, text: bulletText(bulletId) })),
          }),
          warnings,
        );
        return { kind: "items", id, title, items };
      }

      case "certifications": {
        const items = resolveItems(
          app.content.certifications, catalog.byId.certifications, catalog, lang, "certification",
          (cert, bullets) => ({
            id: cert.id,
            lead: t(cert.name),
            rest: ` - ${t(cert.issuer)}`,
            meta: `${label("obtained")} ${formatMonth(cert.date, lang, "short")}`,
            bullets: bullets.map((bulletId) => ({ id: bulletId, text: bulletText(bulletId) })),
          }),
          warnings,
        );

        // Certifications read newest first regardless of how the application
        // listed them. Unlike projects and experience - where the order is an
        // editorial choice about what to lead with - a credential list has one
        // correct order, so the renderer enforces it instead of asking every
        // application to remember. "YYYY-MM" sorts lexicographically.
        const date = (itemId: string) => catalog.byId.certifications.get(itemId)!.date;
        items.sort((a, b) => date(b.id).localeCompare(date(a.id)));

        return { kind: "items", id, title, items };
      }

      case "education": {
        const entries = app.content.education.map((eduId) => {
          const edu = catalog.byId.education.get(eduId);
          if (!edu) throw new Error(`Unknown education id "${eduId}"`);
          return {
            id: edu.id,
            org: t(edu.org),
            program: t(edu.program),
            graduation: edu.graduation ? `${label("graduation")}: ${formatMonth(edu.graduation, lang)}` : undefined,
            semester: edu.semester ? `${ordinal(edu.semester, lang)} ${label("semester")}` : undefined,
            gpa: edu.gpa ? `${label("gpa")}: ${t(edu.gpa)}` : undefined,
            honors: edu.honors.map(t),
            range: formatRange(edu.start, edu.end, lang, label("present")),
          };
        });
        return { kind: "education", id, title, entries };
      }
    }
  });

  const summaryProbes = catalog.summaries.map((s) => ({ id: s.id, text: t(s.text) }));

  return {
    lang,
    name: catalog.profile.name,
    contact,
    summary,
    summaryId: app.content.summary,
    summaryProbes,
    sections,
    warnings,
  };
}
