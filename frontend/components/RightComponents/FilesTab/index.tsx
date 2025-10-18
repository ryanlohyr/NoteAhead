import { useGetAllFiles, downloadFileBlob } from "@/query/files";
import { FileItem } from "@/query/files";
import { useState } from "react";
import { FileViewer } from "@/components/FileViewer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Files } from "lucide-react";

export const FilesList = () => {
  const { data, isLoading } = useGetAllFiles();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const files = data?.files || [];

  const handleFileSelect = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    setSelectedFile(file);
    setIsLoadingContent(true);
    try {
      const blob = await downloadFileBlob(file.id);
      const url = URL.createObjectURL(blob);
      setFileBlobUrl(url);
    } catch (error) {
      console.error("Failed to load file:", error);
      setFileBlobUrl(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleCloseViewer = () => {
    if (fileBlobUrl) {
      URL.revokeObjectURL(fileBlobUrl);
    }
    setSelectedFile(null);
    setFileBlobUrl(null);
  };

  const handleDownload = async (file: FileItem) => {
    try {
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
        <Select onValueChange={handleFileSelect}>
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
          fileBlobUrl={fileBlobUrl}
          isLoadingContent={isLoadingContent}
          onClose={handleCloseViewer}
          onDownload={handleDownload}
        />
      )}
    </>
  );
};
