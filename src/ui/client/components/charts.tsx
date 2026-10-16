import { Link } from "react-router";
import type { Dashboard } from "../../../ops.js";
import type { TrackingEvent } from "../../../schema.js";
import { calendarGrid, calendarLevel, funnelSegments, type SegmentKey, type TimeAxis } from "../../layout.js";
import { shortDate } from "../dates.js";
import { STAGE_LABELS } from "../labels.js";

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  waiting: "En espera",
  silent: "Sin respuesta",
  withdrawn: "Retiradas sin respuesta",
  rejected: "Rechazo directo",
  advanced: "Avanzaron",
};

/** Where each segment leads in the tracker. */
const SEGMENT_LINKS: Record<SegmentKey, string> = {
  waiting: "/convocatorias",
  silent: "/convocatorias?tab=sin-respuesta",
  withdrawn: "/convocatorias?tab=cerradas&etapa=withdrawn",
  rejected: "/convocatorias?tab=cerradas&etapa=rejected",
  advanced: "/convocatorias?tab=todas",
};

export function Kpis({ data }: { data: Dashboard }) {
  const f = data.funnel;
  return (
    <div className="kpis">
      <div className="kpi">
        <div className="label">Enviadas</div>
        <div className="value num">{f.total}</div>
        <div className="hint">{data.pace.average.toFixed(1)} por semana (últimas {data.pace.weeks.length})</div>
      </div>
      <div className="kpi">
        <div className="label"><i className="swatch s-waiting" />En espera</div>
        <div className="value num">{f.waiting}</div>
        <div className="hint">menos de {data.staleDays} días: aún no es un resultado</div>
      </div>
      <div className="kpi">
        <div className="label"><i className="swatch s-silent" />Sin respuesta</div>
        <div className="value num">{f.silent}</div>
        <div className="hint">silencio, no rechazo</div>
      </div>
      <div className="kpi">
        <div className="label">Respondieron</div>
        <div className="value num">
          {f.responded} <small>de {f.resolved}</small>
        </div>
        <div className="hint">{pct(f.responded, f.resolved)}% de las que ya cumplieron la espera</div>
      </div>
    </div>
  );
}

export function FunnelCard({ data }: { data: Dashboard }) {
  const f = data.funnel;
  const segments = funnelSegments(f);
  const reached = (["assessment", "interview", "offer", "hired"] as const)
    .map((reach) => {
      const o = f.advanced[reach];
      const n = o.ongoing + o.rejected + o.withdrawn + o.hired;
      return n > 0 ? `${n} hasta ${STAGE_LABELS[reach].toLowerCase()}` : null;
    })
    .filter(Boolean);
  return (
    <section className="card">
      <h2>¿Qué pasó con cada aplicación?</h2>
      <p className="lede">Cada aplicación cae en exactamente un grupo. Espera y silencio no son rechazo. Clic para verlas.</p>
      <div className="funnel-bar" role="img" aria-label={segments.map((s) => `${SEGMENT_LABELS[s.key]}: ${s.count}`).join(", ")}>
        {segments.map((s) => (
          <Link
            key={s.key}
            to={SEGMENT_LINKS[s.key]}
            viewTransition
            className={`s-${s.key}`}
            style={{ width: `${s.share * 100}%` }}
            title={`${SEGMENT_LABELS[s.key]}: ${s.count} de ${f.total} (${pct(s.count, f.total)}%)`}
          />
        ))}
      </div>
      <div className="legend">
        {segments.map((s) => (
          <Link key={s.key} to={SEGMENT_LINKS[s.key]} viewTransition>
            <i className={`swatch s-${s.key}`} />
            {SEGMENT_LABELS[s.key]} <b className="num">{s.count}</b>
          </Link>
        ))}
      </div>
      {reached.length > 0 && <p className="note">Avanzaron: {reached.join(" · ")}.</p>}
    </section>
  );
}

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function PaceCard({ data }: { data: Dashboard }) {
  const grid = calendarGrid(data.rows.map((r) => r.events), data.today, data.pace.weeks.length);
  const plural = (n: number) => `${n} aplicaci${n === 1 ? "ón" : "ones"}`;
  return (
    <section className="card">
      <h2>Ritmo</h2>
      <p className="lede">
        Cada celda es un día; color más intenso, más aplicaciones. Promedio{" "}
        <span className="num">{data.pace.average.toFixed(1)}</span> por semana.
      </p>
      <div className="cal-wrap">
        <table className="cal">
          <colgroup><col className="days" /></colgroup>
          <thead>
            <tr className="months">
              <th />
              {grid.weeks.map((w) => <th key={w.start}>{w.month ?? ""}</th>)}
            </tr>
            <tr>
              <th />
              {grid.weeks.map((w) => <th key={w.start} className="num">{w.range}</th>)}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday, d) => (
              <tr key={weekday}>
                <th scope="row">{weekday}</th>
                {grid.weeks.map((w) => {
                  const day = w.days[d]!;
                  const label = `${weekday} ${shortDate(day.date)}: ${day.future ? "aún no llega" : plural(day.count)}`;
                  return (
                    <td key={day.date}>
                      <span
                        className={`cell l${calendarLevel(day.count)}${day.today ? " today" : ""}${day.future ? " future" : ""}`}
                        title={label}
                        aria-label={label}
                      >
                        {day.count > 0 ? day.count : ""}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">total</th>
              {grid.weeks.map((w) => <td key={w.start} className="num">{w.total}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="cal-legend">
        menos {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cell l${l}`} />)} más
      </div>
    </section>
  );
}

const eventTitle = (e: TrackingEvent) => `${shortDate(e.date)} · ${STAGE_LABELS[e.stage]}${e.note ? ` · ${e.note}` : ""}`;

/** One application on the shared time axis; dotted line is the wait until today. */
export function TimelineTrack({ events, open, axis }: { events: readonly TrackingEvent[]; open: boolean; axis: TimeAxis }) {
  const start = axis.x(events[0]!.date);
  const end = axis.x(events.at(-1)!.date);
  return (
    <div className="track" aria-hidden>
      {axis.ticks.map((t) => <i className="gridline" key={t.date} style={{ left: `${t.x}%` }} />)}
      {end > start && <i className="span" style={{ left: `${start}%`, width: `${end - start}%` }} />}
      {open && <i className="wait" style={{ left: `${end}%`, width: `${100 - end}%` }} />}
      {events.map((e, i) => (
        <i key={`${e.date}-${i}`} className={`mark ${e.stage}`} style={{ left: `${axis.x(e.date)}%` }} title={eventTitle(e)} />
      ))}
    </div>
  );
}
