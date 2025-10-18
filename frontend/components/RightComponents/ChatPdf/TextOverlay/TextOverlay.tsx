import { Line } from "@/components/Database/types";
import { Markdown } from "@/components/ui/markdown/Markdown";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTextSelection } from "./useTextSelection";
import { useAreaSelection } from "./useAreaSelection";
import { useScreenshotCapture } from "./useScreenshotCapture";
import { SearchResult } from "../hooks/useSearchInPDF";

// Text overlay component for PDF pages

interface TextOverlayProps {
  linesData: Line[];
  pageWidth: number;
  pageHeight: number;
  containerWidth: number;
  scale: number;
  pageNumber: number;
  fileId: string;
  searchResults?: SearchResult[];
  currentSearchResult?: SearchResult;
}

export const TextOverlay = ({
  linesData,
  pageWidth,
  pageHeight,
  containerWidth,
  scale,
  pageNumber,
  fileId,
  searchResults = [],
  currentSearchResult,
}: TextOverlayProps) => {
  // Calculate the actual rendered PDF dimensions
  const actualPDFWidth = containerWidth * scale;
  const scaleFactorX = actualPDFWidth / pageWidth;
  const scaleFactorY = scaleFactorX; // Maintain aspect ratio

  // Custom hooks
  const {
    hoveredLine,
    setHoveredLine,
    contextMenu,
    dropdownOpen,
    setDropdownOpen,
    handleLineClick,
    handleCopyText,
    handleChat,
    handleOverlayClick,
  } = useTextSelection(pageNumber, fileId);

  const {
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
  } = useAreaSelection(linesData, scaleFactorX, scaleFactorY, pageNumber, fileId);

  const { handleAreaCopyImage, handleAreaChat } = useScreenshotCapture(pageNumber, fileId);

  // Helper function to check if a line has search matches
  const getLineSearchInfo = (lineId: string) => {
    const lineResults = searchResults.filter(result => result.lineId === lineId);
    const isCurrentResult = currentSearchResult && 
      currentSearchResult.lineId === lineId && 
      currentSearchResult.pageNumber === pageNumber;
    
    return {
      hasMatches: lineResults.length > 0,
      isCurrentResult: !!isCurrentResult,
      matchCount: lineResults.length,
    };
  };


  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto cursor-crosshair"
      style={{
        width: actualPDFWidth,
        height: pageHeight * scaleFactorY,
      }}
      onClick={handleOverlayClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {linesData
        .filter((line) => line.text_display && line.text_display.trim().length > 0 && line.region)
        .filter((line) => line.text_display && !line.text_display.includes("cdn.mathpix"))
        .map((line) => {
          if (!line.region) return null;
          
          const scaledX = line.region.top_left_x * scaleFactorX;
          const scaledY = line.region.top_left_y * scaleFactorY;
          const scaledWidth = line.region.width * scaleFactorX;
          const scaledHeight = line.region.height * scaleFactorY;

          const searchInfo = getLineSearchInfo(line.id || '');
          
          // Determine styling based on search state
          let className = "absolute pointer-events-auto cursor-pointer transition-all duration-200 ";
          
          if (searchInfo.isCurrentResult) {
            // Current active search result - gentle amber highlight
            className += "bg-amber-100/60 border border-amber-200/50";
          } else if (searchInfo.hasMatches) {
            // Other search matches - subtle amber highlight
            className += "bg-amber-50/40 border border-amber-100/30";
          } else if (hoveredLine?.id === line.id) {
            // Regular hover state
            className += "bg-blue-200/50 border border-blue-400";
          } else {
            // Default hover state
            className += "hover:bg-blue-100/30 hover:border hover:border-blue-300";
          }

          return (
            <div
              key={line.id}
              data-line-id={line.id}
              className={className}
              style={{
                left: scaledX,
                top: scaledY,
                width: scaledWidth,
                height: scaledHeight,
              }}
              onMouseEnter={() => {
                setHoveredLine(line);
              }}
              onMouseMove={() => {
                // Mouse position tracking removed as tooltip is not currently implemented
              }}
              onMouseLeave={() => {
                if (!isSelecting) setHoveredLine(null);
              }}
              onClick={(e) => {
                if (!isSelecting) {
                  handleLineClick(line, e);
                }
              }}
              title={
                searchInfo.hasMatches 
                  ? `Search match${searchInfo.matchCount > 1 ? `es (${searchInfo.matchCount})` : ''}: ${line.text_display}`
                  : `Click for options: ${line.text_display}`
              }
            />
          );
        })}

      {/* Selection rectangle during drag */}
      {isSelecting && selectionStart && selectionEnd && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-200/20 pointer-events-none"
          style={{
            left: Math.min(selectionStart.x, selectionEnd.x),
            top: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionEnd.x - selectionStart.x),
            height: Math.abs(selectionEnd.y - selectionStart.y),
          }}
        />
      )}

      {/* Current selected area rectangle */}
      {currentSelectedArea && (
        <div
          className="absolute border-2 border-green-500 bg-green-200/20 pointer-events-none"
          style={{
            left: currentSelectedArea.x,
            top: currentSelectedArea.y,
            width: currentSelectedArea.width,
            height: currentSelectedArea.height,
          }}
        />
      )}

      {/* Context Menu using shadcn DropdownMenu */}
      {contextMenu && (
        <div
          className="fixed z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: "translate(-50%, -100%)",
            marginTop: "-8px",
          }}
        >
          <DropdownMenu
            key={`${contextMenu.x}-${contextMenu.y}-${contextMenu.line.id}`}
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <div className="w-0 h-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto min-w-fit p-2" side="top" align="center">
              {/* Selected text preview */}
              <div className="text-xs text-center mb-2 px-2">
                <div className="text-gray-500 mb-1">Selected text:</div>
                <div className="font-medium text-gray-900 truncate max-w-[300px]">
                  {contextMenu.line.text_display || contextMenu.line.text}
                </div>
              </div>
              <DropdownMenuSeparator className="mb-2" />

              {/* Horizontal menu items */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopyText(contextMenu.line)}
                  className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors min-w-[50px]"
                  title="Copy text"
                >
                  <span className="text-lg">📋</span>
                  <span className="text-xs">Copy</span>
                </button>

                <button
                  onClick={() => handleChat(contextMenu.line)}
                  className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors min-w-[50px]"
                  title="Chat"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-xs">Chat</span>
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Area Context Menu */}
      {areaContextMenu && (
        <div
          className="fixed z-50"
          style={{
            left: areaContextMenu.x,
            top: areaContextMenu.y,
            transform: "translate(-50%, -100%)",
            marginTop: "-8px",
          }}
        >
          <DropdownMenu
            key={`area-${areaContextMenu.x}-${areaContextMenu.y}-${areaContextMenu.area.width}x${areaContextMenu.area.height}`}
            open={areaDropdownOpen}
            onOpenChange={setAreaDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <div className="w-0 h-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto min-w-fit p-2" side="top" align="center">
              {/* Selected area preview */}
              <div className="text-xs text-center mb-2 px-2">
                <div className="text-gray-500 mb-1">Selected area:</div>
                <div className="font-medium text-gray-900">
                  {Math.round(areaContextMenu.area.width)} ×{" "}
                  {Math.round(areaContextMenu.area.height)} px
                </div>
              </div>
              <DropdownMenuSeparator className="mb-2" />

              {/* 2x2 grid layout */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    handleAreaCopyImage(areaContextMenu.area, overlayRef);
                    setAreaContextMenu(null);
                    setAreaDropdownOpen(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors min-w-[60px]"
                  title="Copy screenshot"
                >
                  <span className="text-lg">📋</span>
                  <span className="text-xs">Copy as Image</span>
                </button>

                <button
                  onClick={() => handleAreaCopyText(areaContextMenu.area)}
                  className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors min-w-[60px]"
                  title="Copy text from area"
                >
                  <span className="text-lg">📄</span>
                  <span className="text-xs">Copy as Text</span>
                </button>

                <button
                  onClick={() => {
                    handleAreaChatWithText(areaContextMenu.area);
                    setAreaContextMenu(null);
                    setAreaDropdownOpen(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors min-w-[60px]"
                  title="Chat with text from area"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-xs">Chat with Text</span>
                </button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          handleAreaChat(areaContextMenu.area, overlayRef);
                          setAreaContextMenu(null);
                          setAreaDropdownOpen(false);
                        }}
                        className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors min-w-[60px] relative"
                        title="Chat with image from area"
                      >
                        <div className="relative">
                          <span className="text-lg">🖼️</span>
                          <Info className="absolute -top-2 -right-2 h-3 w-3 text-blue-500" />
                        </div>
                        <div className="text-xs text-center leading-tight">
                          <div>Chat with</div>
                          <div>Image</div>
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Chat with image will count as one image upload</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
