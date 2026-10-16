import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useCatalog } from "../api.js";
import { catalogEntries, kindFromSlug, KIND_KEYS, KIND_SLUGS } from "../catalog-view.js";
import { useI18n } from "../i18n.js";
import { STATE_KEYS } from "../labels.js";
import { PageError, PageLoading } from "./states.js";

/** One catalog piece: its text in both languages and every CV that uses it. */
export function Piece() {
  const { t } = useI18n();
  const params = useParams();
  const kind = kindFromSlug(params["kind"]);
  const id = decodeURIComponent(params["id"] ?? "");
  const { data, error } = useCatalog();

  if (error) return <PageError error={error} />;
  if (!data) return <PageLoading />;

  const es = catalogEntries(data, kind, "es").find((e) => e.id === id);
  const en = catalogEntries(data, kind, "en").find((e) => e.id === id);
  if (!es || !en) return <PageError error={new Error(t("piece.missing", t(KIND_KEYS[kind]), id))} />;

  const users = data.usage.pieces[`${kind}:${id}`] ?? [];

  return (
    <>
      <Link to={`/catalog${kind === "summary" ? "" : `?kind=${KIND_SLUGS[kind]}`}`} className="back" viewTransition>
        <ArrowLeft size={15} /> {t(KIND_KEYS[kind])}
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
              <h2>{t("piece.text")}</h2>
              {es.text === en.text ? (
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
              <h2>{t("piece.bullets")}</h2>
              <p className="lede">{t("piece.bulletsLede")}</p>
              <ul className="bullet-list">
                {es.bullets.map((b, i) => {
                  const english = en.bullets[i]!;
                  return (
                    <li key={b.id} className={b.count === 0 ? "unused" : ""}>
                      <div className="piece-head">
                        <span className="num muted">{b.id}</span>
                        <span className="uses-text">{b.count === 0 ? t("piece.unusedBullet") : t("cv.usedIn", b.count)}</span>
                      </div>
                      <p className="piece-text">{b.text}</p>
                      {b.text !== english.text && <p className="piece-text muted">{english.text}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <section className="card">
          <h2>{t("piece.usedBy", users.length)}</h2>
          <p className="lede">{users.length === 0 ? t("piece.noneYet") : t("piece.open")}</p>
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
                    <div className="sub">{app.role ?? t("cv.templateOrDraft")}</div>
                  </div>
                  {app.state ? (
                    <span className={`badge ${app.state}`}>{t(STATE_KEYS[app.state])}</span>
                  ) : (
                    <span className="muted when">{t("piece.template")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
