import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { longDate, MONTH_NAMES, monthMatrix, quickDates, shiftMonth } from "../dates.js";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * A date picker that opens where you are working, not on today: on the month
 * of the selected date (which starts at the application's last event when
 * logging late). Marks the days that already have events, blocks the future,
 * and offers one-click shortcuts.
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
        {value === today ? `Hoy · ${longDate(value)}` : longDate(value)}
      </button>
      {open && (
        <div className="pop" role="dialog" aria-label="Elegir fecha">
          <div className="head">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <span>
              {MONTH_NAMES[monthNumber - 1]} {year}
            </span>
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={atCurrentMonth} aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
          <table>
            <thead>
              <tr>{WEEKDAYS.map((d) => <th key={d}>{d}</th>)}</tr>
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
                          aria-label={longDate(date)}
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
              <button type="button" key={q.label} className={`chip${q.date === value ? " on" : ""}`} onClick={() => pick(q.date)}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
