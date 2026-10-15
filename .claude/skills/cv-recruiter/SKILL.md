---
name: cv-recruiter
description: >-
  Use when the user provides a job posting or convocatoria (pasted text, or a
  path to a .md file) and wants a tailored single-page resume / hoja de vida
  built or updated for that specific posting from the vicversa catalog.
  Triggers: "convocatoria", "vacante", "hoja de vida", "CV para esta
  convocatoria", "armar/aplicar CV", "actualizar CV/aplicación", "resume", "job
  posting", "apply to this role", "update this application". Requires the
  vicversa repo (catalog/ and applications/ YAML) as working directory.
---

# cv-recruiter

## Overview

Act as a recruiter and CV expert for Software Engineering. Given one
convocatoria, produce or update a specialized one-page CV for it: select the
right pieces from the catalog, propose (never invent) new catalog content if
the role needs it, write the application YAML, and render a verified PDF. Two
user gates are mandatory: **G1** before writing new content to the catalog,
**G2** before the job counts as done.

**Creating vs updating:** if the user points at an existing
`applications/*.yaml` (including a `general-es`/`general-en` one) instead of
asking for a brand-new file, load it as the starting point and run F1 against
it — the delta is what changes, not a from-scratch rebuild. Skip F2 for
anything the file already covers correctly. Loading an existing file does
**not** exempt its current selections from the exclusion check in F1 — audit
every already-included skill/group against this posting too, not just what
you're about to add. An inherited selection that fails the check gets cut,
same as a new one that fails it.

**Source of truth is `catalog/*.yaml`. Applications never invent data — they
select it.** The intelligence is in the analysis, selection and writing; the
rules below exist to keep the repo's invariants intact.

## Voice

Talk to the user like a recruiter presenting a CV, never like a process
narrating itself. Don't say "F1", "F3", "Gate G1/G2", "per this skill", or
otherwise reference these internal phase/gate labels or this document — the
user should hear *what* was decided and *why it fits the posting*, not that
a procedure ran. "I kept Docker and Kubernetes because the posting asks for
container orchestration" — not "Per F1, Docker was marked must-have." This
also covers any todo list you create: phrase items in plain task language
("draft catalog additions for review", "render and check one-page fit"),
never with phase/gate labels (F0-F5, G1/G2).

## Judgment calls

**Decide, don't poll.** Scope and presentation calls — which relevant-but-
optional skill row to include, how to phrase a bullet, which of two
defensible options fits better — are the recruiter's job to resolve. Pick the
option that best fits the posting, say why in one line, and let the user
override if they disagree. Reserve actual questions for G1 (new catalog
content) and real unknowns (does the user have X). A judgment call phrased
back to the user as "do you want A or B?" when both are defensible is a red
flag — you're polling instead of recruiting.

## Contexto fijo del repo (do not re-derive)

- Data contract and formats: `SPEC.md` §5. Data lives in `catalog/*.yaml`;
  every CV is an `applications/*.yaml` (git is the audit trail).
- **Golden rule of selections (bullet-first):** `experience`, `projects`,
  `certifications` are lists of **bullet ids in render order**; the parent item
  is derived from each bullet's owner. A bare item id (`northwind`) includes the
  header with no bullets. One list, not two.
- **One-page budget:** A4 gives ~785.9pt ≈ 58 lines at 10pt/13.5pt. The CLI
  renderer refuses to build an overflowing CV; `validate` prices every exit
  (summary swaps cost content nothing; bullets are measured heights).
- Tools: the **vicversa MCP server** — `get_catalog`, `list_applications`,
  `get_application`, `validate`, `render` (`force` only to fight the one-page
  rule — never). If MCP tools are unavailable, the CLI equivalents are
  `pnpm cv list | validate [app...] | render <app>`. Writing the application
  YAML is a plain file edit; there is no write tool.
- Never touch `theme.yaml`, `src/`, or the YAML schema. Applications follow the
  existing repo conventions.

