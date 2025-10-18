import "@/app/globals.css";
import { getFaviconMetadata } from "@/utils/favicon";
import { getMetadataTitle, getMetadataDescription } from "@/utils/metadata";

export const metadata = {
  title: getMetadataTitle(),
  description: getMetadataDescription(),
  icons: getFaviconMetadata(),
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

