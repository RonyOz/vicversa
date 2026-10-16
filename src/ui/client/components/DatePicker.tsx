import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { longDate, monthMatrix, monthNames, quickDates, shiftMonth, weekdayInitials } from "../dates.js";
import { useI18n } from "../i18n.js";

/**
 * A date picker that opens where you are working, not on today: on the month
 * of the selected date. Marks the days that already have events, blocks the
 * future, and offers one-click shortcuts including the last event's day.
 */
export function DatePicker({
  value,
  onChange,
  today,
  eventDates,
  lastEvent,
}: {
  value: string;
  onChange: (date: string) => void;
  today: string;
  eventDates: readonly string[];
  lastEvent: string | null;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.slice(0, 7));
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => setMonth(value.slice(0, 7)), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const pick = (date: string) => {
    onChange(date);
    setOpen(false);
  };
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const atCurrentMonth = month >= today.slice(0, 7);

  return (
    <div className="datepick" ref={root}>
      <button type="button" className="btn trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <CalendarDays />
        {value === today ? t("date.todayPrefix", longDate(value, lang)) : longDate(value, lang)}
      </button>
      {open && (
        <div className="pop" role="dialog" aria-label={t("date.pick")}>
          <div className="head">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t("date.prev")}>
              <ChevronLeft size={18} />
            </button>
            <span>
              {monthNames(lang)[monthNumber - 1]} {year}
            </span>
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={atCurrentMonth} aria-label={t("date.next")}>
              <ChevronRight size={18} />
            </button>
          </div>
          <table>
            <thead>
              <tr>{weekdayInitials(lang).map((d, i) => <th key={i}>{d}</th>)}</tr>
            </thead>
            <tbody>
              {monthMatrix(month).map((week, w) => (
                <tr key={w}>
                  {week.map((date, d) => (
                    <td key={d}>
                      {date && (
                        <button
                          type="button"
                          disabled={date > today}
                          onClick={() => pick(date)}
                          className={[
                            date === value && "selected",
                            date === today && "today",
                            eventDates.includes(date) && "has-event",
                          ].filter(Boolean).join(" ")}
                          aria-label={longDate(date, lang)}
                          aria-pressed={date === value}
                        >
                          {Number(date.slice(8))}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="quick">
            {quickDates(today, lastEvent).map((q) => (
              <button type="button" key={q.key} className={`chip${q.date === value ? " on" : ""}`} onClick={() => pick(q.date)}>
                {t(q.key)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
