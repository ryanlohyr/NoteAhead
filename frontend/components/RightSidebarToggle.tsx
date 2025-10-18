"use client";

import { useRightSidebarStore } from "@/store/sidebar";
import { Maximize2 } from "lucide-react";

export const RightSidebarToggle = () => {
  const { openRight, isRightOpen } = useRightSidebarStore();

  if (isRightOpen) return null;

  return (
    <button
      onClick={openRight}
      className="fixed right-4 top-4 z-50 p-2  hover:bg-muted rounded-sm transition-colors"
      aria-label="Maximize right sidebar"
    >
      <Maximize2 className="h-4 w-4" />
    </button>
  );
};
