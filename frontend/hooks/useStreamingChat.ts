import { useCallback, useRef, useState } from "react";
import { Message, ReasoningStep, MessagePart, FunctionCall } from "@/types/chat";

interface UseStreamingChatProps {
  chatId?: string;
  onMessageUpdate?: (messageId: string, updates: Partial<Message>) => void;
  onError?: (error: Error) => void;
}

interface StreamingError {
  message: string;
  details?: string;
}

interface StreamingChatReturn {
  isConnecting: boolean;
  error: StreamingError | null;
  connectToStream: (messageContent: string) => Promise<void>;
  disconnectStream: () => void;
  clearError: () => void;
}

export const useStreamingChat = ({
  chatId,
  onMessageUpdate,
  onError,
}: UseStreamingChatProps): StreamingChatReturn => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<StreamingError | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const onMessageUpdateRef = useRef(onMessageUpdate);
  const onErrorRef = useRef(onError);

  onMessageUpdateRef.current = onMessageUpdate;
  onErrorRef.current = onError;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((errorMessage: string, details?: string) => {
    const streamingError: StreamingError = {
      message: errorMessage,
      details,
    };
    setError(streamingError);
    setIsConnecting(false);

    const jsError = new Error(errorMessage);
    onErrorRef.current?.(jsError);
  }, []);

  const disconnectStream = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    setIsConnecting(false);
  }, []);

  const connectToStream = useCallback(
    async (messageContent: string) => {
      try {
        setIsConnecting(true);
        clearError();

        // Close existing connection
        if (readerRef.current) {
          readerRef.current.cancel();
          readerRef.current = null;
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Get Supabase session token
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        );
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        // Use POST request with streaming response
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const endpoint = `${baseUrl}/chat/stream-text`;
        
        if (!process.env.NEXT_PUBLIC_API_URL) {
          console.warn("NEXT_PUBLIC_API_URL not set, using fallback:", baseUrl);
        }
        
        console.log("Connecting to chat stream:", endpoint);
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: messageContent,
            ...(chatId && { chatId }),
          }),
        });

        if (!response.ok) {
          handleError(
            "Failed to initiate chat stream",
            `HTTP ${response.status}: ${response.statusText}`
          );
          return;
        }

        // Read the streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          handleError(
            "Response body is not readable",
            "The server response stream could not be accessed"
          );
          return;
        }
        readerRef.current = reader;

        let currentMessageId: string | null = null;
        let currentContent = "";
        let currentReasoningStep: ReasoningStep | null = null;
        let currentParts: MessagePart[] = [];
        let sequenceCounter = 0;
        const functionCallsMap = new Map<string, FunctionCall>();

        try {
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines (Server-Sent Events format: "data: {...}\n\n")
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const jsonStr = line.slice(6); // Remove "data: " prefix
                  const data = JSON.parse(jsonStr);

                  switch (data.type) {
                    case "message-start":
                      currentMessageId = data.id;
                      currentContent = "";
                      currentReasoningStep = null;
                      currentParts = [];
                      sequenceCounter = 0;
                      onMessageUpdateRef.current?.(data.id, {
                        id: data.id,
                        role: "assistant",
                        content: "",
                        createdAt: new Date(),
                        isStreaming: true,
                        parts: [],
                        chatId: chatId || "",
                        userId: "",
                      });
                      break;

                    case "content":
                      if (currentMessageId) {
                        currentContent += data.content;
                        // Add or update content part
                        const existingContentPartIndex = currentParts.findIndex(
                          (part) => part.type === "content"
                        );
                        if (existingContentPartIndex >= 0) {
                          currentParts[existingContentPartIndex].data = currentContent;
                        } else {
                          currentParts.push({
                            id: `${currentMessageId}-content`,
                            type: "content",
                            sequence: sequenceCounter++,
                            data: currentContent,
                          });
                        }
                        onMessageUpdateRef.current?.(currentMessageId, {
                          content: currentContent,
                          isStreaming: true,
                          parts: [...currentParts],
                        });
                      }
                      break;

                    case "reasoning-started":
                      if (currentMessageId) {
                        // Start a new reasoning step
                        currentReasoningStep = {
                          id: `${currentMessageId}-reason`,
                          step: 1,
                          content: "",
                          type: "reasoning",
                          isStreaming: true,
                        };
                        // Add reasoning part to parts array
                        currentParts.push({
                          id: currentReasoningStep.id,
                          type: "reasoning",
                          sequence: sequenceCounter++,
                          data: currentReasoningStep,
                        });
                        onMessageUpdateRef.current?.(currentMessageId, {
                          parts: [...currentParts],
                        });
                      }
                      break;

                    case "reasoning-delta":
                      if (currentMessageId && currentReasoningStep && data.delta) {
                        // Stream content to the current reasoning step
                        currentReasoningStep.content += data.delta;
                        // Update the corresponding part in parts array
                        const partIndex = currentParts.findIndex(
                          (part) => part.id === currentReasoningStep!.id
                        );
                        if (partIndex >= 0) {
                          currentParts[partIndex].data = { ...currentReasoningStep };
                        }
                        onMessageUpdateRef.current?.(currentMessageId, {
                          parts: [...currentParts],
                        });
                      }
                      break;

                    case "reasoning-end":
                      if (currentMessageId && currentReasoningStep) {
                        // Mark the current reasoning step as complete
                        currentReasoningStep.isStreaming = false;
                        // Update the corresponding part in parts array
                        const partIndex = currentParts.findIndex(
                          (part) => part.id === currentReasoningStep!.id
                        );
                        if (partIndex >= 0) {
                          currentParts[partIndex].data = { ...currentReasoningStep };
                        }
                        currentReasoningStep = null;
                        onMessageUpdateRef.current?.(currentMessageId, {
                          parts: [...currentParts],
                        });
                      }
                      break;

                    case "function_calls_to_execute":
                      if (currentMessageId && data.functionCallsToExecute) {
                        // Create function call parts for each tool call
                        data.functionCallsToExecute.forEach((fc: any) => {
                          const functionCall: FunctionCall = {
                            id: fc.id,
                            name: fc.name,
                            arguments: fc.arguments,
                            isInProgress: true,
                            isCompleted: false,
                          };
                          functionCallsMap.set(fc.id, functionCall);
                          
                          // Add function call part
                          currentParts.push({
                            id: fc.id,
                            type: "function_call",
                            sequence: sequenceCounter++,
                            data: functionCall,
                          });
                        });
                        
                        onMessageUpdateRef.current?.(currentMessageId, {
                          parts: [...currentParts],
                        });
                      }
                      break;

                    case "function_call_result":
                      if (currentMessageId && data.id) {
                        // Update the function call with results
                        const functionCall = functionCallsMap.get(data.id);
                        if (functionCall) {
                          functionCall.isInProgress = false;
                          functionCall.isCompleted = true;
                          functionCall.result = data.result;
                          
                          // Update the corresponding part
                          const partIndex = currentParts.findIndex(
                            (part) => part.id === data.id
                          );
                          if (partIndex >= 0) {
                            currentParts[partIndex].data = { ...functionCall };
                          }
                          
                          onMessageUpdateRef.current?.(currentMessageId, {
                            parts: [...currentParts],
                          });
                        }
                      }
                      break;

                    case "message-end":
                      if (currentMessageId) {
                        onMessageUpdateRef.current?.(currentMessageId, {
                          isStreaming: false,
                        });
                      }
                      return; // Exit the while loop

                    case "error":
                      handleError(
                        data.error || "Internal server error",
                        data.details || "An unknown error occurred on the server"
                      );
                      return;
                  }
                } catch (err) {
                  handleError(
                    "Error parsing server response",
                    err instanceof Error ? err.message : "Unknown parsing error"
                  );
                  return;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          readerRef.current = null;
          setIsConnecting(false);
        }
      } catch (error) {
        handleError(
          "Failed to connect to stream",
          error instanceof Error ? error.message : "Unknown connection error"
        );
      }
    },
    [chatId, clearError, handleError]
  );

  return {
    isConnecting,
    error,
    connectToStream,
    disconnectStream,
    clearError,
  };
};

