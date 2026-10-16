import { ArrowLeft, ChevronRight, ExternalLink, FileText, RotateCcw, Undo2 } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";
import { daysBetween } from "../../../tracking.js";
import { useApplication, useDashboard, useUndo } from "../api.js";
import { CvPreview } from "../components/CvPreview.js";
import { EventForm } from "../components/EventForm.js";
import { longDate, shortDate } from "../dates.js";
import { StageIcon, STAGE_LABELS, STATE_LABELS } from "../labels.js";
import { useToast } from "../toast.js";
import { PageError, PageLoading } from "./states.js";

export function ApplicationDetail() {
  const name = decodeURIComponent(useParams()["name"] ?? "");
  const back = (useLocation().state as { back?: string } | null)?.back ?? "/convocatorias";
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

  const runUndo = () =>
    undo.mutate(
      { name },
      {
        onSuccess: (r) =>
          toast({ kind: "ok", text: `Quitado: ${STAGE_LABELS[r.removed.stage].toLowerCase()} del ${shortDate(r.removed.date)}` }),
        onError: (e) => toast({ kind: "error", text: e.message }),
      },
    );

  return (
    <>
      <Link to={back} className="back" viewTransition>
        <ArrowLeft size={15} /> Convocatorias
      </Link>
      <header className="page-head detail-head">
        <div>
          <h1>
            {meta.company ?? name}
            {summary && <span className={`badge ${summary.state}`}>{STATE_LABELS[summary.state]}</span>}
          </h1>
          <p>{meta.role}</p>
          <div className="links">
            {meta.url && (
              <a className="btn" href={meta.url} target="_blank" rel="noreferrer">
                <ExternalLink /> Ver convocatoria
              </a>
            )}
            <Link className="btn" to={`/cvs/${encodeURIComponent(name)}`} viewTransition>
              <FileText /> Ver CV y sus piezas
            </Link>
          </div>
        </div>
      </header>

      <div className="grid-2">
        <div className="stack">
          <section className="card">
            <h2>Historia</h2>
            <p className="lede">
              {events.length > 0
                ? `Aplicada el ${longDate(events[0]!.date)}${summary ? ` · ${daysBetween(events[0]!.date, summary.state === "closed" ? summary.lastDate : today)} días de proceso` : ""}`
                : "Plantilla o borrador: sin seguimiento."}
            </p>
            <ol className="timeline">
              {events.map((event, i) => (
                <li key={`${event.date}-${i}`} style={{ animationDelay: `${i * 40}ms` }}>
                  <StageIcon stage={event.stage} />
                  <div>
                    <div className="what">{STAGE_LABELS[event.stage]}{event.note ? ` · ${event.note}` : ""}</div>
                    <div className="when">{longDate(event.date)}</div>
                  </div>
                  {i > 0 ? (
                    <span className="gap" data-tip={`${daysBetween(events[i - 1]!.date, event.date)} días\ndespués de ${STAGE_LABELS[events[i - 1]!.stage].toLowerCase()}`}>
                      +{daysBetween(events[i - 1]!.date, event.date)}d
                    </span>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
              {summary && summary.state !== "closed" && (
                <li>
                  <span className="stage-icon st-applied" aria-hidden>…</span>
                  <div className="waiting">Esperando desde hace {summary.daysSince} días</div>
                  <span />
                </li>
              )}
            </ol>
            {canUndo && last && (
              <button type="button" className="btn ghost" onClick={runUndo} disabled={undo.isPending}>
                {summary?.state === "closed" ? <RotateCcw /> : <Undo2 />}
                {summary?.state === "closed" ? "Reabrir" : "Deshacer"}: quitar «{STAGE_LABELS[last.stage].toLowerCase()} {shortDate(last.date)}»
              </button>
            )}
          </section>

          {summary && summary.state !== "closed" && (
            <section className="card">
              <h2>Registrar evento</h2>
              <EventForm key={name} name={name} events={events} today={today} />
            </section>
          )}

          {meta.notes && (
            <section className="card">
              <details className="fold">
                <summary>
                  <ChevronRight /> Notas de la aplicación
                </summary>
                <p className="notes">{meta.notes}</p>
              </details>
            </section>
          )}
        </div>

        <section className="card">
          <h2>Hoja de vida enviada</h2>
          <p className="lede">La página tal como se imprime el PDF ({meta.language.toUpperCase()}).</p>
          <CvPreview src={cvUrl} title={`CV para ${meta.company ?? name}`} />
        </section>
      </div>
    </>
  );
}
