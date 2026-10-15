/**
 * vicversa over MCP (stdio). Start with `pnpm mcp`, or register
 * `node_modules/.bin/tsx src/mcp.ts` in a client (.mcp.json, opencode.json).
 *
 * Over stdio, stdout carries the protocol: one stray log line corrupts the
 * session. Every console method is pointed at stderr first, and the server is
 * imported dynamically so nothing it loads can log before that happens.
 */
console.log = console.info = console.warn = console.debug = (...args: unknown[]) => console.error(...args);

const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
const { createServer } = await import("./mcp-server.js");

await createServer().connect(new StdioServerTransport());
console.error("vicversa MCP server ready on stdio");

export {};
