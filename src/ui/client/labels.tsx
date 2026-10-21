import {
  Award, CircleSlash, ClipboardCheck, Handshake, LogOut, MessageCircle, MessagesSquare, RotateCcw, Send,
  type LucideIcon,
} from "lucide-react";
import type { Language, Stage } from "../../schema.js";
import type { State } from "../../tracking.js";
import type { MessageKey } from "./i18n.js";

export const STAGE_KEYS: Record<Stage, MessageKey> = {
  applied: "stage.applied",
  assessment: "stage.assessment",
  interview: "stage.interview",
  offer: "stage.offer",
  hired: "stage.hired",
  rejected: "stage.rejected",
  withdrawn: "stage.withdrawn",
  interaction: "stage.interaction",
  reopened: "stage.reopened",
};

export const STATE_KEYS: Record<State, MessageKey> = {
  active: "state.active",
  stale: "state.stale",
  closed: "state.closed",
};

export const STAGE_ICONS: Record<Stage, LucideIcon> = {
  applied: Send,
  assessment: ClipboardCheck,
  interview: MessagesSquare,
  offer: Handshake,
  hired: Award,
  rejected: CircleSlash,
  withdrawn: LogOut,
  interaction: MessageCircle,
  reopened: RotateCcw,
};

/** Short notes people actually write for each stage; one click fills the field. */
export const NOTE_SUGGESTIONS: Record<Language, Partial<Record<Stage, string[]>>> = {
  en: {
    assessment: ["Aptitude test", "Take-home", "HackerRank", "Video interview", "Case study"],
    interview: ["HR", "Technical", "With the lead", "Final", "Culture fit"],
    offer: ["Verbal", "In writing"],
    rejected: ["Email", "First round", "After the test", "After the interview"],
    withdrawn: ["Other offer", "Salary", "Lost interest"],
    interaction: ["Postponed", "Date to confirm", "Follow-up", "They reached out"],
    reopened: ["Another opening", "They reached out"],
  },
  es: {
    assessment: ["Psicotécnica", "Prueba técnica", "HackerRank", "Video entrevista", "Caso práctico"],
    interview: ["RH", "Técnica", "Con líder", "Final", "Cultural"],
    offer: ["Verbal", "Por escrito"],
    rejected: ["Correo", "Primera etapa", "Tras prueba", "Tras entrevista"],
    withdrawn: ["Otra oferta", "Salario", "No me interesó"],
    interaction: ["Aplazada", "Fecha por confirmar", "Seguimiento", "Me contactaron"],
    reopened: ["Otra vacante", "Me contactaron"],
  },
};

export function StageIcon({ stage }: { stage: Stage }) {
  const Icon = STAGE_ICONS[stage];
  return (
    <span className={`stage-icon st-${stage}`} aria-hidden>
      <Icon />
    </span>
  );
}
