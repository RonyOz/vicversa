import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import {
  DEFAULT_STALE_DAYS, DEFAULT_WEEKS, getApplication, getCvHtml, getDashboard, trackEvent, undoLastEvent,
} from "../ops.js";
import { localToday } from "../tracking.js";

/**
 * The panel: a JSON API over src/ops.ts under /api, and the React app (served
 * by Vite in middleware mode) for everything else. One process, localhost only.
 * The YAML files stay the source of truth; the only writes are track and undo.
 */

const CLIENT_ROOT = resolve(import.meta.dirname, "client");

class BadRequest extends Error {}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new BadRequest("Body must be a JSON object.");
}

const text = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

/** Routes /api/*; returns false when the path is not an API route at all. */
async function api(request: IncomingMessage, response: ServerResponse, today: string): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const path = decodeURIComponent(url.pathname);
  const method = request.method ?? "GET";

  try {
    if (method === "GET" && path === "/api/dashboard") {
      return send(response, 200, await getDashboard({ today, staleDays: DEFAULT_STALE_DAYS, weeks: DEFAULT_WEEKS }));
    }
    const application = /^\/api\/applications\/([^/]+)$/.exec(path);
    if (method === "GET" && application) {
      return send(response, 200, await getApplication(application[1]!, { today }));
    }
    const cv = /^\/api\/cv\/([^/]+)\.html$/.exec(path);
    if (method === "GET" && cv) {
      const { html } = await getCvHtml(cv[1]!);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(html);
      return;
    }
    if (method === "POST" && path === "/api/track") {
      const body = await readJson(request);
      const result = await trackEvent(
        String(body["name"] ?? ""),
        { stage: String(body["stage"] ?? ""), date: text(body["date"]), note: text(body["note"]) },
        today,
      );
      return send(response, 200, result);
    }
    if (method === "POST" && path === "/api/undo") {
      const body = await readJson(request);
      return send(response, 200, await undoLastEvent(String(body["name"] ?? ""), today));
    }
    return send(response, 404, { error: `No API route ${method} ${path}` });
  } catch (error) {
    // ops throws plain Errors with messages meant for the user (bad name, future date, closed…).
    return send(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

export async function createUiServer(options: { today?: () => string; vite?: boolean } = {}): Promise<Server> {
  const today = options.today ?? localToday;
  const vite =
    options.vite === false
      ? null
      : await (async () => {
          const { createServer: createVite } = await import("vite");
          const { default: react } = await import("@vitejs/plugin-react");
          return createVite({
            root: CLIENT_ROOT,
            configFile: false,
            plugins: [react()],
            appType: "spa",
            server: { middlewareMode: true },
            logLevel: "warn",
          });
        })();

  const server = createServer((request, response) => {
    if ((request.url ?? "").startsWith("/api/")) {
      void api(request, response, today());
      return;
    }
    if (vite) {
      vite.middlewares(request, response);
      return;
    }
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found (UI disabled)");
  });
  server.on("close", () => void vite?.close());
  return server;
}
