import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { files, notes, chunks } from "./schemas/schema";

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

// Note types
export type NoteRecord = typeof notes.$inferSelect;
export type NewNoteRecord = typeof notes.$inferInsert;

// Chunk types
export type ChunkRecord = typeof chunks.$inferSelect;
export type NewChunkRecord = typeof chunks.$inferInsert;

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
  updateFileStatus: async (
    fileId: string,
    status: "in_progress" | "success" | "failed",
    summary?: string,
    linesJsonPages?: any[]
  ): Promise<FileRecord> => {
    const updateData: any = {
      embeddingsStatus: status,
      updatedAt: new Date(),
    };
    
    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (linesJsonPages !== undefined) {
      updateData.linesJsonPages = linesJsonPages;
    }

    const result = await db
      .update(files)
      .set(updateData)
      .where(eq(files.id, fileId))
      .returning();
    return result[0];
  },

  getProcessingFiles: async (userId: string): Promise<FileRecord[]> => {
    return db
      .select()
      .from(files)
      .where(
        and(
          eq(files.userId, userId),
          inArray(files.embeddingsStatus, ["in_progress", "failed"])
        )
      );
  },
};

// Chunk database operations
export const chunkDb = {
  createChunks: async (
    chunksData: Array<{
      content: string;
      originalContent: string;
      context: string;
      fileId: string;
      embedding: number[];
      pageNumbers: number[];
      userId: string;
      type: string;
    }>
  ): Promise<ChunkRecord[]> => {
    const values = chunksData.map((chunk) => ({
      content: chunk.content,
      originalContent: chunk.originalContent,
      context: chunk.context,
      fileId: chunk.fileId,
      embedding: chunk.embedding,
      pageNumbers: chunk.pageNumbers,
      userId: chunk.userId,
      type: chunk.type,
    }));
    return db.insert(chunks).values(values).returning();
  },

  deleteChunksByFileId: async (fileId: string): Promise<void> => {
    await db.delete(chunks).where(eq(chunks.fileId, fileId));
  },

  findSimilarChunks: async ({
    userId,
    embedding,
    limit = 10,
    similarityThreshold = 0.3,
    typeFilters,
  }: {
    userId: string;
    embedding: number[];
    limit?: number;
    similarityThreshold?: number;
    typeFilters?: string[];
  }): Promise<Array<ChunkRecord & { similarity: number }>> => {
    const embeddingStr = `[${embedding.join(",")}]`;
    
    // Build the query - use raw SQL with proper parameter binding
    let queryStr = `
      SELECT 
        id,
        content,
        file_id,
        embedding,
        created_at,
        page_numbers,
        original_content,
        context,
        user_id,
        type,
        1 - (embedding <=> $1::vector) as similarity
      FROM chunks
      WHERE user_id = $2
        AND 1 - (embedding <=> $3::vector) > $4
    `;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [embeddingStr, userId, embeddingStr, similarityThreshold];
    
    if (typeFilters && typeFilters.length > 0) {
      queryStr += ` AND type = ANY($5)`;
      params.push(typeFilters);
    }
    
    queryStr += `
      ORDER BY embedding <=> $${typeFilters && typeFilters.length > 0 ? 6 : 5}::vector
      LIMIT $${typeFilters && typeFilters.length > 0 ? 7 : 6}
    `;
    
    params.push(embeddingStr);
    params.push(limit);

    const result = await client.unsafe(queryStr, params);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((row: any) => ({
      id: row.id as string,
      content: row.content as string,
      fileId: row.file_id as string,
      embedding: [],
      createdAt: row.created_at as Date,
      pageNumbers: row.page_numbers as number[],
      originalContent: row.original_content as string | null,
      context: row.context as string | null,
      userId: row.user_id as string | null,
      type: row.type as string,
      similarity: parseFloat(row.similarity as string),
    }));
  },
};

// Note database operations
export const noteDb = {
  getAllNotes: async (userId: string): Promise<NoteRecord[]> => {
    return db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt));
  },

  getNote: async (noteId: string, userId: string): Promise<NoteRecord | null> => {
    const result = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .limit(1);
    return result[0] || null;
  },

  createNote: async (data: {
    title: string;
    content: unknown;
    userId: string;
    folderId?: string;
  }): Promise<NoteRecord> => {
    const result = await db
      .insert(notes)
      .values({
        title: data.title,
        content: data.content,
        userId: data.userId,
        folderId: data.folderId,
      })
      .returning();
    return result[0];
  },

  updateNote: async (
    noteId: string,
    userId: string,
    data: {
      title?: string;
      content?: unknown;
      folderId?: string;
    }
  ): Promise<NoteRecord | null> => {
    const result = await db
      .update(notes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();
    return result[0] || null;
  },

  deleteNote: async (noteId: string, userId: string): Promise<boolean> => {
    const result = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning();
    return result.length > 0;
  },
};

