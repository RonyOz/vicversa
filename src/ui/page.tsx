import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard } from "../ops.js";
import { STAGES, type Stage, type TrackingEvent } from "../schema.js";
import { daysBetween, type State } from "../tracking.js";
import { calendarGrid, calendarLevel, funnelSegments, timeAxis, timelineGroups, type SegmentKey } from "./layout.js";
import { styles } from "./styles.js";

const SEGMENT_LABELS: Record<SegmentKey, string> = {
  waiting: "En espera",
  silent: "Sin respuesta",
  withdrawn: "Retiradas sin respuesta",
  rejected: "Rechazo directo",
  advanced: "Avanzaron",
};

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "aplicada",
  assessment: "prueba",
  interview: "entrevista",
  offer: "oferta",
  hired: "contratado",
  rejected: "rechazo",
  withdrawn: "retirada",
};

const STATE_TITLES: Record<State, string> = { active: "Activas", stale: "Sin respuesta", closed: "Cerradas" };

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const short = (date: string) => {
  const [, m, d] = date.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};
const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

function Kpis({ data }: { data: Dashboard }) {
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

function FunnelCard({ data }: { data: Dashboard }) {
  const f = data.funnel;
  const segments = funnelSegments(f);
  const advancedParts = (["assessment", "interview", "offer", "hired"] as const)
    .map((reach) => {
      const outcomes = f.advanced[reach];
      const n = outcomes.ongoing + outcomes.rejected + outcomes.withdrawn + outcomes.hired;
      return n > 0 ? `${n} hasta ${STAGE_LABELS[reach]}` : null;
    })
    .filter(Boolean);
  return (
    <section className="card">
      <h2>¿Qué pasó con cada aplicación?</h2>
      <p className="lede">Cada aplicación cae en exactamente un grupo. Espera y silencio no son rechazo.</p>
      <div className="funnel-bar" role="img" aria-label={segments.map((s) => `${SEGMENT_LABELS[s.key]}: ${s.count}`).join(", ")}>
        {segments.map((s) => (
          <div
            key={s.key}
            className={`s-${s.key}`}
            style={{ width: `${s.share * 100}%` }}
            title={`${SEGMENT_LABELS[s.key]}: ${s.count} de ${f.total} (${pct(s.count, f.total)}%)`}
          />
        ))}
      </div>
      <div className="funnel-legend">
        {segments.map((s) => (
          <span className="item" key={s.key}>
            <i className={`swatch s-${s.key}`} />
            {SEGMENT_LABELS[s.key]} <b className="num">{s.count}</b>
          </span>
        ))}
      </div>
      {advancedParts.length > 0 && <p className="funnel-note">Avanzaron: {advancedParts.join(" · ")}.</p>}
    </section>
  );
}

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function PaceCard({ data }: { data: Dashboard }) {
  const grid = calendarGrid(data.rows.map((row) => row.events), data.today, data.pace.weeks.length);
  const plural = (n: number) => `${n} aplicaci${n === 1 ? "ón" : "ones"}`;
  return (
    <section className="card">
      <h2>Ritmo</h2>
      <p className="lede">
        Cada celda es un día; color más intenso, más aplicaciones enviadas. Promedio{" "}
        <span className="num">{data.pace.average.toFixed(1)}</span> por semana en las últimas {grid.weeks.length}.
      </p>
      <div className="cal-wrap">
        <table className="cal">
          <colgroup><col className="days" /></colgroup>
          <thead>
            <tr className="cal-months">
              <th />
              {grid.weeks.map((w) => <th key={w.start}>{w.month ?? ""}</th>)}
            </tr>
            <tr className="cal-ranges">
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
                  const label = `${weekday} ${short(day.date)}: ${day.future ? "aún no llega" : plural(day.count)}`;
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
        menos
        {[0, 1, 2, 3, 4].map((level) => <span key={level} className={`cell l${level}`} />)}
        más <span className="sep">·</span> <span className="cell l0 today" /> hoy
      </div>
    </section>
  );
}

function TrackForm({ name, today }: { name: string; today: string }) {
  return (
    <details className="track-form">
      <summary>registrar</summary>
      <form method="post" action="/track">
        <input type="hidden" name="name" value={name} />
        <select name="stage" defaultValue="rejected" aria-label="Etapa">
          {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
        </select>
        <input type="date" name="date" defaultValue={today} max={today} aria-label="Fecha" />
        <input type="text" name="note" placeholder="nota corta (opcional)" aria-label="Nota" />
        <button type="submit">Registrar</button>
      </form>
    </details>
  );
}

function UndoForm({ name, last, label }: { name: string; last: TrackingEvent; label: string }) {
  return (
    <details className="track-form">
      <summary>{label}</summary>
      <form method="post" action="/undo">
        <input type="hidden" name="name" value={name} />
        <span>{`¿Quitar «${STAGE_LABELS[last.stage]} ${short(last.date)}${last.note ? ` · ${last.note}` : ""}»?`}</span>
        <button type="submit">Quitar</button>
      </form>
    </details>
  );
}

function eventTitle(event: TrackingEvent) {
  return `${short(event.date)} · ${STAGE_LABELS[event.stage]}${event.note ? ` · ${event.note}` : ""}`;
}

function TimelinesCard({ data }: { data: Dashboard }) {
  const first = data.rows.flatMap((row) => row.events.map((e) => e.date)).sort()[0] ?? data.today;
  const axis = timeAxis(first, data.today, 100);
  const groups = timelineGroups(data.rows);
  return (
    <section className="card">
      <h2>Cada convocatoria en el tiempo</h2>
      <p className="lede">De la aplicación al último movimiento; la línea punteada es la espera hasta hoy.</p>
      <div className="legend-marks">
        <span><i className="mark applied" /> aplicada</span>
        <span><i className="mark interview" /> prueba / entrevista / oferta</span>
        <span><i className="mark rejected" /> rechazo</span>
        <span><i className="mark withdrawn" /> retirada</span>
      </div>
      <div className="tl-axis" style={{ marginTop: 14 }}>
        <div />
        <div className="track">
          {axis.ticks.map((t) => <span className="tick" key={t.date} style={{ left: `${t.x}%` }}>{t.label}</span>)}
          <span className="tick" style={{ left: "100%" }}>hoy</span>
        </div>
        <div />
      </div>
      {groups.map((group) => (
        <div className="tl-group" key={group.state}>
          <h3>{STATE_TITLES[group.state]} · {group.rows.length}</h3>
          {group.rows.map((row) => {
            const applied = (row.events.find((e) => e.stage === "applied") ?? row.events[0]!).date;
            const start = axis.x(row.events[0]!.date);
            const end = axis.x(row.lastDate);
            return (
              <div className="tl-row" key={row.name} id={row.name}>
                <div className="who" title={row.name}>
                  <div className="company">{row.company ?? row.name}</div>
                  <div className="role">{row.role ?? row.name}</div>
                </div>
                <div className="track">
                  {axis.ticks.map((t) => <i className="gridline" key={t.date} style={{ left: `${t.x}%` }} />)}
                  {end > start && <i className="span" style={{ left: `${start}%`, width: `${end - start}%` }} />}
                  {row.state !== "closed" && <i className="wait" style={{ left: `${end}%`, width: `${100 - end}%` }} />}
                  {row.events.map((event, i) => (
                    <i
                      key={`${event.date}-${i}`}
                      className={`mark ${event.stage}`}
                      style={{ left: `${axis.x(event.date)}%` }}
                      title={eventTitle(event)}
                    />
                  ))}
                </div>
                <div className="meta">
                  <div className="sent" title={applied}>{`aplicada ${short(applied)}`}</div>
                  {row.state === "closed" ? (
                    <div>
                      {`${STAGE_LABELS[row.stage]} ${short(row.lastDate)} · ${daysBetween(applied, row.lastDate)}d`}
                      <UndoForm name={row.name} last={row.events.at(-1)!} label="reabrir" />
                    </div>
                  ) : (
                    <div>
                      <span className="days num">{row.daysSince}d</span> sin mov.
                      <TrackForm name={row.name} today={data.today} />
                      {row.events.length > 1 && <UndoForm name={row.name} last={row.events.at(-1)!} label="deshacer" />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function Page({ data, flash }: { data: Dashboard; flash?: { kind: "ok" | "error"; text: string } }) {
  return (
    <main>
      <header className="top">
        <h1>vicversa <span>· seguimiento</span></h1>
        <div className="today">Hoy, {short(data.today)} · espera de {data.staleDays} días</div>
      </header>
      {flash && <p className={`flash ${flash.kind}`} role="status">{flash.text}</p>}
      <Kpis data={data} />
      <FunnelCard data={data} />
      <PaceCard data={data} />
      <TimelinesCard data={data} />
    </main>
  );
}

export function renderPage(data: Dashboard, fontCss: string, flash?: { kind: "ok" | "error"; text: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>vicversa · seguimiento</title>
<style>${fontCss}</style>
<style>${styles}</style>
</head>
<body>${renderToStaticMarkup(<Page data={data} flash={flash} />)}</body>
</html>`;
}
