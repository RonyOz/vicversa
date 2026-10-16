import type { LoadedCatalog } from "./catalog.js";
import type { Application } from "./schema.js";

/**
 * Which catalog pieces each CV uses, and the reverse: which CVs use each
 * piece. Pure; the panel's CV view and catalog explorer are built on it.
 */

export type PieceKind = "summary" | "experience" | "project" | "certification" | "education" | "skill";

export interface AppPieces {
  summary: string | null;
  /** Items in render order (the application's section order), each with its selected bullets. */
  items: { kind: Exclude<PieceKind, "summary" | "skill">; id: string; bullets: string[] }[];
  skills: string[];
}

export const pieceKey = (kind: PieceKind, id: string) => `${kind}:${id}`;

const LIST_KINDS = {
  experience: "experience",
  projects: "project",
  certifications: "certification",
} as const;

export function piecesOf(app: Application, catalog: LoadedCatalog): AppPieces {
  const items: AppPieces["items"] = [];
  for (const section of app.content.sections) {
    if (section === "skills") continue;
    if (section === "education") {
      for (const id of app.content.education) items.push({ kind: "education", id, bullets: [] });
      continue;
    }
    const kind = LIST_KINDS[section];
    for (const id of app.content[section]) {
      const bullet = catalog.byId.bullets.get(id);
      const owner = bullet ? bullet.ownerId : id;
      let item = items.find((i) => i.kind === kind && i.id === owner);
      if (!item) {
        item = { kind, id: owner, bullets: [] };
        items.push(item);
      }
      if (bullet) item.bullets.push(id);
    }
  }
  return {
    summary: app.content.summary ?? null,
    items,
    skills: app.content.skills.flatMap((row) => row.items),
  };
}

export interface UsageIndex {
  /** `kind:id` → application names, in the order given. */
  pieces: Record<string, string[]>;
  /** bullet id → application names. */
  bullets: Record<string, string[]>;
}

export function usageIndex(byApp: Record<string, AppPieces>): UsageIndex {
  const index: UsageIndex = { pieces: {}, bullets: {} };
  const add = (map: Record<string, string[]>, key: string, app: string) => {
    const list = (map[key] ??= []);
    if (!list.includes(app)) list.push(app);
  };
  for (const [app, pieces] of Object.entries(byApp)) {
    if (pieces.summary) add(index.pieces, pieceKey("summary", pieces.summary), app);
    for (const item of pieces.items) {
      add(index.pieces, pieceKey(item.kind, item.id), app);
      for (const bullet of item.bullets) add(index.bullets, bullet, app);
    }
    for (const skill of pieces.skills) add(index.pieces, pieceKey("skill", skill), app);
  }
  return index;
}
