"use client";

import { useRightSidebarStore } from "@/store/sidebar";
import { Minimize2, MessageSquare, Files } from "lucide-react";
import { Chat } from "./chat/Chat";
import { FilesList } from "./RightComponents/FilesTab";


export const RightSidebar = () => {
  const { closeRight, activeView, setActiveView } = useRightSidebarStore();

  return (
    <div className="h-full w-full bg-background border-l flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("chat")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              activeView === "chat"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Chat</span>
          </button>
          <button
            onClick={() => setActiveView("files")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
              activeView === "files"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Files className="h-4 w-4" />
            <span className="text-sm font-medium">Files</span>
          </button>
        </div>
        <button
          onClick={closeRight}
          className="p-1 hover:bg-muted rounded-sm transition-colors"
          aria-label="Minimize right sidebar"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === "chat" ? <Chat /> : <FilesList />}
      </div>
    </div>
  );
};

