import { Link } from "react-router";
import { useDashboard } from "../api.js";
import { FunnelCard, Kpis, PaceCard } from "../components/charts.js";
import { longDate, shortDate } from "../dates.js";
import { StageIcon, STAGE_LABELS } from "../labels.js";
import { PageError, PageLoading } from "./states.js";

export function Summary() {
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
          <h1>Resumen</h1>
          <p>{longDate(data.today)} · espera de {data.staleDays} días antes de contar como "sin respuesta"</p>
        </div>
      </header>
      <Kpis data={data} />
      <FunnelCard data={data} />
      <div className="grid-2">
        <PaceCard data={data} />
        <section className="card">
          <h2>Actividad reciente</h2>
          <p className="lede">Últimos movimientos registrados.</p>
          <ul className="feed">
            {activity.map(({ row, event }, i) => (
              <li key={`${row.name}-${i}`}>
                <StageIcon stage={event.stage} />
                <div>
                  <Link to={`/convocatorias/${encodeURIComponent(row.name)}`} viewTransition>
                    {row.company ?? row.name}
                  </Link>
                  <div className="sub">
                    {STAGE_LABELS[event.stage]}
                    {event.note ? ` · ${event.note}` : ""} · {row.role}
                  </div>
                </div>
                <span className="muted num" style={{ fontSize: 12 }}>{shortDate(event.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
