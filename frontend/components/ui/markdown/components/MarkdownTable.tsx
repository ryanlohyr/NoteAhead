import { useState } from "react";
import { useCallback } from "react";
import { WrapWithTooltip } from "../../tooltip";
import { CheckIcon, CopyIcon } from "lucide-react";
import { ComponentProps } from "../types";

// Type definitions for component props

export const MarkdownTable = ({ children, ...props }: ComponentProps) => {
    const [isHovering, setIsHovering] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
  
    const copyTableToClipboard = useCallback(() => {
      const tableEl = document.querySelector("table");
      if (!tableEl) return;
  
      const rows = Array.from(tableEl.querySelectorAll("tr"));
      const tableText = rows
        .map((row) =>
          Array.from(row.querySelectorAll("th, td"))
            .map((cell) => cell.textContent)
            .join("\t")
        )
        .join("\n");
  
      navigator.clipboard
        .writeText(tableText)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => {
            setIsCopied(false);
          }, 3000);
        })
        .catch(() => {
          // Failed to copy
        });
    }, []);
  
    return (
      <div
        className="relative py-4"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="absolute right-0 top-0">
          {isHovering && (
            <WrapWithTooltip
              trigger={
                <button
                  onClick={copyTableToClipboard}
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                </button>
              }
              showTooltip={true}
              side="top"
            >
              {isCopied ? "Copied!" : "Copy to clipboard"}
            </WrapWithTooltip>
          )}
        </div>
        <div className="relative my-4 overflow-x-auto rounded-lg">
          <table
            className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-700"
            {...props}
          >
            {children}
          </table>
        </div>
      </div>
    );
  };

