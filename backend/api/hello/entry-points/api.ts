import { Express, Request, Response } from "express";

export default function helloRoutes(app: Express) {
  const API_PREFIX = "/api";

  app.get(`${API_PREFIX}/hello`, async (req: Request, res: Response) => {
    try {
      res.json({
        message: "Hello from NoteAhead Backend! 🚀",
        timestamp: new Date().toISOString(),
        status: "success",
      });
    } catch (error) {
      console.error("Error in hello endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

