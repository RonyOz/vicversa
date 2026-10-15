---
name: cv-tracker
description: Use when the user reports news about a job application or asks how their applications are going, in the vicversa repo. Triggers: "me rechazaron de X", "decidimos continuar con otros candidatos", "tuve entrevista / prueba con Y", "me llegó una prueba técnica", "me ofrecieron", "acepté la oferta", "me retiré de", "¿cómo van mis convocatorias?", "¿cómo voy aplicando?", "application status", "I got rejected", "I had an interview".
---

# cv-tracker

Records application events and reports status through the `cv` CLI.
**Never edit `tracking` in a YAML by hand** — always `pnpm cv track`, which
validates and keeps the file's formatting byte for byte.

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

1. Identify the application. `ls applications/` and match company/role.
   If more than one file matches (several Initech, Dunder Mifflin, Fabrikam…), ask which
   one, listing the candidates with their role. Never guess.
2. Map the message to a stage (table above) and to the date it **happened**
   (ask if "last Tuesday"-style dates are ambiguous; default is today).
3. Keep any short detail as `--note` ("RH", "técnica con líder", "HackerRank").
4. Run:
   ```bash
   pnpm cv track <application> <stage> [--date YYYY-MM-DD] [--note "..."]
   ```
5. Confirm in one line with what the command printed. If it fails, relay the
   error (future date, already closed, template) and what would fix it.

## Reporting status

Run `pnpm cv status` (or `pnpm cv status <application>` for one timeline) and
summarize from its numbers:

- Lead with pace and the funnel **with denominators**: "31 enviadas: 18 aún en
  espera, 9 sin respuesta, 3 respondieron (2 rechazos directos, 1 avanzó)".
- Never collapse waiting and silence into rejection. Do not say "te han
  rechazado en muchas" when most are waiting or unanswered.
- No comparisons against market averages: there is no reliable data and it
  adds bias. Only the user's own numbers.
