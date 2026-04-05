import dotenv from "dotenv";
import { URL } from "node:url";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

const connectionUrl = process.env.DATABASE_URL || "";
const parsedUrl = connectionUrl ? new URL(connectionUrl) : null;
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";
const databaseSslCa = process.env.DATABASE_SSL_CA;

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  schemaFilters: ["public"],
  dbCredentials: {
    host: parsedUrl?.hostname || "",
    port: parsedUrl?.port || "5432",
    user: decodeURIComponent(parsedUrl?.username || ""),
    password: decodeURIComponent(parsedUrl?.password || ""),
    database: parsedUrl?.pathname.replace(/^\//u, "") || "",
    ssl: {
      rejectUnauthorized,
      ...(databaseSslCa ? { ca: databaseSslCa } : {}),
    },
  },
});
