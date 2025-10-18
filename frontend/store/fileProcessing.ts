import { create } from "zustand";

/**
 * File processing status interface
 */
export interface ProcessingFile {
  id: string;
  name: string;
  embeddingsStatus: "in_progress" | "failed";
}

interface FileProcessingState {
  files: ProcessingFile[];
  isLoading: boolean;
  hasFilesInProgress: boolean;
  processingFileCount: number;
  failedFileCount: number;
  isExpanded: boolean;
  isVisible: boolean;

  // Actions
  setFiles: (files: ProcessingFile[]) => void;
  setLoading: (isLoading: boolean) => void;
  addFile: (file: ProcessingFile) => void;
  removeFile: (fileId: string) => void;
  updateFileStatus: (fileId: string, status: "in_progress" | "failed") => void;
  clearFiles: () => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  setVisible: (visible: boolean) => void;
}

export const useFileProcessingStore = create<FileProcessingState>((set, get) => ({
  files: [],
  isLoading: false,
  hasFilesInProgress: false,
  processingFileCount: 0,
  failedFileCount: 0,
  isExpanded: true,
  isVisible: false,

  setFiles: (files) => {
    const processingFileCount = files.filter(file => file.embeddingsStatus === "in_progress").length;
    const failedFileCount = files.filter(file => file.embeddingsStatus === "failed").length;
    const hasFilesInProgress = processingFileCount > 0;
    const shouldBeVisible = hasFilesInProgress || failedFileCount > 0;

    set({
      files,
      processingFileCount,
      failedFileCount,
      hasFilesInProgress,
      isVisible: shouldBeVisible,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  addFile: (file) => {
    const currentFiles = get().files;
    const updatedFiles = [...currentFiles, file];
    get().setFiles(updatedFiles);
  },

  removeFile: (fileId) => {
    const currentFiles = get().files;
    const updatedFiles = currentFiles.filter(file => file.id !== fileId);
    get().setFiles(updatedFiles);
  },

  updateFileStatus: (fileId, status) => {
    const currentFiles = get().files;
    const updatedFiles = currentFiles.map(file =>
      file.id === fileId ? { ...file, embeddingsStatus: status } : file
    );
    get().setFiles(updatedFiles);
  },

  clearFiles: () => set({
    files: [],
    hasFilesInProgress: false,
    processingFileCount: 0,
    failedFileCount: 0,
    isVisible: false,
  }),

  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

  setExpanded: (expanded) => set({ isExpanded: expanded }),

  setVisible: (visible) => set({ isVisible: visible }),
}));