## Input

- **Convocatoria:** pasted text (normal case) or a local file path (`.md`
  preferred; readable text also ok). Identify company, role, and date for the
  filename.
- **Naming:** `applications/YYYY-MM-company-role.yaml`. Latin-normalize the
  company/role. For "both languages":
  `applications/YYYY-MM-company-role-es.yaml` and `...-en.yaml`.
- **Language:** follows the convocatoria (Spanish text → `es`, English → `en`).
  The user can override it, or request **both** versions.

## Procedure

### F0 — Load context

1. Read the catalog with `get_catalog`: parts `profile`, `summaries`,
   `sections`, `experiences`, `projects`, `certifications`, `education`,
   `skills`, with `language` set to the posting's language (halves the size).
2. `list_applications` for every existing application; `get_application` on
   the ones whose role is close to this posting.
3. State in one line: company, role, detected language.

### F1 — Recruiter analysis

From the convocatoria extract:

- Role and seniority (internship, junior, mid, senior).
- Sector / stack.
- Key responsibilities.
- **Explicit skills** (named in the text) and **implicit/contextual skills**
  (derived from the role or sector even if unstated — e.g. "backend services"
  implies Docker, CI/CD, REST, testing; an AI-architecture role implies RAG,
  LLM APIs, evaluation/observability).
- Mark each as must-have vs nice-to-have.

**Default is exclusion, not inclusion.** A skill/group only makes the cut if
it's named in the posting text, or you can name the exact responsibility line
that implies it. "The general CV includes this group" and "it rounds out the
skills section" are not reasons — a tight 2-group CV that matches the posting
beats a 4-group CV padded from the general-purpose baseline. When in doubt,
leave it out and let the user ask for it back.

Before moving to F2, tell the user in plain language (no phase labels, see
Voice) what profile this posting is actually looking for and which
must-haves/nice-to-haves you found — this is what gets checked against the
final selection in F3.

### F2 — Gap vs catalog → proposals · [GATE G1]

1. Map every key skill (explicit and implicit) to skills, projects, and
   experiences that already exist in the catalog.
2. For each gap, **draft the exact bilingual (`Localized`) content** for the
   catalog file it belongs to:
   - `skills.yaml`: `id`, `name`, `detail`, `tags`, and suggested group (new
     group id + bilingue label only if no existing group fits).
   - `projects.yaml` / `experiences.yaml`: the full entry with bullets.
   - `summaries.yaml`: a new `contoso_arch_ai`-style summary only if no
     existing summary matches the convocatoria angle.
3. **Anti-invention rule:** never fabricate experience. If a gap demands real
   experience the catalog does not back and the user has not declared, do not
   write it — flag it, explain why it would be a gap, and ask the user how to
   proceed (include, drop, or provide real details). **Confirm before you
   draft:** for a gap that's an explicit posting requirement but has no
   catalog backing, ask a plain yes/no about real experience *before* writing
   the catalog entry — don't draft a skill/project hoping the user backs it
   after seeing it; that costs a full round-trip when they don't.
4. **Present the proposals to the user** (draft text, ready to edit) and wait.
   Only after the user edits/approves — **G1** — write to the catalog
   (`skills.yaml`, `projects.yaml`, etc.). The user confirming they *have* a
   skill or experience (e.g. answering a clarifying question) is not the same
   as approving the *exact drafted wording, tags, or group* — still show the
   draft before writing it.
5. External references (web, other resumes) are **writing support only**: use
   them to draft the summary and organize skills. Never source personal data
   from them.

Rationale comment in each new catalog entry, following repo style (see
`contoso_arch_ai`).

### F3 — Assemble the application

Write `applications/YEAR-MM-company-role.yaml`:

