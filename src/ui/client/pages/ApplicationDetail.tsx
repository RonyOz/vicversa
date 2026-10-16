import { ArrowLeft, ChevronRight, ExternalLink, FileText, RotateCcw, Undo2 } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";
import type { TrackingEvent } from "../../../schema.js";
import { daysBetween } from "../../../tracking.js";
import { useApplication, useDashboard, useUndo } from "../api.js";
import { CvPreview } from "../components/CvPreview.js";
import { EventForm } from "../components/EventForm.js";
import { longDate, shortDate } from "../dates.js";
import { useI18n } from "../i18n.js";
import { StageIcon, STAGE_KEYS, STATE_KEYS } from "../labels.js";
import { useToast } from "../toast.js";
import { PageError, PageLoading } from "./states.js";

export function ApplicationDetail() {
  const { t, lang } = useI18n();
  const name = decodeURIComponent(useParams()["name"] ?? "");
  const back = (useLocation().state as { back?: string } | null)?.back ?? "/applications";
  const detail = useApplication(name);
  const dashboard = useDashboard();
  const undo = useUndo();
  const toast = useToast();

  const error = detail.error ?? dashboard.error;
  if (error) return <PageError error={error} />;
  if (!detail.data || !dashboard.data) return <PageLoading />;

  const { application, timeline, summary } = detail.data;
  const today = dashboard.data.today;
  const meta = application.metadata;
  const events = timeline ?? [];
  const last = events.at(-1);
  const canUndo = (application.tracking?.length ?? 0) > 1;
  const cvUrl = `/api/cv/${encodeURIComponent(name)}.html`;
  const describe = (e: TrackingEvent) => `${t(STAGE_KEYS[e.stage]).toLowerCase()} ${shortDate(e.date, lang)}`;

  const runUndo = () =>
    undo.mutate(
      { name },
      {
        onSuccess: (r) => toast({ kind: "ok", text: t("detail.removed", describe(r.removed)) }),
        onError: (e) => toast({ kind: "error", text: e.message }),
      },
    );

  return (
    <>
      <Link to={back} className="back" viewTransition>
        <ArrowLeft size={15} /> {t("detail.back")}
      </Link>
      <header className="page-head detail-head">
        <div>
          <h1>
            {meta.company ?? name}
            {summary && <span className={`badge ${summary.state}`}>{t(STATE_KEYS[summary.state])}</span>}
          </h1>
          <p>{meta.role}</p>
          <div className="links">
            {meta.url && (
              <a className="btn" href={meta.url} target="_blank" rel="noreferrer">
                <ExternalLink /> {t("detail.posting")}
              </a>
            )}
            <Link className="btn" to={`/cvs/${encodeURIComponent(name)}`} viewTransition>
              <FileText /> {t("detail.cv")}
            </Link>
          </div>
        </div>
      </header>

      <div className="grid-2">
        <div className="stack">
          <section className="card">
            <h2>{t("detail.history")}</h2>
            <p className="lede">
              {events.length > 0
                ? t(
                    "detail.since",
                    longDate(events[0]!.date, lang),
                    summary ? daysBetween(events[0]!.date, summary.state === "closed" ? summary.lastDate : today) : null,
                  )
                : t("detail.untracked")}
            </p>
            <ol className="timeline">
              {events.map((event, i) => (
                <li key={`${event.date}-${i}`}>
                  <StageIcon stage={event.stage} />
                  <div>
                    <div className="what">
                      {t(STAGE_KEYS[event.stage])}
                      {event.note ? `: ${event.note}` : ""}
                    </div>
                    <div className="when">{longDate(event.date, lang)}</div>
                  </div>
                  {i > 0 ? (
                    <span className="gap" data-tip={t("detail.gap", daysBetween(events[i - 1]!.date, event.date), t(STAGE_KEYS[events[i - 1]!.stage]))}>
                      +{daysBetween(events[i - 1]!.date, event.date)}d
                    </span>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
              {summary && summary.state !== "closed" && (
                <li>
                  <span className="stage-icon st-waiting" aria-hidden />
                  <div className="waiting">{t("detail.waitingFor", summary.daysSince)}</div>
                  <span />
                </li>
              )}
            </ol>
            {canUndo && last && (
              <button type="button" className="btn ghost" onClick={runUndo} disabled={undo.isPending}>
                {summary?.state === "closed" ? <RotateCcw /> : <Undo2 />}
                {summary?.state === "closed" ? t("detail.reopen", describe(last)) : t("detail.undo", describe(last))}
              </button>
            )}
          </section>

          {summary && summary.state !== "closed" && (
            <section className="card">
              <h2>{t("detail.record")}</h2>
              <EventForm key={name} name={name} events={events} today={today} />
            </section>
          )}

          {meta.notes && (
            <section className="card">
              <details className="fold">
                <summary>
                  <ChevronRight /> {t("detail.notes")}
                </summary>
                <p className="notes">{meta.notes}</p>
              </details>
            </section>
          )}
        </div>

        <section className="card">
          <h2>{t("detail.sentCv")}</h2>
          <p className="lede">{t("detail.sentCvLede", meta.language.toUpperCase())}</p>
          <CvPreview src={cvUrl} title={meta.company ?? name} />
        </section>
      </div>
    </>
  );
}
