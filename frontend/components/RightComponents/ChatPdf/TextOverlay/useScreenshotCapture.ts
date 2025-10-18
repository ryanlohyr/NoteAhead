import { toast } from "sonner";
import { useChatStore } from "@/store/chat";
import { useFileUpload } from "@/components/chats/hooks/useFileUpload";
import { AttachedFile } from "@/components/chats/types";

export const useScreenshotCapture = (pageNumber: number, fileId: string) => {
  const { setAttachedFiles } = useChatStore();
  const { uploadFiles } = useFileUpload();

  const captureAreaScreenshot = async (
    area: { x: number; y: number; width: number; height: number },
    overlayRef: React.RefObject<HTMLDivElement>
  ) => {
    try {
      if (!overlayRef.current) return null;

      // Find the PDF page element
      const pdfPageElement = overlayRef.current.parentElement?.querySelector("canvas");
      if (!pdfPageElement) {
        toast.error("Could not find PDF canvas for screenshot");
        return null;
      }

      const pdfCanvas = pdfPageElement as HTMLCanvasElement;
      
      // Calculate the scaling factor between overlay coordinates and canvas coordinates
      const canvasRect = pdfCanvas.getBoundingClientRect();
      
      // The canvas internal dimensions vs its display dimensions
      const canvasScaleX = pdfCanvas.width / canvasRect.width;
      const canvasScaleY = pdfCanvas.height / canvasRect.height;
      
      // Convert overlay coordinates to canvas coordinates
      const canvasX = area.x * canvasScaleX;
      const canvasY = area.y * canvasScaleY;
      const canvasWidth = area.width * canvasScaleX;
      const canvasHeight = area.height * canvasScaleY;

      // Create a temporary canvas to capture the selected area
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Set canvas dimensions accounting for device pixel ratio for crisp output
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw the selected area from the PDF canvas
      ctx.drawImage(
        pdfCanvas,
        canvasX,
        canvasY,
        canvasWidth,
        canvasHeight, // Source rectangle from PDF canvas
        0,
        0,
        canvasWidth,
        canvasHeight // Destination rectangle on output canvas
      );

      // Convert to blob
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      toast.error("Failed to capture screenshot");
      return null;
    }
  };

  const handleAreaCopyImage = async (
    area: { x: number; y: number; width: number; height: number },
    overlayRef: React.RefObject<HTMLDivElement>
  ) => {
    const blob = await captureAreaScreenshot(area, overlayRef);
    if (blob) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Screenshot copied to clipboard!");

      } catch (err) {
        console.error("Clipboard error:", err);
        toast.error("Failed to copy screenshot to clipboard");
      }
    }
  };

  const handleAreaChat = async (
    area: { x: number; y: number; width: number; height: number },
    overlayRef: React.RefObject<HTMLDivElement>
  ) => {
    const blob = await captureAreaScreenshot(area, overlayRef);
    if (blob) {
      try {
        // Create a File object from the blob with a descriptive name
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `pdf-screenshot-page-${pageNumber}-${timestamp}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        
        // Create enhanced setAttachedFiles function that adds our metadata
        const enhancedSetAttachedFiles = (updater: React.SetStateAction<AttachedFile[]>) => {
          if (typeof updater === 'function') {
            setAttachedFiles((prev) => {
              const newFiles = updater(prev);
              // Find the newly added file and enhance it with page number and file ID
              return newFiles.map((attachedFile: AttachedFile) => {
                if (attachedFile.fileName === fileName && !attachedFile.pageNumber) {
                  return {
                    ...attachedFile,
                    pageNumber,
                    sourceFileId: fileId,
                    description: `Screenshot from page ${pageNumber}`,
                  };
                }
                return attachedFile;
              });
            });
          } else {
            setAttachedFiles(updater);
          }
        };
        
        // Use uploadFiles with our enhanced setAttachedFiles function
        uploadFiles([file], enhancedSetAttachedFiles);

      } catch (error) {
        console.error("Error creating file from screenshot:", error);
        toast.error("Failed to add screenshot to attachments");
      }
    }
  };

  return {
    captureAreaScreenshot,
    handleAreaCopyImage,
    handleAreaChat,
  };
};
