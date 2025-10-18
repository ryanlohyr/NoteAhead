"use client";

import { Message, ReasoningStep as ReasoningStepType } from "@/types/chat";
import { cn } from "@/lib/utils";
import { ReasoningStep } from "./ReasoningStep";
import { useState } from "react";

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [showReasoning, setShowReasoning] = useState(true);
  const isUser = message.role === "user";

  // Extract reasoning and content parts
  const reasoningParts =
    message.parts?.filter((part) => part.type === "reasoning") || [];
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
        "flex mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Content */}
      <div
        className={cn(
          "flex flex-col space-y-2 max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Reasoning steps */}
        {!isUser && reasoningParts.length > 0 && (
          <div className="space-y-2 w-full">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showReasoning ? "Hide" : "Show"} reasoning
            </button>
            {showReasoning &&
              reasoningParts.map((part) => (
                <ReasoningStep
                  key={part.id}
                  reasoning={part.data as ReasoningStepType}
                />
              ))}
          </div>
        )}

        {/* Main content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
            isUser
              ? "bg-blue-500 text-white rounded-tr-sm"
              : "bg-blue-50 text-gray-900 rounded-tl-sm"
          )}
        >
          {content}
          {message.isStreaming && !reasoningParts.length && (
            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

