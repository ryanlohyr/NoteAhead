import { fileDb, FileRecord } from "#db/index.js";

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

