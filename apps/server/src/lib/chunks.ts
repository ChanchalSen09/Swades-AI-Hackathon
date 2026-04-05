import { Buffer } from "node:buffer";

import { ValidationError } from "./errors";

const DATA_URL_PREFIX_PATTERN = /^data:.*;base64,/u;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

export const buildStorageKey = (sessionId: string, index: number, chunkId: string): string => {
  return `${sessionId}/${index.toString().padStart(8, "0")}-${chunkId}.bin`;
};

export const decodeChunkPayload = (input: string): Buffer => {
  const normalizedInput = input.replace(DATA_URL_PREFIX_PATTERN, "").trim();

  if (normalizedInput.length === 0) {
    throw new ValidationError("Chunk data must not be empty");
  }

  if (!BASE64_PATTERN.test(normalizedInput)) {
    throw new ValidationError("Chunk data must be valid base64");
  }

  const buffer = Buffer.from(normalizedInput, "base64");

  if (buffer.byteLength === 0) {
    throw new ValidationError("Decoded chunk data must not be empty");
  }

  return buffer;
};

export const createChunkChecksum = async (buffer: Buffer): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Buffer.from(digest).toString("hex");
};
