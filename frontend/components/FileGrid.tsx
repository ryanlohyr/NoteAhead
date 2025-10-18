import { FileItem } from "@/query/files";
import { File, Trash2, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileGridProps {
  files: FileItem[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onFileClick: (file: FileItem) => void;
}

const getFileIcon = (fileType?: string) => {
  if (!fileType) {
    return <File className="h-8 w-8 text-gray-500" />;
  }
  
  if (fileType.startsWith("image/")) {
    return <Image className="h-8 w-8 text-muted-foreground" />;
  } else if (fileType === "application/pdf") {
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  } else if (
    fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return <FileText className="h-8 w-8 text-orange-500" />;
  }
  return <File className="h-8 w-8 text-gray-500" />;
};

const getStatusBadge = (status?: FileItem["status"]) => {
  const statusConfig = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
    uploading: { label: "Uploading...", className: "bg-muted text-foreground border border-border" },
    uploaded: { label: "Uploaded", className: "bg-green-100 text-green-800" },
    failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  };

  // Default to uploaded if no status provided
  const config = statusConfig[status || "uploaded"];
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${config.className} dark:bg-opacity-20`}
    >
      {config.label}
    </span>
  );
};

export const FileGrid: React.FC<FileGridProps> = ({ files, isLoading, onDelete, onFileClick }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
          >
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No files yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Upload your first file by dragging and dropping or clicking the upload button
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800 cursor-pointer"
          onClick={() => onFileClick(file)}
        >
          <div className="flex items-start justify-between mb-3">
            {getFileIcon(file.fileType)}
            <div className="flex items-center gap-2">
              {getStatusBadge(file.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file.id);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
            {file.name}
          </h3>
          {file.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
              {file.description}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(file.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

