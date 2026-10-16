import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/** `<data>/vicversa.yaml`: optional, every key has a default. */
export const Config = z.object({
  /** Template every CV is rendered with: a bundled id or one under `<data>/templates/`. */
  template: z.string().default("harvard"),
});
export type Config = z.infer<typeof Config>;

export async function loadConfig(root: string): Promise<Config> {
  let raw: unknown = {};
  try {
    raw = parse(await readFile(resolve(root, "vicversa.yaml"), "utf8")) ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const result = Config.safeParse(raw);
  if (!result.success) {
    throw new Error(`vicversa.yaml is not valid:\n${result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  }
  return result.data;
}
