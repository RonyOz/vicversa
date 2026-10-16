import { Fragment } from "react";
import {
  measure, SkillList, SummaryProbes,
  type ResolvedItem, type ResolvedSection, type TemplateDefinition, type TemplateProps, type Theme,
} from "../kit.js";

/**
 * harvard — the classic one-column résumé of Harvard's career office: centered
 * name, small-caps section headings over a full rule, organisation on the left
 * with dates on the right, role in italics, then bullets. Set in Tinos, which
 * shares Times New Roman's metrics, so it reads like the Word original.
 */

function Item({ item }: { item: ResolvedItem }) {
  const org = item.secondary ?? item.lead;
  const role = item.secondary ? item.lead : undefined;
  return (
    <div className="item" {...measure.item(item.id)}>
      <div className="row">
        <span className="org">{org}</span>
        {item.meta && <span className="when">{item.meta}</span>}
      </div>
      {role && (
        <div className="row">
          {item.href ? <a className="role" href={item.href}>{role}</a> : <span className="role">{role}</span>}
        </div>
      )}
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
              <span className="skill-label" {...measure.skillLabel}>{row.label}{theme.skills.labelSuffix}</span>{" "}
              <span className="skill-value" {...measure.skillValue}><SkillList items={row.items} theme={theme} /></span>
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
                <span className="org">{e.org}</span>
                <span className="when">{e.graduation ?? e.range}</span>
              </div>
              <div className="row">
                <span className="role">{e.program}{e.semester ? `, ${e.semester}` : ""}</span>
                {e.gpa && <span>{e.gpa}</span>}
              </div>
              {e.honors.length > 0 && (
                <p className="honors">
                  {e.honors.map((h, i) => <Fragment key={h}>{i > 0 && theme.honor.separator}{h}</Fragment>)}
                </p>
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
              {i > 0 && <span className="sep"> • </span>}
              {c.href ? <a href={c.href}>{c.text}</a> : c.text}
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
a { color: inherit; text-decoration: none; }
.name {
  margin: 0; text-align: center; font-size: var(--size-name); font-weight: var(--weight-bold);
  line-height: var(--lh-heading); letter-spacing: 0.02em;
}
.contact { margin: var(--space-after-name) 0 0; text-align: center; font-size: var(--size-contact); }
.summary { margin: var(--space-after-header-block) 0 0; font-size: var(--size-summary); text-align: var(--text-align); hyphens: var(--text-hyphens); }
.section { margin-top: var(--space-section); }
.section-title {
  margin: 0; padding-bottom: var(--space-header-to-rule); border-bottom: var(--rule-section) solid var(--color-rule);
  font-size: var(--size-section); font-weight: var(--weight-bold); font-variant: small-caps; letter-spacing: 0.06em;
  line-height: var(--lh-heading);
}
.section-title + * { margin-top: var(--space-after-header-rule); }
.item + .item { margin-top: var(--space-item); }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.org { font-weight: var(--weight-bold); font-size: var(--size-item-title); }
.when { flex: none; white-space: nowrap; }
.role { font-style: italic; }
.bullets { margin: var(--space-after-item-title) 0 0; padding-left: var(--bullet-indent); }
.bullets li { text-align: var(--text-align); hyphens: var(--text-hyphens); }
.skill-row { margin: 0; }
.skill-row + .skill-row { margin-top: var(--space-skill-row); }
.skill-label { font-weight: var(--weight-bold); }
.skill__detail { color: var(--color-muted); }
.honors { margin: 0; font-style: italic; color: var(--color-muted); font-size: var(--size-honor); }
`;

const harvard: TemplateDefinition = {
  id: "harvard",
  name: "Harvard",
  description: "Harvard career-office classic: one column, serif, small-caps headings over a rule, US Letter.",
  ats: true,
  fonts: ["Tinos"],
  Page,
  styles,
};

export default harvard;
