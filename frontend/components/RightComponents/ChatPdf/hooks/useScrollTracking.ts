import { useEffect, RefObject } from 'react';

interface UseScrollTrackingProps {
  pdfContainerRef: RefObject<HTMLDivElement>;
  pageRefs: RefObject<{ [key: number]: HTMLDivElement }>;
  isClient: boolean;
  setCurrentPage: (page: number) => void;
}

/**
 * Custom hook to track scroll position in PDF viewer and update current page
 * based on which page is closest to the center of the viewport
 */
export function useScrollTracking({
  pdfContainerRef,
  pageRefs,
  isClient,
  setCurrentPage,
}: UseScrollTrackingProps) {
  useEffect(() => {
    if (!pdfContainerRef.current || !isClient) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Debounce scroll events
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const container = pdfContainerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        // Find which page is closest to the center of the viewport
        let closestPage = 1;
        let minDistance = Infinity;

        Object.entries(pageRefs.current || {}).forEach(([pageNum, pageElement]) => {
          if (pageElement) {
            const pageRect = pageElement.getBoundingClientRect();
            const pageCenter = pageRect.top + pageRect.height / 2;
            const distance = Math.abs(pageCenter - containerCenter);

            if (distance < minDistance) {
              minDistance = distance;
              closestPage = parseInt(pageNum);
            }
          }
        });

        // Update the current page in the store
        setCurrentPage(closestPage);
      }, 100); // 100ms debounce
    };

    const container = pdfContainerRef.current;
    container.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isClient, setCurrentPage, pdfContainerRef, pageRefs]);
}

