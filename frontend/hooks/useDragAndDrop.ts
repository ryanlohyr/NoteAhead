import { useCallback, useState } from "react";
import { toast } from "sonner";

export const useDragAndDrop = (onFileDrop: (files: File[]) => void) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        
        // Check if any items are folders (they would have empty type and size 0)
        const hasDirectories = files.some(file => file.type === '' && file.size === 0);
        
        if (hasDirectories) {
          // Reject all files if any directories are detected
          toast.error("Folders cannot be uploaded. Please select individual files only.");
          return;
        }
        
        // Only pass actual files
        const validFiles = files.filter(file => file.type !== '' || file.size > 0);
        
        if (validFiles.length > 0) {
          onFileDrop(validFiles);
        }
      }
    },
    [onFileDrop]
  );

  return {
    isDragging,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
};

