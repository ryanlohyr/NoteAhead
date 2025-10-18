import "@/app/globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { ResizableWrapper } from "@/components/ResizableWrapper";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { getFaviconMetadata } from "@/utils/favicon";
import { getMetadataTitle, getMetadataDescription } from "@/utils/metadata";

export const metadata: Metadata = {
  title: getMetadataTitle(),
  description: getMetadataDescription(),
  icons: getFaviconMetadata(),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <ResizableWrapper>{children}</ResizableWrapper>
            </SidebarInset>
          </SidebarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

