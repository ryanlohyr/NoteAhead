import { Response } from "express";
import OpenAI from "openai";
import { StreamingEvent } from "../types";
import { saveMessage } from "../data_access";
import { addNumbersTool, searchKnowledgeBaseTool, executeTool } from "../tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tool definitions
const tools = [addNumbersTool, searchKnowledgeBaseTool];

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

      const inputMessages: Array<{
        role: string;
        content: string | Array<{ type: string; text: string }>;
      }> = [
        {
          role: "user",
          content: [{ type: "input_text", text: message }],
        },
      ];

      let fullResponse = "";
      let isComplete = false;
      const maxIterations = 10;
      let iterations = 0;

      // Use a while loop to handle potential multiple tool calls (agentic loop)
      while (!isComplete && iterations < maxIterations) {
        iterations++;

        const systemInstruction = `You are a helpful AI assistant. 
        
When users ask about their documents or uploaded files, use the search_knowledge_base tool to find relevant information.
When asked to add numbers, use the addNumbers function.

Always provide clear, helpful responses based on the tools available to you.`;

        // Use OpenAI Responses API with o3 model
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream: any = await openai.responses.create({
          input: [
            {
              role: "developer",
              content: systemInstruction,
            },
            ...inputMessages,
          ],
          model: "o3-mini",
          stream: true,
          reasoning: {
            effort: "medium",
            summary: "auto",
          },
          tools: iterations === maxIterations ? undefined : tools,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        let currentFunctionCalls: Array<{
          id: string;
          name: string;
          arguments: string;
        }> = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let responseOutput: Array<Record<string, any>> = [];

        // Process the stream events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const event of stream as any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eventAny = event as any;
          if (eventAny.type === "response.output_text.delta") {
            fullResponse += eventAny.delta;
            sendSSEEvent({
              type: "content",
              content: eventAny.delta,
            });
          } else if (eventAny.type === "response.reasoning_summary_part.added") {
            sendSSEEvent({ type: "reasoning-started" });
          } else if (eventAny.type === "response.reasoning_summary_text.delta") {
            sendSSEEvent({ type: "reasoning-delta", delta: eventAny.delta });
          } else if (eventAny.type === "response.reasoning_summary_text.done") {
            sendSSEEvent({ type: "reasoning-end" });
          } else if (eventAny.type === "response.completed") {
            responseOutput = eventAny.response.output;
          }
        }

        // Extract function calls from response output
        currentFunctionCalls = responseOutput
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: Record<string, any>) => item.type === "function_call")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: Record<string, any>) => ({
            id: item.call_id as string,
            name: item.name as string,
            arguments: item.arguments as string,
          }));

        console.log(`Iteration ${iterations}: Found ${currentFunctionCalls.length} function calls`);

        // If no function calls, we're done
        if (currentFunctionCalls.length === 0) {
          isComplete = true;
          break;
        }

        // Send function calls to execute event
        sendSSEEvent({
          type: "function_calls_to_execute",
          functionCallsToExecute: currentFunctionCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            arguments: JSON.parse(fc.arguments),
          })),
        });

        // Execute function calls
        const functionCallResults: string[] = [];
        for (const functionCall of currentFunctionCalls) {
          try {
            const args = JSON.parse(functionCall.arguments);
            const result = await executeTool(functionCall.name, args, { userId });

            // Send function call result event
            sendSSEEvent({
              type: "function_call_result",
              id: functionCall.id,
              result,
            });

            functionCallResults.push(`
Function: ${functionCall.name}
Arguments: ${JSON.stringify(args)}
Result: ${JSON.stringify(result)}
`);
          } catch (error) {
            const errorResult = {
              error: error instanceof Error ? error.message : "Function execution failed",
            };
            sendSSEEvent({
              type: "function_call_result",
              id: functionCall.id,
              result: errorResult,
            });
            functionCallResults.push(`
Function: ${functionCall.name}
Error: ${errorResult.error}
`);
          }
        }

        // Add assistant response with function results back to conversation
        inputMessages.push({
          role: "assistant",
          content: `Function call results:\n${functionCallResults.join("\n")}`,
        });
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
      console.error("Error in chat stream:", error);
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

