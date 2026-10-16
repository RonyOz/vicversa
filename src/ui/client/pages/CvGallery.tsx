import { Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useCvs, useFit } from "../api.js";
import { CvPreview } from "../components/CvPreview.js";
import { FitBadge } from "../components/FitBadge.js";
import { shortDate } from "../dates.js";
import { STATE_LABELS } from "../labels.js";
import { PageError, PageLoading } from "./states.js";

type Filter = "todas" | "enviadas" | "plantillas";
const FILTER_LABELS: Record<Filter, string> = { todas: "Todas", enviadas: "Enviadas", plantillas: "Plantillas y borradores" };

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function CvGallery() {
  const cvs = useCvs();
  const fit = useFit();
  const [params, setParams] = useSearchParams();
  const filter = (["enviadas", "plantillas"].includes(params.get("ver") ?? "") ? params.get("ver") : "todas") as Filter;
  const language = params.get("idioma");
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
      .filter((cv) => filter === "todas" || (filter === "enviadas" ? cv.tracked : !cv.tracked))
      .filter((cv) => !language || cv.language === language)
      .filter((cv) => words.every((w) => fold(`${cv.name} ${cv.company ?? ""} ${cv.role ?? ""}`).includes(w)))
      .sort((a, b) => (b.applied ?? "").localeCompare(a.applied ?? "") || a.name.localeCompare(b.name));
  }, [cvs.data, filter, language, query]);

  if (cvs.error) return <PageError error={cvs.error} />;
  if (!cvs.data) return <PageLoading />;
  const counts: Record<Filter, number> = {
    todas: cvs.data.length,
    enviadas: cvs.data.filter((c) => c.tracked).length,
    plantillas: cvs.data.filter((c) => !c.tracked).length,
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Hojas de vida</h1>
          <p>Cada una es una selección del catálogo, compuesta y medida igual que el PDF.</p>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Tipo">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button type="button" key={f} className={filter === f ? "active" : ""} onClick={() => set("ver", f === "todas" ? null : f)}>
              {FILTER_LABELS[f]} <span className="count num">{counts[f]}</span>
            </button>
          ))}
        </nav>
        <div className="search">
          <Search />
          <input
            type="search"
            value={query}
            placeholder="Buscar empresa, rol, archivo…"
            aria-label="Buscar"
            onChange={(e) => {
              setQuery(e.target.value);
              set("q", e.target.value || null);
            }}
          />
        </div>
        <div className="filters">
          {(["es", "en"] as const).map((l) => (
            <button type="button" key={l} className={`chip${language === l ? " on" : ""}`} aria-pressed={language === l} onClick={() => set("idioma", language === l ? null : l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card empty">
          <SearchX />
          <p>Ninguna hoja de vida coincide.</p>
        </div>
      ) : (
        <div className="gallery">
          {shown.map((cv, i) => (
            <Link key={cv.name} to={`/cvs/${encodeURIComponent(cv.name)}`} viewTransition className="cv-card" style={{ ["--i" as string]: Math.min(i, 16) }}>
              <CvPreview src={`/api/cv/${encodeURIComponent(cv.name)}.html`} title={`Miniatura de ${cv.name}`} thumbnail />
              <div className="cv-card-body">
                <div className="company">
                  {cv.company ?? <span className="muted">Plantilla</span>} <span className="lang">{cv.language.toUpperCase()}</span>
                </div>
                <div className="role">{cv.role ?? cv.name}</div>
                <div className="cv-card-meta">
                  <FitBadge fit={fit.data?.[cv.name]} />
                  {cv.tracked && cv.state && (
                    <span className={`badge ${cv.state}`} data-tip={`Enviada el ${shortDate(cv.applied!)}\n${STATE_LABELS[cv.state]}`}>
                      {STATE_LABELS[cv.state]}
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
