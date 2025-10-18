import { create } from 'zustand';

export type ProcessingFile = {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress?: number;
  error?: string;
};

interface FileProcessingStore {
  files: ProcessingFile[];
  isLoading: boolean;
  setFiles: (files: ProcessingFile[]) => void;
  setLoading: (loading: boolean) => void;
  addFile: (file: ProcessingFile) => void;
  updateFile: (id: string, updates: Partial<ProcessingFile>) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

export const useFileProcessingStore = create<FileProcessingStore>((set) => ({
  files: [],
  isLoading: false,
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ isLoading: loading }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),
  clearFiles: () => set({ files: [] }),
}));

