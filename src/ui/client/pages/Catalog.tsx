import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Language } from "../../../schema.js";
import type { PieceKind } from "../../../usage.js";
import { useCatalog } from "../api.js";
import { catalogEntries, filterEntries, kindFromSlug, KIND_KEYS, KIND_SLUGS, pieceHref } from "../catalog-view.js";
import { useI18n } from "../i18n.js";
import { PageError, PageLoading } from "./states.js";

const KINDS = Object.keys(KIND_SLUGS) as PieceKind[];

/** Usage as a small bar against the most-used piece of the same kind. */
function Uses({ count, max }: { count: number; max: number }) {
  const { t } = useI18n();
  return (
    <span className={`uses${count === 0 ? " none" : ""}`} data-tip={count === 0 ? t("catalog.nobody") : t("catalog.appearsIn", count)}>
      <i style={{ ["--w" as string]: `${max ? (count / max) * 100 : 0}%` }} />
      <span className="num">{count}</span>
    </span>
  );
}

export function Catalog() {
  const { t } = useI18n();
  const { data, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const kind = kindFromSlug(params.get("kind") ?? undefined);
  const language: Language = params.get("lang") === "en" ? "en" : "es";
  const unused = params.get("unused") === "1";
  const [query, setQuery] = useState(params.get("q") ?? "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const all = useMemo(() => (data ? catalogEntries(data, kind, language) : []), [data, kind, language]);
  const shown = useMemo(() => filterEntries(all, query, unused).sort((a, b) => b.count - a.count), [all, query, unused]);

  if (error) return <PageError error={error} />;
  if (!data) return <PageLoading />;
  const max = Math.max(0, ...all.map((e) => e.count));
  const unusedCount = all.filter((e) => e.count === 0).length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("catalog.title")}</h1>
          <p>{t("catalog.lede")}</p>
        </div>
        <div className="filters">
          {(["es", "en"] as const).map((l) => (
            <button type="button" key={l} className={`chip${language === l ? " on" : ""}`} aria-pressed={language === l} onClick={() => set("lang", l === "es" ? null : l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label={t("catalog.title")}>
          {KINDS.map((k) => (
            <button type="button" key={k} className={kind === k ? "active" : ""} onClick={() => set("kind", k === "summary" ? null : KIND_SLUGS[k])}>
              {t(KIND_KEYS[k])}
            </button>
          ))}
        </nav>
        <div className="search">
          <Search />
          <input
            type="search"
            value={query}
            placeholder={t("catalog.searchIn", t(KIND_KEYS[kind]))}
            aria-label={t("search.label")}
            onChange={(e) => {
              setQuery(e.target.value);
              set("q", e.target.value || null);
            }}
          />
        </div>
        <button type="button" className={`chip${unused ? " on" : ""}`} aria-pressed={unused} onClick={() => set("unused", unused ? null : "1")}>
          {t("catalog.unused")} <span className="num">{unusedCount}</span>
        </button>
      </div>

      <p className="result-count">{t("catalog.count", shown.length, all.length)}</p>

      {shown.length === 0 ? (
        <div className="card empty">
          <SearchX />
          <p>{t("catalog.empty")}</p>
        </div>
      ) : kind === "skill" ? (
        <div className="card skill-grid">
          {shown.map((e) => (
            <Link key={e.id} to={pieceHref(kind, e.id)} className="skill-cell" viewTransition>
              <span>
                <strong>{e.title}</strong>
                {e.subtitle && <small> ({e.subtitle})</small>}
              </span>
              <Uses count={e.count} max={max} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="list">
          {shown.map((e) => (
            <Link key={e.id} to={pieceHref(kind, e.id)} className="catalog-row" viewTransition>
              <div className="piece-head">
                <strong className={kind === "summary" ? "num" : ""}>{e.title}</strong>
                <Uses count={e.count} max={max} />
              </div>
              {e.subtitle && <div className="piece-sub">{e.subtitle}</div>}
              {e.text && <p className="piece-text clamp">{e.text}</p>}
              {e.bullets.length > 0 && (
                <ul className="bullets compact">
                  {e.bullets.map((b) => (
                    <li key={b.id} className={b.count === 0 ? "unused" : ""}>
                      <span className="clamp-1">{b.text}</span>
                      <span className="num muted" data-tip={`${b.id}\n${b.count === 0 ? t("catalog.nobody") : t("catalog.appearsIn", b.count)}`}>
                        {b.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
