import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dashboard, getApplication } from "../../ops.js";
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
    },
  });
}

export const useTrack = () =>
  useWrite((input: TrackInput) => post<Written & { event: TrackingEvent }>("/api/track", input));

export const useUndo = () =>
  useWrite((input: { name: string }) => post<Written & { removed: TrackingEvent }>("/api/undo", input));
