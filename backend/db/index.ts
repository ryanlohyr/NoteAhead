import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import { files } from "./schemas/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// https://orm.drizzle.team/docs/connect-supabase
export const client = postgres(connectionString, {
  connect_timeout: 10_000,
});
export const db = drizzle(client);

// File types
export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;

// File database operations
export const fileDb = {
  getAllFiles: async (userId: string): Promise<FileRecord[]> => {
    return db.select().from(files).where(eq(files.userId, userId));
  },

  getFile: async (fileId: string, userId: string): Promise<FileRecord | null> => {
    const result = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .limit(1);
    return result[0] || null;
  },

  createFile: async (data: {
    name: string;
    storageUrl: string;
    fileType: string;
    userId: string;
  }): Promise<FileRecord> => {
    const result = await db
      .insert(files)
      .values({
        name: data.name,
        userId: data.userId,
        s3Url: data.storageUrl,
        mimeType: data.fileType,
      })
      .returning();
    return result[0];
  },

  batchCreateFiles: async (
    filesData: Array<{
      name: string;
      storageUrl: string;
      fileType: string;
      userId: string;
    }>
  ): Promise<FileRecord[]> => {
    const values = filesData.map((file) => ({
      name: file.name,
      userId: file.userId,
      s3Url: file.storageUrl,
      mimeType: file.fileType,
    }));
    return db.insert(files).values(values).returning();
  },

  deleteFile: async (fileId: string, userId: string): Promise<boolean> => {
    const result = await db
      .delete(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)))
      .returning();
    return result.length > 0;
  },
};

