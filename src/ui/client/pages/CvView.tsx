import { ArrowLeft, ChevronRight, ExternalLink, FileText, ListChecks } from "lucide-react";
import { Link, useParams } from "react-router";
import type { PieceKind } from "../../../usage.js";
import { useCatalog, useCv, useFit } from "../api.js";
import { catalogEntries, KIND_KEYS, pieceHref, type CatalogEntry } from "../catalog-view.js";
import { CvPreview } from "../components/CvPreview.js";
import { FitBadge } from "../components/FitBadge.js";
import { useI18n } from "../i18n.js";
import { STATE_KEYS } from "../labels.js";
import { PageError, PageLoading } from "./states.js";

const ITEM_KINDS = ["experience", "project", "education", "certification"] as const;

export function CvView() {
  const { t } = useI18n();
  const name = decodeURIComponent(useParams()["name"] ?? "");
  const cv = useCv(name);
  const catalog = useCatalog();
  const fit = useFit();

  const error = cv.error ?? catalog.error;
  if (error) return <PageError error={error} />;
  if (!cv.data || !catalog.data) return <PageLoading />;

  const { application, pieces, tracking } = cv.data;
  const meta = application.metadata;
  const htmlUrl = `/api/cv/${encodeURIComponent(name)}.html`;
  const own = fit.data?.[name];

  // Pieces read in the CV's own language, the way they print.
  const entries = new Map<PieceKind, CatalogEntry[]>();
  const all = (kind: PieceKind) => {
    if (!entries.has(kind)) entries.set(kind, catalogEntries(catalog.data, kind, meta.language));
    return entries.get(kind)!;
  };
  const entryOf = (kind: PieceKind, id: string) => all(kind).find((e) => e.id === id);
  const summary = pieces.summary ? entryOf("summary", pieces.summary) : undefined;

  // The other side of the diff: catalog items this version leaves out.
  const left = ITEM_KINDS.flatMap((kind) =>
    all(kind)
      .filter((e) => !pieces.items.some((i) => i.kind === kind && i.id === e.id))
      .map((e) => ({ kind, entry: e })),
  );

  return (
    <>
      <Link to="/cvs" className="back" viewTransition>
        <ArrowLeft size={15} /> {t("cv.back")}
      </Link>
      <header className="page-head detail-head">
        <div>
          <h1>
            {meta.company ?? name}
            {tracking && <span className={`badge ${tracking.state}`}>{t(STATE_KEYS[tracking.state])}</span>}
          </h1>
          <p>
            {meta.role ?? t("cv.templateOrDraft")} <span className="file num">{name}</span>
          </p>
          <div className="links">
            {tracking && (
              <Link className="btn" to={`/applications/${encodeURIComponent(name)}`} viewTransition>
                <ListChecks /> {t("cv.tracking")}
              </Link>
            )}
            {meta.url && (
              <a className="btn" href={meta.url} target="_blank" rel="noreferrer">
                <ExternalLink /> {t("cv.posting")}
              </a>
            )}
            <a className="btn" href={htmlUrl} target="_blank" rel="noreferrer">
              <FileText /> {t("cv.open")}
            </a>
          </div>
        </div>
      </header>

      <div className="grid-2 cv-layout">
        <section className="card">
          <CvPreview src={htmlUrl} title={name} />
        </section>

        <div className="stack">
          <section className="card">
            <h2>{t("cv.fit")}</h2>
            <p className="lede">{t("cv.fitLede")}</p>
            <FitBadge fit={own} />
            {own && !own.error && (
              <div className="meter" data-tip={t("fit.meterTip", own.used.toFixed(0), own.available.toFixed(0))}>
                <i style={{ width: `${Math.min(100, (own.used / own.available) * 100)}%` }} className={own.ok ? "" : "over"} />
              </div>
            )}
          </section>

          <section className="card">
            <h2>{t("cv.pieces")}</h2>
            <p className="lede">{t("cv.piecesLede")}</p>

            <ul className="diff">
              {summary && (
                <li>
                  <Link to={pieceHref("summary", summary.id)} className="piece add" viewTransition>
                    <span className="piece-head">
                      <span>
                        <span className="kind">{t(KIND_KEYS.summary)}</span> <span className="num">{summary.id}</span>
                      </span>
                      <span className="uses">{t("cv.usedIn", summary.count)}</span>
                    </span>
                    <span className="piece-text">{summary.text}</span>
                  </Link>
                </li>
              )}
              {pieces.items.map((item) => {
                const entry = entryOf(item.kind, item.id);
                return (
                  <li key={`${item.kind}:${item.id}`}>
                    <Link to={pieceHref(item.kind, item.id)} className="piece add" viewTransition>
                      <span className="piece-head">
                        <span>
                          <span className="kind">{t(KIND_KEYS[item.kind])}</span> <strong>{entry?.title ?? item.id}</strong>
                        </span>
                        <span className="uses">{t("cv.usedIn", entry?.count ?? 0)}</span>
                      </span>
                      {entry?.subtitle && <span className="piece-sub">{entry.subtitle}</span>}
                      {item.bullets.length > 0 && (
                        <span className="bullets">
                          {item.bullets.map((b) => {
                            const bullet = entry?.bullets.find((x) => x.id === b);
                            return (
                              <span key={b} className="bullet" data-tip={`${b}\n${t("cv.usedIn", bullet?.count ?? 0)}`}>
                                {bullet?.text ?? b}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {pieces.skills.length > 0 && (
                <li className="piece add">
                  <span className="piece-head">
                    <span className="kind">{t(KIND_KEYS.skill)}</span>
                  </span>
                  <span className="skill-chips">
                    {pieces.skills.map((id) => {
                      const skill = entryOf("skill", id);
                      return (
                        <Link key={id} to={pieceHref("skill", id)} className="chip" viewTransition data-tip={`${skill?.title ?? id}${skill?.subtitle ? ` (${skill.subtitle})` : ""}\n${t("cv.usedIn", skill?.count ?? 0)}`}>
                          {skill?.title ?? id}
                        </Link>
                      );
                    })}
                  </span>
                </li>
              )}
            </ul>

            {left.length > 0 && (
              <details className="fold left-out">
                <summary>
                  <ChevronRight /> {t("cv.unused", left.length)}
                </summary>
                <ul className="diff">
                  {left.map(({ kind, entry }) => (
                    <li key={`${kind}:${entry.id}`}>
                      <Link to={pieceHref(kind, entry.id)} className="piece remove" viewTransition>
                        <span className="piece-head">
                          <span>
                            <span className="kind">{t(KIND_KEYS[kind])}</span> {entry.title}
                          </span>
                          <span className="uses">{t("cv.usedIn", entry.count)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
