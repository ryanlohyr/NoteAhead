"use client";

import { MessagePart, ReasoningStep as ReasoningStepType, FunctionCall as FunctionCallType } from "@/types/chat";
import { ReasoningStep } from "./ReasoningStep";
import { FunctionCallItem } from "./FunctionCallItem";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

interface ThoughtProcessProps {
  parts: MessagePart[];
  isLoading?: boolean;
}

export const ThoughtProcess: React.FC<ThoughtProcessProps> = ({ parts, isLoading = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Filter and sort parts by sequence to maintain order
  const thoughtProcessParts = parts
    .filter((part) => part.type === "reasoning" || part.type === "function_call")
    .sort((a, b) => a.sequence - b.sequence);

  const renderMessagePart = (part: MessagePart) => {
    const getContent = () => {
      switch (part.type) {
        case "reasoning":
          return <ReasoningStep reasoning={part.data as ReasoningStepType} />;

        case "function_call":
          return (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Function Call</div>
              <FunctionCallItem functionCall={part.data as FunctionCallType} />
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div key={part.id} className="mt-3 z-2 relative w-full min-w-0">
        <div className="absolute left-[7.5px] top-2 w-2 h-2 bg-muted-foreground rounded-full z-2"></div>
        <div className="absolute left-[11px] bottom-0 w-px h-[calc(100%_-_10px)] bg-muted-foreground/20"></div>

        <div className="border-muted-foreground/20 pl-6 ml-2 w-full min-w-0 overflow-hidden">
          {getContent()}
        </div>
      </div>
    );
  };

  if (thoughtProcessParts.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 overflow-x-hidden max-w-full">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Thought Process ({thoughtProcessParts.length} items)

        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </button>

      {!isCollapsed && (
        <div className="space-y-2 w-full min-w-0 overflow-hidden">
          {thoughtProcessParts.map((part) => renderMessagePart(part))}
        </div>
      )}
    </div>
  );
};

