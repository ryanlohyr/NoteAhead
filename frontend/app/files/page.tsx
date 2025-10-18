"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploadModal } from "@/components/FileUploadModal";
import { FileGrid } from "@/components/FileGrid";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import {
  useGetAllFiles,
  useDeleteFile,
  uploadFile,
  useBatchCreateFiles,
} from "@/query/files";
import pLimit from "p-limit";

export default function FilesPage() {
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useGetAllFiles();
  const deleteFileMutation = useDeleteFile();
  const batchCreateFilesMutation = useBatchCreateFiles();

  // Process single file drop (for add file button)
  const handleSingleFileDrop = useCallback(
    (file: File) => {
      try {
        setSelectedFile(file);
        if (!newFileName.trim()) {
          setNewFileName(file.name);
        }
        setShowNewFileModal(true);
      } catch (error) {
        console.error("Error in handleSingleFileDrop:", error);
      }
    },
    [newFileName]
  );

  // Process multiple files drop (for drag and drop)
  const handleMultipleFilesDrop = useCallback(
    async (files: File[]) => {
      try {
        // If modal is open, just attach the first file to the modal instead of uploading directly
        if (showNewFileModal) {
          if (files.length > 0) {
            handleSingleFileDrop(files[0]);
          }
          return;
        }

        // Check maximum 6 files at a time
        if (files.length > 6) {
          toast.error(
            `Cannot upload more than 6 files at a time. You selected ${files.length} files.`
          );
          return;
        }

        // Show initial toast
        toast.info(`Starting upload of ${files.length} file${files.length > 1 ? "s" : ""}...`);

        // Create a queue with limit of 3 concurrent uploads
        const limit = pLimit(3);
        let successCount = 0;
        let errorCount = 0;
        const errorMessages: string[] = [];

        // Upload all files to storage first (in batches of 3)
        const uploadedFiles: Array<{
          name: string;
          storageUrl: string;
          fileType: string;
        }> = [];

        const uploadPromises = files.map((file) =>
          limit(async () => {
            try {
              await uploadFile(
                file,
                file.name, // Use original file name
                async (uploaded) => {
                  uploadedFiles.push({
                    name: uploaded.name,
                    storageUrl: uploaded.storageUrl,
                    fileType: uploaded.fileType,
                  });
                  successCount++;
                }
              );
            } catch (error) {
              // Fallback error handling for any errors not caught by uploadFile's onError
              const err = error as Error;
              const errorMessage = err?.message
                ? `${file.name}: ${err.message}`
                : `${file.name}: Unknown error occurred`;
              errorMessages.push(errorMessage);
              errorCount++;
            }
          })
        );

        // Wait for all uploads to complete
        await Promise.allSettled(uploadPromises);

        // Create all files in database with a single API call using mutation
        if (uploadedFiles.length > 0) {
          try {
            await batchCreateFilesMutation.mutateAsync({
              files: uploadedFiles,
            });
          } catch (error) {
            const err = error as Error;
            toast.error(`Failed to save files to database: ${err.message}`);
          }
        }

        // Show final result toast
        if (successCount > 0 && errorCount === 0) {
          toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? "s" : ""}`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(
            `Uploaded ${successCount} file${successCount > 1 ? "s" : ""}, ${errorCount} failed`,
            {
              description:
                errorMessages.length > 0
                  ? errorMessages.join("\n\n\n\n")
                  : "Some files failed to upload",
            }
          );
        } else if (errorCount > 0) {
          toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`, {
            description:
              errorMessages.length > 0 ? errorMessages.join("\n\n\n\n") : "Please try again.",
          });
        }
      } catch (error) {
        const err = error as Error;
        const errorMessage = err?.message || "Unknown error occurred";
        toast.error("Failed to upload files", {
          description: errorMessage,
        });
      }
    },
    [showNewFileModal, handleSingleFileDrop, batchCreateFilesMutation]
  );

  const { isDragging, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } =
    useDragAndDrop(handleMultipleFilesDrop);

  // Handle file creation
  const handleCreateFile = async () => {
    if (!selectedFile || !newFileName.trim()) return;

    setIsSubmitting(true);
    try {
      await uploadFile(
        selectedFile,
        newFileName,
        async (uploadedFile) => {
          // Create file record in database
          await batchCreateFilesMutation.mutateAsync({
            files: [
              {
                name: uploadedFile.name,
                storageUrl: uploadedFile.storageUrl,
                fileType: uploadedFile.fileType,
              },
            ],
          });
        },
        (error) => {
          console.error("Error uploading file:", error);
          toast.error("Failed to upload file");
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
        }
      );

      setNewFileName("");
      setFileDescription("");
      setSelectedFile(null);
      setShowNewFileModal(false);
    } catch (err: unknown) {
      if (err instanceof Object && "message" in err && typeof err.message === "string") {
        try {
          const errorObject = JSON.parse(err.message);
          toast.error("Failed to upload file", {
            description: errorObject.message || "Unknown error",
          });
        } catch {
          toast.error("Failed to upload file", {
            description: err.message,
          });
        }
      } else {
        toast.error("Failed to upload file", {
          description: "Unknown error",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared drag props
  const dragProps = {
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const handleDeleteFile = (id: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFileMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/10 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl border-2 border-dashed border-blue-400">
            <Upload className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Drop files here to upload
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Files</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload and manage your files. Drag and drop multiple files or click to upload
          individually.
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {data?.files?.length || 0} file{data?.files?.length !== 1 ? "s" : ""}
        </div>
        <Button onClick={() => setShowNewFileModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* Content Area with Drag and Drop */}
      <div
        className={`relative min-h-[calc(100vh-300px)] rounded-xl transition-all ${
          isDragging
            ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 p-6"
            : "p-2"
        }`}
        {...dragProps}
      >
        <FileGrid
          files={data?.files || []}
          isLoading={isLoading}
          onDelete={handleDeleteFile}
        />
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showNewFileModal}
        file={selectedFile}
        name={newFileName}
        description={fileDescription}
        isDragging={isDragging}
        isUploading={isSubmitting}
        onNameChange={setNewFileName}
        onDescriptionChange={setFileDescription}
        onFileChange={handleSingleFileDrop}
        onSubmit={handleCreateFile}
        onCancel={() => {
          setShowNewFileModal(false);
          setNewFileName("");
          setFileDescription("");
          setSelectedFile(null);
        }}
        dragProps={dragProps}
      />
    </div>
  );
}

