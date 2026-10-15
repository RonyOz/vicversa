import { createUiServer } from "./server.js";

const port = Number(process.env["PORT"] ?? 4747);

// Bound to localhost only: the panel can write to your applications.
createUiServer().listen(port, "127.0.0.1", () => {
  console.log(`vicversa panel → http://localhost:${port}`);
});
