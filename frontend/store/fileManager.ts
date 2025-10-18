import { create } from 'zustand';

interface FileManagerState {
  // PDF viewer state
  numPages: number;
  currentPage: number;
  scale: number;
  pdfError: string | null;
  scrollToPageRef: ((pageNumber: number) => void) | null;
  
  // Selected file state
  selectedFileId: string | null;
  selectedFileName: string | null;
  selectedFileBlobUrl: string | null;

  // Actions
  setNumPages: (numPages: number) => void;
  setCurrentPage: (currentPage: number) => void;
  setScale: (scale: number) => void;
  setPDFError: (error: string | null) => void;
  setScrollToPageRef: (fn: ((pageNumber: number) => void) | null) => void;
  selectFile: (fileId: string) => Promise<void>;
  clearSelectedFile: () => void;
  resetFileManager: () => void;
}

const initialState = {
  numPages: 0,
  currentPage: 1,
  scale: 1,
  pdfError: null,
  scrollToPageRef: null,
  selectedFileId: null,
  selectedFileName: null,
  selectedFileBlobUrl: null,
};

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
  ...initialState,

  setNumPages: (numPages) => set({ numPages }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setScale: (scale) => set({ scale }),
  setPDFError: (pdfError) => set({ pdfError }),
  setScrollToPageRef: (scrollToPageRef) => set({ scrollToPageRef }),
  
  selectFile: async (fileId: string) => {
    try {
      // Import downloadFileBlob dynamically to avoid circular dependencies
      const { downloadFileBlob } = await import('@/query/files');
      
      // Clear previous file blob URL if it exists
      const currentBlobUrl = get().selectedFileBlobUrl;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
      
      // Download and set the new file
      const blob = await downloadFileBlob(fileId);
      const url = URL.createObjectURL(blob);
      
      set({
        selectedFileId: fileId,
        selectedFileBlobUrl: url,
      });
      
      console.log('✅ File selected:', fileId);
    } catch (error) {
      console.error('❌ Failed to select file:', error);
      throw error;
    }
  },
  
  clearSelectedFile: () => {
    const currentBlobUrl = get().selectedFileBlobUrl;
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    set({
      selectedFileId: null,
      selectedFileName: null,
      selectedFileBlobUrl: null,
    });
  },
  
  resetFileManager: () => {
    const currentBlobUrl = get().selectedFileBlobUrl;
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    set(initialState);
  },
}));

