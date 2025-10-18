import { Response } from "express";
import OpenAI from "openai";
import { StreamingEvent } from "../types";
import { saveMessage } from "../data_access";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tool definition: Add two numbers
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "addNumbers",
      description: "Add two numbers together and return the sum",
      parameters: {
        type: "object",
        properties: {
          a: {
            type: "number",
            description: "The first number to add",
          },
          b: {
            type: "number",
            description: "The second number to add",
          },
        },
        required: ["a", "b"],
      },
    },
  },
];

// Tool implementation
async function addNumbers(args: { a: number; b: number }): Promise<number> {
  const { a, b } = args;
  return a + b;
}

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

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content:
            "You are a helpful assistant. When asked to add numbers, use the addNumbers function.",
        },
        {
          role: "user",
          content: message,
        },
      ];

      let fullResponse = "";
      let isComplete = false;

      // Use a while loop to handle potential multiple tool calls
      while (!isComplete) {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          tools: tools,
          tool_choice: "auto",
          stream: true,
        });

        let currentToolCalls: {
          id: string;
          name: string;
          arguments: string;
        }[] = [];

        // Process the stream
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          // Handle content streaming
          if (delta?.content) {
            fullResponse += delta.content;
            sendSSEEvent({
              type: "content",
              content: delta.content,
            });
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index;
              if (!currentToolCalls[index]) {
                currentToolCalls[index] = {
                  id: toolCall.id || "",
                  name: toolCall.function?.name || "",
                  arguments: "",
                };
              }
              if (toolCall.function?.arguments) {
                currentToolCalls[index].arguments +=
                  toolCall.function.arguments;
              }
            }
          }

          // Check if we're done
          if (chunk.choices[0]?.finish_reason) {
            const finishReason = chunk.choices[0].finish_reason;

            if (finishReason === "tool_calls" && currentToolCalls.length > 0) {
              // Send reasoning event for tool call
              sendSSEEvent({ type: "reasoning-started" });
              sendSSEEvent({
                type: "reasoning-delta",
                delta: `Calling function: ${currentToolCalls[0].name}...`,
              });
              sendSSEEvent({ type: "reasoning-end" });

              // Execute tool calls
              const toolResults = [];
              for (const toolCall of currentToolCalls) {
                let result: string;
                try {
                  const args = JSON.parse(toolCall.arguments);

                  if (toolCall.name === "addNumbers") {
                    const sum = await addNumbers(args);
                    result = JSON.stringify({ sum });
                  } else {
                    result = JSON.stringify({ error: "Unknown function" });
                  }
                } catch (error) {
                  result = JSON.stringify({
                    error:
                      error instanceof Error
                        ? error.message
                        : "Function execution failed",
                  });
                }

                toolResults.push({
                  tool_call_id: toolCall.id,
                  role: "tool" as const,
                  content: result,
                });
              }

              // Add assistant message with tool calls
              messages.push({
                role: "assistant",
                tool_calls: currentToolCalls.map((tc) => ({
                  id: tc.id,
                  type: "function" as const,
                  function: {
                    name: tc.name,
                    arguments: tc.arguments,
                  },
                })),
              });

              // Add tool results to messages
              messages.push(...toolResults);

              // Continue the loop to get final response
              currentToolCalls = [];
            } else {
              // No more tool calls, we're done
              isComplete = true;
            }
          }
        }
      }

      // Save the complete message to storage
      saveMessage(chatId, userId, "assistant", fullResponse);

      // Send message-end event
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

