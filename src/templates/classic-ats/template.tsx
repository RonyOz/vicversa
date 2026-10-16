import { Fragment } from "react";
import {
  measure, SkillList, SummaryProbes,
  type ResolvedItem, type ResolvedSection, type TemplateDefinition, type TemplateProps, type Theme,
} from "../kit.js";

/**
 * classic-ats — the plainest thing an applicant tracking system can read: one
 * column, left-aligned, standard uppercase headings, no tables, no icons, no
 * colour. Set in Arimo, which shares Arial's metrics.
 */

function Item({ item }: { item: ResolvedItem }) {
  return (
    <div className="item" {...measure.item(item.id)}>
      <div className="row">
        <span>
          <strong>{item.lead}</strong>
          {item.secondary && <span className="secondary"> — {item.secondary}</span>}
        </span>
        {item.meta && <span className="when">{item.meta}</span>}
      </div>
      {/* The link is printed only when the title does not already spell it out (projects lead with the repo path). */}
      {item.href && !item.href.includes(item.lead) && <div className="link">{item.href.replace(/^https?:\/\//, "")}</div>}
      {item.bullets.length > 0 && (
        <ul className="bullets">
          {item.bullets.map((b) => <li key={b.id} {...measure.bullet(b.id)}>{b.text}</li>)}
        </ul>
      )}
    </div>
  );
}

function Body({ section, theme }: { section: ResolvedSection; theme: Theme }) {
  switch (section.kind) {
    case "items":
      return <>{section.items.map((item) => <Item key={item.id} item={item} />)}</>;
    case "skills":
      return (
        <>
          {section.rows.map((row, i) => (
            <p className="skill-row" key={i} {...measure.skillRow}>
              <strong {...measure.skillLabel}>{row.label}{theme.skills.labelSuffix}</strong>{" "}
              <span {...measure.skillValue}><SkillList items={row.items} theme={theme} /></span>
            </p>
          ))}
        </>
      );
    case "education":
      return (
        <>
          {section.entries.map((e) => (
            <div className="item" key={e.id}>
              <div className="row">
                <span>
                  <strong>{e.program}</strong>
                  <span className="secondary"> — {e.org}</span>
                </span>
                <span className="when">{e.graduation ?? e.range}</span>
              </div>
              {(e.semester || e.gpa || e.honors.length > 0) && (
                <div className="detail">
                  {[e.semester, e.gpa, ...e.honors].filter(Boolean).map((part, i) => (
                    <Fragment key={i}>{i > 0 && theme.honor.separator}{part}</Fragment>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      );
  }
}

function Page({ doc, theme }: TemplateProps) {
  return (
    <div className="page">
      <div className="content" {...measure.content}>
        <h1 className="name">{doc.name}</h1>
        <p className="contact">
          {doc.contact.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && " | "}
              {c.text}
            </Fragment>
          ))}
        </p>
        {doc.summary && <p className="summary">{doc.summary}</p>}
        {doc.sections.map((section) => (
          <section className="section" key={section.id} {...measure.section(section.id)}>
            <h2 className="section-title">{section.title}</h2>
            <Body section={section} theme={theme} />
          </section>
        ))}
      </div>
      <SummaryProbes doc={doc} className="summary" />
    </div>
  );
}

const styles = () => `
.name { margin: 0; font-size: var(--size-name); font-weight: var(--weight-bold); line-height: var(--lh-heading); }
.contact { margin: var(--space-after-name) 0 0; font-size: var(--size-contact); color: var(--color-muted); }
.summary { margin: var(--space-after-header-block) 0 0; font-size: var(--size-summary); text-align: var(--text-align); hyphens: var(--text-hyphens); }
.section { margin-top: var(--space-section); }
.section-title {
  margin: 0; padding-bottom: var(--space-header-to-rule); border-bottom: var(--rule-section) solid var(--color-rule);
  font-size: var(--size-section); font-weight: var(--weight-bold); text-transform: uppercase; letter-spacing: 0.04em;
  line-height: var(--lh-heading);
}
.section-title + * { margin-top: var(--space-after-header-rule); }
.item + .item { margin-top: var(--space-item); }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; font-size: var(--size-item-title); }
.secondary { font-weight: var(--weight-regular); }
.when { flex: none; white-space: nowrap; color: var(--color-muted); }
.link, .detail { font-size: var(--size-honor); color: var(--color-muted); }
.bullets { margin: var(--space-after-item-title) 0 0; padding-left: var(--bullet-indent); }
.bullets li { text-align: var(--text-align); hyphens: var(--text-hyphens); }
.skill-row { margin: 0; }
.skill-row + .skill-row { margin-top: var(--space-skill-row); }
.skill__detail { color: var(--color-muted); }
`;

const classicAts: TemplateDefinition = {
  id: "classic-ats",
  name: "Classic ATS",
  description: "Plain one-column layout any applicant tracking system parses: standard headings, no tables, no colour. A4.",
  ats: true,
  fonts: ["Arimo"],
  Page,
  styles,
};

export default classicAts;
