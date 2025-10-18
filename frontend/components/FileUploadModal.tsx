import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";

export const FileUploadModal: React.FC<{
  isOpen: boolean;
  file: File | null;
  name: string;
  description: string;
  isDragging: boolean;
  isUploading?: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  onFileChange: (file: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
  dragProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}> = ({
  isOpen,
  file,
  name,
  description,
  isDragging,
  isUploading = false,
  onNameChange,
  onDescriptionChange,
  onFileChange,
  onSubmit,
  onCancel,
  dragProps,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add New File</h2>
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Upload File
          </label>
          <div className="flex items-center justify-center w-full">
            <label
              className={`flex flex-col items-center justify-center w-full h-32 border-2 ${
                isDragging
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
              } border-dashed rounded-lg cursor-pointer transition-colors`}
              {...dragProps}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isDragging ? (
                  <>
                    <Upload className="w-8 h-8 mb-3 text-blue-500" />
                    <p className="mb-1 text-sm text-blue-500">Drop your file here</p>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    {file ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{file.name}</p>
                    ) : (
                      <>
                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                          Drag and drop or click to select file
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PDF, DOCX, PPTX, or image files
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onFileChange(e.target.files[0]);
                  }
                }}
                accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.tif"
              />
            </label>
          </div>
        </div>

        <Input
          placeholder="Display name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mb-4"
          disabled={isUploading}
        />

        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="mb-4"
          disabled={isUploading}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!file || isUploading}>
            {isUploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </div>
    </div>
  );
};

