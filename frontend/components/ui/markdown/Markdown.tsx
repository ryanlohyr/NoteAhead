"use client";

import { toast } from "sonner";
import { useFileManagerStore } from "@/store/fileManager";
import { useRightSidebarStore } from "@/store/sidebar";
import "katex/dist/katex.min.css";
import { ExternalLinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { useSidebar } from "../sidebar";
import { preprocessLatex } from "./utils";
import { ComponentProps, CodeProps, LinkProps } from "./types";
import { MarkdownTable } from "./components/MarkdownTable";

const NonMemoizedMarkdown = ({
  children,
  allowDynamicImages = true,
}: {
  children: string;
  allowDynamicImages?: boolean;
}) => {
  // Use selectors to prevent re-renders when unrelated store state changes
  const scrollToPageRef = useFileManagerStore((state) => state.scrollToPageRef);
  const { isRightOpen, openRight } = useRightSidebarStore();
  const { setOpen: setLeftSidebarOpen } = useSidebar();

  const processedContent = preprocessLatex(children as string);

  const components = {
    code: ({ inline, className, children, ...props }: CodeProps) => {
      const match = /language-(\w+)/.exec(className || "");

      if (!match) {
        return (
          <code
            className="rounded-md px-2 py-1 text-sm bg-blue-100 dark:bg-zinc-800 break-words"
            {...props}
          >
            {children}
          </code>
        );
      }

      return !inline && match ? (
        <pre
          {...props}
          className={`${className} my-3 w-[80dvw] overflow-x-scroll rounded-lg bg-blue-100 p-4 text-sm dark:bg-zinc-800 md:max-w-[500px]`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} rounded-md px-2 py-1 text-sm bg-blue-100 dark:bg-zinc-800`}
          {...props}
        >
          {children}
        </code>
      );
    },
    h1: ({ children, ...props }: ComponentProps) => {
      return (
        <h1 className="mb-3 mt-4 text-2xl font-bold leading-relaxed" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: ComponentProps) => {
      return (
        <h2 className="mb-2 mt-4 text-xl font-bold leading-relaxed" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: ComponentProps) => {
      return (
        <h3 className="mb-2 mt-3 text-lg font-bold leading-relaxed" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ children, ...props }: ComponentProps) => {
      return (
        <h4 className="mb-2 mt-3 text-base font-bold leading-relaxed" {...props}>
          {children}
        </h4>
      );
    },
    h5: ({ children, ...props }: ComponentProps) => {
      return (
        <h5 className="mb-1 mt-2 text-sm font-bold leading-relaxed" {...props}>
          {children}
        </h5>
      );
    },
    h6: ({ children, ...props }: ComponentProps) => {
      return (
        <h6 className="mb-1 mt-2 text-xs font-bold leading-relaxed" {...props}>
          {children}
        </h6>
      );
    },
    hr: ({ ...props }: ComponentProps) => {
      return <hr className="my-4 border-t border-zinc-300 dark:border-zinc-700" {...props} />;
    },
    ol: ({ children, ...props }: ComponentProps) => {
      return (
        <ol className="my-2 ml-6 list-outside list-decimal space-y-1 pl-2" {...props}>
          {children}
        </ol>
      );
    },
    li: ({ children, ...props }: ComponentProps) => {
      return (
        <li className="py-0.5 leading-relaxed" {...props}>
          {children}
        </li>
      );
    },
    ul: ({ children, ...props }: ComponentProps) => {
      return (
        <ul className="my-2 ml-6 list-outside list-disc space-y-1 pl-2" {...props}>
          {children}
        </ul>
      );
    },
    strong: ({ children, ...props }: ComponentProps) => {
      return (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    a: ({ href, children, ...props }: LinkProps) => {
      // Utility function to extract page number from various formats
      const extractPageNumber = (text: string): number | null => {
        // Handle various formats:
        // "19", "Page 19", "page 19", "PAGE 19", "Page: 19", "p. 19", "pg 19", etc.
        const cleanText = text.trim();

        // Try to find any number in the text
        const numberMatch = cleanText.match(/\d+/);
        if (numberMatch) {
          const pageNumber = parseInt(numberMatch[0]);
          return isNaN(pageNumber) ? null : pageNumber;
        }

        return null;
      };

      // Check if this is a file/page link: [page_number](fileId) or [Page page_number](fileId)
      const isFilePageLink = () => {
        if (!href || !children) return false;

        // Check if children contains a page number
        const childrenText =
          typeof children === "string"
            ? children
            : Array.isArray(children)
              ? children.join("")
              : String(children);

        // Extract page number using utility function
        const pageNumber = extractPageNumber(childrenText);
        if (pageNumber === null) return false;

        // Check if href looks like a fileId (UUID format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(href);
      };

      const handleFilePageClick = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (!href) return;

        // Extract page number from text using utility function
        const childrenText = String(children).trim();
        const pageNumber = extractPageNumber(childrenText);

        if (pageNumber === null) return;

        try {
          // Open right sidebar if closed
          if (!isRightOpen) {
            openRight();
          }

          // Navigate to the specific page (with a small delay to ensure PDF loads)
          setTimeout(() => {
            setLeftSidebarOpen(false);
            if (scrollToPageRef) {
              scrollToPageRef(pageNumber);
            }
          }, 500);

          toast.success("Navigated to file", {
            description: `Opened file at page ${pageNumber}`,
          });
        } catch {
          toast.error("Navigation failed", {
            description: `Could not open file`,
          });
        }
      };

      // If it's a file/page link, render custom component
      if (isFilePageLink()) {
        return (
          <button
            onClick={handleFilePageClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 cursor-pointer border border-blue-300 dark:border-blue-700 min-h-[28px]"
            title={`Go to page ${children} in file ${href}`}
            {...props}
          >
            <span className="flex items-center justify-center">📄 {children}</span>
          </button>
        );
      }

      // Regular link handling (unchanged)
      return (
        <Link
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600 min-h-[28px]"
          target="_blank"
          rel="noreferrer"
          href={href || "#"}
          {...props}
        >
          <span className="flex items-center justify-center">{children}</span>
          <ExternalLinkIcon className="h-3 w-3" />
        </Link>
      );
    },
    table: MarkdownTable,
    thead: ({ children, ...props }: ComponentProps) => {
      return (
        <thead className="bg-zinc-100 dark:bg-zinc-800" {...props}>
          {children}
        </thead>
      );
    },
    tbody: ({ children, ...props }: ComponentProps) => {
      return <tbody {...props}>{children}</tbody>;
    },
    tr: ({ children, ...props }: ComponentProps) => {
      return (
        <tr className="border-b border-zinc-300 dark:border-zinc-700" {...props}>
          {children}
        </tr>
      );
    },
    th: ({ children, ...props }: ComponentProps) => {
      return (
        <th
          className="border-r border-zinc-300 px-6 py-3 text-left font-semibold dark:border-zinc-700"
          {...props}
        >
          {children}
        </th>
      );
    },
    td: ({ children, ...props }: ComponentProps) => {
      return (
        <td
          className="border-r border-zinc-300 px-6 py-3 dark:border-zinc-700 leading-relaxed"
          {...props}
        >
          {children}
        </td>
      );
    },
    img: ({ src, alt, ...props }: ComponentProps & { src?: string; alt?: string }) => {
      if (!src) return null;

      // Parse width and height from URL parameters
      const getImageDimensions = (url: string) => {
        if (!allowDynamicImages) {
          return { width: 300, height: 200 };
        }
        try {
          const urlObj = new URL(url);
          const width = urlObj.searchParams.get("lkt_width");
          const height = urlObj.searchParams.get("lkt_height");

          return {
            width: width ? parseInt(width) : 300,
            height: height ? parseInt(height) : 200,
          };
        } catch {
          // If URL parsing fails, use defaults
          return { width: 300, height: 200 };
        }
      };

      const { width, height } = getImageDimensions(src);

      return (
        <div className="my-3 flex justify-center">
          <div
            className="relative max-w-full flex justify-center"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            {/* Use regular img tag for better PDF export compatibility */}
            <Image
              src={src}
              alt={alt || ""}
              fill
              className="w-full h-full object-contain"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
              crossOrigin="anonymous"
              loading="eager"
              {...props}
            />
          </div>
        </div>
      );
    },
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.allowDynamicImages === nextProps.allowDynamicImages
);
