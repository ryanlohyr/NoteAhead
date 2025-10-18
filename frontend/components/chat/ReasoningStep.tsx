"use client";

import { ReasoningStep as ReasoningStepType } from "@/types/chat";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReasoningStepProps {
  reasoning: ReasoningStepType;
}

export const ReasoningStep: React.FC<ReasoningStepProps> = ({ reasoning }) => {
  return (
    <div className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg border border-border">
      <div className="flex-shrink-0 mt-0.5">
        <Brain
          className={cn(
            "h-4 w-4 text-blue-500",
            reasoning.isStreaming && "animate-pulse"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          {reasoning.isStreaming ? "Thinking..." : "Reasoning"}
        </div>
        <div className="text-sm text-foreground whitespace-pre-wrap break-words">
          {reasoning.content}
          {reasoning.isStreaming && (
            <span className="inline-block w-1 h-4 ml-1 bg-blue-500 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

