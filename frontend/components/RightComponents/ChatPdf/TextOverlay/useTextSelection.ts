import { useState } from "react";
import { Line } from "@/components/Database/types";
import { toast } from "sonner";
import { useChatStore } from "@/store/chat";

export const useTextSelection = (pageNumber: number, fileId: string) => {
  const [hoveredLine, setHoveredLine] = useState<Line | null>(null);
  const [contextMenu, setContextMenu] = useState<{ line: Line; x: number; y: number } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { setCopiedTextFromPdf, focusChatInput } = useChatStore();

  const handleLineClick = (line: Line, event: React.MouseEvent) => {
    event.stopPropagation();

    // Set new context menu position (key will force re-render)
    setContextMenu({
      line,
      x: event.clientX,
      y: event.clientY,
    });
    setDropdownOpen(true);
    setHoveredLine(null); // Hide tooltip when showing context menu
  };

  const handleCopyText = (line: Line) => {
    const text = line.text_display || line.text;
    // Filter out mathpix CDN URLs - removes patterns like (https://cdn.mathpix.com/...) or (@https://cdn.mathpix.com/...)
    const filteredText = text.replace(/\(\s*@?\s*https:\/\/cdn\.mathpix\.com\/[^\)]+\)/g, '').trim();

    navigator.clipboard
      .writeText(filteredText)
      .then(() => {
        toast.success("Text copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy text");
      });
    setContextMenu(null);
    setDropdownOpen(false);
  };

  const handleChat = (line: Line) => {
    const text = line.text_display || line.text;
    // Filter out mathpix CDN URLs - removes patterns like (https://cdn.mathpix.com/...) or (@https://cdn.mathpix.com/...)
    const filteredText = text.replace(/\(\s*@?\s*https:\/\/cdn\.mathpix\.com\/[^\)]+\)/g, '').trim();

    // Store the copied text data in chat store
    setCopiedTextFromPdf(filteredText);

    toast.success("Text selected for chat!");
    setContextMenu(null);
    setDropdownOpen(false);
    
    // Refocus the chat input after a brief delay to allow UI updates
    setTimeout(() => focusChatInput(), 100);
  };

  const handleOverlayClick = () => {
    if (dropdownOpen) {
      setContextMenu(null);
      setDropdownOpen(false);
    }
  };

  return {
    hoveredLine,
    setHoveredLine,
    contextMenu,
    dropdownOpen,
    setDropdownOpen,
    handleLineClick,
    handleCopyText,
    handleChat,
    handleOverlayClick,
  };
};
