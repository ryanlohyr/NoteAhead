"use client";

import React from "react";
import { ReasoningStep as ReasoningStepType } from "@/types/chat";
import { Skeleton } from "@/components/ui/skeleton";

interface ReasoningStepProps {
  reasoning: ReasoningStepType;
}

export const ReasoningStep: React.FC<ReasoningStepProps> = ({ reasoning }) => {
  return (
    <div className="text-sm text-muted-foreground">
      {reasoning.isStreaming && !reasoning.content ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : (
        <div className="whitespace-pre-wrap break-words">
          {reasoning.content}
          {reasoning.isStreaming && (
            <span className="inline-block w-1 h-4 ml-1 bg-blue-500 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
};

