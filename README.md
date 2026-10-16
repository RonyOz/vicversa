# vicversa

One catalog of professional data. Many one-page CVs. No copy-paste.

Your CV content lives in `catalog/` as YAML. An "application" picks which pieces
go into one particular CV. The renderer turns that selection into a PDF that is
guaranteed to fit on a single page — or refuses to build and tells you exactly
what to cut.

```
catalog/*.yaml  ──┐
                  ├──> resolve ──> React ──> HTML ──> Chromium ──> CV.pdf
applications/*.yaml ┘                                     │
                                                          └──> measure ──> fits? / what to cut
```

## Usage

```bash
pnpm install
pnpm fonts                          # vendor Montserrat + JetBrains Mono (once)

pnpm cv list                        # what's in the catalog
pnpm cv render baseline-es          # build one PDF into out/
pnpm cv render baseline-es --html   # also dump the HTML, for DevTools
pnpm cv validate                    # check every application fits on a page
pnpm cv status                      # pace, response funnel, every application by state
pnpm cv status <application>        # one application's timeline
pnpm cv track <application> interview --note "RH"   # record what happened (date defaults to today)
pnpm test                           # unit tests
```

`render` writes nothing when the CV overflows. Pass `--force` to override.

## Tracking panel

```bash
pnpm ui                             # http://localhost:4747 (localhost only)
```

A local React app (Vite in middleware mode, one process) over a JSON API that
wraps `src/ops.ts`, like the CLI and the MCP server do:

- **Resumen** — KPIs, the response funnel (each segment links to its
  applications), pace as a daily calendar, recent activity.
- **Convocatorias** — tabs by state with counts, search (`/`), stage and
  language filters, sorting; all of it lives in the URL.
- **Detail** — vertical timeline, undo/reopen, a form with stage buttons,
  note suggestions and a date picker that marks the application's events,
  the posting's notes and link, and the CV page exactly as printed.

- **CVs** — every CV as a real-page thumbnail with its one-page fit (cached
  until a YAML changes) and tracking state; each opens with its fit meter and
  the catalog pieces it uses, in order.
- **Catálogo** — summaries, experience, projects, certifications, education
  and skills, each with how many CVs use it (bullets too), an "unused"
  filter and an ES/EN toggle; a piece shows both languages and every CV that
  uses it.

Everything links: application → its CV → a piece → every CV with that piece →
their applications. The YAML files stay the source of truth; the only writes
are recording and undoing events. Design:
`docs/superpowers/specs/2026-10-15-panel-v2-design.md`.

## MCP server (how agents use it)

The CLI is the secondary interface. AI agents work through an MCP server that
returns data instead of text to parse:

```bash
pnpm mcp                            # stdio server; clients start it for you
```

`.mcp.json` (Claude Code) and `opencode.json` (Opencode) register it for this
repo. Tools:

| Tool | Does |
|---|---|
| `list_applications` | Applications with company, role, tracking state; `query` filters |
| `get_application` | One application parsed, with timeline, state and file path |
| `get_catalog` | Catalog by `parts`, optionally reduced to one `language` |
| `get_status` | Weekly pace, response funnel, applications by state |
| `validate` | One-page fit per CV, with every cut priced cheapest first |
| `render` | PDF into `out/`; writes nothing if it overflows unless `force` |
| `track` | Record an event (`applied` … `rejected`, `withdrawn`) |
| `undo_last_event` | Remove the last recorded event (reopen an application closed by mistake) |

Both interfaces are thin layers over `src/ops.ts`, so they never disagree.

## Adding an application

Copy any file in `applications/`, then edit the selections. Selections are
**bullet ids in render order** — the parent job or project is derived, and
entries appear in the order their first bullet does. One list, not two.

```yaml
metadata:
  company: Acme Corp
  role: Senior Backend Engineer
  url: https://jobs.acme.com/123
  language: en

content:
  summary: backend_platform      # from catalog/summaries.yaml
  sections: [skills, experience, projects, education, certifications]
  experience:
    - northwind.payments
    - northwind.observability
```

Then `pnpm cv render 2026-08-acme`.

## The one-page rule

Every template declares its page and type scale in points, so the budget is
exact: with `harvard` (US Letter, 10pt on a 12.2pt line) a page holds about
**58 lines**. That's the currency.

When a CV goes over, the validator prices every way out and sorts them cheapest
first — including summary swaps, which cost no content at all:

```
✗ baseline-en

  Over by 16.0pt — about 1.2 body lines.

  Smallest single cut that fixes it: data_ml (summary, swap, no content lost, frees 27.0pt)

  Options, cheapest first:
      summary fullstack_product              13.5pt  swap, no content lost
      bullet ledger.sync                     13.5pt  1 line
    ✓ summary data_ml                        27.0pt  swap, no content lost
    ✓ bullet andina_ta.students              27.0pt  2 lines
```

Heights are measured in the same browser that prints the PDF. Character counts
and font tables both lie about where a justified line breaks, and a wrong line
break is a wrong page height.

## Your data lives outside the tool

The repository is the tool. Your catalog, applications, templates and rendered
PDFs live in a folder of your own — usually a private git repo — pointed to by
`VICVERSA_HOME`:

```
my-cv-data/
  vicversa.yaml        # template: harvard
  catalog/*.yaml       # the single source of truth
  applications/*.yaml  # one file per CV; git history is the audit trail
  templates/<id>/      # optional: your own template
  out/                 # rendered PDFs
```

Put `VICVERSA_HOME=/path/to/my-cv-data` in a `.env` at the repo root (ignored by
git); every script loads it. Without it, the bundled demo in `examples/demo/`
(a fictional profile, also the fixture for every test) is used, so a fresh
clone works out of the box.

## Templates

Pick one in `vicversa.yaml` and stay with it:

| Template | Look |
|---|---|
| `harvard` (default) | Harvard career-office classic: one column, Tinos (Times metrics), small-caps headings over a rule, US Letter |
| `classic-ats` | Plain one-column layout any applicant tracking system parses: Arimo (Arial metrics), standard headings, A4 |

Whatever the template, vicversa measures the page in Chromium: it either fits
on one page or the build stops and tells you what to cut.

**Your own template** is a folder `templates/<id>/` in your data with a
`theme.yaml` (every measurement, in points) and a `template.tsx` that
default-exports a `TemplateDefinition` from `"vicversa/template"`. Start by
copying `src/templates/harvard/`. The one rule: mark what can be measured with
`measure.content`, `measure.section(id)`, `measure.item(id)`,
`measure.bullet(id)` and render `<SummaryProbes>` — that is what gives your
design the one-page guarantee. Fonts must be vendored in `assets/fonts/`
(`scripts/fetch-fonts.ts`).

## Layout of the repo

| Path | What's in it |
|---|---|
| `src/templates/` | The template contract (`kit.tsx`), registry, bundled templates |
| `src/render.ts` | Chromium: measures the layout and prints the PDF |
| `src/validate.ts` | Decides whether it fits, and what to cut if not |
| `src/ops.ts` | Every operation as data — shared by the CLI, MCP server and panel |
| `src/ui/` | The panel: JSON API + React app |
| `examples/demo/` | Fictional data folder: the demo and the test fixture |
| `assets/fonts/` | Vendored woff2. Committed on purpose. |
