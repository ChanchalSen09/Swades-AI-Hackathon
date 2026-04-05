import type { Context } from "hono";
import { ZodError } from "zod";

import { AppError, ValidationError } from "./errors";
import { logger } from "./logger";

export const respondWithError = (c: Context, error: unknown) => {
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
      error.statusCode,
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
    500,
  );
};
