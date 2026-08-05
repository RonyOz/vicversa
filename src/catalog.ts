import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  Application, Certification, Education, Experience, Localized,
  Profile, Project, Section, SkillsFile, Summary, type Catalog,
} from "./schema.js";
import { Theme } from "./theme.js";

export const ROOT = resolve(import.meta.dirname, "..");

export const Labels = z.object({
  present: Localized,
  graduation: Localized,
  semester: Localized,
  gpa: Localized,
  obtained: Localized,
});
export type Labels = z.infer<typeof Labels>;

/** Turns a Zod failure into something you can act on without reading a stack trace. */
function formatIssues(file: string, error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    return `  ${path}: ${issue.message}`;
  });
  return `${file} is not valid:\n${lines.join("\n")}`;
}

async function load<T extends z.ZodType>(relativePath: string, schema: T): Promise<z.infer<T>> {
  const absolute = resolve(ROOT, relativePath);

  let raw: string;
  try {
    raw = await readFile(absolute, "utf8");
  } catch {
    throw new Error(`Cannot read ${relativePath}`);
  }

  const result = schema.safeParse(parse(raw));
  if (!result.success) throw new Error(formatIssues(relativePath, result.error));
  return result.data;
}

/** Fails on duplicate ids, which are otherwise a silently-wins-last bug. */
function index<T extends { id: string }>(items: T[], label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) throw new Error(`Duplicate ${label} id: "${item.id}"`);
    map.set(item.id, item);
  }
  return map;
}

export type LoadedCatalog = Catalog & {
  labels: Labels;
  theme: Theme;
  byId: {
    summaries: Map<string, Summary>;
    sections: Map<string, Section>;
    experiences: Map<string, Experience>;
    projects: Map<string, Project>;
    certifications: Map<string, Certification>;
    education: Map<string, Education>;
    skills: Map<string, z.infer<typeof SkillsFile>["skills"][number]>;
    skillGroups: Map<string, z.infer<typeof SkillsFile>["groups"][number]>;
    /** Every bullet in the catalog, keyed by bullet id, with its owning item. */
    bullets: Map<string, { bullet: { id: string; text: Localized; tags: string[] }; ownerId: string }>;
  };
};

export async function loadCatalog(): Promise<LoadedCatalog> {
  const [profile, summaries, sections, experiences, projects, certifications, education, skillsFile, labels, theme] =
    await Promise.all([
      load("catalog/profile.yaml", Profile),
      load("catalog/summaries.yaml", z.array(Summary)),
      load("catalog/sections.yaml", z.array(Section)),
      load("catalog/experiences.yaml", z.array(Experience)),
      load("catalog/projects.yaml", z.array(Project)),
      load("catalog/certifications.yaml", z.array(Certification)),
      load("catalog/education.yaml", z.array(Education)),
      load("catalog/skills.yaml", SkillsFile),
      load("catalog/labels.yaml", Labels),
      load("theme.yaml", Theme),
    ]);

  const bullets: LoadedCatalog["byId"]["bullets"] = new Map();
  for (const owner of [...experiences, ...projects, ...certifications]) {
    for (const bullet of owner.bullets) {
      const existing = bullets.get(bullet.id);
      if (existing) {
        throw new Error(
          `Duplicate bullet id "${bullet.id}" (in both "${existing.ownerId}" and "${owner.id}")`,
        );
      }
      bullets.set(bullet.id, { bullet, ownerId: owner.id });
    }
  }

  return {
    profile, summaries, sections, experiences, projects, certifications, education,
    skills: skillsFile.skills,
    skillGroups: skillsFile.groups,
    labels,
    theme,
    byId: {
      summaries: index(summaries, "summary"),
      sections: index(sections, "section"),
      experiences: index(experiences, "experience"),
      projects: index(projects, "project"),
      certifications: index(certifications, "certification"),
      education: index(education, "education"),
      skills: index(skillsFile.skills, "skill"),
      skillGroups: index(skillsFile.groups, "skill group"),
      bullets,
    },
  };
}

export async function loadApplication(name: string): Promise<Application> {
  const file = name.endsWith(".yaml") ? name : `${name}.yaml`;
  const relativePath = file.includes("/") ? file : `applications/${file}`;
  return load(relativePath, Application);
}
