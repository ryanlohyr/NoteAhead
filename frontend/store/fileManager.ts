import { create } from 'zustand';

interface FileManagerState {
  // PDF viewer state
  numPages: number;
  currentPage: number;
  scale: number;
  pdfError: string | null;
  scrollToPageRef: ((pageNumber: number) => void) | null;

  // Actions
  setNumPages: (numPages: number) => void;
  setCurrentPage: (currentPage: number) => void;
  setScale: (scale: number) => void;
  setPDFError: (error: string | null) => void;
  setScrollToPageRef: (fn: ((pageNumber: number) => void) | null) => void;
  resetFileManager: () => void;
}

const initialState = {
  numPages: 0,
  currentPage: 1,
  scale: 1,
  pdfError: null,
  scrollToPageRef: null,
};

export const useFileManagerStore = create<FileManagerState>((set) => ({
  ...initialState,

  setNumPages: (numPages) => set({ numPages }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setScale: (scale) => set({ scale }),
  setPDFError: (pdfError) => set({ pdfError }),
  setScrollToPageRef: (scrollToPageRef) => set({ scrollToPageRef }),
  resetFileManager: () => set(initialState),
}));

