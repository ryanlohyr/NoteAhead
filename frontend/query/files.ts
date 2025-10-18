import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchWrapper, makeApiUrl } from "@/lib/api";
import { validateFileType } from "@/utils/fileValidation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tus from "tus-js-client";

export type FileItem = {
  id: string;
  name: string;
  description?: string;
  storageUrl: string;
  fileType: string;
  createdAt: string;
  status?: "pending" | "uploading" | "uploaded" | "failed";
};

/**
 * File API functions
 * Centralized API logic for all file operations
 */
export const fileApi = {
  /**
   * Get all files for a user
   */
  getAllFiles: async (): Promise<{ files: FileItem[]; success: boolean }> => {
    const url = makeApiUrl("/api/files");
    const data = await fetchWrapper<{ files: FileItem[]; success: boolean }>(url, {
      method: "GET",
    });
    return data;
  },

  /**
   * Create a new file record
   */
  createFile: async (
    name: string,
    storageUrl: string,
    fileType: string
  ): Promise<{ file: FileItem; success: boolean }> => {
    const url = makeApiUrl("/api/files");
    const data = await fetchWrapper<{ file: FileItem; success: boolean }>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        storageUrl,
        fileType,
      }),
    });
    return data;
  },

  /**
   * Batch create files
   */
  batchCreateFiles: async (
    files: Array<{
      name: string;
      storageUrl: string;
      fileType: string;
    }>
  ): Promise<{ files: FileItem[]; success: boolean }> => {
    const url = makeApiUrl("/api/files/batch");
    const data = await fetchWrapper<{ files: FileItem[]; success: boolean }>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });
    return data;
  },

  /**
   * Delete a file
   */
  deleteFile: async (id: string): Promise<{ success: boolean }> => {
    const url = makeApiUrl(`/api/files/${id}`);
    const data = await fetchWrapper<{ success: boolean }>(url, {
      method: "DELETE",
    });
    return data;
  },

  /**
   * Download file blob from storage
   */
  downloadFileBlob: async (fileId: string): Promise<Blob> => {
    const url = makeApiUrl(`/api/files/${fileId}/download`);
    const blob = await fetchWrapper<Blob>(url, {
      method: "GET",
      responseType: "blob",
    });
    return blob;
  },
};

/**
 * Hook to get all files
 */
export const useGetAllFiles = () => {
  return useQuery({
    queryKey: ["files"],
    queryFn: () => fileApi.getAllFiles(),
  });
};

/**
 * Hook to create a file
 */
export const useCreateFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      storageUrl,
      fileType,
    }: {
      name: string;
      storageUrl: string;
      fileType: string;
    }) => {
      return fileApi.createFile(name, storageUrl, fileType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

/**
 * Hook to batch create files
 */
export const useBatchCreateFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
    }: {
      files: Array<{
        name: string;
        storageUrl: string;
        fileType: string;
      }>;
    }) => {
      return fileApi.batchCreateFiles(files);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (error) => {
      toast.error("Failed to create files", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

/**
 * Hook to delete a file
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fileApi.deleteFile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
};

/**
 * Export downloadFileBlob for direct use
 */
export const downloadFileBlob = fileApi.downloadFileBlob;

/**
 * Toast update options type
 */
type ToastUpdateOptions = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

/**
 * Stateless file upload function using TUS
 * @param file File to upload
 * @param name File name
 * @param onSuccess Callback function to handle successful upload
 * @param onError Optional callback function to handle upload errors
 * @param toastFunctions Toast functions for showing upload progress
 * @param enableFileValidation Whether to validate file type
 */
export const uploadFile = async (
  file: File,
  name: string,
  onSuccess: (uploadedFile: {
    name: string;
    storageUrl: string;
    fileType: string;
  }) => Promise<void> | void,
  onError?: (error: Error) => void,
  toastFunctions?: {
    showToast: (options: {
      title: string;
      description: string;
      variant?: "default" | "destructive";
    }) => { id: string; update: (options: ToastUpdateOptions) => void };
  },
  enableFileValidation: boolean = true
) => {
  if (!name.trim() || !file) return;

  // Validate file type using utility function
  const fileValidation = enableFileValidation ? validateFileType(file) : { isValid: true };
  if (!fileValidation.isValid) {
    const error = new Error(fileValidation.errorMessage || "File type not allowed");

    // Show error toast if toast functions are provided
    if (toastFunctions) {
      toastFunctions.showToast({
        variant: "destructive",
        title: "Upload Error",
        description: fileValidation.errorMessage || "File type not allowed",
      });
    }

    if (onError) {
      onError(error);
    }
    throw error;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    // get the user id
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const bucketName = "user-files";
    const nameWithoutExtension = name.replace(/\.[^/.]+$/, "");
    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileURL = `${userId}/${sanitizedName}`;

    const uploadMetadata = {
      bucketName,
      fileURL,
    };

    if (!session?.access_token) {
      throw new Error("Authentication failed. Please log in again.");
    }

    // Show initial upload toast if toast functions are provided
    let toastId: string | undefined;
    let updateToast: ((options: ToastUpdateOptions) => void) | undefined;

    if (toastFunctions) {
      const toastResult = toastFunctions.showToast({
        title: "Upload Started",
        description: `Uploading ${nameWithoutExtension}...`,
      });
      toastId = toastResult.id;
      updateToast = toastResult.update;
    }

    return new Promise<void>((resolve, reject) => {
      // Use the Supabase URL from environment
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "x-upsert": "true", // Overwrite existing files if needed
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: uploadMetadata.bucketName,
          objectName: uploadMetadata.fileURL,
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024, // 6MB chunk size as required
        onError: (error: Error) => {
          // Update toast with error
          if (updateToast && toastId) {
            updateToast({
              id: toastId,
              variant: "destructive",
              title: "Upload Failed",
              description: `Failed to upload ${nameWithoutExtension}: ${error.message}`,
            });
          }

          if (onError) {
            onError(error);
          }
          reject(error);
        },
        onProgress: (bytesUploaded: number, bytesTotal: number) => {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          // Update toast with progress
          if (updateToast && toastId) {
            updateToast({
              id: toastId,
              title: "Uploading...",
              description: `${nameWithoutExtension}: ${percentage}%`,
            });
          }
        },
        onSuccess: async () => {
          // Update toast with success
          if (updateToast && toastId) {
            updateToast({
              id: toastId,
              variant: "default",
              title: "Upload Complete",
              description: `${nameWithoutExtension} uploaded successfully!`,
            });
          }

          // Call the provided onSuccess callback
          try {
            await onSuccess({
              name: nameWithoutExtension,
              storageUrl: sanitizedName,
              fileType: file.type,
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });

      // Check for previous uploads to resume
      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          // Found previous uploads so we select the first one
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);

            // Update toast for resumed upload
            if (updateToast && toastId) {
              updateToast({
                id: toastId,
                title: "Resuming Upload",
                description: `Resuming upload of ${name}...`,
              });
            }
          }

          // Start the upload
          upload.start();
        })
        .catch((error: Error) => {
          // Update toast with error
          if (updateToast && toastId) {
            updateToast({
              id: toastId,
              variant: "destructive",
              title: "Upload Error",
              description: `Error finding previous uploads: ${error.message}`,
            });
          }

          if (onError) {
            onError(error);
          }
          reject(error);
        });
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    // Show error toast if toast functions are provided
    if (toastFunctions) {
      toastFunctions.showToast({
        variant: "destructive",
        title: "Upload Error",
        description: `Error: ${error.message}`,
      });
    }

    if (onError) {
      onError(error);
    }
    throw error; // Re-throw to allow handling by the caller
  }
};

