import { CircleAlert } from "lucide-react";
import { useI18n } from "../i18n.js";

export function PageLoading() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton" style={{ height: 44, width: 260, minHeight: 0, marginBottom: 20 }} />
      <div className="skeleton" />
      <div className="skeleton" style={{ marginTop: 16, minHeight: 240 }} />
    </div>
  );
}

export function PageError({ error }: { error: Error }) {
  return (
    <div className="card empty" role="alert">
      <CircleAlert />
      <p>{error.message}</p>
    </div>
  );
}
