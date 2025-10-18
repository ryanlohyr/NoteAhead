import { fileDb, FileRecord } from "#db/index.js";
import { createClient } from "@supabase/supabase-js";

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

