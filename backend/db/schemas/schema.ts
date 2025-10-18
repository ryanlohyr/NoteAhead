import {
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  vector,
  foreignKey,
  index,
  json,
  } from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");

const users = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name"),
  userId: uuid("userId")
    .references(() => users.id)
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}).enableRLS();

// Files table
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  s3Url: text("s3_url").notNull(),
  mimeType: text("mime_type").notNull(),
  embeddingsStatus: text("embeddings_status").$type<"in_progress" | "success" | "failed">().default("in_progress"),
  summary: text("summary"),
  linesJsonPages: json("lines_json_pages"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}).enableRLS();

// Notes table
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  folderId: uuid("folder_id"), // For future folder organization
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}).enableRLS();

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    fileId: uuid("file_id")
      .references(() => files.id, { onDelete: "cascade" })
      .notNull(),
    embedding: vector("embedding", {
      dimensions: 1536,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    pageNumbers: integer("page_numbers").array().notNull(),
    originalContent: text("original_content"),
    context: text("context"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.fileId],
      foreignColumns: [files.id],
      name: "chunks_file_id_files_id_fk",
    }).onDelete("cascade"),
    index("embeddingIndex").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ]
).enableRLS();

// Export all tables for migrations
export const schema = {
  accounts,
  files,
  notes,
  chunks,
};

