"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store/chat";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { MessageItem } from "./MessageItem";
import { ChatInput } from "./ChatInput";
import { Bot, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/types/chat";

export const Chat: React.FC = () => {
  const {
    messages,
    currentChat,
    addMessage,
    updateMessage,
  } = useChatStore();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { isConnecting, error, connectToStream, disconnectStream, clearError } =
    useStreamingChat({
      chatId: currentChat?.id,
      onMessageUpdate: (messageId, updates) => {
        updateMessage(messageId, updates);
      },
      onError: (err) => {
        console.error("Chat error:", err);
      },
    });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        }, 0);
      }
    }
  }, [messages.length, messages]);

  const handleSend = useCallback(
    async (messageContent: string) => {
      // Create user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        chatId: currentChat?.id || "",
        userId: "",
        role: "user",
        content: messageContent,
        createdAt: new Date(),
      };

      // Add user message to UI immediately
      addMessage(userMessage);

      // Clear any previous errors
      clearError();

      // Connect to stream for assistant response
      await connectToStream(messageContent);
    },
    [currentChat?.id, addMessage, connectToStream, clearError]
  );

  const handleStop = useCallback(() => {
    disconnectStream();
  }, [disconnectStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectStream();
    };
  }, [disconnectStream]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 h-full">
        <div className="px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">
                Type a message below to begin chatting with the assistant
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-destructive">
              {error.message}
            </div>
            {error.details && (
              <div className="text-xs text-destructive/80 mt-1">
                {error.details}
              </div>
            )}
          </div>
          <button
            onClick={clearError}
            className="text-xs text-destructive hover:text-destructive/80 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        isLoading={isConnecting}
        onStop={handleStop}
      />
    </div>
  );
};
