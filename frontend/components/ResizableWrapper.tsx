"use client";

import { useRightSidebarStore } from "@/store/sidebar";
import { RightSidebar } from "./RightSidebar";
import { RightSidebarToggle } from "./RightSidebarToggle";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";

export const ResizableWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isRightOpen } = useRightSidebarStore();

  // Calculate default sizes based on which panels are open
  const activePanelCount = [true, isRightOpen].filter(Boolean).length;
  const defaultSize = activePanelCount > 1 ? 100 / activePanelCount : 100;

  return (
    <>
      <RightSidebarToggle />
      <ResizablePanelGroup
        direction="horizontal"
        className="w-full h-full"
        style={{ minWidth: 0 }}
        autoSaveId="resizable-wrapper"
      >
        <ResizablePanel
          id="main"
          order={1}
          defaultSize={defaultSize}
          className="h-full"
          minSize={25}
        >
          {children}
        </ResizablePanel>

        {isRightOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="right-sidebar"
              order={2}
              defaultSize={defaultSize}
              minSize={20}
              maxSize={60}
              className="w-full overflow-hidden"
              style={{ minWidth: 0 }}
            >
              <RightSidebar />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </>
  );
};

