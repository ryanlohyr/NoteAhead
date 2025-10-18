import { Express, Router, Request, Response } from "express";
import { verifyAuth } from "#middleware/auth";
import { AuthenticatedRequest } from "#shared/types";
import {
  getAllFilesUseCase,
  getFileUseCase,
  createFileUseCase,
  batchCreateFilesUseCase,
  deleteFileUseCase,
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
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      res.json({
        success: true,
        file: mappedFile,
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
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));

      res.json({
        success: true,
        files: mappedFiles,
      });
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

  app.use(prefix, router);
}

