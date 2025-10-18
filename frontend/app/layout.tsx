"use client";

import "@/app/globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/components/Auth";
import { GlobalFileProcessingMonitor } from "@/components/GlobalFileProcessingMonitor";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <GlobalFileProcessingMonitor />
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
