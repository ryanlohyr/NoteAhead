"use client";

import { useRightSidebarStore } from "@/store/sidebar";
import { Minimize2 } from "lucide-react";
import { Chat } from "./chat/Chat";

export const RightSidebar = () => {
  const { closeRight } = useRightSidebarStore();

  return (
    <div className="h-full w-full bg-background border-l flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Chat Assistant</h2>
        <button
          onClick={closeRight}
          className="p-1 hover:bg-muted rounded-sm transition-colors"
          aria-label="Minimize right sidebar"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <Chat />
      </div>
    </div>
  );
};

