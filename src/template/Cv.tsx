import { Fragment } from "react";
import type { ResolvedDocument, ResolvedItem, ResolvedSection } from "../resolve.js";
import type { Theme } from "../theme.js";

/**
 * The CV template.
 *
 * Rendered to a string for the PDF pipeline and mounted directly by the editing
 * UI, so there is exactly one definition of what a CV looks like. Two templates
 * kept in sync is the same failure this project exists to eliminate.
 */

function SkillValue({ items, theme }: { items: { name: string; detail?: string }[]; theme: Theme }) {
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

function Item({ item }: { item: ResolvedItem }) {
  return (
    <div className="item" data-measure="item" data-item={item.id}>
      <div className="item__head">
        <span>
          {item.href ? (
            <a className="item__lead" href={item.href}>{item.lead}</a>
          ) : (
            <span className="item__lead">{item.lead}</span>
          )}
          {item.rest}
        </span>
        {item.meta && <span className="item__meta">{item.meta}</span>}
      </div>
      {item.bullets.length > 0 && (
        <ul className="bullets">
          {item.bullets.map((bullet) => (
            <li key={bullet.id} data-measure="bullet" data-bullet={bullet.id}>{bullet.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionBody({ section, theme }: { section: ResolvedSection; theme: Theme }) {
  switch (section.kind) {
    case "skills":
      return (
        <>
          {section.rows.map((row, i) => (
            <div className="skill-row" data-measure="skill-row" key={i}>
              <span className="skill-row__label" data-measure="skill-label">
                {row.label}
                {theme.skills.labelSuffix}
              </span>
              <span className="skill-row__value" data-measure="skill-value">
                <SkillValue items={row.items} theme={theme} />
              </span>
            </div>
          ))}
        </>
      );

    case "items":
      return <>{section.items.map((item) => <Item item={item} key={item.id} />)}</>;

    case "education":
      return (
        <>
          {section.entries.map((entry) => (
            <div className="edu" key={entry.id}>
              <div className="edu__row">
                <span>
                  <span className="edu__org">{entry.org}</span>
                  {" - "}
                  <span className="edu__program">{entry.program}</span>
                </span>
                {entry.graduation && <span className="edu__graduation">{entry.graduation}</span>}
              </div>
              {(entry.semester || entry.gpa) && (
                <div className="edu__row">
                  <span className="edu__semester">{entry.semester}</span>
                  {entry.gpa && <span className="edu__gpa">{entry.gpa}</span>}
                </div>
              )}
              {/*
                Distinctions share the date line rather than claiming one of
                their own. That line is short and its right half is empty, so
                this costs no page height - which on a one-page CV is the only
                budget that matters.
              */}
              <div className="edu__row">
                <span className="edu__range">{entry.range}</span>
                {entry.honors.length > 0 && (
                  <span className="edu__honors">
                    {entry.honors.map((honor, i) => (
                      <Fragment key={honor}>
                        {i > 0 && theme.honor.separator}
                        {honor}
                      </Fragment>
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </>
      );
  }
}

export function Cv({ doc, theme }: { doc: ResolvedDocument; theme: Theme }) {
  return (
    <div className="page">
      <div className="content" data-measure="content">
        <h1 className="name">{doc.name}</h1>

        <p className="contact">
          {doc.contact.map((chip, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="contact__sep">•</span>}
              {chip.href ? <a href={chip.href}>{chip.text}</a> : chip.text}
            </Fragment>
          ))}
        </p>

        <hr className="rule rule--header" />

        {doc.summary && <p className="summary">{doc.summary}</p>}

        {doc.sections.map((section) => (
          <section className="section" key={section.id} data-measure="section" data-section={section.id}>
            <h2 className="section__title">{section.title}</h2>
            <hr className="rule rule--section" />
            <div className="section__body">
              <SectionBody section={section} theme={theme} />
            </div>
          </section>
        ))}
      </div>

      {/*
        Off-page measurement copies of every catalog summary, at the real column
        width. Hidden and outside .content, so they cost no height and never
        print - the renderer measures them to price each swap.
      */}
      <div className="probe" aria-hidden="true">
        {doc.summaryProbes.map((probe) => (
          <p className="summary" data-measure="summary-probe" data-summary={probe.id} key={probe.id}>{probe.text}</p>
        ))}
      </div>
    </div>
  );
}
