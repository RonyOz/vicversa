---
name: cv-tracker
description: Use when the user reports news about a job application or asks how their applications are going, in the vicversa repo. Triggers: "me rechazaron de X", "decidimos continuar con otros candidatos", "tuve entrevista / prueba con Y", "me llegó una prueba técnica", "me ofrecieron", "acepté la oferta", "me retiré de", "¿cómo van mis convocatorias?", "¿cómo voy aplicando?", "application status", "I got rejected", "I had an interview".
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

Only events that already happened are recorded. A scheduled future interview
is not an event yet: say so and offer to record it when it happens.

## Recording an event

1. Identify the application: `list_applications` with `query` = company (or
   role). If more than one matches (several Initech, Dunder Mifflin, Fabrikam…), ask
   which one, listing name + role. Never guess.
2. Map the message to a stage (table above) and to the date it **happened**
   (ask if "last Tuesday"-style dates are ambiguous; default is today).
3. Keep any short detail as `note` ("RH", "técnica con líder", "HackerRank").
4. Call `track` with `name`, `stage`, and `date` / `note` when known.
5. Confirm in one line from the tool's text. If it returns an error, relay it
   (future date, already closed, template) and what would fix it.

## Fixing a mistake

"La cerré por error", "no era rechazo", wrong date or stage: call
`undo_last_event` with the application name. It removes only the **last**
recorded event (the first `applied` is never removed); tell the user which
event will go before calling. To fix it, undo and then `track` the right
event. Older events than the last one: undo repeatedly, then re-record.
The panel (`pnpm ui`) offers the same as "reabrir" / "deshacer".

## Reporting status

Call `get_status` (or `get_application` for one timeline) and summarize from
its numbers:

- Lead with pace and the funnel **with denominators**: "30 enviadas: 9 aún en
  espera, 21 sin respuesta, 0 respondieron".
- Never collapse waiting and silence into rejection. Do not say "te han
  rechazado en muchas" when most are waiting or unanswered.
- No comparisons against market averages: there is no reliable data and it
  adds bias. Only the user's own numbers.
