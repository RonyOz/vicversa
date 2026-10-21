# Architecture

vicversa turns one catalog of professional data into many one-page CVs and
tracks what happened to each one. This document records the decisions that are
not obvious from the code, and why they were made.

## The data model

- **Catalog** (`<data>/catalog/*.yaml`) is the single source of truth: profile,
  summaries, sections, experiences, projects, certifications, education, skills
  and fixed labels. Every translatable value is `Localized`: a bare string
  (identical in every language — proper nouns, tool names) or `{ es, en }`.
- **Application** (`<data>/applications/*.yaml`) is one CV: metadata (company,
  role, language, posting URL, notes), the content selection and, once sent,
  its `tracking` timeline. Git history of this folder is the audit trail of
  what was sent.
- **Bullet-first selection.** `experience`, `projects` and `certifications` are
  lists of *bullet* ids in render order; the owning item is derived, and items
  appear in the order of their first bullet. A bare item id includes its header
  with no bullets. One list, never two kept in sync.
- **Validation** is Zod at load time, with error messages that name the file
  and path. Duplicate ids fail loudly instead of silently winning last.

## The one-page guarantee

- Rendering is `resolve → template (React, renderToStaticMarkup) → HTML →
  Chromium`. Measuring happens in the same browser that prints the PDF:
  character counts and font metric tables both lie about where a justified
  line breaks, and a wrong line break is a wrong page height.
- Fonts are vendored (`assets/fonts/`) and embedded as data URIs, so a page
  makes no external request and cannot silently fall back to a system font.
  The font script never re-downloads a file it already has: a new upstream
  build could shift metrics and every existing CV with them.
- When a CV overflows, the validator prices every way out — dropping a bullet,
  dropping an item, or **swapping the summary** (all summaries are measured
  off-page at the real column width, so a swap costs no content) — and sorts
  them cheapest first. It fails instead of shrinking: auto-compaction would
  make every CV a slightly different density.

## Templates

- A template is a `TemplateDefinition` (`src/templates/kit.tsx`): a React
  `Page`, its CSS and the font families to embed, plus a `theme.yaml` holding
  every measurement in points. The stylesheet reads lengths from CSS custom
  properties generated from the theme.
- **The measurement contract** is attributes, not class names:
  `data-measure="content | section | item | bullet | skill-row | skill-label |
  skill-value | summary-probe"`. Any design that marks these gets the one-page
  guarantee and the cut report.
- The active template is chosen once in `<data>/vicversa.yaml`. Bundled ones
  live in `src/templates/<id>/`; your own in `<data>/templates/<id>/`. A user
  template sits outside the repository, where `react` and `"vicversa/template"`
  cannot be resolved, so it is copied into `.vicversa-cache/` (keyed by its
  content, never stale) and imported from there with the automatic JSX runtime.

## Tool and data are separate

- `VICVERSA_HOME` points at the data folder; every script loads `.env`. Unset,
  the bundled fictional demo (`examples/demo/`) is used, which is also the
  fixture for every test. Personal data never has to live in, or be committed
  to, the tool's repository.

## Tracking

- An application's history is a list of events (`applied`, `assessment`,
  `interview`, `offer`, `hired`, `rejected`, `withdrawn`, plus `interaction`
  and `reopened`); state is never stored, it is derived. Without `tracking`, `metadata.date_submitted` stands
  for one `applied` event; with neither, the file is a template or draft.
- Rules: dates in order, nothing after a terminal stage except `reopened`,
  which is only valid right there: a company that comes back reopens the same
  process and the closing event stays in the history. `interaction` is any
  contact that is not progress (a postponed interview, a follow-up); it keeps
  a process from looking silent but is never counted as a company response.
  Events are inserted in date order (logging late is the common case) and
  future dates are refused.
- **Edits never re-serialize YAML.** `yaml`'s `Document.toString()` refolds
  block scalars and reflows lists in every file, so recording an event splices
  one line in at an offset taken from the parsed node ranges, and undo splices
  one out; the result is re-parsed and compared before anything is written.
  Writes to a file are serialized so two parallel requests cannot drop one.
- The **funnel** puts every application in exactly one bucket — waiting,
  silent, withdrawn before an answer, rejected outright, advanced — so waiting
  and silence are never counted as rejection. Reach counts over the whole
  history; a rejection counts only while it has not been reopened. Percentages always show their
  denominators; there are no market averages to compare against.

## One core, three interfaces

`src/ops.ts` exposes every operation as a function that returns data and never
writes to stdout. The CLI prints it, the MCP server (`src/mcp*.ts`, stdio)
returns it as typed tool results, and the panel serves it as a JSON API.
Over stdio, stdout is the protocol, so the MCP entry point redirects every
console method to stderr before loading anything.

## The panel

- One local process: `/api/*` is JSON over `ops`, everything else is a React
  app served by Vite in middleware mode (hot reload rides on the same server).
  It binds to `127.0.0.1` only, because it can write to your applications.
- React Router for real URLs — list state (tab, search, filters, sort) lives in
  the query string — and TanStack Query for caching, invalidated after every
  write. Charts, the date picker and tooltips are small in-house components.
- Every CV view is the real print layout, scaled as a whole so line breaks stay
  exactly as printed. The one-page fit of every CV is measured once and cached
  until any YAML, the config or the template changes.
- Visual identity: graphite and paper with a single highlighter accent; the
  wordmark sets "CV" in Instrument Serif over a highlighter stroke. Tracking
  colours keep their meaning; rejection is orange, never red.
