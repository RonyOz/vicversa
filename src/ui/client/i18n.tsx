import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Language } from "../../schema.js";

/**
 * The panel's words in English (default) and Spanish. A typed dictionary, not
 * a library: two languages do not pay for one. Every key exists in both, and
 * values that depend on numbers are functions, so plurals stay grammatical.
 */

type Message = string | ((...args: never[]) => string);

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

const en = {
  "nav.summary": "Summary",
  "nav.applications": "Applications",
  "nav.cvs": "CVs",
  "nav.catalog": "Catalog",
  "nav.data": "Data folder",
  "nav.language": "Español",
  "nav.collapse": "Collapse sidebar",
  "nav.expand": "Expand sidebar",

  "state.active": "Active",
  "state.stale": "No response",
  "state.closed": "Closed",

  "stage.applied": "Applied",
  "stage.assessment": "Assessment",
  "stage.interview": "Interview",
  "stage.offer": "Offer",
  "stage.hired": "Hired",
  "stage.rejected": "Rejected",
  "stage.withdrawn": "Withdrawn",
  "stage.interaction": "Interaction",
  "stage.reopened": "Reopened",

  "summary.title": "Summary",
  "summary.lede": (date: string, days: number) => `${date}. An application counts as unanswered after ${days} days.`,
  "kpi.sent": "Sent",
  "kpi.sentHint": (avg: string, weeks: number) => `${avg} a week over the last ${weeks} weeks`,
  "kpi.waiting": "Waiting",
  "kpi.waitingHint": (days: number) => `Under ${days} days: not a result yet`,
  "kpi.silent": "No response",
  "kpi.silentHint": "Silence, not rejection",
  "kpi.responded": "Responded",
  "kpi.of": (n: number) => `of ${n}`,
  "kpi.respondedHint": (pct: number) => `${pct}% of those past the waiting window`,
  "funnel.title": "What happened to each application",
  "funnel.lede": "Every application is in exactly one group. Waiting and silence are not rejection. Select a group to see it.",
  "funnel.waiting": "Waiting",
  "funnel.silent": "No response",
  "funnel.withdrawn": "Withdrawn before an answer",
  "funnel.rejected": "Rejected outright",
  "funnel.advanced": "Advanced",
  "funnel.tip": (label: string, n: number, total: number, pct: number) => `${label}\n${n} of ${total} (${pct}%), select to see them`,
  "funnel.reached": (parts: string) => `Advanced: ${parts}.`,
  "funnel.reachedPart": (n: number, stage: string) => `${n} reached ${stage.toLowerCase()}`,
  "pace.title": "Pace",
  "pace.lede": (avg: string) => `One cell per day; stronger colour, more applications. ${avg} a week on average.`,
  "pace.ledeRange": (avg: string, from: string, to: string) => `${avg} a week on average between ${from} and ${to}.`,
  "pace.older": "Earlier weeks",
  "pace.newer": "Later weeks",
  "pace.now": "Today",
  "pace.total": "total",
  "pace.less": "less",
  "pace.more": "more",
  "pace.today": "today",
  "pace.future": "not yet",
  "pace.count": (n: number) => `${n} ${s(n, "application", "applications")}`,
  "activity.title": "Recent activity",
  "activity.lede": "The latest recorded moves.",

  "apps.title": "Applications",
  "apps.lede": (n: number) => `${n} tracked. Open one to see its history and record what happened.`,
  "tab.active": "Active",
  "tab.stale": "No response",
  "tab.closed": "Closed",
  "tab.all": "All",
  "search.placeholder": "Search company, role…",
  "search.label": "Search",
  "filters.clear": "Clear",
  "sort.label": "Sort",
  "sort.recent": "Latest movement",
  "sort.waiting": "Longest waiting",
  "sort.applied": "Date applied",
  "sort.company": "Company (A–Z)",
  "apps.count": (n: number) => `${n} ${s(n, "application", "applications")}`,
  "apps.empty": "Nothing matches this search and these filters.",
  "apps.applied": (date: string) => `applied ${date}`,
  "apps.idle": (days: number) => `${days}d without movement`,
  "axis.today": "today",

  "detail.back": "Applications",
  "detail.posting": "View posting",
  "detail.cv": "CV and its pieces",
  "detail.history": "History",
  "detail.since": (date: string, days: number | null) => `Applied ${date}${days === null ? "" : `, ${days} days in process`}.`,
  "detail.untracked": "Template or draft: not tracked.",
  "detail.waitingFor": (days: number) => `Waiting for ${days} days`,
  "detail.gap": (days: number, stage: string) => `${days} days\nafter ${stage.toLowerCase()}`,
  "detail.reopenProcess": "The company came back",
  "detail.reopenLede": "Reopen this process. The closing event stays in the history.",
  "detail.undo": (what: string) => `Undo: remove “${what}”`,
  "detail.removed": (what: string) => `Removed ${what}`,
  "detail.record": "Record an event",
  "detail.notes": "Application notes",
  "detail.sentCv": "CV sent",
  "detail.sentCvLede": (lang: string) => `The page exactly as the PDF prints (${lang}).`,

  "form.what": "What happened?",
  "form.when": "When?",
  "form.note": "Short note (optional)",
  "form.notePlaceholder": "e.g. HR, technical with lead",
  "form.submit": (stage: string) => `Record ${stage.toLowerCase()}`,
  "form.recorded": (stage: string, date: string) => `Recorded: ${stage.toLowerCase()} on ${date}`,
  "form.undo": "Undo",
  "form.undone": "Undone",
  "date.today": "Today",
  "date.yesterday": "Yesterday",
  "date.weekAgo": "A week ago",
  "date.lastEvent": "Last event",
  "date.pick": "Pick a date",
  "date.prev": "Previous month",
  "date.next": "Next month",
  "date.todayPrefix": (date: string) => `Today, ${date}`,

  "cvs.title": "CVs",
  "cvs.lede": (n: number) => `${n} ${s(n, "version", "versions")} of one catalog, laid out and measured exactly as printed.`,
  "cvs.all": "All",
  "cvs.sent": "Sent",
  "cvs.templates": "Templates and drafts",
  "cvs.search": "Search company, role, file…",
  "cvs.empty": "No CV matches.",
  "cvs.template": "Template",
  "cvs.sentOn": (date: string, state: string) => `Sent ${date}\n${state}`,
  "cv.back": "CVs",
  "cv.tracking": "Tracking",
  "cv.posting": "View posting",
  "cv.open": "Open page",
  "cv.templateOrDraft": "Template or draft",
  "cv.fit": "One page",
  "cv.fitLede": "Measured in the same browser that prints the PDF.",
  "cv.pieces": "Catalog pieces",
  "cv.piecesLede": "What this CV takes from the catalog, in order (+), and what it leaves out (−).",
  "cv.unused": (n: number) => `${n} catalog ${s(n, "item", "items")} left out`,
  "cv.usedIn": (n: number) => `in ${n} ${s(n, "CV", "CVs")}`,
  "fit.pending": "measuring",
  "fit.pendingTip": "Measuring in Chromium\nthe first run takes a few seconds",
  "fit.error": "error",
  "fit.errorTip": (e: string) => `Could not lay out\n${e}`,
  "fit.ok": (lines: string) => `fits, ${lines} lines free`,
  "fit.okTip": (used: string, available: string, lines: string) => `Fits on one page\n${used} of ${available} pt, ${lines} lines free`,
  "fit.clipped": "skills clipped",
  "fit.clippedTip": "Fits, but a skills row is clipped",
  "fit.over": (lines: string) => `over by ${lines} lines`,
  "fit.overTip": (lines: string) => `Spills past one page\nby ${lines} lines`,
  "fit.meterTip": (used: string, available: string) => `${used} of ${available} pt used`,

  "catalog.title": "Catalog",
  "catalog.lede": "The source every CV is cut from: how many CVs use each piece, and which never made it into one.",
  "catalog.searchIn": (kind: string) => `Search ${kind.toLowerCase()}…`,
  "catalog.unused": "Unused",
  "catalog.count": (shown: number, total: number) => `${shown} of ${total}, most used first`,
  "catalog.empty": "Nothing matches.",
  "catalog.nobody": "No CV uses it",
  "catalog.appearsIn": (n: number) => `Used in ${n} ${s(n, "CV", "CVs")}`,
  "kind.summary": "Summaries",
  "kind.experience": "Experience",
  "kind.project": "Projects",
  "kind.certification": "Certifications",
  "kind.education": "Education",
  "kind.skill": "Skills",
  "piece.text": "Text",
  "piece.bullets": "Bullets",
  "piece.bulletsLede": "Each CV picks which to include. The number is how many do.",
  "piece.unusedBullet": "unused",
  "piece.usedBy": (n: number) => `Used in ${n} ${s(n, "CV", "CVs")}`,
  "piece.noneYet": "No CV includes it yet.",
  "piece.open": "Open a CV.",
  "piece.missing": (kind: string, id: string) => `No ${kind.toLowerCase()} with id “${id}”.`,
  "piece.template": "template",

  "common.loading": "Loading",
  "common.notFound": "This page does not exist.",
  "time.present": "present",
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof en;
type Messages = { [K in MessageKey]: (typeof en)[K] };

const es: Messages = {
  "nav.summary": "Resumen",
  "nav.applications": "Convocatorias",
  "nav.cvs": "CVs",
  "nav.catalog": "Catálogo",
  "nav.data": "Carpeta de datos",
  "nav.language": "English",
  "nav.collapse": "Contraer barra lateral",
  "nav.expand": "Expandir barra lateral",

  "state.active": "Activa",
  "state.stale": "Sin respuesta",
  "state.closed": "Cerrada",

  "stage.applied": "Aplicada",
  "stage.assessment": "Prueba",
  "stage.interview": "Entrevista",
  "stage.offer": "Oferta",
  "stage.hired": "Contratado",
  "stage.rejected": "Rechazo",
  "stage.withdrawn": "Retirada",
  "stage.interaction": "Interacción",
  "stage.reopened": "Reabierta",

  "summary.title": "Resumen",
  "summary.lede": (date, days) => `${date}. Una aplicación cuenta como sin respuesta después de ${days} días.`,
  "kpi.sent": "Enviadas",
  "kpi.sentHint": (avg, weeks) => `${avg} por semana en las últimas ${weeks} semanas`,
  "kpi.waiting": "En espera",
  "kpi.waitingHint": (days) => `Menos de ${days} días: aún no es un resultado`,
  "kpi.silent": "Sin respuesta",
  "kpi.silentHint": "Silencio, no rechazo",
  "kpi.responded": "Respondieron",
  "kpi.of": (n) => `de ${n}`,
  "kpi.respondedHint": (pct) => `${pct}% de las que ya cumplieron la espera`,
  "funnel.title": "Qué pasó con cada aplicación",
  "funnel.lede": "Cada aplicación está en exactamente un grupo. Espera y silencio no son rechazo. Elige un grupo para verlo.",
  "funnel.waiting": "En espera",
  "funnel.silent": "Sin respuesta",
  "funnel.withdrawn": "Retiradas sin respuesta",
  "funnel.rejected": "Rechazo directo",
  "funnel.advanced": "Avanzaron",
  "funnel.tip": (label, n, total, pct) => `${label}\n${n} de ${total} (${pct}%), elige para verlas`,
  "funnel.reached": (parts) => `Avanzaron: ${parts}.`,
  "funnel.reachedPart": (n, stage) => `${n} hasta ${stage.toLowerCase()}`,
  "pace.title": "Ritmo",
  "pace.lede": (avg) => `Una celda por día; color más intenso, más aplicaciones. ${avg} por semana en promedio.`,
  "pace.ledeRange": (avg, from, to) => `${avg} por semana en promedio entre ${from} y ${to}.`,
  "pace.older": "Semanas anteriores",
  "pace.newer": "Semanas siguientes",
  "pace.now": "Hoy",
  "pace.total": "total",
  "pace.less": "menos",
  "pace.more": "más",
  "pace.today": "hoy",
  "pace.future": "aún no llega",
  "pace.count": (n) => `${n} ${s(n, "aplicación", "aplicaciones")}`,
  "activity.title": "Actividad reciente",
  "activity.lede": "Los últimos movimientos registrados.",

  "apps.title": "Convocatorias",
  "apps.lede": (n) => `${n} con seguimiento. Abre una para ver su historia y registrar lo que pasó.`,
  "tab.active": "Activas",
  "tab.stale": "Sin respuesta",
  "tab.closed": "Cerradas",
  "tab.all": "Todas",
  "search.placeholder": "Buscar empresa, rol…",
  "search.label": "Buscar",
  "filters.clear": "Limpiar",
  "sort.label": "Ordenar",
  "sort.recent": "Último movimiento",
  "sort.waiting": "Más tiempo esperando",
  "sort.applied": "Fecha de aplicación",
  "sort.company": "Empresa (A–Z)",
  "apps.count": (n) => `${n} ${s(n, "convocatoria", "convocatorias")}`,
  "apps.empty": "Nada coincide con esta búsqueda y estos filtros.",
  "apps.applied": (date) => `aplicada ${date}`,
  "apps.idle": (days) => `${days}d sin movimiento`,
  "axis.today": "hoy",

  "detail.back": "Convocatorias",
  "detail.posting": "Ver convocatoria",
  "detail.cv": "CV y sus piezas",
  "detail.history": "Historia",
  "detail.since": (date, days) => `Aplicada el ${date}${days === null ? "" : `, ${days} días de proceso`}.`,
  "detail.untracked": "Plantilla o borrador: sin seguimiento.",
  "detail.waitingFor": (days) => `Esperando desde hace ${days} días`,
  "detail.gap": (days, stage) => `${days} días\ndespués de ${stage.toLowerCase()}`,
  "detail.reopenProcess": "La empresa volvió a escribir",
  "detail.reopenLede": "Reabre el proceso. El cierre se queda en el historial.",
  "detail.undo": (what) => `Deshacer: quitar «${what}»`,
  "detail.removed": (what) => `Quitado: ${what}`,
  "detail.record": "Registrar evento",
  "detail.notes": "Notas de la aplicación",
  "detail.sentCv": "Hoja de vida enviada",
  "detail.sentCvLede": (lang) => `La página tal como se imprime el PDF (${lang}).`,

  "form.what": "¿Qué pasó?",
  "form.when": "¿Cuándo?",
  "form.note": "Nota corta (opcional)",
  "form.notePlaceholder": "p. ej. RH, técnica con líder",
  "form.submit": (stage) => `Registrar ${stage.toLowerCase()}`,
  "form.recorded": (stage, date) => `Registrado: ${stage.toLowerCase()} el ${date}`,
  "form.undo": "Deshacer",
  "form.undone": "Registro deshecho",
  "date.today": "Hoy",
  "date.yesterday": "Ayer",
  "date.weekAgo": "Hace una semana",
  "date.lastEvent": "Último evento",
  "date.pick": "Elegir fecha",
  "date.prev": "Mes anterior",
  "date.next": "Mes siguiente",
  "date.todayPrefix": (date) => `Hoy, ${date}`,

  "cvs.title": "Hojas de vida",
  "cvs.lede": (n) => `${n} ${s(n, "versión", "versiones")} de un solo catálogo, compuestas y medidas igual que el PDF.`,
  "cvs.all": "Todas",
  "cvs.sent": "Enviadas",
  "cvs.templates": "Plantillas y borradores",
  "cvs.search": "Buscar empresa, rol, archivo…",
  "cvs.empty": "Ninguna hoja de vida coincide.",
  "cvs.template": "Plantilla",
  "cvs.sentOn": (date, state) => `Enviada el ${date}\n${state}`,
  "cv.back": "Hojas de vida",
  "cv.tracking": "Seguimiento",
  "cv.posting": "Ver convocatoria",
  "cv.open": "Abrir página",
  "cv.templateOrDraft": "Plantilla o borrador",
  "cv.fit": "Una página",
  "cv.fitLede": "Medido en el mismo navegador que imprime el PDF.",
  "cv.pieces": "Piezas del catálogo",
  "cv.piecesLede": "Lo que esta hoja de vida toma del catálogo, en orden (+), y lo que deja fuera (−).",
  "cv.unused": (n) => `${n} ${s(n, "elemento", "elementos")} del catálogo fuera`,
  "cv.usedIn": (n) => `en ${n} ${s(n, "CV", "CVs")}`,
  "fit.pending": "midiendo",
  "fit.pendingTip": "Midiendo en Chromium\nla primera vez tarda unos segundos",
  "fit.error": "error",
  "fit.errorTip": (e) => `No se pudo componer\n${e}`,
  "fit.ok": (lines) => `cabe, ${lines} líneas libres`,
  "fit.okTip": (used, available, lines) => `Cabe en una página\n${used} de ${available} pt, ${lines} líneas libres`,
  "fit.clipped": "skills recortadas",
  "fit.clippedTip": "Cabe, pero una fila de skills se recorta",
  "fit.over": (lines) => `se pasa ${lines} líneas`,
  "fit.overTip": (lines) => `Se pasa de una página\npor ${lines} líneas`,
  "fit.meterTip": (used, available) => `${used} de ${available} pt usados`,

  "catalog.title": "Catálogo",
  "catalog.lede": "La fuente de la que sale cada hoja de vida: cuántos CVs usan cada pieza, y cuáles nunca entraron en uno.",
  "catalog.searchIn": (kind) => `Buscar en ${kind.toLowerCase()}…`,
  "catalog.unused": "Sin usar",
  "catalog.count": (shown, total) => `${shown} de ${total}, las más usadas primero`,
  "catalog.empty": "Nada coincide.",
  "catalog.nobody": "Ningún CV la usa",
  "catalog.appearsIn": (n) => `Aparece en ${n} ${s(n, "CV", "CVs")}`,
  "kind.summary": "Resúmenes",
  "kind.experience": "Experiencia",
  "kind.project": "Proyectos",
  "kind.certification": "Certificaciones",
  "kind.education": "Educación",
  "kind.skill": "Skills",
  "piece.text": "Texto",
  "piece.bullets": "Bullets",
  "piece.bulletsLede": "Cada CV elige cuáles incluir. El número es en cuántos aparece.",
  "piece.unusedBullet": "sin usar",
  "piece.usedBy": (n) => `Usada en ${n} ${s(n, "hoja de vida", "hojas de vida")}`,
  "piece.noneYet": "Ningún CV la incluye todavía.",
  "piece.open": "Abre un CV.",
  "piece.missing": (kind, id) => `No hay ${kind.toLowerCase()} con id «${id}».`,
  "piece.template": "plantilla",

  "common.loading": "Cargando",
  "common.notFound": "Esta página no existe.",
  "time.present": "actual",
};

const MESSAGES: Record<Language, Messages> = { en, es };

type Args<K extends MessageKey> = (typeof en)[K] extends (...args: infer A) => string ? A : [];
export type Translate = <K extends MessageKey>(key: K, ...args: Args<K>) => string;

interface I18n {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translate;
}

const I18nContext = createContext<I18n | null>(null);
const STORAGE_KEY = "vicversa.lang";

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    // storage blocked: fall through to the default
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLanguage);
  const setLang = useCallback((next: Language) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // the choice just won't survive a reload
    }
  }, []);
  const value = useMemo<I18n>(() => {
    const dict = MESSAGES[lang];
    const t = ((key: MessageKey, ...args: unknown[]) => {
      const message = dict[key] as Message;
      return typeof message === "function" ? (message as (...a: unknown[]) => string)(...args) : message;
    }) as Translate;
    return { lang, setLang, t };
  }, [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n outside <I18nProvider>");
  return context;
}

/** For pure modules and tests: the dictionary without React. */
export function translator(lang: Language): Translate {
  const dict = MESSAGES[lang];
  return ((key: MessageKey, ...args: unknown[]) => {
    const message = dict[key] as Message;
    return typeof message === "function" ? (message as (...a: unknown[]) => string)(...args) : message;
  }) as Translate;
}
