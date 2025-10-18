"use client";

import { useRightSidebarStore } from "@/store/sidebar";
import { Minimize2 } from "lucide-react";

export const RightSidebar = () => {
  const { closeRight } = useRightSidebarStore();

  return (
    <div className="h-full w-full bg-background border-l flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Right Sidebar</h2>
        <button
          onClick={closeRight}
          className="p-1 hover:bg-muted rounded-sm transition-colors"
          aria-label="Minimize right sidebar"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {/* Right sidebar content will go here */}
        <p className="text-muted-foreground text-sm">Right sidebar content</p>
      </div>
    </div>
  );
};

