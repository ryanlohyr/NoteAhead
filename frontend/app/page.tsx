"use client";

import { useHelloQuery } from "@/query/helloQuery";

export default function Home() {
  const { data, isLoading, error } = useHelloQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Welcome to NoteAhead</h1>
        <p className="text-lg text-muted-foreground">
          Your note-taking application is ready to go!
        </p>

        <div className="mt-8 p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Backend Connection Test</h2>
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
    </main>
  );
}

