import { useGetAllFiles } from "@/query/files";
import { FileItem } from "@/query/files";
import { useState } from "react";
import { FileViewer } from "@/components/FileViewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Files } from "lucide-react";
import { useFileManagerStore } from "@/store/fileManager";

export const FilesList = () => {
  const { data, isLoading } = useGetAllFiles();
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  // Use global file manager store
  const selectedFileId = useFileManagerStore((state) => state.selectedFileId);
  const selectedFileBlobUrl = useFileManagerStore((state) => state.selectedFileBlobUrl);
  const selectFile = useFileManagerStore((state) => state.selectFile);
  const clearSelectedFile = useFileManagerStore((state) => state.clearSelectedFile);

  const files = data?.files || [];
  
  // Get the selected file object from the files list
  const selectedFile = selectedFileId ? files.find((f) => f.id === selectedFileId) : null;

  const handleFileSelect = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setIsLoadingContent(true);
    try {
      await selectFile(file.id);
    } catch (error) {
      console.error("Failed to load file:", error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleCloseViewer = () => {
    clearSelectedFile();
  };

  const handleDownload = async (file: FileItem) => {
    try {
      // Import dynamically to match the store's pattern
      const { downloadFileBlob } = await import("@/query/files");
      const blob = await downloadFileBlob(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading files...</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Files className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No files yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <Select onValueChange={handleFileSelect} value={selectedFileId || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Select a file to view" />
          </SelectTrigger>
          <SelectContent>
            {files.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                {file.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedFile && (
        <FileViewer
          selectedFile={selectedFile}
          fileBlobUrl={selectedFileBlobUrl}
          isLoadingContent={isLoadingContent}
          onClose={handleCloseViewer}
          onDownload={handleDownload}
        />
      )}
    </>
  );
};
