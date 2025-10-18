import { Response } from "express";
import { StreamingEvent } from "../types";
import { saveMessage } from "../data_access";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getChatStream = async (
  message: string,
  chatId: string,
  userId: string
): Promise<{ send: (res: Response) => Promise<void>; messageId: string }> => {
  // Create assistant message ID
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sendToStream = async (res: Response) => {
    const sendSSEEvent = (event: StreamingEvent) => {
      const eventData = JSON.stringify(event);
      res.write(`data: ${eventData}\n\n`);
    };

    try {
      // 1. Send message-start event
      sendSSEEvent({
        type: "message-start",
        id: messageId,
      });

      await delay(300);

      // 2. Simulate reasoning process
      const reasoningTexts = [
        "Analyzing your message...",
        "Processing the content...",
        "Preparing response...",
      ];

      sendSSEEvent({ type: "reasoning-started" });
      await delay(200);

      for (const reasoningText of reasoningTexts) {
        // Stream reasoning character by character
        for (let i = 0; i < reasoningText.length; i++) {
          sendSSEEvent({
            type: "reasoning-delta",
            delta: reasoningText[i],
          });
          await delay(30); // 30ms between characters
        }
        await delay(300); // Pause between reasoning steps
      }

      sendSSEEvent({ type: "reasoning-end" });
      await delay(300);

      // 3. Stream the echo response character by character
      const responseText = `Echo: ${message}`;

      for (let i = 0; i < responseText.length; i++) {
        sendSSEEvent({
          type: "content",
          content: responseText[i],
        });
        await delay(50); // 50ms between characters for slower streaming
      }

      await delay(200);

      // 4. Save the complete message to storage
      saveMessage(chatId, userId, "assistant", responseText);

      // 5. Send message-end event
      sendSSEEvent({
        type: "message-end",
        id: messageId,
      });

      res.end();
    } catch (error) {
      sendSSEEvent({
        type: "error",
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      });
      res.end();
    }
  };

  return {
    send: sendToStream,
    messageId,
  };
};

