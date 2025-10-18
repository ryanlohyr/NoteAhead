import { Express, Router, Response } from "express";
import { verifyAuth, AuthRequest } from "../../../middleware/auth";
import { StreamTextRequestBody, StreamingEvent } from "../types";
import { createChat, getChatById, saveMessage } from "../data_access";
import { getChatStream } from "../use_cases/use-case";

function chatRoutes(app: Express) {
  const router = Router();
  const prefix = "/chat";

  // Apply auth middleware to all chat routes
  router.use(verifyAuth);

  // POST /api/chat/stream-text - Stream chat responses with SSE
  router.post("/stream-text", async (req: AuthRequest, res: Response) => {
    // Disable timeout for streaming - allow unlimited time
    req.setTimeout(0);

    try {
      const { message, chatId: providedChatId } = req.body as StreamTextRequestBody;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      // Create or get chat
      let chatId = providedChatId;
      if (!chatId) {
        const chat = createChat(userId, "New Chat");
        chatId = chat.id;
      } else {
        // Verify chat exists and belongs to user
        const chat = getChatById(chatId);
        if (!chat) {
          return res.status(404).json({
            success: false,
            message: "Chat not found",
          });
        }
        if (chat.userId !== userId) {
          return res.status(403).json({
            success: false,
            message: "Access denied",
          });
        }
      }

      // Save user message
      saveMessage(chatId, userId, "user", message.trim());

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

      // Handle client disconnect
      let interrupted = false;
      res.on("close", () => {
        interrupted = true;
        console.log("Client disconnected from stream");
      });

      // Get and send the stream
      const { send } = await getChatStream(message.trim(), chatId, userId);
      await send(res);
    } catch (error) {
      console.error("Error in stream-text endpoint:", error);

      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const sendSSEEvent = (event: StreamingEvent) => {
          const eventData = JSON.stringify(event);
          res.write(`data: ${eventData}\n\n`);
        };

        sendSSEEvent({
          type: "error",
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.end();
    }
  });

  app.use(prefix, router);
}

export default chatRoutes;

