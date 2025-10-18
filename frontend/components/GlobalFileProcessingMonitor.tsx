"use client";

import { useGlobalFileProcessingMonitor } from "@/hooks/useGlobalFileProcessingMonitor";
import { useFileProcessingStore, ProcessingFile } from "@/store/fileProcessing";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  Loader2, 
  AlertCircle, 
  X,
  FolderOpen,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useRetryFileProcessing } from "@/query/files";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Global File Processing Monitor Component
 * This component runs in the background to monitor file processing status,
 * provides toast notifications when files complete processing,
 * and displays a collapsible status UI in the bottom-right corner.
 * It should be mounted once at the application level.
 */
export const GlobalFileProcessingMonitor = () => {
  // Initialize the global file processing monitor
  // This will start polling when there are files in progress
  // and show toast notifications when processing completes
  useGlobalFileProcessingMonitor();

  const router = useRouter();
  const queryClient = useQueryClient();
  const retryFileProcessing = useRetryFileProcessing();

  const {
    files,
    hasFilesInProgress,
    processingFileCount,
    failedFileCount,
    isExpanded,
    isVisible,
    toggleExpanded,
    setVisible,
  } = useFileProcessingStore();

  const handleGoToFile = (file: ProcessingFile) => {
    try {
      // Navigate to the files page
      router.push('/files');
      
      toast.success("Navigating to files", {
        description: `Opening files page`,
      });
    } catch {
      toast.error("Navigation failed", {
        description: "Could not navigate to files page",
      });
    }
  };

  const handleRetryFile = async (fileId: string) => {
    try {
      await retryFileProcessing.mutateAsync(fileId);
      // Immediately invalidate the processing-files query to refetch and show updated status
      await queryClient.invalidateQueries({ queryKey: ["processing-files"] });
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Retry failed:", error);
    }
  };

  // Don't render UI if not visible
  if (!isVisible) return null;

  const totalFiles = files.length;
  const progressPercentage = totalFiles > 0 ? ((totalFiles - processingFileCount) / totalFiles) * 100 : 0;

  return (
    <>
      {/* Minimalistic corner badge - collapsed state */}
      {!isExpanded && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 px-3 py-2">
            {/* Count badge */}
            {(processingFileCount > 0 || failedFileCount > 0) && (
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {processingFileCount + failedFileCount}
              </span>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-1">
              {hasFilesInProgress && (
                <div className="relative">
                  <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 h-2 w-2 bg-orange-500 rounded-full animate-ping"></div>
                </div>
              )}
              {failedFileCount > 0 && (
                <X className="h-4 w-4 text-red-500" strokeWidth={3} />
              )}
            </div>

            {/* Expand button */}
            <button
              onClick={toggleExpanded}
              className="h-5 w-5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Expand file processing status"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded detailed view */}
      {isExpanded && (
        <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-3 space-y-2">
              {/* Title and controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasFilesInProgress && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <FileText className="h-4 w-4" />
                  <span className="font-medium text-sm">File Processing</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleExpanded}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisible(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Status badges row */}
              {(processingFileCount > 0 || failedFileCount > 0) && (
                <div className="flex gap-2">
                  {processingFileCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {processingFileCount} processing
                    </Badge>
                  )}
                  {failedFileCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {failedFileCount} failed
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Progress bar section */}
              {hasFilesInProgress && (
                <div className="space-y-1 pt-1">
                  <Progress value={progressPercentage} className="h-1.5" />
                  <div className="text-xs text-muted-foreground">
                    {Math.round(progressPercentage)}% complete
                  </div>
                </div>
              )}

              {/* Warning message */}
              {hasFilesInProgress && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Files are not searchable until processing completes
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-0 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {files.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    No files being processed
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border",
                        file.embeddingsStatus === "in_progress" && "bg-muted/30 border-border",
                        file.embeddingsStatus === "failed" && "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex-shrink-0">
                        {file.embeddingsStatus === "failed" && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {file.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>
                            {file.embeddingsStatus === "in_progress" && "Processing..."}
                            {file.embeddingsStatus === "failed" && "Processing failed"}
                          </span>
                          {file.embeddingsStatus === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetryFile(file.id)}
                              disabled={retryFileProcessing.isPending}
                              className="h-5 px-1 text-xs hover:bg-red-100"
                              title="Retry processing"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGoToFile(file)}
                          className="h-6 w-6 p-0"
                          title="Go to files page"
                        >
                          <FolderOpen className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

