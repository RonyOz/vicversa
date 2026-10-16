import { CircleAlert } from "lucide-react";

export function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="skeleton" style={{ height: 40, width: 240, minHeight: 0, marginBottom: 16 }} />
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
