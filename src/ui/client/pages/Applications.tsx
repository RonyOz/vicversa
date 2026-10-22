import { Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Stage } from "../../../schema.js";
import { cycleStart, timeAxis } from "../../layout.js";
import { useDashboard } from "../api.js";
import { TimelineTrack } from "../components/charts.js";
import { monthNames, shortDate } from "../dates.js";
import { useI18n, type MessageKey } from "../i18n.js";
import { STAGE_ICONS, STAGE_KEYS } from "../labels.js";
import { applyQuery, parseQuery, tabCounts, toSearch, type ListQuery, type SortKey, type Tab } from "../query.js";
import { PageError, PageLoading } from "./states.js";

const TAB_KEYS: Record<Tab, MessageKey> = { active: "tab.active", stale: "tab.stale", closed: "tab.closed", all: "tab.all" };
const SORT_KEYS: Record<SortKey, MessageKey> = {
  recent: "sort.recent",
  waiting: "sort.waiting",
  applied: "sort.applied",
  company: "sort.company",
};
const STAGE_FILTERS: Stage[] = ["applied", "assessment", "interview", "offer", "rejected", "withdrawn"];

export function Applications() {
  const { t, lang } = useI18n();
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
  // Starts at the earliest current cycle, so an old attempt before a reopening doesn't squeeze every row.
  const axis = useMemo(() => {
    const first = data?.rows.filter((r) => r.events.length > 0).map((r) => cycleStart(r.events)).sort()[0];
    return data && first ? timeAxis(first, data.today, 100, monthNames(lang, "short")) : null;
  }, [data, lang]);

  if (error) return <PageError error={error} />;
  if (!data || !axis) return <PageLoading />;
  const counts = tabCounts(data.rows);
  const filtered = query.q || query.stage || query.language;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("apps.title")}</h1>
          <p>{t("apps.lede", data.rows.length)}</p>
        </div>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label={t("apps.title")}>
          {(Object.keys(TAB_KEYS) as Tab[]).map((tab) => (
            <Link
              key={tab}
              to={toSearch({ ...query, tab }) || "?"}
              replace
              className={query.tab === tab ? "active" : ""}
              aria-current={query.tab === tab ? "page" : undefined}
            >
              {t(TAB_KEYS[tab])} <span className="count num">{counts[tab]}</span>
            </Link>
          ))}
        </nav>
        <div className="search">
          <Search />
          <input
            ref={search}
            type="search"
            value={text}
            placeholder={t("search.placeholder")}
            aria-label={t("search.label")}
            onChange={(e) => {
              setText(e.target.value);
              update({ q: e.target.value });
            }}
          />
          {!text && <kbd>/</kbd>}
        </div>
      </div>

      <div className="toolbar">
        <div className="filters">
          {STAGE_FILTERS.map((stage) => {
            const Icon = STAGE_ICONS[stage];
            const on = query.stage === stage;
            return (
              <button type="button" key={stage} className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => update({ stage: on ? null : stage })}>
                <Icon /> {t(STAGE_KEYS[stage])}
              </button>
            );
          })}
          <span className="filter-gap" />
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
              <X /> {t("filters.clear")}
            </button>
          )}
        </div>
        <label className="sort">
          {t("sort.label")}
          <select value={query.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
            {(Object.keys(SORT_KEYS) as SortKey[]).map((key) => <option key={key} value={key}>{t(SORT_KEYS[key])}</option>)}
          </select>
        </label>
      </div>

      <p className="result-count">{t("apps.count", rows.length)}</p>

      <div className="list">
        {rows.length === 0 ? (
          <div className="empty">
            <SearchX />
            <p>{t("apps.empty")}</p>
          </div>
        ) : (
          <>
            <div className="list-axis" aria-hidden>
              <span />
              <div className="track">
                {axis.ticks.map((tick) => <span key={tick.date} className="tick" style={{ left: `${tick.x}%` }}>{tick.label}</span>)}
                <span className="tick" style={{ left: "100%" }}>{t("axis.today")}</span>
              </div>
              <span />
            </div>
            {rows.map((row) => (
              <Link
                key={row.name}
                to={`/applications/${encodeURIComponent(row.name)}`}
                state={{ back: `/applications${toSearch(query)}` }}
                viewTransition
                className="row"
              >
                <div className="who">
                  <div className="company">
                    {row.company ?? row.name} <span className="lang">{row.language.toUpperCase()}</span>
                  </div>
                  <div className="role">{row.role ?? row.name}</div>
                </div>
                <TimelineTrack events={row.events} open={row.state !== "closed"} axis={axis} />
                <div className="meta">
                  <div>{t("apps.applied", shortDate(row.applied, lang))}</div>
                  {row.state === "closed" ? (
                    <div>{t(STAGE_KEYS[row.stage]).toLowerCase()} {shortDate(row.lastDate, lang)}</div>
                  ) : (
                    <div><strong className="num">{t("apps.idle", row.daysSince)}</strong></div>
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
