import "@/app/globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoteAhead",
  description: "Your note-taking application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

