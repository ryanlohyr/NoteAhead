"use client";

import { useRightSidebarStore } from "@/store/sidebar";
import { Minimize2, MessageSquare, Files } from "lucide-react";
import { Chat } from "./chat/Chat";
import { useGetAllFiles, downloadFileBlob } from "@/query/files";
import { FileItem } from "@/query/files";
import { useState } from "react";
import { FileViewer } from "./FileViewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const FilesList = () => {
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

export const RightSidebar = () => {
  const { closeRight, activeView, setActiveView } = useRightSidebarStore();

  return (
    <div className="h-full w-full bg-background border-l flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("chat")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              activeView === "chat"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Chat</span>
          </button>
          <button
            onClick={() => setActiveView("files")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              activeView === "files"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Files className="h-4 w-4" />
            <span className="text-sm font-medium">Files</span>
          </button>
        </div>
        <button
          onClick={closeRight}
          className="p-1 hover:bg-muted rounded-sm transition-colors"
          aria-label="Minimize right sidebar"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === "chat" ? <Chat /> : <FilesList />}
      </div>
    </div>
  );
};

