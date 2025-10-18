import { Express, Router, Request, Response } from "express";
import { verifyAuth } from "#middleware/auth";
import { AuthenticatedRequest } from "#shared/types";
import {
  getAllNotesUseCase,
  getNoteUseCase,
  createNoteUseCase,
  updateNoteUseCase,
  deleteNoteUseCase,
} from "#use-case/notes/notes.js";

export default function notesRoutes(app: Express) {
  const router = Router();
  const prefix = "/api/notes";

  // Apply auth middleware to all note routes
  router.use(verifyAuth);

  // Get all notes for a user
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

      const notes = await getAllNotesUseCase(userId);

      res.json({
        success: true,
        notes,
      });
    } catch (error) {
      console.error("Error getting notes:", error);
      res.status(500).json({ success: false, error: "Failed to get notes" });
    }
  });

  // Get a specific note
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
      const note = await getNoteUseCase(id, userId);

      if (!note) {
        return res.status(404).json({ success: false, error: "Note not found" });
      }

      res.json({
        success: true,
        note,
      });
    } catch (error) {
      console.error("Error getting note:", error);
      res.status(500).json({ success: false, error: "Failed to get note" });
    }
  });

  // Create a new note
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

      const { title, content, folderId } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: title, content",
        });
      }

      const note = await createNoteUseCase(title, content, userId, folderId);

      res.json({
        success: true,
        note,
      });
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ success: false, error: "Failed to create note" });
    }
  });

  // Update a note
  router.put("/:id", async (req: Request, res: Response) => {
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
      const { title, content, folderId } = req.body;

      const updateData: { title?: string; content?: any; folderId?: string } = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (folderId !== undefined) updateData.folderId = folderId;

      const note = await updateNoteUseCase(id, userId, updateData);

      if (!note) {
        return res.status(404).json({ success: false, error: "Note not found" });
      }

      res.json({
        success: true,
        note,
      });
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ success: false, error: "Failed to update note" });
    }
  });

  // Delete a note
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

      const deleted = await deleteNoteUseCase(id, userId);

      if (!deleted) {
        return res.status(404).json({ success: false, error: "Note not found" });
      }

      res.json({
        success: true,
        message: "Note deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ success: false, error: "Failed to delete note" });
    }
  });

  app.use(prefix, router);
}

