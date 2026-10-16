import {
  Award, CircleSlash, ClipboardCheck, Handshake, LogOut, MessagesSquare, Send, type LucideIcon,
} from "lucide-react";
import type { Stage } from "../../schema.js";
import type { State } from "../../tracking.js";

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Aplicada",
  assessment: "Prueba",
  interview: "Entrevista",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "Rechazo",
  withdrawn: "Retirada",
};

export const STAGE_ICONS: Record<Stage, LucideIcon> = {
  applied: Send,
  assessment: ClipboardCheck,
  interview: MessagesSquare,
  offer: Handshake,
  hired: Award,
  rejected: CircleSlash,
  withdrawn: LogOut,
};

/** Short notes people actually write for each stage; one click fills the field. */
export const NOTE_SUGGESTIONS: Partial<Record<Stage, string[]>> = {
  assessment: ["Psicotécnica", "Prueba técnica", "HackerRank", "Video entrevista", "Caso práctico"],
  interview: ["RH", "Técnica", "Con líder", "Final", "Cultural"],
  offer: ["Verbal", "Por escrito"],
  rejected: ["Correo", "Primera etapa", "Tras prueba", "Tras entrevista"],
  withdrawn: ["Otra oferta", "Salario", "No me interesó"],
};

export const STATE_LABELS: Record<State, string> = { active: "Activa", stale: "Sin respuesta", closed: "Cerrada" };

export function StageIcon({ stage, size }: { stage: Stage; size?: number }) {
  const Icon = STAGE_ICONS[stage];
  return (
    <span className={`stage-icon st-${stage}`} style={size ? { width: size, height: size } : undefined} aria-hidden>
      <Icon />
    </span>
  );
}
