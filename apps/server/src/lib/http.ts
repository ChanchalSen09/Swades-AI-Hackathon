import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

import { AppError, ValidationError } from "./errors";
import { logger } from "./logger";

const toStatusCode = (status: number): ContentfulStatusCode => {
  return Math.max(100, Math.min(599, status)) as ContentfulStatusCode;
};

export const respondWithError = (c: Context, error: unknown): Response => {
  if (error instanceof ZodError) {
    const validationError = new ValidationError(error.issues.map((issue) => issue.message).join(", "));
    return respondWithError(c, validationError);
  }

  if (error instanceof AppError) {
    logger.warn("request_failed", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });

    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      toStatusCode(error.statusCode),
    );
  }

  logger.error("unexpected_request_failure", {
    error: error instanceof Error ? error.message : String(error),
    path: c.req.path,
  });

  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error",
      },
    },
    toStatusCode(500),
  );
};