```yaml
metadata:
  company: <Company>
  role: "<Role>"
  url: <url>            # only if the posting has one
  date_submitted: "YYYY-MM-DD"
  language: es|en
  notes: >-
    <required: for every included skill/group not literally named in the
    posting, the exact responsibility line that implies it; why this
    summary fits this posting specifically (not just "closest tag")>

content:
  summary: <id>                    # from catalog/summaries.yaml
  contact: [phone, website, linkedin, email]   # or omit for the default order
  sections: [skills, experience, projects, education, certifications]
  skills:
    - group: <group>
      items: [<skill ids, in priority order>]
  experience:
    - <bullet ids in render order>
  projects:
    - <bullet ids in render order>
  certifications:
    - <bullet ids in render order>
  education:
    - <education id>

tracking:
  - { date: "YYYY-MM-DD", stage: applied }   # same date as date_submitted
```

If the CV is prepared but **not sent yet**, omit both `date_submitted` and
`tracking`; the file then stays out of tracking until it is sent. Later events
are recorded with the `cv-tracker` skill (MCP `track`), never by hand.

Selection rules:

- **Skills first:** convocatoria skills (must-haves before nice-to-haves, and
  they appear first in each row and rows are ordered most-important first).
- **Projects/experience next:** pick the bullets that best demonstrate the
  explicit and implicit skills, in render order.
