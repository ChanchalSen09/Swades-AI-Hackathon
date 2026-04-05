import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const chunkStatusEnum = pgEnum("chunk_status", [
  "pending",
  "uploaded",
  "failed",
  "needs_reupload",
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chunkId: text("chunk_id").notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    index: integer("chunk_index").notNull(),
    status: chunkStatusEnum("status").notNull().default("pending"),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum"),
    sizeBytes: integer("size_bytes").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  },
  (table) => ({
    chunkIdUnique: uniqueIndex("chunks_chunk_id_key").on(table.chunkId),
    sessionIndexUnique: uniqueIndex("chunks_session_id_chunk_index_key").on(
      table.sessionId,
      table.index,
    ),
    sessionIdIdx: index("chunks_session_id_idx").on(table.sessionId),
    statusIdx: index("chunks_status_idx").on(table.status),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
