import { toast } from "sonner";
import { uploadFile } from "@/query/files";
import { v4 as uuidv4 } from "uuid";
import { validateFileType } from "@/utils/fileValidation";

export type AttachedFile = {
  id: string;
  file: File;
  name: string;
  fileName: string;
  fileType: string;
  description: string;
  uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
  s3Url?: string;
};

/**
 * Get accepted file types string for file input
 */
export const getAcceptedFileTypes = (): string => {
  const mimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ];
  const extensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.tif'];
  return [...mimeTypes, ...extensions].join(',');
};

/**
 * Process file name by removing extension and replacing spaces with underscores
 */
const processFileName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  const value = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  // Replace all whitespace characters (spaces, tabs, non-breaking spaces, etc.) with underscores
  const result = value.replace(/\s+/g, "_");
  return result;
};

export const useFileUpload = () => {
  const uploadFiles = async (
    files: File[],
    setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>
  ) => {
    if (files.length === 0) return;

    // Filter files by allowed types
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach(file => {
      const validation = validateFileType(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    // Show error for invalid files
    if (invalidFiles.length > 0) {
      const fileNames = invalidFiles.join(', ');
      const message = invalidFiles.length === 1 
        ? `File "${fileNames}" is not supported. Only PDF, DOCX, PPTX, and image files are allowed.`
        : `Files "${fileNames}" are not supported. Only PDF, DOCX, PPTX, and image files are allowed.`;
      
      toast.error("Invalid file type", { 
        description: message 
      });
    }

    // If no valid files, return early
    if (validFiles.length === 0) return;

    // Add valid files to attached files first for immediate UI feedback
    const newFiles: AttachedFile[] = validFiles.map((file) => {
      const processedFileName = processFileName(file.name);
      return {
        id: uuidv4(),
        file,
        name: processedFileName,
        fileName: file.name,
        fileType: file.type,
        description: `File attachment: ${processedFileName}`,
        uploadStatus: "pending",
      };
    });

    setAttachedFiles((prev: AttachedFile[]) => [...prev, ...newFiles]);

    // Start uploading valid files immediately
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const processedFileName = processFileName(file.name);

        setAttachedFiles((prev: AttachedFile[]) =>
          prev.map((f: AttachedFile) =>
            f.name === processedFileName ? { ...f, uploadStatus: "uploading" as const } : f
          )
        );

        let s3Url = "";

        try {
          await uploadFile(
            file,
            processedFileName,
            async (uploadedFile) => {
              // Store the storage URL
              s3Url = uploadedFile.storageUrl;
            },
            () => {
              // Update status to failed
              setAttachedFiles((prev: AttachedFile[]) =>
                prev.map((f: AttachedFile) =>
                  f.name === processedFileName ? { ...f, uploadStatus: "failed" as const } : f
                )
              );
              toast.error("Error uploading file", { description: "Please try again." });
            },
            {
              showToast: (options) => {
                if (options.variant === "destructive") {
                  toast.error(options.title, { description: options.description });
                } else {
                  toast(options.title, { description: options.description });
                }
                return {
                  id: "upload",
                  update: () => {},
                };
              },
            },
            true
          );

          // Update status to uploaded
          setAttachedFiles((prev: AttachedFile[]) =>
            prev.map((f: AttachedFile) =>
              f.name === processedFileName
                ? {
                    ...f,
                    s3Url,
                    uploadStatus: "uploaded" as const,
                  }
                : f
            )
          );
          toast.success("File uploaded successfully");
        } catch {
          // Update status to failed
          setAttachedFiles((prev: AttachedFile[]) =>
            prev.map((f: AttachedFile) =>
              f.name === processedFileName ? { ...f, uploadStatus: "failed" as const } : f
            )
          );
        }

        return s3Url;
      });

      await Promise.all(uploadPromises);
    } catch {
      // File upload batch failed
    }
  };

  return {
    uploadFiles,
    processFileName,
  };
};

