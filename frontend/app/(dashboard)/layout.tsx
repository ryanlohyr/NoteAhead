import { ResizableWrapper } from "@/components/ResizableWrapper";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import "@/app/globals.css";
import { getFaviconMetadata } from "@/utils/favicon";
import { getMetadataTitle, getMetadataDescription } from "@/utils/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: getMetadataTitle(),
  description: getMetadataDescription(),
  icons: getFaviconMetadata(),
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <ResizableWrapper>{children}</ResizableWrapper>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}

