"use client";

import { useHelloQuery } from "@/query/helloQuery";
import { useRightSidebarStore } from "@/store/sidebar";
import { PanelRightOpen } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Home() {
  const { data, isLoading, error } = useHelloQuery();
  const { toggleRight, isRightOpen } = useRightSidebarStore();

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <SidebarTrigger />
        <h1 className="text-2xl font-bold">Welcome to NoteAhead</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-6 max-w-2xl">
          <h2 className="text-4xl font-bold">Your note-taking application is ready!</h2>
          <p className="text-lg text-muted-foreground">
            Use the left sidebar to navigate and the right sidebar for additional tools.
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={toggleRight}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <PanelRightOpen className="h-4 w-4" />
              {isRightOpen ? "Close" : "Open"} Right Sidebar
            </button>
          </div>

          <div className="mt-8 p-6 border rounded-lg bg-card">
            <h3 className="text-2xl font-semibold mb-4">Backend Connection Test</h3>
            {isLoading && (
              <p className="text-muted-foreground">Loading from backend...</p>
            )}
            {error && (
              <p className="text-destructive">
                Error: {error instanceof Error ? error.message : "Failed to connect"}
              </p>
            )}
            {data && (
              <div className="space-y-2">
                <p className="text-lg text-primary font-semibold">{data.message}</p>
                <p className="text-sm text-muted-foreground">
                  Timestamp: {new Date(data.timestamp).toLocaleString()}
                </p>
                <p className="text-sm text-success">
                  ✓ Status: {data.status}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

