/** Calendar math for the date picker: plain "YYYY-MM-DD" strings, no time zones. */

export const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "2026-10" ± n months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Weeks of the month, Monday first; days outside the month are null. */
export function monthMatrix(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = `${month}-01`;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Shortcuts under the picker; the last event's day is the usual anchor for late logging. */
export function quickDates(today: string, lastEvent: string | null): { label: string; date: string }[] {
  const options = [
    { label: "Hoy", date: today },
    { label: "Ayer", date: addDays(today, -1) },
    { label: "Hace 1 semana", date: addDays(today, -7) },
  ];
  if (lastEvent && !options.some((o) => o.date === lastEvent)) options.push({ label: "Último evento", date: lastEvent });
  return options;
}

/** "15 oct" — and "15 oct 2025" when the year is not the current one. */
export function shortDate(date: string, currentYear?: string): string {
  const [y, m, d] = date.split("-");
  const base = `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}`;
  return currentYear && y !== currentYear ? `${base} ${y}` : base;
}

export function longDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${Number(d)} de ${MONTH_NAMES[Number(m) - 1]} de ${y}`;
}
