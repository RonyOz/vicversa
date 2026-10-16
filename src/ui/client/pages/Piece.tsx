import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useCatalog } from "../api.js";
import { catalogEntries, kindFromSlug, KIND_LABELS, KIND_SLUGS } from "../catalog-view.js";
import { STATE_LABELS } from "../labels.js";
import { PageError } from "./states.js";
import { PageLoading } from "./states.js";

/** One catalog piece: its text in both languages and every CV that uses it. */
export function Piece() {
  const params = useParams();
  const kind = kindFromSlug(params["kind"]);
  const id = decodeURIComponent(params["id"] ?? "");
  const { data, error } = useCatalog();

  if (error) return <PageError error={error} />;
  if (!data) return <PageLoading />;

  const es = catalogEntries(data, kind, "es").find((e) => e.id === id);
  const en = catalogEntries(data, kind, "en").find((e) => e.id === id);
  if (!es || !en) return <PageError error={new Error(`No hay ${KIND_LABELS[kind].toLowerCase()} con id "${id}".`)} />;

  const users = data.usage.pieces[`${kind}:${id}`] ?? [];
  const sameText = (a: string, b: string) => a === b;

  return (
    <>
      <Link to={`/catalogo${kind === "summary" ? "" : `?tipo=${KIND_SLUGS[kind]}`}`} className="back" viewTransition>
        <ArrowLeft size={15} /> {KIND_LABELS[kind]}
      </Link>
      <header className="page-head">
        <div>
          <h1 className={kind === "summary" ? "num" : ""}>{es.title}</h1>
          <p>{es.subtitle}</p>
        </div>
      </header>

      <div className="grid-2">
        <div className="stack">
          {(es.text || en.text) && (
            <section className="card">
              <h2>Texto</h2>
              {sameText(es.text, en.text) ? (
                <p className="piece-text">{es.text}</p>
              ) : (
                <div className="bilingual">
                  <div><span className="lang">ES</span><p className="piece-text">{es.text}</p></div>
                  <div><span className="lang">EN</span><p className="piece-text">{en.text}</p></div>
                </div>
              )}
            </section>
          )}
          {es.bullets.length > 0 && (
            <section className="card">
              <h2>Bullets</h2>
              <p className="lede">Cada CV elige cuáles incluir. El número es en cuántos aparece.</p>
              <ul className="bullet-list">
                {es.bullets.map((b, i) => {
                  const english = en.bullets[i]!;
                  return (
                    <li key={b.id} className={b.count === 0 ? "unused" : ""}>
                      <div className="piece-head">
                        <span className="num muted">{b.id}</span>
                        <span className="uses-text">{b.count === 0 ? "sin usar" : `en ${b.count} ${b.count === 1 ? "CV" : "CVs"}`}</span>
                      </div>
                      <p className="piece-text">{b.text}</p>
                      {!sameText(b.text, english.text) && <p className="piece-text muted">{english.text}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <section className="card">
          <h2>Usada en {users.length} {users.length === 1 ? "hoja de vida" : "hojas de vida"}</h2>
          <p className="lede">{users.length === 0 ? "Ningún CV la incluye todavía." : "Clic para abrir el CV."}</p>
          <ul className="feed">
            {users.map((name) => {
              const app = data.apps[name]!;
              return (
                <li key={name}>
                  <span className="lang">{app.language.toUpperCase()}</span>
                  <div>
                    <Link to={`/cvs/${encodeURIComponent(name)}`} viewTransition>
                      {app.company ?? name}
                    </Link>
                    <div className="sub">{app.role ?? "Plantilla o borrador"}</div>
                  </div>
                  {app.state ? <span className={`badge ${app.state}`}>{STATE_LABELS[app.state]}</span> : <span className="muted" style={{ fontSize: 12 }}>plantilla</span>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
