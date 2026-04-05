import { env } from "@my-better-t-app/env/server";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { chunksRouter } from "./routes/chunks";
import { transcriptionsRouter } from "./routes/transcriptions";

const app = new Hono();
const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (requestOrigin) => {
      if (!requestOrigin) {
        return allowedOrigins[0] ?? "";
      }

      return allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins[0] ?? "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

app.route("/api/chunks", chunksRouter);
app.route("/api/transcriptions", transcriptionsRouter);

if (import.meta.main) {
  serve({
    fetch: app.fetch,
    port: 3000,
  });
}

export default app;
