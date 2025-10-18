import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { fileApi } from "@/query/files";
import { useFileProcessingStore, ProcessingFile } from "@/store/fileProcessing";

/**
 * Utility function to check if there are files currently in progress
 */
const hasFilesInProgress = (files: ProcessingFile[] | undefined): boolean => {
  if (!files) return false;
  return files.some(file => file.embeddingsStatus === "in_progress");
};

/**
 * Global file processing monitor hook
 * Monitors only in_progress and failed files for efficient polling
 * Detects success by absence (files that disappear from the list are successful)
 * Provides toast notifications and automatic query invalidation
 */
export const useGlobalFileProcessingMonitor = () => {
  const queryClient = useQueryClient();
  const previousFilesRef = useRef<Set<string>>(new Set());
  const fileNamesRef = useRef<Map<string, string>>(new Map());
  const { setFiles, setLoading } = useFileProcessingStore();

  
  // Query to get only files that are in_progress or failed for efficient monitoring
  const { data, isLoading } = useQuery({
    queryKey: ["processing-files"],
    queryFn: () => fileApi.getProcessingFiles(),
    refetchInterval: (query) =>     {
      // Poll every 2.5 seconds if there are files in progress, otherwise don't poll
      const files = query.state.data?.files || [];
      const processingFiles = files.filter(f => 
        f.embeddingsStatus === "in_progress" || f.embeddingsStatus === "failed"
      ) as ProcessingFile[];
      return hasFilesInProgress(processingFiles) ? 2500 : false;
    },
    // Keep the query active even when no components are using it
    staleTime: 0,
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Update store with loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // Monitor for status changes and show notifications
  useEffect(() => {
    if (!data?.files) return;

    const currentFiles = data.files as ProcessingFile[];
    
    // Update the store with current files
    setFiles(currentFiles);
    
    const currentFileIds = new Set(currentFiles.map(file => file.id));
    const previousFileIds = previousFilesRef.current;

    // Store current file names for future reference
    currentFiles.forEach(file => {
      fileNamesRef.current.set(file.id, file.name);
    });

    // Check for files that were in progress but are no longer in the list (success)
    const successfulFileIds = Array.from(previousFileIds).filter(id => !currentFileIds.has(id));
    
    // Check for files that changed from in_progress to failed
    const failedFiles = currentFiles.filter(file => 
      file.embeddingsStatus === "failed" && 
      previousFileIds.has(file.id) // Only show notification if we were tracking this file
    );

    // Show success notifications for files that disappeared (completed successfully)
    successfulFileIds.forEach((fileId) => {
      const fileName = fileNamesRef.current.get(fileId) || "Unknown file";
      toast.success("File processed successfully", {
        description: `${fileName} has been processed and is ready to use.`,
        duration: 5000,
      });
      
      // Clean up the stored file name
      fileNamesRef.current.delete(fileId);
      
      // Invalidate all relevant queries when processing completes
      queryClient.invalidateQueries({ queryKey: ["files"] });
    });

    // Show failure notifications
    failedFiles.forEach(file => {
      toast.error("File processing failed", {
        description: `${file.name} processing failed. You can try again.`,
        duration: 8000,
      });
      
      // Invalidate queries for failed files too
      queryClient.invalidateQueries({ queryKey: ["files"] });
    });

    // Update the previous file IDs (only track in_progress files for success detection)
    const inProgressFileIds = new Set(
      currentFiles
        .filter(file => file.embeddingsStatus === "in_progress")
        .map(file => file.id)
    );
    previousFilesRef.current = inProgressFileIds;
  }, [data, queryClient, setFiles]);

  const files = data?.files as ProcessingFile[] || [];
  
  return {
    hasFilesInProgress: hasFilesInProgress(files),
    isLoading,
    processingFileCount: files.filter(file => file.embeddingsStatus === "in_progress").length,
    failedFileCount: files.filter(file => file.embeddingsStatus === "failed").length,
  };
};