- **Summary:** reuse an existing one only if you can point to specific phrases
  in its text that match *this* posting's profile — not just a shared tag.
  Reusing a summary written for a different company/angle is a red flag: reread
  it sentence by sentence against what this posting actually emphasizes (tech
  stack, product type, what they build). If it doesn't specifically fit, draft
  a new one under F2 — a slightly slower G1 round-trip beats a visibly generic
  opening paragraph. When it must also carry cultural/soft signals from the
  posting (ownership, autonomy, apprenticeship, pace), state them as
  demonstrated traits backed by real catalog evidence ("I take ownership, I
  ship products on my own") — never as first-person wishes or pleading
  ("quiero", "espero poder", "I want to truly...", "I hope to contribute").
  Confidence over supplication, same bar as the technical claims.
- **Summary is the profile, not a digest of the page.** Write it in the
  voice of the baselines (`ux_architecture`, `fullstack_cloud`): who the
  candidate is, their broad foundation, what motivates them, and how they
  work — tuned to the posting's angle. Read the draft against the whole
  rendered CV, not against the posting alone, and cut:
  - **Stack lists that repeat the skills section** right below it. Naming a
    broad foundation ("backend and frontend", "Java and Python") is fine; a
    tool-by-tool inventory is the skills section's job.
  - **Anchoring on one project or bullet** that already appears further down
    ("I have built a fintech product..."). The profile is bigger than any
    single project; evidence lives in the bullets.
  - **Stitched claims** that merge facts from different projects into one
    sentence and imply something no single project backs (e.g. "Python
    services deployed on Kubernetes" when only the Java project ran on EKS).
  The one exception: a posting hard requirement that has no other home on
  the page (e.g. daily Claude/LLM use) belongs in the summary, stated
  plainly.
- **Skills-row consistency:** before presenting a row, check it has one naming
  axis (either "one chip per broad language/family with tools as `detail`", or
  "one chip per specific tool") and no technology named twice across two chips
  in the same row. If a new addition would clash in granularity with what's
  already in the catalog, propose consolidating into one chip (`name` +
  `detail`, e.g. `sql` detail `Oracle, PL/SQL`) instead of stacking separate
  ones.
- **Primary inspiration is the repo's own related applications** (same sector,
  stack, or seniority — e.g. for a Java/cloud backend call, look at how
  Contoso/capgeni/Fabrikam selected). `general-es`/`general-en` are also
  valid references, not out-of-scope: they're the max-coverage baseline of the
  profile and a fine source for phrasing or a default selection when the
  convocatoria has no closer match. External material is secondary to all of
  these.
- Use real bullet ids; unknown ids fail the build. Verify ids exist when you
  write them.

### F4 — Render and fit (automatic loop)

1. `render` with the application name.
2. If `written` is true → proceed to F5.
3. If it overflows, read `assessment.cuts` (cheapest first, `enough` marks the
   cuts that fix it alone; `smallestCut` is the cheapest sufficient one) and
   apply the **single cheapest fix** (summary swap
   or dropping one bullet) by editing the application YAML, re-render.
4. Repeat until it fits or **max 3 attempts**. If it still overflows, do NOT
   keep cutting silently: carry the validator report into G2 and let the user
   decide (manual cut or drop content).
5. If a passing render reports more than ~5 spare lines, mention it as an
   opening to add a bullet/project/certification — don't wait for the user to
   notice the white space.

### F5 — Final confirmation, single gate · [GATE G2]

Present to the user, as one review:

1. Catalog changes applied (if any, already G1-approved).
2. The final application YAML.
3. The rendered PDF path in `out/`.

Ask for approval. On approval the job is done — the user exports from `out/`
manually. On changes → return to the affected phase, apply, regenerate
(including re-running F4; PDF must still fit).

## Gates — non-negotiable

| Gate | When | What must happen |
|---|---|---|
| **G1** | Before any write to `catalog/` | User edits/approves the drafted bilingual content. |
| **G2** | End of the run | User reviews catalog diff + application + PDF and approves. |

**G1 rationalizations — none of these substitute for showing the draft:**

| Excuse | Reality |
|---|---|
| "User already confirmed they have this skill/experience" | Confirms the fact, not the exact wording/tags/group you're about to write. |
| "It's one small skill id, not worth a checkpoint" | The catalog is the source of truth for every future CV; unshown content is unapproved content. |
| "User seems in a hurry, I'll show it after I write it" | G1 is *before* the write, not a heads-up after. Draft first, write second. |

## Red flags — stop and fix

- You wrote something to the catalog without G1 → **revert it**, then propose.
- The final PDF does not pass `validate` → not done.
- A bullet id you selected does not exist → re-check F3.
- You are about to edit `theme.yaml` or the schema to "fit more" → **forbidden**;
  the cut must be content.
- You are unsure whether the user really has a skill → ask, don't assume.

## Quick reference

| Need | Command / source |
|---|---|
| See what exists | `list_applications`, `get_catalog` |
| Check if a CV fits one page | `validate` (`names` optional; none = all) |
| Build the PDF | `render` (`force` only to bypass one-page rule — never) |
| Fix an overflow | Apply validator's single cheapest fix, re-render (max 3 tries, see F4) |
| New posting, no close match in `applications/` | Base selection on `general-es`/`general-en` |
| Editing an existing application | Load it, diff against F1 analysis, touch only the delta |

## Common mistakes

| Outcome | Fix |
|---|---|
| CV overflows after your "guesstimate" cut | Use the validator's measured heights, not intuition about line counts. |
| Invented bullet or skill | Forbidden by anti-invention rule; ask the user instead. |
| Missing-language fallback (mixed es/en content) | The render warns on silent language fallback — surface it in G2, not after. |
| Picky selection from external examples | Related applications in `applications/` are the primary reference; keep external refs for wording only. |
| CV has every skill group "for coverage" (looks like the general CV, not this posting) | Default is exclusion — cut anything without a text citation or named implication (see F1). |
| Summary carried over from another application untouched | Tag match ≠ fit; reread it against this posting's actual emphasis before reusing (see F3 Summary rule). |
| New summary reads as a recap of the skills row and the top project | Summary is the profile (baseline voice), not a digest — no stack inventory, no single-project anchor, no stitched claims (see F3). |
| You explained a choice by citing "F2" / "Gate G1" / this skill | Talk like a recruiter, not a process (see Voice) — restate the reason in plain terms. |
| Updating an app, you called the inherited selections "already fine" | The exclusion check applies to old content too (see Creating vs updating) — audit it, don't grandfather it. |
| You asked "want A or B?" on a call both options defend | That's a judgment call, not a gate — decide and say why (see Judgment calls). |