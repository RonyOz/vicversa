---
name: cv-tracker
description: Use when the user reports news about a job application or asks how their applications are going, in the vicversa repo. Triggers: "me rechazaron de X", "decidimos continuar con otros candidatos", "tuve entrevista / prueba con Y", "me llegó una prueba técnica", "me ofrecieron", "acepté la oferta", "me retiré de", "me aplazaron la entrevista", "me volvieron a contactar", "¿cómo van mis convocatorias?", "¿cómo voy aplicando?", "application status", "I got rejected", "I had an interview".
---

# cv-tracker

Records application events and reports status through the **vicversa MCP
server** (tools `list_applications`, `get_application`, `track`,
`get_status`). **Never edit `tracking` in a YAML by hand** — `track`
validates and keeps the file's formatting byte for byte.

If the MCP tools are not available in this client, use the CLI equivalents:
`pnpm cv status [app]` and `pnpm cv track <app> <stage> [--date] [--note]`.

## Stages

| User says (examples) | stage |
|---|---|
| "apliqué", "envié la hoja de vida" | `applied` |
| "me llegó una prueba", "psicotécnica", "prueba técnica", "assessment" | `assessment` |
| "tuve entrevista", "me llamó RH", "entrevista técnica" | `interview` |
| "me ofrecieron", "me llegó la oferta" | `offer` |
| "acepté", "me contrataron" | `hired` |
| "me rechazaron", "continuar con otros candidatos", "no seguimos" | `rejected` |
| "me retiré", "rechacé la oferta", "ya no me interesa" | `withdrawn` |
| "aplacé / me aplazaron", "fecha por confirmar", "les escribí", "me escribió el recruiter" | `interaction` |
| after a closing event: "me volvieron a contactar", "me ofrecieron otra área" (same process, same CV) | `reopened` |

`interaction` is any real contact that is not progress. It is not a stage of
the funnel and not a company response; it only shows the process is alive.
`reopened` is valid only right after `rejected`/`withdrawn`/`hired`. The
closing event stays in the history, so never undo a rejection to reopen. If
a rejected process comes back, record `reopened`, then any new stage.

Only events that already happened are recorded. A scheduled future interview
is not an event yet: say so and offer to record it when it happens.

## Recording an event

1. Identify the application: `list_applications` with `query` = company (or
   role). If more than one matches (several roles at the same company), ask
   which one, listing name + role. Never guess.
2. Map the message to a stage (table above) and to the date it **happened**
   (ask if "last Tuesday"-style dates are ambiguous; default is today).
3. Keep any short detail as `note` ("RH", "técnica con líder", "HackerRank").
4. Call `track` with `name`, `stage`, and `date` / `note` when known.
5. Confirm in one line from the tool's text. If it returns an error, relay it
   (future date, already closed, template) and what would fix it.

## Fixing a mistake

"La cerré por error", "no era rechazo" (a mistake, not a company that came
back: that is `reopened`), wrong date or stage: call
`undo_last_event` with the application name. It removes only the **last**
recorded event (the first `applied` is never removed); tell the user which
event will go before calling. To fix it, undo and then `track` the right
event. Older events than the last one: undo repeatedly, then re-record.
The panel (`pnpm ui`) offers the same as "deshacer".

## Reporting status

Call `get_status` (or `get_application` for one timeline) and summarize from
its numbers:

- Lead with pace and the funnel **with denominators**, in the user's language:
  "30 sent: 9 still waiting, 21 no response, 0 responded".
- Never collapse waiting and silence into rejection. Do not say "te han
  rechazado en muchas" when most are waiting or unanswered.
- No comparisons against market averages: there is no reliable data and it
  adds bias. Only the user's own numbers.
