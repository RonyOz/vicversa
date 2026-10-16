import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CvListing, Dashboard, FitEntry, getApplication, getCvDetail } from "../../ops.js";
import type { Explorer } from "./catalog-view.js";
import type { Stage, TrackingEvent } from "../../schema.js";
import type { TrackSummary } from "../../tracking.js";

/** Typed calls to the panel API (src/ui/server.ts), cached by React Query. */

export type ApplicationDetail = Awaited<ReturnType<typeof getApplication>>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
  return body as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const useDashboard = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => request<Dashboard>("/api/dashboard") });

export const useApplication = (name: string) =>
  useQuery({
    queryKey: ["application", name],
    queryFn: () => request<ApplicationDetail>(`/api/applications/${encodeURIComponent(name)}`),
  });

export interface TrackInput {
  name: string;
  stage: Stage;
  date: string;
  note?: string;
}

type Written = { name: string; events: TrackingEvent[]; summary: TrackSummary | null };

/** Every write refreshes both the dashboard and that application. */
function useWrite<I extends { name: string }, R>(fn: (input: I) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_result, input) => {
      void client.invalidateQueries({ queryKey: ["dashboard"] });
      void client.invalidateQueries({ queryKey: ["application", input.name] });
      // Tracking state also shows in the CV gallery, the CV view and the catalog.
      void client.invalidateQueries({ queryKey: ["cvs"] });
      void client.invalidateQueries({ queryKey: ["cv", input.name] });
      void client.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export const useTrack = () =>
  useWrite((input: TrackInput) => post<Written & { event: TrackingEvent }>("/api/track", input));

export const useUndo = () =>
  useWrite((input: { name: string }) => post<Written & { removed: TrackingEvent }>("/api/undo", input));

export type CvDetail = Awaited<ReturnType<typeof getCvDetail>>;

export const useCvs = () =>
  useQuery({ queryKey: ["cvs"], queryFn: () => request<{ cvs: CvListing[] }>("/api/cvs").then((r) => r.cvs) });

export const useCv = (name: string) =>
  useQuery({ queryKey: ["cv", name], queryFn: () => request<CvDetail>(`/api/cvs/${encodeURIComponent(name)}`) });

/** One-page fit of every CV: slow the first time (Chromium), cached by the server after. */
export const useFit = () =>
  useQuery({
    queryKey: ["fit"],
    queryFn: () => request<{ fit: Record<string, FitEntry> }>("/api/fit").then((r) => r.fit),
    staleTime: 5 * 60_000,
  });

export const useCatalog = () => useQuery({ queryKey: ["catalog"], queryFn: () => request<Explorer>("/api/catalog") });
