"use client";

import { Message, ReasoningStep as ReasoningStepType } from "@/types/chat";
import { User, Bot } from "lucide-react";
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
        "flex gap-3 p-4 rounded-lg",
        isUser ? "bg-muted/30" : "bg-background"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isUser ? "bg-primary" : "bg-blue-500"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="text-sm font-medium text-foreground">
          {isUser ? "You" : "Assistant"}
        </div>

        {/* Reasoning steps */}
        {!isUser && reasoningParts.length > 0 && (
          <div className="space-y-2">
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
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {content}
          {message.isStreaming && !reasoningParts.length && (
            <span className="inline-block w-1 h-4 ml-1 bg-foreground animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

