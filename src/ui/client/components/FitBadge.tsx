import { CircleAlert, CircleCheck, Loader } from "lucide-react";
import type { FitEntry } from "../../../ops.js";
import { useI18n } from "../i18n.js";

/** One-page fit at a glance: spare lines when it fits, overflow when it does not. */
export function FitBadge({ fit }: { fit: FitEntry | undefined }) {
  const { t } = useI18n();
  if (!fit) {
    return (
      <span className="fit pending" data-tip={t("fit.pendingTip")}>
        <Loader /> {t("fit.pending")}
      </span>
    );
  }
  if (fit.error) {
    return (
      <span className="fit bad" data-tip={t("fit.errorTip", fit.error)}>
        <CircleAlert /> {t("fit.error")}
      </span>
    );
  }
  if (fit.ok) {
    const lines = fit.spareLines.toFixed(1);
    return (
      <span className="fit ok" data-tip={t("fit.okTip", fit.used.toFixed(0), fit.available.toFixed(0), lines)}>
        <CircleCheck /> {t("fit.ok", lines)}
      </span>
    );
  }
  const over = fit.overflowLines.toFixed(1);
  return (
    <span className="fit bad" data-tip={fit.fits ? t("fit.clippedTip") : t("fit.overTip", over)}>
      <CircleAlert /> {fit.fits ? t("fit.clipped") : t("fit.over", over)}
    </span>
  );
}
