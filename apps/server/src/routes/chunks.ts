import { Hono } from "hono";
import { z } from "zod";

import { respondWithError } from "../lib/http";
import { chunkService } from "../services/chunk-service";

const uploadChunkSchema = z.object({
  chunkId: z.string().min(1),
  sessionId: z.string().min(1),
  index: z.number().int().min(0),
  data: z.string().min(1),
});

const reconcileQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export const chunksRouter = new Hono();

chunksRouter.post("/upload", async (c) => {
  try {
    const payload = await c.req.json();
    const request = uploadChunkSchema.parse(payload);
    const result = await chunkService.uploadChunk(request);

    return c.json({
      ok: true,
      result,
    });
  } catch (error) {
    return respondWithError(c, error);
  }
});

chunksRouter.get("/reconcile", async (c) => {
  try {
    const query = reconcileQuerySchema.parse(c.req.query());
    const result = await chunkService.reconcileUploadedChunks(query.limit);

    return c.json({
      ok: true,
      result,
    });
  } catch (error) {
    return respondWithError(c, error);
  }
});
