import { CircleAlert, CircleCheck, Loader } from "lucide-react";
import type { FitEntry } from "../../../ops.js";

/** One-page fit at a glance: spare lines when it fits, overflow when it does not. */
export function FitBadge({ fit }: { fit: FitEntry | undefined }) {
  if (!fit) {
    return (
      <span className="fit pending" data-tip={"Midiendo en Chromium\nla primera vez tarda unos segundos"}>
        <Loader /> midiendo
      </span>
    );
  }
  if (fit.error) {
    return (
      <span className="fit bad" data-tip={`No se pudo componer\n${fit.error}`}>
        <CircleAlert /> error
      </span>
    );
  }
  if (fit.ok) {
    return (
      <span className="fit ok" data-tip={`Cabe en una página\n${fit.used.toFixed(0)} de ${fit.available.toFixed(0)} pt · ${fit.spareLines.toFixed(1)} líneas libres`}>
        <CircleCheck /> cabe · {fit.spareLines.toFixed(1)} líneas libres
      </span>
    );
  }
  return (
    <span className="fit bad" data-tip={fit.fits ? "Cabe, pero una fila de skills se recorta" : `Se pasa de una página\npor ${fit.overflowLines.toFixed(1)} líneas`}>
      <CircleAlert /> {fit.fits ? "skills recortadas" : `se pasa ${fit.overflowLines.toFixed(1)} líneas`}
    </span>
  );
}
