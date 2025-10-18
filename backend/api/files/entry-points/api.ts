import { Express, Router, Request, Response } from "express";
import { verifyAuth } from "#middleware/auth";
import { AuthenticatedRequest } from "#shared/types";
import {
  getAllFilesUseCase,
  getFileUseCase,
  createFileUseCase,
  batchCreateFilesUseCase,
  deleteFileUseCase,
  downloadFileUseCase,
  processFileForEmbeddings,
  getProcessingFilesUseCase,
  retryFileProcessingUseCase,
} from "#use-case/files/files.js";

export default function filesRoutes(app: Express) {
  const router = Router();
  const prefix = "/api/files";

  // Apply auth middleware to all file routes
  router.use(verifyAuth);

  // Get all files for a user
  router.get("/", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const files = await getAllFilesUseCase(userId);
      
      // Map database fields to API response format
      const mappedFiles = files.map((file) => ({
        id: file.id,
        name: file.name,
        userId: file.userId,
        storageUrl: file.s3Url,
        fileType: file.mimeType,
        embeddingsStatus: file.embeddingsStatus,
        summary: file.summary,
        linesJsonPages: file.linesJsonPages,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));

      res.json({
        success: true,
        files: mappedFiles,
      });
    } catch (error) {
      console.error("Error getting files:", error);
      res.status(500).json({ success: false, error: "Failed to get files" });
    }
  });

  // Get files that are currently processing or failed (for monitoring)
  // IMPORTANT: This must come BEFORE the /:id route to avoid matching "processing-status" as an ID
  router.get("/processing-status", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const files = await getProcessingFilesUseCase(userId);

      // Map database fields to API response format
      const mappedFiles = files.map((file) => ({
        id: file.id,
        name: file.name,
        embeddingsStatus: file.embeddingsStatus,
      }));

      res.json({
        success: true,
        files: mappedFiles,
      });
    } catch (error) {
      console.error("Error getting processing files:", error);
      res.status(500).json({ success: false, error: "Failed to get processing files" });
    }
  });

  // Get a specific file
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;
      const file = await getFileUseCase(id, userId);
      
      if (!file) {
        return res.status(404).json({ success: false, error: "File not found" });
      }

      // Map database fields to API response format
      const mappedFile = {
        id: file.id,
        name: file.name,
        userId: file.userId,
        storageUrl: file.s3Url,
        fileType: file.mimeType,
        embeddingsStatus: file.embeddingsStatus,
        summary: file.summary,
        linesJsonPages: file.linesJsonPages,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      res.json({
        success: true,
        file: mappedFile,
      });
    } catch (error) {
      console.error("Error getting file:", error);
      res.status(500).json({ success: false, error: "Failed to get file" });
    }
  });

  // Create a new file
  router.post("/", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { name, storageUrl, fileType } = req.body;

      if (!name || !storageUrl || !fileType) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: name, storageUrl, fileType",
        });
      }

      const file = await createFileUseCase(
        name,
        storageUrl,
        fileType,
        userId
      );

      // Map database fields to API response format
      const mappedFile = {
        id: file.id,
        name: file.name,
        userId: file.userId,
        storageUrl: file.s3Url,
        fileType: file.mimeType,
        embeddingsStatus: file.embeddingsStatus,
        summary: file.summary,
        linesJsonPages: file.linesJsonPages,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      res.json({
        success: true,
        file: mappedFile,
      });

      // Process file for embeddings in background (don't await)
      processFileForEmbeddings(file, userId).catch((error) => {
        console.error("Error processing file for embeddings:", error);
      });
    } catch (error) {
      console.error("Error creating file:", error);
      res.status(500).json({ success: false, error: "Failed to create file" });
    }
  });

  // Batch create files
  router.post("/batch", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { files } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Missing or invalid files array",
        });
      }

      // Validate each file has required fields
      for (const file of files) {
        if (!file.name || !file.storageUrl || !file.fileType) {
          return res.status(400).json({
            success: false,
            error: "Each file must have name, storageUrl, and fileType",
          });
        }
      }

      const createdFiles = await batchCreateFilesUseCase(files, userId);

      // Map database fields to API response format
      const mappedFiles = createdFiles.map((file) => ({
        id: file.id,
        name: file.name,
        userId: file.userId,
        storageUrl: file.s3Url,
        fileType: file.mimeType,
        embeddingsStatus: file.embeddingsStatus,
        summary: file.summary,
        linesJsonPages: file.linesJsonPages,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));

      res.json({
        success: true,
        files: mappedFiles,
      });

      // Process all files for embeddings in background (don't await)
      for (const file of createdFiles) {
        processFileForEmbeddings(file, userId).catch((error) => {
          console.error(`Error processing file ${file.id} for embeddings:`, error);
        });
      }
    } catch (error) {
      console.error("Error batch creating files:", error);
      res.status(500).json({ success: false, error: "Failed to batch create files" });
    }
  });

  // Delete a file
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;

      const deleted = await deleteFileUseCase(id, userId);

      if (!deleted) {
        return res.status(404).json({ success: false, error: "File not found" });
      }

      res.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ success: false, error: "Failed to delete file" });
    }
  });

  // Poll file processing status
  router.get("/:id/poll", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;

      const file = await getFileUseCase(id, userId);

      if (!file) {
        return res.status(404).json({ success: false, error: "File not found" });
      }

      // Map database fields to API response format with status
      const mappedFile = {
        id: file.id,
        name: file.name,
        userId: file.userId,
        storageUrl: file.s3Url,
        fileType: file.mimeType,
        embeddingsStatus: file.embeddingsStatus,
        summary: file.summary,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      res.json({
        success: true,
        status: file.embeddingsStatus,
        file: mappedFile,
      });
    } catch (error) {
      console.error("Error polling file status:", error);
      res.status(500).json({ success: false, error: "Failed to poll file status" });
    }
  });

  // Download a file blob
  router.get("/:id/download", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;

      const { blob, fileName, mimeType } = await downloadFileUseCase(id, userId);

      if (!blob) {
        return res.status(404).json({ success: false, error: "File not found" });
      }

      // Sanitize filename to remove invalid characters for HTTP headers
      // Remove or replace characters that are invalid in HTTP headers
      const sanitizedFileName = fileName
        .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII characters
        .replace(/"/g, '\\"'); // Escape quotes

      // Set appropriate headers for file download
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${sanitizedFileName}"`);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
      );
      
      // Convert blob buffer to stream and pipe to response
      res.send(blob);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ success: false, error: "Failed to download file" });
    }
  });

  // Retry file processing
  router.post("/:id/retry-processing", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
      }

      const { id } = req.params;

      await retryFileProcessingUseCase(id, userId);

      res.json({
        success: true,
        message: "File processing retry started",
      });
    } catch (error) {
      console.error("Error retrying file processing:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to retry file processing",
      });
    }
  });

  app.use(prefix, router);
}

