import next from "next";
import express from "express";
import { startApiServer } from "./index.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const nextApp = next({ dev, hostname: "localhost", port });
const handle = nextApp.getRequestHandler();

await nextApp.prepare();
const server = express();
let apiApp;

try {
  apiApp = await startApiServer();
} catch (error) {
  if (!dev) throw error;
  console.error("Marketplace API is unavailable. Check PostgreSQL credentials in .env.local.", error.message);
}

server.all("/api/revalidate", (request, response) => handle(request, response));
if (apiApp) server.use(apiApp);
if (!apiApp) {
  server.use("/api", (_request, response) => {
    response.status(503).json({ message: "Marketplace API is unavailable. Configure PostgreSQL credentials." });
  });
  server.use("/uploads", (_request, response) => response.status(503).end());
}
server.all("*", (request, response) => handle(request, response));
server.listen(port, () => {
  console.log(`Open Market running on http://localhost:${port}`);
});