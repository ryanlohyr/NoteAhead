import { fileDb, FileRecord, chunkDb } from "#db/index.js";
import { createClient } from "@supabase/supabase-js";
import { extractChunksFromPdf, embedChunksUseCase } from "../ai/extract.js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const getAllFilesUseCase = async (userId: string): Promise<FileRecord[]> => {
  return fileDb.getAllFiles(userId);
};

export const getFileUseCase = async (fileId: string, userId: string): Promise<FileRecord | null> => {
  return fileDb.getFile(fileId, userId);
};

export const createFileUseCase = async (
  name: string,
  storageUrl: string,
  fileType: string,
  userId: string
): Promise<FileRecord> => {
  return fileDb.createFile({
    name,
    storageUrl,
    fileType,
    userId,
  });
};

export const batchCreateFilesUseCase = async (
  files: Array<{
    name: string;
    storageUrl: string;
    fileType: string;
  }>,
  userId: string
): Promise<FileRecord[]> => {
  const filesWithUserId = files.map((file) => ({
    ...file,
    userId,
  }));
  return fileDb.batchCreateFiles(filesWithUserId);
};

export const deleteFileUseCase = async (fileId: string, userId: string): Promise<boolean> => {
  return fileDb.deleteFile(fileId, userId);
};

export const downloadFileUseCase = async (
  fileId: string,
  userId: string
): Promise<{ blob: Buffer; fileName: string; mimeType: string }> => {
  // Get file record from database
  const file = await fileDb.getFile(fileId, userId);
  
  if (!file) {
    throw new Error("File not found");
  }

  // Download file from Supabase storage
  const bucketName = "user-files";
  const filePath = `${userId}/${file.s3Url}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(filePath);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || "Unknown error"}`);
  }

  // Convert blob to buffer
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    blob: buffer,
    fileName: file.name,
    mimeType: file.mimeType || "application/octet-stream",
  };
};

/**
 * Get files that are currently processing or failed
 */
export const getProcessingFilesUseCase = async (userId: string): Promise<FileRecord[]> => {
  return fileDb.getProcessingFiles(userId);
};

/**
 * Retry file processing for failed files
 */
export const retryFileProcessingUseCase = async (
  fileId: string,
  userId: string
): Promise<void> => {
  // Get the file
  const file = await fileDb.getFile(fileId, userId);
  
  if (!file) {
    throw new Error("File not found");
  }

  // Check if file is in failed state
  if (file.embeddingsStatus !== "failed") {
    throw new Error("File is not in failed state");
  }

  // Trigger processing
  await processFileForEmbeddings(file, userId);
};

/**
 * Process file for embeddings in the background
 */
export const processFileForEmbeddings = async (
  file: FileRecord,
  userId: string
): Promise<void> => {
  try {
    console.log(`Starting to process file ${file.id} for embeddings`);
    
    // Set file status to in_progress
    await fileDb.updateFileStatus(file.id, "in_progress");

    // Download file from Supabase storage
    const bucketName = "user-files";
    const filePath = `${userId}/${file.s3Url}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (error || !data) {
      throw new Error(`Failed to download file: ${error?.message || "Unknown error"}`);
    }

    // Extract chunks from PDF
    const { chunks, summary, linesJsonPages } = await extractChunksFromPdf(data);
    
    console.log(`Extracted ${chunks.length} chunks from file ${file.id}`);

    // Generate embeddings for chunks
    const chunkContents = chunks.map((chunk) => chunk.content);
    const embeddings = await embedChunksUseCase(chunkContents);

    console.log(`Generated ${embeddings.length} embeddings for file ${file.id}`);

    // Delete existing chunks for this file (if any)
    await chunkDb.deleteChunksByFileId(file.id);

    // Store chunks with embeddings
    const chunksData = chunks.map((chunk, index) => ({
      content: chunk.content,
      originalContent: chunk.originalContent,
      context: chunk.context,
      fileId: file.id,
      embedding: embeddings[index],
      pageNumbers: chunk.pageNumbers,
      userId: userId,
      type: chunk.type,
    }));

    await chunkDb.createChunks(chunksData);

    console.log(`Stored ${chunksData.length} chunks for file ${file.id}`);

    // Update file status to success with summary and linesJsonPages
    await fileDb.updateFileStatus(file.id, "success", summary, linesJsonPages);

    console.log(`Successfully processed file ${file.id} for embeddings`);
  } catch (error) {
    console.error(`Error processing file ${file.id} for embeddings:`, error);
    
    // Update file status to failed
    await fileDb.updateFileStatus(file.id, "failed");
    
    throw error;
  }
};

