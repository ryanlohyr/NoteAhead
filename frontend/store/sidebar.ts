import { create } from "zustand";

type RightSidebarView = "chat" | "files";

interface RightSidebarState {
  isRightOpen: boolean;
  activeView: RightSidebarView;
  toggleRight: () => void;
  openRight: () => void;
  closeRight: () => void;
  setActiveView: (view: RightSidebarView) => void;
}

export const useRightSidebarStore = create<RightSidebarState>((set) => ({
  isRightOpen: false,
  activeView: "chat",
  toggleRight: () => set((state) => ({ isRightOpen: !state.isRightOpen })),
  openRight: () => set({ isRightOpen: true }),
  closeRight: () => set({ isRightOpen: false }),
  setActiveView: (view) => set({ activeView: view }),
}));

