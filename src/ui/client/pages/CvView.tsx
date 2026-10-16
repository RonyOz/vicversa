import { ArrowLeft, ExternalLink, FileText, ListChecks } from "lucide-react";
import { Link, useParams } from "react-router";
import { useCatalog, useCv, useFit } from "../api.js";
import { catalogEntries, KIND_LABELS, pieceHref, type CatalogEntry } from "../catalog-view.js";
import { CvPreview } from "../components/CvPreview.js";
import { FitBadge } from "../components/FitBadge.js";
import { STATE_LABELS } from "../labels.js";
import type { PieceKind } from "../../../usage.js";
import { PageError, PageLoading } from "./states.js";

const usedIn = (n: number) => `en ${n} ${n === 1 ? "CV" : "CVs"}`;

export function CvView() {
  const name = decodeURIComponent(useParams()["name"] ?? "");
  const cv = useCv(name);
  const catalog = useCatalog();
  const fit = useFit();

  const error = cv.error ?? catalog.error;
  if (error) return <PageError error={error} />;
  if (!cv.data || !catalog.data) return <PageLoading />;

  const { application, pieces, tracking } = cv.data;
  const meta = application.metadata;
  const language = meta.language;
  const htmlUrl = `/api/cv/${encodeURIComponent(name)}.html`;

  // Look pieces up in the CV's own language, so texts read as they print.
  const lookup = (kind: PieceKind) => new Map(catalogEntries(catalog.data, kind, language).map((e) => [e.id, e]));
  const summary = pieces.summary ? lookup("summary").get(pieces.summary) : undefined;
  const byKind = new Map<PieceKind, Map<string, CatalogEntry>>();
  const entryOf = (kind: PieceKind, id: string) => {
    if (!byKind.has(kind)) byKind.set(kind, lookup(kind));
    return byKind.get(kind)!.get(id);
  };

  return (
    <>
      <Link to="/cvs" className="back" viewTransition>
        <ArrowLeft size={15} /> Hojas de vida
      </Link>
      <header className="page-head detail-head">
        <div>
          <h1>
            {meta.company ?? name}
            {tracking && <span className={`badge ${tracking.state}`}>{STATE_LABELS[tracking.state]}</span>}
          </h1>
          <p>
            {meta.role ?? "Plantilla o borrador"} · <span className="num">{name}</span>
          </p>
          <div className="links">
            {tracking && (
              <Link className="btn" to={`/convocatorias/${encodeURIComponent(name)}`} viewTransition>
                <ListChecks /> Ver seguimiento
              </Link>
            )}
            {meta.url && (
              <a className="btn" href={meta.url} target="_blank" rel="noreferrer">
                <ExternalLink /> Ver convocatoria
              </a>
            )}
            <a className="btn" href={htmlUrl} target="_blank" rel="noreferrer">
              <FileText /> Abrir página
            </a>
          </div>
        </div>
      </header>

      <div className="grid-2 cv-layout">
        <section className="card">
          <CvPreview src={htmlUrl} title={`CV ${name}`} />
        </section>

        <div className="stack">
          <section className="card">
            <h2>Una página</h2>
            <p className="lede">Medido en el mismo navegador que imprime el PDF.</p>
            <FitBadge fit={fit.data?.[name]} />
            {fit.data?.[name] && !fit.data[name]!.error && (
              <div className="meter" data-tip={`${fit.data[name]!.used.toFixed(0)} de ${fit.data[name]!.available.toFixed(0)} pt usados`}>
                <i style={{ width: `${Math.min(100, (fit.data[name]!.used / fit.data[name]!.available) * 100)}%` }} className={fit.data[name]!.ok ? "" : "over"} />
              </div>
            )}
          </section>

          <section className="card">
            <h2>Piezas del catálogo</h2>
            <p className="lede">Lo que esta hoja de vida toma del catálogo, en orden. Clic para ver dónde más se usa.</p>

            {summary && (
              <div className="piece-group">
                <h3>{KIND_LABELS.summary}</h3>
                <Link to={pieceHref("summary", summary.id)} className="piece" viewTransition>
                  <div className="piece-head">
                    <span className="num">{summary.id}</span>
                    <span className="uses">{usedIn(summary.count)}</span>
                  </div>
                  <p className="piece-text">{summary.text}</p>
                </Link>
              </div>
            )}

            {(["experience", "project", "education", "certification"] as const).map((kind) => {
              const items = pieces.items.filter((i) => i.kind === kind);
              if (items.length === 0) return null;
              return (
                <div className="piece-group" key={kind}>
                  <h3>{KIND_LABELS[kind]}</h3>
                  {items.map((item) => {
                    const entry = entryOf(kind, item.id);
                    return (
                      <Link key={item.id} to={pieceHref(kind, item.id)} className="piece" viewTransition>
                        <div className="piece-head">
                          <strong>{entry?.title ?? item.id}</strong>
                          <span className="uses">{usedIn(entry?.count ?? 0)}</span>
                        </div>
                        <div className="piece-sub">{entry?.subtitle}</div>
                        {item.bullets.length > 0 && (
                          <ul className="bullets">
                            {item.bullets.map((b) => {
                              const bullet = entry?.bullets.find((x) => x.id === b);
                              return (
                                <li key={b} data-tip={`${b}\n${usedIn(bullet?.count ?? 0)}`}>
                                  {bullet?.text ?? b}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            {pieces.skills.length > 0 && (
              <div className="piece-group">
                <h3>{KIND_LABELS.skill}</h3>
                <div className="skill-chips">
                  {pieces.skills.map((id) => {
                    const skill = entryOf("skill", id);
                    return (
                      <Link key={id} to={pieceHref("skill", id)} className="chip" viewTransition data-tip={`${skill?.title ?? id}${skill?.subtitle ? ` · ${skill.subtitle}` : ""}\n${usedIn(skill?.count ?? 0)}`}>
                        {skill?.title ?? id}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
