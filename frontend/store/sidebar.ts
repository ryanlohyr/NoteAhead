import { create } from "zustand";

interface RightSidebarState {
  isRightOpen: boolean;
  toggleRight: () => void;
  openRight: () => void;
  closeRight: () => void;
}

export const useRightSidebarStore = create<RightSidebarState>((set) => ({
  isRightOpen: false,
  toggleRight: () => set((state) => ({ isRightOpen: !state.isRightOpen })),
  openRight: () => set({ isRightOpen: true }),
  closeRight: () => set({ isRightOpen: false }),
}));

