import { useCallback, useRef, useState } from "react";
import { LinesJsonPage } from "@/components/Database/types";
import { SCROLL_PADDING } from "../constants";

interface SearchResult {
  pageNumber: number;
  lineId: string;
  text: string;
  matchStart: number;
  matchEnd: number;
}

interface UseSearchInPDFProps {
  linesJsonPages: LinesJsonPage[] | undefined;
  pageRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement }>;
  pdfContainerRef: React.RefObject<HTMLDivElement>;
  setCurrentPage: (page: number) => void;
}

export const useSearchInPDF = ({
  linesJsonPages,
  pageRefs,
  pdfContainerRef,
  setCurrentPage,
}: UseSearchInPDFProps) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchResult, setCurrentSearchResult] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Enhanced scroll function that can scroll to specific line
  const scrollToSearchResult = useCallback(
    (pageNumber: number, lineId?: string) => {
      const pageElement = pageRefs.current[pageNumber];
      const container = pdfContainerRef.current;

      if (pageElement && container) {
        // Set current page in global store
        setCurrentPage(pageNumber);

        let scrollTop = pageElement.offsetTop - 140; // Default page scroll with padding

        // If we have a specific line ID, try to scroll to that line
        if (lineId) {
          // Find the line element within the page by looking for elements with the line ID
          // The line elements are in the TextOverlay component
          const lineElements = pageElement.querySelectorAll(`[data-line-id="${lineId}"]`);
          if (lineElements.length > 0) {
            const lineElement = lineElements[0] as HTMLElement;
            const lineTop = pageElement.offsetTop + lineElement.offsetTop;
            scrollTop = lineTop - SCROLL_PADDING; // Scroll so line is near the top with some padding
          }
        }

        // Scroll to the calculated position
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });

        // Visual feedback on the page
        pageElement.style.boxShadow = "0 0 15px rgba(245, 158, 11, 0.3)";
        setTimeout(() => {
          pageElement.style.boxShadow = "";
        }, 1500);
      }
    },
    [pageRefs, pdfContainerRef, setCurrentPage]
  );

  // Search functionality - Exact case-sensitive search
  const performSearch = useCallback(
    (term: string) => {
      if (!term.trim() || !linesJsonPages) {
        setSearchResults([]);
        setCurrentSearchResult(0);
        return;
      }

      const results: SearchResult[] = [];

      linesJsonPages.forEach((page) => {
        if (page.lines) {
          page.lines.forEach((line) => {
            if (
              line.text_display &&
              line.text_display.trim().length > 0 &&
              !line.text_display.includes("cdn.mathpix")
            ) {
              let index = 0;

              while (index < line.text_display.length) {
                const matchIndex = line.text_display.indexOf(term, index);
                if (matchIndex === -1) break;

                results.push({
                  pageNumber: page.page,
                  lineId: line.id || `line-${page.page}-${index}`,
                  text: line.text_display || line.text,
                  matchStart: matchIndex,
                  matchEnd: matchIndex + term.length,
                });

                index = matchIndex + 1;
              }
            }
          });
        }
      });

      setSearchResults(results);
      setCurrentSearchResult(results.length > 0 ? 1 : 0);

      // Navigate to first result if found
      if (results.length > 0) {
        scrollToSearchResult(results[0].pageNumber, results[0].lineId);
      }
    },
    [linesJsonPages, scrollToSearchResult]
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    performSearch(value);
  };

  // Navigate search results
  const goToNextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = currentSearchResult >= searchResults.length ? 1 : currentSearchResult + 1;
    setCurrentSearchResult(nextIndex);
    const result = searchResults[nextIndex - 1];
    scrollToSearchResult(result.pageNumber, result.lineId);
  };

  const goToPreviousSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchResult <= 1 ? searchResults.length : currentSearchResult - 1;
    setCurrentSearchResult(prevIndex);
    const result = searchResults[prevIndex - 1];
    scrollToSearchResult(result.pageNumber, result.lineId);
  };

  // Toggle search visibility
  const toggleSearch = () => {
    if (!isSearchOpen) {
      setIsSearchOpen(true);
      // Focus after a brief moment
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setIsSearchOpen(false);
      setSearchTerm("");
      setSearchResults([]);
      setCurrentSearchResult(0);
    }
  };

  // Backward compatibility function for page scrolling
  const scrollToPageLocal = useCallback(
    (pageNumber: number) => {
      scrollToSearchResult(pageNumber);
    },
    [scrollToSearchResult]
  );

  return {
    // State
    searchTerm,
    searchResults,
    currentSearchResult,
    isSearchOpen,
    searchInputRef,
    
    // Functions
    handleSearchChange,
    goToNextSearchResult,
    goToPreviousSearchResult,
    toggleSearch,
    scrollToPageLocal,
    scrollToSearchResult,
  };
};

export type { SearchResult };
