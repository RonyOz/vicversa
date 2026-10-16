import type { Language } from "../../schema.js";
import type { MessageKey } from "./i18n.js";

/** Calendar math and date wording for the panel: plain "YYYY-MM-DD" strings, no time zones. */

const MONTHS: Record<Language, { long: string[]; short: string[] }> = {
  en: {
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  es: {
    long: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    short: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  },
};

export const monthNames = (lang: Language, width: "long" | "short" = "long") => MONTHS[lang][width];

/** Monday first, three letters. */
export const weekdayNames = (lang: Language) =>
  lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** One letter, for the date picker header. */
export const weekdayInitials = (lang: Language) =>
  lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["L", "M", "X", "J", "V", "S", "D"];

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
export function quickDates(today: string, lastEvent: string | null): { key: MessageKey; date: string }[] {
  const options: { key: MessageKey; date: string }[] = [
    { key: "date.today", date: today },
    { key: "date.yesterday", date: addDays(today, -1) },
    { key: "date.weekAgo", date: addDays(today, -7) },
  ];
  if (lastEvent && !options.some((o) => o.date === lastEvent)) options.push({ key: "date.lastEvent", date: lastEvent });
  return options;
}

/** "Oct 15" / "15 oct" — with the year when it is not the current one. */
export function shortDate(date: string, lang: Language = "es", currentYear?: string): string {
  const [y, m, d] = date.split("-");
  const month = MONTHS[lang].short[Number(m) - 1];
  const base = lang === "en" ? `${month} ${Number(d)}` : `${Number(d)} ${month}`;
  return currentYear && y !== currentYear ? `${base}${lang === "en" ? "," : ""} ${y}` : base;
}

/** "October 15, 2026" / "15 de octubre de 2026". */
export function longDate(date: string, lang: Language = "es"): string {
  const [y, m, d] = date.split("-");
  const month = MONTHS[lang].long[Number(m) - 1];
  return lang === "en" ? `${month} ${Number(d)}, ${y}` : `${Number(d)} de ${month} de ${y}`;
}
