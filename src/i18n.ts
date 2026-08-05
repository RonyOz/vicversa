import { LANGUAGES, type Language, type Localized } from "./schema.js";

/**
 * Resolves a translatable value.
 *
 * Falls back to another language rather than failing, so a bullet written only
 * in Spanish still renders on an English CV. That's the intended behaviour: a
 * visible untranslated line is a to-do you'll notice and fix, whereas a
 * silently dropped one is a hole you won't.
 */
export function pick(value: Localized, lang: Language): string {
  if (typeof value === "string") return value;

  const exact = value[lang];
  if (exact !== undefined) return exact;

  for (const other of LANGUAGES) {
    const fallback = value[other];
    if (fallback !== undefined) return fallback;
  }
  throw new Error(`Localized value is empty: ${JSON.stringify(value)}`);
}

/** True when `value` has no text for `lang` and had to fall back. */
export function isFallback(value: Localized, lang: Language): boolean {
  return typeof value !== "string" && value[lang] === undefined;
}

const MONTHS: Record<Language, readonly string[]> = {
  // Capitalized to match the original, though Spanish normally lowercases these.
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
       "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  en: ["January", "February", "March", "April", "May", "June",
       "July", "August", "September", "October", "November", "December"],
};

const MONTHS_SHORT: Record<Language, readonly string[]> = {
  es: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function split(yearMonth: string): { year: string; monthIndex: number } {
  const [year, month] = yearMonth.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex)) throw new Error(`Bad date: "${yearMonth}"`);
  return { year, monthIndex };
}

export function formatMonth(yearMonth: string, lang: Language, style: "long" | "short" = "long"): string {
  const { year, monthIndex } = split(yearMonth);
  const table = style === "short" ? MONTHS_SHORT : MONTHS;
  return `${table[lang][monthIndex]} ${year}`;
}

/** "Diciembre 2025 - Julio 2026", or "- Actualidad" when `end` is null. */
export function formatRange(
  start: string,
  end: string | null,
  lang: Language,
  presentLabel: string,
): string {
  const to = end === null ? presentLabel : formatMonth(end, lang);
  return `${formatMonth(start, lang)} - ${to}`;
}

const ES_ORDINAL_SUFFIX: Record<number, string> = {
  1: "er", 2: "do", 3: "er", 4: "to", 5: "to",
  6: "to", 7: "mo", 8: "vo", 9: "no", 0: "mo",
};

/** "8vo" / "9th". Spanish suffixes are irregular, English is the usual rule. */
export function ordinal(n: number, lang: Language): string {
  if (lang === "es") return `${n}${ES_ORDINAL_SUFFIX[n % 10] ?? "mo"}`;

  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}
