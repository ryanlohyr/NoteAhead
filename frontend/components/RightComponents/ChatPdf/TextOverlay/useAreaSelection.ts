import { useState, useRef } from "react";
import { Line } from "@/components/Database/types";
import { toast } from "sonner";
import { useChatStore } from "@/store/chat";

export const useAreaSelection = (
  linesData: Line[],
  scaleFactorX: number,
  scaleFactorY: number,
  pageNumber: number,
  fileId: string
) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [currentSelectedArea, setCurrentSelectedArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [areaContextMenu, setAreaContextMenu] = useState<{
    area: { x: number; y: number; width: number; height: number };
    x: number;
    y: number;
  } | null>(null);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { setCopiedTextFromPdf, focusChatInput } = useChatStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setCurrentSelectedArea(null);

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isSelecting && selectionStart) {
      setSelectionEnd({ x, y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {

    // Stop selecting immediately to prevent further mouse move updates
    const wasSelecting = isSelecting;
    setIsSelecting(false);

    if (wasSelecting && selectionStart && selectionEnd && overlayRef.current) {
      const minWidth = 20; // Minimum selection size
      const minHeight = 20;

      const width = Math.abs(selectionEnd.x - selectionStart.x);
      const height = Math.abs(selectionEnd.y - selectionStart.y);

      if (width >= minWidth && height >= minHeight) {
        const area = {
          x: Math.min(selectionStart.x, selectionEnd.x),
          y: Math.min(selectionStart.y, selectionEnd.y),
          width,
          height,
        };

        setCurrentSelectedArea(area);

        // Show area context menu
        setAreaContextMenu({
          area,
          x: e.clientX,
          y: e.clientY,
        });
        setAreaDropdownOpen(true);
        // Don't clear selection state until dropdown is closed
        return;
      }
    }

    // Clear selection coordinates if area dropdown is not open
    if (!areaDropdownOpen) {
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  const handleAreaCopyText = (area: { x: number; y: number; width: number; height: number }) => {
    // Find all lines that intersect with the selected area
    const intersectingLines = linesData.filter((line) => {
      if (!line.text_display || line.text_display.trim().length === 0 || !line.region) return false;
      
      // Convert line coordinates to overlay coordinates
      const lineX = line.region.top_left_x * scaleFactorX;
      const lineY = line.region.top_left_y * scaleFactorY;
      const lineWidth = line.region.width * scaleFactorX;
      const lineHeight = line.region.height * scaleFactorY;
      
      // Check if line intersects with the selected area
      const lineRight = lineX + lineWidth;
      const lineBottom = lineY + lineHeight;
      const areaRight = area.x + area.width;
      const areaBottom = area.y + area.height;
      
      return !(
        lineRight < area.x ||
        lineX > areaRight ||
        lineBottom < area.y ||
        lineY > areaBottom
      );
    });

    if (intersectingLines.length === 0) {
      toast.error("No text found in selected area");
      setAreaContextMenu(null);
      setAreaDropdownOpen(false);
      return;
    }

    // Sort lines by position (top to bottom, left to right)
    const sortedLines = intersectingLines.sort((a, b) => {
      if (!a.region || !b.region) return 0;
      
      const aY = a.region.top_left_y * scaleFactorY;
      const bY = b.region.top_left_y * scaleFactorY;
      const yDiff = aY - bY;
      
      // If lines are on roughly the same horizontal level (within 10px), sort by x position
      if (Math.abs(yDiff) < 10) {
        return (a.region.top_left_x * scaleFactorX) - (b.region.top_left_x * scaleFactorX);
      }
      
      return yDiff;
    });

    // Combine text from all intersecting lines
    const combinedText = sortedLines.map(line => line.text_display || line.text).join(' ');

    // Filter out mathpix CDN URLs - removes patterns like (https://cdn.mathpix.com/...) or (@https://cdn.mathpix.com/...)
    const filteredText = combinedText.replace(/\(\s*@?\s*https:\/\/cdn\.mathpix\.com\/[^\)]+\)/g, '').trim();

    // Copy to clipboard
    navigator.clipboard
      .writeText(filteredText)
      .then(() => {
        toast.success("Text copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy text");
      });

    setAreaContextMenu(null);
    setAreaDropdownOpen(false);
  };

  const handleAreaChatWithText = (area: { x: number; y: number; width: number; height: number }) => {
    // Find all lines that intersect with the selected area
    const intersectingLines = linesData.filter((line) => {
      if (!line.text_display || line.text_display.trim().length === 0 || !line.region) return false;
      
      // Convert line coordinates to overlay coordinates
      const lineX = line.region.top_left_x * scaleFactorX;
      const lineY = line.region.top_left_y * scaleFactorY;
      const lineWidth = line.region.width * scaleFactorX;
      const lineHeight = line.region.height * scaleFactorY;
      
      // Check if line intersects with the selected area
      const lineRight = lineX + lineWidth;
      const lineBottom = lineY + lineHeight;
      const areaRight = area.x + area.width;
      const areaBottom = area.y + area.height;
      
      return !(
        lineRight < area.x ||
        lineX > areaRight ||
        lineBottom < area.y ||
        lineY > areaBottom
      );
    });

    if (intersectingLines.length === 0) {
      toast.error("No text found in selected area");
      setAreaContextMenu(null);
      setAreaDropdownOpen(false);
      return;
    }

    // Sort lines by position (top to bottom, left to right)
    const sortedLines = intersectingLines.sort((a, b) => {
      if (!a.region || !b.region) return 0;
      
      const aY = a.region.top_left_y * scaleFactorY;
      const bY = b.region.top_left_y * scaleFactorY;
      const yDiff = aY - bY;
      
      // If lines are on roughly the same horizontal level (within 10px), sort by x position
      if (Math.abs(yDiff) < 10) {
        return (a.region.top_left_x * scaleFactorX) - (b.region.top_left_x * scaleFactorX);
      }
      
      return yDiff;
    });

    // Combine text from all intersecting lines
    const combinedText = sortedLines.map(line => line.text_display || line.text).join(' ');

    // Filter out mathpix CDN URLs - removes patterns like (https://cdn.mathpix.com/...) or (@https://cdn.mathpix.com/...)
    const filteredText = combinedText.replace(/\(\s*@?\s*https:\/\/cdn\.mathpix\.com\/[^\)]+\)/g, '').trim();

    // Store the combined text data in chat store (similar to handleChat)
    setCopiedTextFromPdf(filteredText);

    toast.success("Text selected for chat!");
    setAreaContextMenu(null);
    setAreaDropdownOpen(false);
    
    // Refocus the chat input after a brief delay to allow UI updates
    setTimeout(() => focusChatInput(), 100);
  };

  return {
    isSelecting,
    selectionStart,
    selectionEnd,
    currentSelectedArea,
    areaContextMenu,
    areaDropdownOpen,
    setAreaDropdownOpen,
    overlayRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleAreaCopyText,
    handleAreaChatWithText,
    setAreaContextMenu,
  };
};
