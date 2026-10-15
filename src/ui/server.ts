import { createServer, type IncomingMessage, type Server } from "node:http";
import { fontFaceCss } from "../fonts.js";
import { DEFAULT_STALE_DAYS, DEFAULT_WEEKS, getDashboard, trackEvent } from "../ops.js";
import { localToday } from "../tracking.js";
import { renderPage } from "./page.js";

/**
 * The tracking panel: server-rendered pages over src/ops.ts, plain form posts,
 * no client JavaScript and no database. The YAML files stay the source of truth.
 */

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export function createUiServer(options: { today?: () => string } = {}): Server {
  const today = options.today ?? localToday;
  let fonts: Promise<string> | undefined;

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/") {
        const ok = url.searchParams.get("ok");
        const error = url.searchParams.get("error");
        const flash = ok ? { kind: "ok" as const, text: ok } : error ? { kind: "error" as const, text: error } : undefined;
        const data = await getDashboard({ today: today(), staleDays: DEFAULT_STALE_DAYS, weeks: DEFAULT_WEEKS });
        fonts ??= fontFaceCss();
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(renderPage(data, await fonts, flash));
        return;
      }

      if (request.method === "POST" && url.pathname === "/track") {
        const form = await readForm(request);
        const name = form.get("name") ?? "";
        let location: string;
        try {
          const result = await trackEvent(
            name,
            { stage: form.get("stage") ?? "", date: form.get("date") || undefined, note: form.get("note") ?? undefined },
            today(),
          );
          const text = `${result.name}: ${result.event.stage} el ${result.event.date} registrado`;
          location = `/?ok=${encodeURIComponent(text)}#${encodeURIComponent(result.name)}`;
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          location = `/?error=${encodeURIComponent(text)}#${encodeURIComponent(name)}`;
        }
        response.writeHead(303, { location });
        response.end();
        return;
      }

      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    } catch (error) {
      console.error(error);
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
}
