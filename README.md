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

Pace, the response funnel and every application's timeline, with a form to
record what happened. Server-rendered over `src/ops.ts`; no client JS, no
database — the YAML files stay the source of truth.

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
  summary: distributed_ai        # from catalog/summaries.yaml
  sections: [skills, experience, projects, education, certifications]
  experience:
    - northwind.ddd
    - northwind.adapter
```

Then `pnpm cv render 2026-08-acme`.

## The one-page rule

A4 leaves **785.9pt** of vertical space. Body text is 10pt on a 13.5pt line, so
the whole budget is about **58 lines**. That's the currency.

When a CV goes over, the validator prices every way out and sorts them cheapest
first — including summary swaps, which cost no content at all:

```
✗ baseline-en-fullstack

  Over by 16.0pt — about 1.2 body lines.

  Smallest single cut that fixes it: andina_monitor.students (bullet, 2 lines, frees 27.0pt)

  Options, cheapest first:
      summary cloud_architect                13.5pt  swap, no content lost
    ✓ bullet andina_monitor.students          27.0pt  2 lines
    ✓ summary ux_architecture                27.0pt  swap, no content lost
    ✓ bullet northwind.adapter                40.5pt  3 lines
```

Heights are measured in the same browser that prints the PDF. Character counts
and font tables both lie about where a justified line breaks, and a wrong line
break is a wrong page height.

## Layout

`theme.yaml` holds every measurement — page size, margins, type scale, the
spacing between each kind of block. The stylesheet contains none: it reads CSS
custom properties generated from that file. Tuning the design means editing
YAML, which is what will let an editing UI change the layout later without
anyone hand-writing CSS.

Every value in it was measured off `data/CV - ALEX RIVERA.pdf`, not guessed.
Canva positions each text block as an independent frame, so the original drifts
1–6pt between blocks meant to align; `theme.yaml` records the normalized intent
and notes the observed range beside it.

Fonts are vendored into `assets/fonts/` and embedded as data URIs. The rendered
page makes no external requests, so it cannot silently fall back to a system
font and reflow every line.

## Layout of the repo

| Path | What's in it |
|---|---|
| `catalog/` | Your data. The single source of truth. |
| `applications/` | One file per CV sent. Git history is the audit trail. |
| `theme.yaml` | Every measurement, as data. |
| `src/template/` | The React template and print stylesheet. |
| `src/render.ts` | Chromium: measures the layout and prints the PDF. |
| `src/validate.ts` | Decides whether it fits, and what to cut if not. |
| `assets/fonts/` | Vendored woff2. Committed on purpose. |
| `data/` | The original Canva export, kept as the design reference. |

## Still to write

- **`andina_fullstack` has no description.** In the Canva export it borrowed
  `andina_software_dev`'s and appended "in backend and frontend", which is how two
  separate certifications came to look like one. Applications select it bare, so
  it renders as a header until a real description exists.
- **`contact_tracing_devops`** has no link. The Canva export pointed it at the
  `ice-voting-system` repo, but the text describes a different project.
- Bullets marked `TRANSLATED:` were written for this catalog and have never been
  proofread by a human.

Northwind's end date (`2026-09`) is an estimate.
