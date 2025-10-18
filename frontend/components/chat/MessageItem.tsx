"use client";

import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { ThoughtProcess } from "./ThoughtProcess";

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === "user";

  // Extract content parts
  const contentParts =
    message.parts?.filter((part) => part.type === "content") || [];

  // Get the text content
  const content =
    contentParts.length > 0
      ? (contentParts[0].data as string)
      : message.content;

  return (
    <div
      className={cn(
        "flex flex-col mb-4 w-full",
        isUser ? "items-end" : "items-start"
      )}
    >
      {/* Thought Process (reasoning + tool calls in sequential order) - full width */}
      {!isUser && message.parts && message.parts.length > 0 && (
        <ThoughtProcess parts={message.parts} isLoading={message.isStreaming} />
      )}

      {/* Main content - constrained width */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words max-w-[75%]",
          isUser
            ? "bg-blue-500 text-white rounded-tr-sm"
            : "bg-blue-50 text-gray-900 rounded-tl-sm"
        )}
      >
        {content.length === 0 ? (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            </div>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

