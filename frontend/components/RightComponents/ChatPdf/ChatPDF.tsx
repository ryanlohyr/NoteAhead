"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useFileManagerStore } from "@/store/fileManager";
import { Download, X, Plus, Minus, ChevronDown, Search, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { LinesJsonPage } from "@/components/Database/types";
import { TextOverlay } from "./TextOverlay/TextOverlay";
import { useSearchInPDF } from "./hooks/useSearchInPDF";
import { useScrollTracking } from "./hooks/useScrollTracking";
import { MAX_WIDTH_PDF, MIN_WIDTH_PDF, ZOOM_LEVELS } from "./constants";

// Configure PDF.js worker only on client side
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs`;
}

interface ChatPDFProps {
  pdfUrl: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
  linesJsonPages: LinesJsonPage[] | undefined;
  fileId: string;
}

export default function ChatPDF({
  pdfUrl,
  fileName,
  onClose,
  onDownload,
  linesJsonPages,
  fileId,
}: ChatPDFProps) {
  const [isClient, setIsClient] = useState(false);
  const [containerWidth, setContainerWidth] = useState(500);
  const [pageInputValue, setPageInputValue] = useState("");

  // Use global file manager store
  const {
    numPages,
    currentPage,
    scale,
    pdfError,
    setNumPages,
    setCurrentPage,
    setPDFError,
    setScrollToPageRef,
  } = useFileManagerStore();

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track container width for responsive PDF sizing with debouncing
  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    let debounceTimer: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver((entries) => {
      // Clear existing timer
      clearTimeout(debounceTimer);

      // Set new timer to debounce the resize updates
      debounceTimer = setTimeout(() => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          // Calculate appropriate PDF width based on container width
          // Leave some padding and ensure minimum readable size
          const pdfWidth = Math.max(MIN_WIDTH_PDF, Math.min(MAX_WIDTH_PDF, width * 0.85));

          setContainerWidth(pdfWidth);
        }
      }, 150); // 150ms debounce delay
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(debounceTimer);
      resizeObserver.disconnect();
    };
  }, [isClient]);

  // Refs for scrolling and container width tracking
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Search functionality
  const {
    searchTerm,
    searchResults,
    currentSearchResult,
    isSearchOpen,
    searchInputRef,
    handleSearchChange,
    goToNextSearchResult,
    goToPreviousSearchResult,
    toggleSearch,
    scrollToPageLocal,
  } = useSearchInPDF({
    linesJsonPages,
    pageRefs,
    pdfContainerRef,
    setCurrentPage,
  });

  // Track scroll position and update current page
  useScrollTracking({
    pdfContainerRef,
    pageRefs,
    isClient,
    setCurrentPage,
  });

  // Memoize options to prevent unnecessary reloads
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: "https://unpkg.com/pdfjs-dist@5.3.31/cmaps/",
      cMapPacked: true,
    }),
    []
  );

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPDFError(null);
    },
    [setNumPages, setPDFError]
  );

  const onDocumentLoadError = useCallback(
    (error: Error) => {
      const errorMessage = error.message || "Unknown PDF loading error";

      // Check if it's a blob URL issue
      if (errorMessage.includes("server response (0)")) {
        setPDFError("Failed to load PDF file. The file may be corrupted or unavailable.");
      } else {
        setPDFError(errorMessage);
      }

      toast.error("PDF Loading Error", {
        description: `Failed to load PDF: ${errorMessage}`,
      });
    },
    [setPDFError]
  );

  // Add effect to handle PDF URL changes
  useEffect(() => {
    if (pdfUrl && pdfUrl.startsWith("blob:")) {
      // Reset error state when new PDF URL is received
      setPDFError(null);
    }
  }, [pdfUrl, setPDFError]);

  // Update page input when current page changes
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue);
    if (pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
      scrollToPageLocal(pageNum);
    } else {
      // Reset to current page if invalid
      setPageInputValue(currentPage.toString());
      toast.error(`Please enter a page number between 1 and ${numPages}`);
    }
  };

  const handleZoomIn = () => {
    const newScale = Math.min(3, scale + 0.05); // Max 300%, increment by 5%
    useFileManagerStore.setState({ scale: newScale });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.25, scale - 0.05); // Min 25%, decrement by 5%
    useFileManagerStore.setState({ scale: newScale });
  };

  const handleZoomSelect = (newScale: number) => {
    useFileManagerStore.setState({ scale: newScale });
  };

  // Predefined zoom levels

  // Set page ref when page renders
  const setPageRef = (pageNumber: number) => (el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current[pageNumber] = el;
    }
  };

  // Register scroll function with global store
  useEffect(() => {
    setScrollToPageRef(scrollToPageLocal);

    // Clean up on unmount
    return () => {
      setScrollToPageRef(null);
    };
  }, [scrollToPageLocal, setScrollToPageRef]);

  // Don't clean up blob URL here - let the store handle it
  // The PDF.js library needs the blob URL to remain available

  // Don't render PDF components until client-side
  if (!isClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading PDF viewer...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full">
      {/* PDF Header */}
      <div className="max-w-full w-full border-b border-border bg-muted/30">
        <div className="p-3 flex justify-between items-center gap-3">
          <div className="flex-1 min-w-0 max-w-[200px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-sm font-medium truncate">{fileName}</h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{fileName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center">
              {!isSearchOpen ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={toggleSearch}
                  className="h-7 px-2"
                >
                  <Search className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="h-7 w-40 pl-7 pr-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          toggleSearch();
                        } else if (e.key === 'Enter' && searchResults.length > 0) {
                          goToNextSearchResult();
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.relatedTarget?.closest('[data-search-nav]') && !searchTerm) {
                          toggleSearch();
                        }
                      }}
                    />
                    <Search className="h-3 w-3 absolute left-2 top-2 text-muted-foreground" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleSearch}
                      className="absolute right-0 top-0 h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-1" data-search-nav>
                      <span className="text-xs text-muted-foreground">
                        {currentSearchResult} of {searchResults.length}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={goToPreviousSearchResult}
                        className="h-6 w-6 p-0"
                        data-search-nav
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={goToNextSearchResult}
                        className="h-6 w-6 p-0"
                        data-search-nav
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Page Navigation */}
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
              <Input
                type="number"
                value={pageInputValue}
                onChange={handlePageInputChange}
                className="w-12 h-7 text-xs text-center p-1"
                min={1}
                max={numPages}
              />
              <span className="text-sm text-muted-foreground">/ {numPages}</span>
            </form>

            {/* Zoom Control */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 px-2 gap-1">
                  <span className="text-xs">{Math.round(scale * 100)}%</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-center gap-2 p-2">
                  <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
                  <Button size="sm" variant="outline" onClick={handleZoomIn} className="h-6 w-6 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleZoomOut} className="h-6 w-6 p-0">
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
                <DropdownMenuSeparator />
                {ZOOM_LEVELS.map((level) => (
                  <DropdownMenuItem
                    key={level}
                    onClick={() => handleZoomSelect(level)}
                    className={scale === level ? "bg-accent" : ""}
                  >
                    {Math.round(level * 100)}%
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" onClick={onDownload} className="h-7 px-2">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="p-0 h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Document - Scrollable All Pages View */}
      <div className="flex-1 overflow-hidden max-w-full w-full">
        <div className="h-full overflow-auto max-w-full" ref={pdfContainerRef} >
          <div className="p-4 flex flex-col items-center space-y-4 max-w-full">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-destructive">
                    Failed to load PDF
                    {pdfError && <div className="text-xs mt-2">Error: {pdfError}</div>}
                    <div className="text-xs mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(pdfUrl, "_blank")}
                        className="mt-2"
                      >
                        Try opening in new tab
                      </Button>
                    </div>
                  </div>
                </div>
              }
              options={pdfOptions}
            >
              {[...Array(numPages)].map((_, index) => {
                const pageNumber = index + 1;
                const pageData = linesJsonPages?.find((p) => p.page === pageNumber);

                return (
                  <div
                    key={`page_${pageNumber}`}
                    ref={setPageRef(pageNumber)}
                    className="mb-6 transition-all duration-300 relative max-w-full overflow-scroll"
                  >
                    <div className="relative inline-block">
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        className="shadow-lg border border-gray-200"
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={containerWidth}
                      />

                      {pageData && pageData.lines && pageData.lines.length > 0 && (
                        <TextOverlay
                          linesData={pageData.lines}
                          pageWidth={pageData.page_width}
                          pageHeight={pageData.page_height}
                          containerWidth={containerWidth}
                          scale={scale}
                          pageNumber={pageNumber}
                          fileId={fileId}
                          searchResults={searchResults.filter(result => result.pageNumber === pageNumber)}
                          currentSearchResult={searchResults.length > 0 ? searchResults[currentSearchResult - 1] : undefined}
                        />
                      )}
                    </div>
                    <div className="text-center mt-2 text-sm text-muted-foreground">
                      Page {pageNumber}
                    </div>
                  </div>
                );
              })}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
