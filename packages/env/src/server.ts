import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL_REJECT_UNAUTHORIZED: z
      .string()
      .transform((value) => value === "true")
      .default("true"),
    DATABASE_SSL_CA: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_TRANSCRIPTION_MODEL: z.string().min(1).default("gpt-4o-mini-transcribe"),
    CORS_ORIGIN: z.string().min(1),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1).default("us-east-1"),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),
    S3_FORCE_PATH_STYLE: z
      .string()
      .transform((value) => value === "true")
      .default("true"),
    CHUNK_UPLOAD_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
    CHUNK_RECONCILE_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(200),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
