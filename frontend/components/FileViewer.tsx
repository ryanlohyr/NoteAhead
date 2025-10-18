import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { FileItem } from "@/query/files";

// Dynamically import ChatPDF to prevent SSR issues
const ChatPDF = dynamic(() => import("@/components/RightComponents/ChatPdf/ChatPDF"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm text-muted-foreground">Loading PDF viewer...</div>
    </div>
  ),
});

interface FileViewerProps {
  selectedFile: FileItem;
  fileContent?: string | null;
  fileBlobUrl: string | null;
  isLoadingContent: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  selectedFile,
  fileContent,
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
    <div className="h-full flex flex-col w-full">
      {isPDF && fileBlobUrl ? (
        // PDF viewer with ChatPDF component
        <ChatPDF
          pdfUrl={fileBlobUrl}
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          linesJsonPages={selectedFile.linesJsonPages}
          onClose={onClose}
          onDownload={() => onDownload(selectedFile)}
        />
      ) : isDocument && fileBlobUrl ? (
        // PPTX/DOCX viewer
        <>
          <div className="p-3 border-b border-border flex items-center gap-3 bg-muted/30">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{selectedFile.name}</h3>
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
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              ×
            </Button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-muted/20 p-6">
            <div className="text-center max-w-md space-y-4">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium">
                {selectedFile.name.toLowerCase().endsWith('.pptx') 
                  ? 'PowerPoint Presentation' 
                  : 'Word Document'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Sorry we are unable to render powerpoints and docx files for now, please stay tuned!
              </p>
            </div>
          </div>
        </>
      ) : isImage && fileBlobUrl ? (
        // Image viewer
        <>
          <div className="p-3 border-b border-border flex items-center gap-3 bg-muted/30">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{selectedFile.name}</h3>
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
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              ×
            </Button>
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/20 p-4">
            <img
              src={fileBlobUrl}
              alt={selectedFile.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </>
      ) : (
        // Non-PDF/Image/Document file viewer
        <>
          <div className="p-3 border-b border-border flex items-center gap-3 bg-muted/30">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{selectedFile.name}</h3>
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
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              ×
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {fileContent ? (
              // Text file content
              <ScrollArea className="h-full">
                <div className="p-3 w-full">
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-3 rounded-lg w-full break-words">
                    {fileContent}
                  </pre>
                </div>
              </ScrollArea>
            ) : fileBlobUrl ? (
              // Other file content
              <div className="h-full bg-gray-100 rounded-lg overflow-hidden w-full">
                <iframe
                  src={fileBlobUrl}
                  className="w-full h-full border-none"
                  title={`Preview ${selectedFile.name}`}
                  onError={() => {
                    // Failed to load file in iframe
                  }}
                />
              </div>
            ) : (
              // Loading state
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground text-center py-4">
                  {isLoadingContent ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      Loading file...
                    </div>
                  ) : (
                    "Failed to load file content"
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

