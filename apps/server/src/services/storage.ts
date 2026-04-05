import { HeadObjectCommand, PutObjectCommand, S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import { env } from "@my-better-t-app/env/server";

import { StorageError } from "../lib/errors";

const bucketName = env.S3_BUCKET_NAME;

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export type UploadChunkInput = {
  body: Uint8Array;
  contentType?: string;
  key: string;
};

const isNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof S3ServiceException)) {
    return false;
  }

  return error.name === "NotFound" || error.$metadata.httpStatusCode === 404;
};

export const storageService = {
  async uploadChunk(input: UploadChunkInput): Promise<void> {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: input.key,
          Body: input.body,
          ContentLength: input.body.byteLength,
          ContentType: input.contentType ?? "application/octet-stream",
        }),
      );
    } catch (error) {
      throw new StorageError(
        error instanceof Error ? `Bucket upload failed: ${error.message}` : "Bucket upload failed",
      );
    }
  },

  async hasChunk(key: string): Promise<boolean> {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw new StorageError(
        error instanceof Error ? `Bucket lookup failed: ${error.message}` : "Bucket lookup failed",
      );
    }
  },
};
