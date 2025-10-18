import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, X } from "lucide-react";
import { FileItem } from "@/query/files";

interface FileViewerProps {
  selectedFile: FileItem;
  fileBlobUrl: string | null;
  isLoadingContent: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  selectedFile,
  fileBlobUrl,
  isLoadingContent,
  onClose,
  onDownload,
}) => {
  const isPDF = selectedFile.fileType === "application/pdf";
  const isImage = selectedFile.fileType?.startsWith("image/");
  const isDocument =
    selectedFile.fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    selectedFile.fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
              {selectedFile.name}
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(selectedFile)}
            className="h-8 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin"></div>
                  Loading file...
                </div>
              </div>
            </div>
          ) : fileBlobUrl ? (
            isDocument ? (
              // PPTX/DOCX viewer - show message
              <div className="flex-1 h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900/20 p-6">
                <div className="text-center max-w-md space-y-4">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {selectedFile.fileType?.includes("presentation")
                      ? "PowerPoint Presentation"
                      : "Word Document"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    We are unable to render this file type in the browser. Please download
                    the file to view it.
                  </p>
                  <Button onClick={() => onDownload(selectedFile)} className="mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              </div>
            ) : isImage ? (
              // Image viewer
              <div className="h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <img
                  src={fileBlobUrl}
                  alt={selectedFile.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              // PDF and other files - use iframe
              <div className="h-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden w-full">
                <iframe
                  src={fileBlobUrl}
                  className="w-full h-full border-none"
                  title={`Preview ${selectedFile.name}`}
                  onError={() => {
                    console.error("Failed to load file in iframe");
                  }}
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Failed to load file content
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

