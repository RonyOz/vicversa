import { Link } from "react-router";
import type { Dashboard } from "../../../ops.js";
import type { TrackingEvent } from "../../../schema.js";
import { calendarGrid, calendarLevel, funnelSegments, type SegmentKey, type TimeAxis } from "../../layout.js";
import { monthNames, shortDate, weekdayNames } from "../dates.js";
import { useI18n, type MessageKey } from "../i18n.js";
import { STAGE_KEYS } from "../labels.js";

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

export const SEGMENT_KEYS: Record<SegmentKey, MessageKey> = {
  waiting: "funnel.waiting",
  silent: "funnel.silent",
  withdrawn: "funnel.withdrawn",
  rejected: "funnel.rejected",
  advanced: "funnel.advanced",
};

/** Where each segment leads in the tracker. */
const SEGMENT_LINKS: Record<SegmentKey, string> = {
  waiting: "/applications",
  silent: "/applications?tab=stale",
  withdrawn: "/applications?tab=closed&stage=withdrawn",
  rejected: "/applications?tab=closed&stage=rejected",
  advanced: "/applications?tab=all",
};

export function Kpis({ data }: { data: Dashboard }) {
  const { t } = useI18n();
  const f = data.funnel;
  return (
    <div className="kpis">
      <div className="kpi">
        <div className="label">{t("kpi.sent")}</div>
        <div className="value num">{f.total}</div>
        <div className="hint">{t("kpi.sentHint", data.pace.average.toFixed(1), data.pace.weeks.length)}</div>
      </div>
      <div className="kpi">
        <div className="label"><i className="swatch s-waiting" />{t("kpi.waiting")}</div>
        <div className="value num">{f.waiting}</div>
        <div className="hint">{t("kpi.waitingHint", data.staleDays)}</div>
      </div>
      <div className="kpi">
        <div className="label"><i className="swatch s-silent" />{t("kpi.silent")}</div>
        <div className="value num">{f.silent}</div>
        <div className="hint">{t("kpi.silentHint")}</div>
      </div>
      <div className="kpi">
        <div className="label">{t("kpi.responded")}</div>
        <div className="value num">
          {f.responded} <small>{t("kpi.of", f.resolved)}</small>
        </div>
        <div className="hint">{t("kpi.respondedHint", pct(f.responded, f.resolved))}</div>
      </div>
    </div>
  );
}

export function FunnelCard({ data }: { data: Dashboard }) {
  const { t } = useI18n();
  const f = data.funnel;
  const segments = funnelSegments(f);
  const reached = (["assessment", "interview", "offer", "hired"] as const)
    .map((reach) => {
      const o = f.advanced[reach];
      const n = o.ongoing + o.rejected + o.withdrawn + o.hired;
      return n > 0 ? t("funnel.reachedPart", n, t(STAGE_KEYS[reach])) : null;
    })
    .filter(Boolean);
  return (
    <section className="card">
      <h2>{t("funnel.title")}</h2>
      <p className="lede">{t("funnel.lede")}</p>
      <div className="funnel-bar" role="img" aria-label={segments.map((s) => `${t(SEGMENT_KEYS[s.key])}: ${s.count}`).join(", ")}>
        {segments.map((s, i) => (
          <Link
            key={s.key}
            to={SEGMENT_LINKS[s.key]}
            viewTransition
            className={`s-${s.key}`}
            style={{ width: `${s.share * 100}%`, ["--i" as string]: i }}
            data-tip={t("funnel.tip", t(SEGMENT_KEYS[s.key]), s.count, f.total, pct(s.count, f.total))}
          />
        ))}
      </div>
      <div className="legend">
        {segments.map((s) => (
          <Link key={s.key} to={SEGMENT_LINKS[s.key]} viewTransition>
            <i className={`swatch s-${s.key}`} />
            {t(SEGMENT_KEYS[s.key])} <b className="num">{s.count}</b>
          </Link>
        ))}
      </div>
      {reached.length > 0 && <p className="note">{t("funnel.reached", reached.join(", "))}</p>}
    </section>
  );
}

export function PaceCard({ data }: { data: Dashboard }) {
  const { t, lang } = useI18n();
  const grid = calendarGrid(data.rows.map((r) => r.events), data.today, data.pace.weeks.length, monthNames(lang, "short"));
  const weekdays = weekdayNames(lang);
  return (
    <section className="card">
      <h2>{t("pace.title")}</h2>
      <p className="lede">{t("pace.lede", data.pace.average.toFixed(1))}</p>
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
            {weekdays.map((weekday, d) => (
              <tr key={weekday}>
                <th scope="row">{weekday}</th>
                {grid.weeks.map((w) => {
                  const day = w.days[d]!;
                  const when = `${weekday} ${shortDate(day.date, lang)}`;
                  const what = day.future ? t("pace.future") : t("pace.count", day.count);
                  return (
                    <td key={day.date}>
                      <span
                        className={`cell l${calendarLevel(day.count)}${day.today ? " today" : ""}${day.future ? " future" : ""}`}
                        data-tip={`${when}${day.today ? `, ${t("pace.today")}` : ""}\n${what}`}
                        aria-label={`${when}: ${what}`}
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
              <th scope="row">{t("pace.total")}</th>
              {grid.weeks.map((w) => <td key={w.start} className="num">{w.total}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="cal-legend">
        {t("pace.less")} {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cell l${l}`} />)} {t("pace.more")}
      </div>
    </section>
  );
}

/** One application on the shared time axis; the dotted line is the wait until today. */
export function TimelineTrack({ events, open, axis }: { events: readonly TrackingEvent[]; open: boolean; axis: TimeAxis }) {
  const { t, lang } = useI18n();
  const start = axis.x(events[0]!.date);
  const end = axis.x(events.at(-1)!.date);
  return (
    <div className="track" aria-hidden>
      {axis.ticks.map((tick) => <i className="gridline" key={tick.date} style={{ left: `${tick.x}%` }} />)}
      {end > start && <i className="span" style={{ left: `${start}%`, width: `${end - start}%` }} />}
      {open && <i className="wait" style={{ left: `${end}%`, width: `${100 - end}%` }} />}
      {events.map((e, i) => (
        <i
          key={`${e.date}-${i}`}
          className={`mark ${e.stage}`}
          style={{ left: `${axis.x(e.date)}%` }}
          data-tip={`${t(STAGE_KEYS[e.stage])}${e.note ? `: ${e.note}` : ""}\n${shortDate(e.date, lang)}`}
        />
      ))}
    </div>
  );
}
