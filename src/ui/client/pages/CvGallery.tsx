import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useCvs, useFit } from "../api.js";
import { CvPreview } from "../components/CvPreview.js";
import { FitBadge } from "../components/FitBadge.js";
import { shortDate } from "../dates.js";
import { useI18n, type MessageKey } from "../i18n.js";
import { STATE_KEYS } from "../labels.js";
import { PageError, PageLoading } from "./states.js";

type Filter = "all" | "sent" | "templates";
const FILTER_KEYS: Record<Filter, MessageKey> = { all: "cvs.all", sent: "cvs.sent", templates: "cvs.templates" };

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function CvGallery() {
  const { t, lang } = useI18n();
  const cvs = useCvs();
  const fit = useFit();
  const [params, setParams] = useSearchParams();
  const filter = (["sent", "templates"].includes(params.get("show") ?? "") ? params.get("show") : "all") as Filter;
  const language = params.get("lang");
  const [query, setQuery] = useState(params.get("q") ?? "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const shown = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    return (cvs.data ?? [])
      .filter((cv) => filter === "all" || (filter === "sent" ? cv.tracked : !cv.tracked))
      .filter((cv) => !language || cv.language === language)
      .filter((cv) => words.every((w) => fold(`${cv.name} ${cv.company ?? ""} ${cv.role ?? ""}`).includes(w)))
      .sort((a, b) => (b.applied ?? "").localeCompare(a.applied ?? "") || a.name.localeCompare(b.name));
  }, [cvs.data, filter, language, query]);

  if (cvs.error) return <PageError error={cvs.error} />;
  if (!cvs.data) return <PageLoading />;
  const counts: Record<Filter, number> = {
    all: cvs.data.length,
    sent: cvs.data.filter((c) => c.tracked).length,
    templates: cvs.data.filter((c) => !c.tracked).length,
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("cvs.title")}</h1>
          <p>{t("cvs.lede", cvs.data.length)}</p>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label={t("cvs.title")}>
          {(Object.keys(FILTER_KEYS) as Filter[]).map((f) => (
            <button type="button" key={f} className={filter === f ? "active" : ""} onClick={() => set("show", f === "all" ? null : f)}>
              {t(FILTER_KEYS[f])} <span className="count num">{counts[f]}</span>
            </button>
          ))}
        </nav>
        <div className="search">
          <Search />
          <input
            type="search"
            value={query}
            placeholder={t("cvs.search")}
            aria-label={t("search.label")}
            onChange={(e) => {
              setQuery(e.target.value);
              set("q", e.target.value || null);
            }}
          />
        </div>
        <div className="filters">
          {(["es", "en"] as const).map((l) => (
            <button type="button" key={l} className={`chip${language === l ? " on" : ""}`} aria-pressed={language === l} onClick={() => set("lang", language === l ? null : l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card empty">
          <SearchX />
          <p>{t("cvs.empty")}</p>
        </div>
      ) : (
        <div className="gallery">
          {shown.map((cv) => (
            <Link key={cv.name} to={`/cvs/${encodeURIComponent(cv.name)}`} viewTransition className="cv-card">
              <CvPreview src={`/api/cv/${encodeURIComponent(cv.name)}.html`} title={cv.name} thumbnail />
              <div className="cv-card-body">
                <div className="company">
                  {cv.company ?? <span className="muted">{t("cvs.template")}</span>} <span className="lang">{cv.language.toUpperCase()}</span>
                </div>
                <div className="file num">{cv.name}</div>
                <div className="cv-card-meta">
                  <FitBadge fit={fit.data?.[cv.name]} />
                  {cv.tracked && cv.state && (
                    <span className={`badge ${cv.state}`} data-tip={t("cvs.sentOn", shortDate(cv.applied!, lang), t(STATE_KEYS[cv.state]))}>
                      {t(STATE_KEYS[cv.state])}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
