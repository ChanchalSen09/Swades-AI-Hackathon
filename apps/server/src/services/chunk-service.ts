import { chunks, db, sessions } from "@my-better-t-app/db";
import { env } from "@my-better-t-app/env/server";
import { asc, eq, inArray, sql } from "drizzle-orm";

import { buildStorageKey, createChunkChecksum, decodeChunkPayload } from "../lib/chunks";
import { AppError, StorageError } from "../lib/errors";
import { logger } from "../lib/logger";
import { storageService } from "./storage";

export type UploadChunkRequest = {
  chunkId: string;
  data: string;
  index: number;
  sessionId: string;
};

type UploadChunkResult =
  | {
      chunkId: string;
      status: "uploaded";
      storageKey: string;
    }
  | {
      chunkId: string;
      status: "already_uploaded";
      storageKey: string;
    };

type ReconcileResult = {
  checked: number;
  missing: string[];
  scannedStatus: "uploaded";
};

const RETRYABLE_CHUNK_STATUSES = new Set(["failed", "needs_reupload", "pending"] as const);

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const runWithRetry = async <T>(operation: () => Promise<T>, chunkId: string): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= env.CHUNK_UPLOAD_MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      logger.warn("chunk_upload_attempt_failed", {
        attempt,
        chunkId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < env.CHUNK_UPLOAD_MAX_RETRIES) {
        const backoffMs = 100 * 2 ** (attempt - 1);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
};

const ensureSession = async (sessionId: string): Promise<void> => {
  await db.insert(sessions).values({ id: sessionId }).onConflictDoNothing();
};

const selectChunkById = async (tx: DbTransaction, chunkId: string) => {
  const [chunk] = await tx.select().from(chunks).where(eq(chunks.chunkId, chunkId)).limit(1);
  return chunk;
};

const createOrResetChunk = async (
  tx: DbTransaction,
  request: UploadChunkRequest,
  sizeBytes: number,
  checksum: string,
) => {
  const storageKey = buildStorageKey(request.sessionId, request.index, request.chunkId);
  const existingChunk = await selectChunkById(tx, request.chunkId);

  if (!existingChunk) {
    const [createdChunk] = await tx
      .insert(chunks)
      .values({
        chunkId: request.chunkId,
        sessionId: request.sessionId,
        index: request.index,
        status: "pending",
        storageKey,
        checksum,
        sizeBytes,
      })
      .returning();

    if (!createdChunk) {
      throw new AppError("Failed to create chunk record", 500, "CHUNK_CREATE_FAILED");
    }

    return createdChunk;
  }

  if (
    existingChunk.sessionId !== request.sessionId ||
    existingChunk.index !== request.index
  ) {
    throw new AppError("chunkId already belongs to another session or index", 409, "CHUNK_CONFLICT");
  }

  if (existingChunk.checksum && existingChunk.checksum !== checksum) {
    throw new AppError("chunkId was reused with different data", 409, "CHUNK_CONTENT_MISMATCH");
  }

  if (existingChunk.status === "uploaded") {
    return existingChunk;
  }

  if (!RETRYABLE_CHUNK_STATUSES.has(existingChunk.status)) {
    throw new AppError("chunk is in an unsupported state", 409, "CHUNK_STATE_INVALID");
  }

  const [updatedChunk] = await tx
    .update(chunks)
    .set({
      status: "pending",
      lastError: null,
      checksum,
      sizeBytes,
      storageKey,
      updatedAt: sql`now()`,
    })
    .where(eq(chunks.chunkId, request.chunkId))
    .returning();

  if (!updatedChunk) {
    throw new AppError("Failed to update chunk record", 500, "CHUNK_UPDATE_FAILED");
  }

  return updatedChunk;
};

export const chunkService = {
  async uploadChunk(request: UploadChunkRequest): Promise<UploadChunkResult> {
    const body = decodeChunkPayload(request.data);
    const checksum = await createChunkChecksum(body);

    await ensureSession(request.sessionId);

    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${request.chunkId})::bigint)`);

      const chunkRecord = await createOrResetChunk(tx, request, body.byteLength, checksum);

      if (chunkRecord.status === "uploaded") {
        return {
          chunkId: chunkRecord.chunkId,
          status: "already_uploaded",
          storageKey: chunkRecord.storageKey,
        };
      }

      try {
        await runWithRetry(
          async () =>
            storageService.uploadChunk({
              body,
              key: chunkRecord.storageKey,
            }),
          request.chunkId,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Chunk upload failed for an unknown reason";

        await tx
          .update(chunks)
          .set({
            status: "failed",
            lastError: errorMessage,
            retryCount: sql`${chunks.retryCount} + 1`,
            updatedAt: sql`now()`,
          })
          .where(eq(chunks.chunkId, request.chunkId));

        throw error instanceof StorageError ? error : new StorageError(errorMessage);
      }

      await tx
        .update(chunks)
        .set({
          status: "uploaded",
          lastError: null,
          checksum,
          sizeBytes: body.byteLength,
          uploadedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(chunks.chunkId, request.chunkId));

      logger.info("chunk_uploaded", {
        chunkId: request.chunkId,
        sessionId: request.sessionId,
        index: request.index,
        sizeBytes: body.byteLength,
      });

      return {
        chunkId: request.chunkId,
        status: "uploaded",
        storageKey: chunkRecord.storageKey,
      };
    });
  },

  async reconcileUploadedChunks(limit = env.CHUNK_RECONCILE_BATCH_SIZE): Promise<ReconcileResult> {
    const uploadedChunks = await db
      .select({
        chunkId: chunks.chunkId,
        storageKey: chunks.storageKey,
      })
      .from(chunks)
      .where(eq(chunks.status, "uploaded"))
      .orderBy(asc(chunks.createdAt))
      .limit(limit);

    const missingChunkIds: string[] = [];

    for (const chunk of uploadedChunks) {
      const existsInBucket = await storageService.hasChunk(chunk.storageKey);

      if (!existsInBucket) {
        missingChunkIds.push(chunk.chunkId);
      }
    }

    if (missingChunkIds.length > 0) {
      await db
        .update(chunks)
        .set({
          status: "needs_reupload",
          lastError: "Chunk acknowledged in database but missing from bucket",
          updatedAt: sql`now()`,
        })
        .where(inArray(chunks.chunkId, missingChunkIds));
    }

    return {
      checked: uploadedChunks.length,
      missing: missingChunkIds,
      scannedStatus: "uploaded",
    };
  },
};
