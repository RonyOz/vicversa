import { z } from "zod";

export const LANGUAGES = ["es", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * A translatable value.
 *
 * A bare string means "identical in every language" - which is the common case
 * for proper nouns like "Fullstack Developer" or "Docker". Writing those out
 * twice is how translations drift apart, so the schema makes it unnecessary.
 */
export const Localized = z.union([
  z.string(),
  z.object({ es: z.string().optional(), en: z.string().optional() }),
]);
export type Localized = z.infer<typeof Localized>;

/** "YYYY-MM". Rendered per language, never stored pre-formatted. */
export const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected "YYYY-MM"');

const Id = z
  .string()
  .regex(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/, "ids are lowercase, with . separating a bullet from its item");

export const Bullet = z.object({
  id: Id,
  tags: z.array(z.string()).default([]),
  text: Localized,
});
export type Bullet = z.infer<typeof Bullet>;

export const Experience = z.object({
  id: Id,
  org: Localized,
  role: Localized,
  start: YearMonth,
  end: YearMonth.nullable().default(null),
  bullets: z.array(Bullet).default([]),
});
export type Experience = z.infer<typeof Experience>;

export const Project = z.object({
  id: Id,
  /** The underlined lead-in. Usually a repo path, sometimes just a name. */
  label: z.string(),
  href: z.url().optional(),
  name: Localized,
  tech: z.array(z.string()).default([]),
  bullets: z.array(Bullet).default([]),
});
export type Project = z.infer<typeof Project>;

export const Certification = z.object({
  id: Id,
  name: Localized,
  issuer: Localized,
  date: YearMonth,
  bullets: z.array(Bullet).default([]),
});
export type Certification = z.infer<typeof Certification>;

export const Education = z.object({
  id: Id,
  org: Localized,
  program: Localized,
  start: YearMonth,
  end: YearMonth.nullable().default(null),
  graduation: YearMonth.optional(),
  semester: z.number().int().positive().optional(),
  /** Kept per language because the grading scale itself differs by audience. */
  gpa: Localized.optional(),
  /**
   * Distinctions earned during the programme, rendered as inline labels under
   * the entry. A list rather than one string so each badge stays an editable
   * unit - dropping one to reclaim a line shouldn't mean rewriting a sentence.
   */
  honors: z.array(Localized).default([]),
});
export type Education = z.infer<typeof Education>;

export const Skill = z.object({
  id: Id,
  /** Renders bold. */
  name: z.string(),
  /** Renders regular, in parentheses. */
  detail: z.string().optional(),
  tags: z.array(z.string()).default([]),
});
export type Skill = z.infer<typeof Skill>;

export const SkillGroup = z.object({ id: Id, label: Localized });
export type SkillGroup = z.infer<typeof SkillGroup>;

export const SkillsFile = z.object({
  groups: z.array(SkillGroup),
  skills: z.array(Skill),
});

export const Summary = z.object({
  id: Id,
  tags: z.array(z.string()).default([]),
  text: Localized,
});
export type Summary = z.infer<typeof Summary>;

export const Section = z.object({ id: Id, title: Localized });
export type Section = z.infer<typeof Section>;

export const ContactItem = z.object({
  id: Id,
  text: Localized,
  href: z.string().optional(),
});
export type ContactItem = z.infer<typeof ContactItem>;

export const Profile = z.object({
  name: z.string(),
  contact: z.array(ContactItem),
});
export type Profile = z.infer<typeof Profile>;

export type Catalog = {
  profile: Profile;
  summaries: Summary[];
  sections: Section[];
  experiences: Experience[];
  projects: Project[];
  certifications: Certification[];
  education: Education[];
  skills: Skill[];
  skillGroups: SkillGroup[];
};

/** Which catalog sections an application may lay out, in any order. */
export const SECTION_IDS = ["skills", "projects", "experience", "education", "certifications"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SkillRow = z.object({
  group: Id,
  items: z.array(Id),
  /** Overrides the group's catalog label for this application only. */
  label: Localized.optional(),
});

/** "YYYY-MM-DD", a local calendar date. */
export const IsoDate = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'expected "YYYY-MM-DD"');

export const STAGES = ["applied", "assessment", "interview", "offer", "hired", "rejected", "withdrawn"] as const;
export type Stage = (typeof STAGES)[number];

/** A process is over once one of these is recorded, so it must be the last event. */
export const TERMINAL_STAGES: readonly Stage[] = ["hired", "rejected", "withdrawn"];

/** Events only the company can cause: any of them means the application got a response. */
export const COMPANY_STAGES: readonly Stage[] = ["assessment", "interview", "offer", "hired", "rejected"];

export const TrackingEvent = z.object({
  date: IsoDate,
  stage: z.enum(STAGES),
  note: z.string().optional(),
});
export type TrackingEvent = z.infer<typeof TrackingEvent>;

/**
 * The two rules every timeline satisfies. Returned as a message instead of
 * thrown so the schema and `cv track` report a broken timeline the same way.
 */
export function trackingProblem(events: readonly TrackingEvent[]): string | null {
  for (let i = 1; i < events.length; i++) {
    const previous = events[i - 1]!;
    const current = events[i]!;
    if (current.date < previous.date) {
      return `events must be in date order: ${current.date} (${current.stage}) comes after ${previous.date} (${previous.stage})`;
    }
  }
  const terminal = events.findIndex((event) => TERMINAL_STAGES.includes(event.stage));
  if (terminal !== -1 && terminal !== events.length - 1) {
    const event = events[terminal]!;
    return `nothing can follow a terminal stage: ${event.stage} on ${event.date} is not the last event`;
  }
  return null;
}

/**
 * The application's history: one event per line, oldest first. Status is
 * never stored; it is derived from the last event (see src/tracking.ts).
 */
export const Tracking = z
  .array(TrackingEvent)
  .min(1, "tracking needs at least one event; remove the key instead")
  .superRefine((events, ctx) => {
    const problem = trackingProblem(events);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export const Application = z.object({
  metadata: z.object({
    company: z.string().optional(),
    role: z.string().optional(),
    url: z.url().optional(),
    date_submitted: z.string().optional(),
    language: z.enum(LANGUAGES),
    notes: z.string().optional(),
  }),
  content: z.object({
    summary: Id.optional(),
    /** Contact chips to show, in order. Omit to show all of them. */
    contact: z.array(Id).optional(),
    /** Sections to render, in order. Omitting a section drops it entirely. */
    sections: z.array(z.enum(SECTION_IDS)),
    /** Per-application heading overrides, e.g. "LAST CERTIFICATIONS". */
    section_titles: z.partialRecord(z.enum(SECTION_IDS), Localized).default({}),
    skills: z.array(SkillRow).default([]),
    /**
     * Each of these is a list of bullet ids in render order; the parent item is
     * derived and items are ordered by where their first bullet appears. A bare
     * item id includes that item's header with no bullets.
     */
    projects: z.array(Id).default([]),
    experience: z.array(Id).default([]),
    certifications: z.array(Id).default([]),
    education: z.array(Id).default([]),
  }),
  /** Optional. Without it, `metadata.date_submitted` implies one "applied" event. */
  tracking: Tracking.optional(),
});
export type Application = z.infer<typeof Application>;
