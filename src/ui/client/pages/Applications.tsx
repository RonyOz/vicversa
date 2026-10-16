import { SearchX, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Stage } from "../../../schema.js";
import { timeAxis } from "../../layout.js";
import { useDashboard } from "../api.js";
import { TimelineTrack } from "../components/charts.js";
import { shortDate } from "../dates.js";
import { STAGE_ICONS, STAGE_LABELS } from "../labels.js";
import { applyQuery, parseQuery, tabCounts, toSearch, type ListQuery, type SortKey, type Tab } from "../query.js";
import { PageError, PageLoading } from "./states.js";

const TAB_LABELS: Record<Tab, string> = {
  activas: "Activas",
  "sin-respuesta": "Sin respuesta",
  cerradas: "Cerradas",
  todas: "Todas",
};

const SORT_LABELS: Record<SortKey, string> = {
  reciente: "Último movimiento",
  dias: "Más tiempo esperando",
  aplicada: "Fecha de aplicación",
  empresa: "Empresa (A–Z)",
};

const STAGE_FILTERS: Stage[] = ["applied", "assessment", "interview", "offer", "rejected", "withdrawn"];

export function Applications() {
  const { data, error } = useDashboard();
  const [params, setParams] = useSearchParams();
  const query = parseQuery(params);
  const search = useRef<HTMLInputElement>(null);

  // "/" focuses the search box, like most apps with a list.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Build on the browser's actual URL, not on this render's params: navigations
  // render as low-priority transitions, so a keystroke right after switching tabs
  // would otherwise start from the old query and drop the tab.
  const update = (change: Partial<ListQuery>) => {
    const current = parseQuery(new URLSearchParams(window.location.search));
    setParams(new URLSearchParams(toSearch({ ...current, ...change })), { replace: true });
  };

  // The input keeps its own text so fast typing never waits on navigation.
  const [text, setText] = useState(query.q);
  useEffect(() => setText(query.q), [query.q]);

  const rows = useMemo(() => (data ? applyQuery(data.rows, query) : []), [data, params]);
  const axis = useMemo(() => {
    const first = data?.rows.flatMap((r) => r.events.map((e) => e.date)).sort()[0];
    return data && first ? timeAxis(first, data.today, 100) : null;
  }, [data]);

  if (error) return <PageError error={error} />;
  if (!data || !axis) return <PageLoading />;
  const counts = tabCounts(data.rows);
  const filtered = query.q || query.stage || query.language;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Convocatorias</h1>
          <p>{data.rows.length} con seguimiento · clic en una para ver su historia y registrar eventos</p>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Estado">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <Link
              key={tab}
              to={toSearch({ ...query, tab }) || "?"}
              replace
              className={query.tab === tab ? "active" : ""}
              aria-current={query.tab === tab ? "page" : undefined}
            >
              {TAB_LABELS[tab]} <span className="count num">{counts[tab]}</span>
            </Link>
          ))}
        </nav>
        <div className="search">
          <Search />
          <input
            ref={search}
            type="search"
            value={text}
            placeholder="Buscar empresa, rol…"
            aria-label="Buscar"
            onChange={(e) => {
              setText(e.target.value);
              update({ q: e.target.value });
            }}
          />
          {!text && <kbd>/</kbd>}
        </div>
      </div>

      <div className="toolbar">
        <div className="filters" aria-label="Filtros">
          {STAGE_FILTERS.map((stage) => {
            const Icon = STAGE_ICONS[stage];
            const on = query.stage === stage;
            return (
              <button type="button" key={stage} className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => update({ stage: on ? null : stage })}>
                <Icon /> {STAGE_LABELS[stage]}
              </button>
            );
          })}
          <span className="muted" style={{ margin: "0 4px" }}>·</span>
          {(["es", "en"] as const).map((language) => {
            const on = query.language === language;
            return (
              <button type="button" key={language} className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => update({ language: on ? null : language })}>
                {language.toUpperCase()}
              </button>
            );
          })}
          {filtered && (
            <button type="button" className="btn ghost" onClick={() => update({ q: "", stage: null, language: null })}>
              <X /> Limpiar
            </button>
          )}
        </div>
        <label className="sort" style={{ marginLeft: "auto" }}>
          Ordenar
          <select value={query.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}
          </select>
        </label>
      </div>

      <p className="result-count">
        {rows.length} {rows.length === 1 ? "convocatoria" : "convocatorias"}
      </p>

      <div className="list">
        {rows.length === 0 ? (
          <div className="empty">
            <SearchX />
            <p>Nada coincide con esta búsqueda y filtros.</p>
          </div>
        ) : (
          <>
            <div className="list-axis" aria-hidden>
              <span />
              <div className="track">
                {axis.ticks.map((t) => <span key={t.date} className="tick" style={{ left: `${t.x}%` }}>{t.label}</span>)}
                <span className="tick" style={{ left: "100%" }}>hoy</span>
              </div>
              <span />
            </div>
            {rows.map((row, i) => (
              <Link
                key={row.name}
                to={`/convocatorias/${encodeURIComponent(row.name)}`}
                state={{ back: `/convocatorias${toSearch(query)}` }}
                viewTransition
                className="row"
                style={{ ["--i" as string]: Math.min(i, 20) }}
              >
                <div className="who">
                  <div className="company">
                    {row.company ?? row.name} <span className="lang">{row.language.toUpperCase()}</span>
                  </div>
                  <div className="role">{row.role ?? row.name}</div>
                </div>
                <TimelineTrack events={row.events} open={row.state !== "closed"} axis={axis} />
                <div className="meta">
                  <div>aplicada <strong>{shortDate(row.applied)}</strong></div>
                  {row.state === "closed" ? (
                    <div>{STAGE_LABELS[row.stage].toLowerCase()} {shortDate(row.lastDate)}</div>
                  ) : (
                    <div><strong className="num">{row.daysSince}d</strong> sin movimiento</div>
                  )}
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}
