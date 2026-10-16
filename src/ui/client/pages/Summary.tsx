import { Link } from "react-router";
import { useDashboard } from "../api.js";
import { FunnelCard, Kpis, PaceCard } from "../components/charts.js";
import { longDate, shortDate } from "../dates.js";
import { useI18n } from "../i18n.js";
import { StageIcon, STAGE_KEYS } from "../labels.js";
import { PageError, PageLoading } from "./states.js";

export function Summary() {
  const { t, lang } = useI18n();
  const { data, error } = useDashboard();
  if (error) return <PageError error={error} />;
  if (!data) return <PageLoading />;

  // Most recent movements across every application: what changed lately.
  const activity = data.rows
    .flatMap((row) => row.events.map((event) => ({ row, event })))
    .sort((a, b) => b.event.date.localeCompare(a.event.date))
    .slice(0, 8);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{t("summary.title")}</h1>
          <p>{t("summary.lede", longDate(data.today, lang), data.staleDays)}</p>
        </div>
      </header>
      <div className="stack">
        <Kpis data={data} />
        <FunnelCard data={data} />
        <div className="grid-2">
          <PaceCard data={data} />
          <section className="card">
            <h2>{t("activity.title")}</h2>
            <p className="lede">{t("activity.lede")}</p>
            <ul className="feed">
              {activity.map(({ row, event }, i) => (
                <li key={`${row.name}-${i}`}>
                  <StageIcon stage={event.stage} />
                  <div>
                    <Link to={`/applications/${encodeURIComponent(row.name)}`} viewTransition>
                      {row.company ?? row.name}
                    </Link>
                    <div className="sub">
                      {t(STAGE_KEYS[event.stage])}
                      {event.note ? `: ${event.note}` : ""}
                      <span className="muted">, {row.role}</span>
                    </div>
                  </div>
                  <span className="muted num when">{shortDate(event.date, lang)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
