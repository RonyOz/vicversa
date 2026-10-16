import { CircleAlert, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Stage, TrackingEvent } from "../../../schema.js";
import { useTrack, useUndo } from "../api.js";
import { shortDate } from "../dates.js";
import { useI18n } from "../i18n.js";
import { NOTE_SUGGESTIONS, STAGE_ICONS, STAGE_KEYS } from "../labels.js";
import { useToast } from "../toast.js";
import { DatePicker } from "./DatePicker.js";

const CHOICES: Stage[] = ["assessment", "interview", "offer", "hired", "rejected", "withdrawn"];

/**
 * Records what happened in one application: stage as buttons, a date picker
 * that marks this application's events and offers its last event as a
 * shortcut, note suggestions per stage. After saving, the toast offers undo.
 */
export function EventForm({ name, events, today }: { name: string; events: readonly TrackingEvent[]; today: string }) {
  const { t, lang } = useI18n();
  const last = events.at(-1) ?? null;
  const [stage, setStage] = useState<Stage>("interview");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const track = useTrack();
  const undo = useUndo();
  const toast = useToast();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    track.mutate(
      { name, stage, date, note: note.trim() || undefined },
      {
        onSuccess: (result) => {
          setNote("");
          toast({
            kind: "ok",
            text: t("form.recorded", t(STAGE_KEYS[stage]), shortDate(result.event.date, lang)),
            action: {
              label: t("form.undo"),
              run: () => undo.mutate({ name }, { onSuccess: () => toast({ kind: "ok", text: t("form.undone") }) }),
            },
          });
        },
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <span className="label">{t("form.what")}</span>
        <div className="stage-picker" role="radiogroup" aria-label={t("form.what")}>
          {CHOICES.map((choice) => {
            const Icon = STAGE_ICONS[choice];
            return (
              <button
                type="button"
                key={choice}
                role="radio"
                aria-checked={stage === choice}
                className={`stage-option${stage === choice ? " on" : ""}`}
                onClick={() => setStage(choice)}
              >
                <span className={`stage-icon st-${choice}`}>
                  <Icon />
                </span>
                {t(STAGE_KEYS[choice])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <span className="label">{t("form.when")}</span>
        <DatePicker value={date} onChange={setDate} today={today} eventDates={events.map((e) => e.date)} lastEvent={last?.date ?? null} />
      </div>

      <div className="field">
        <label htmlFor={`note-${name}`}>{t("form.note")}</label>
        <input
          id={`note-${name}`}
          type="text"
          value={note}
          maxLength={80}
          placeholder={t("form.notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="suggestions">
          {(NOTE_SUGGESTIONS[lang][stage] ?? []).map((s) => (
            <button type="button" key={s} className={`chip${note === s ? " on" : ""}`} onClick={() => setNote(note === s ? "" : s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {track.error && (
        <p className="form-error" role="alert">
          <CircleAlert size={16} /> {track.error.message}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={track.isPending}>
          <Plus /> {t("form.submit", t(STAGE_KEYS[stage]))}
        </button>
      </div>
    </form>
  );
}
