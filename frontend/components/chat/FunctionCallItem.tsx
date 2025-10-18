"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Settings, Check, Loader2, Search, Plus } from "lucide-react";

export interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  isInProgress?: boolean;
  isCompleted?: boolean;
  result?: unknown;
}

interface FunctionCallItemProps {
  functionCall: FunctionCall;
}

export const FunctionCallItem: React.FC<FunctionCallItemProps> = ({ functionCall }) => {
  const getStatusIcon = () => {
    if (functionCall.isCompleted) {
      return <Check className="w-4 h-4 text-green-500" />;
    } else if (functionCall.isInProgress) {
      return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
    return <Settings className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (functionCall.isCompleted) {
      return "Completed";
    } else if (functionCall.isInProgress) {
      return "In Progress";
    }
    return "Pending";
  };

  const getFunctionIcon = () => {
    switch (functionCall.name) {
      case "search_knowledge_base":
        return <Search className="w-5 h-5 text-muted-foreground" />;
      case "addNumbers":
        return <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getFunctionTitle = () => {
    switch (functionCall.name) {
      case "search_knowledge_base":
        return "Searching Knowledge Base";
      case "addNumbers":
        return "Adding Numbers";
      default:
        return functionCall.name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getFunctionDescription = () => {
    switch (functionCall.name) {
      case "search_knowledge_base":
        return "Searching through your uploaded documents";
      case "addNumbers":
        return "Performing mathematical calculation";
      default:
        return "Executing function";
    }
  };

  const renderCustomContent = () => {
    const args = functionCall.arguments;
    
    switch (functionCall.name) {
      case "search_knowledge_base":
        return (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <Search className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Search Query
                </div>
                <div className="text-sm text-foreground break-words">
                  {args.query as string || "No query provided"}
                </div>
                {args.type && Array.isArray(args.type) && args.type.length > 0 ? (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Content Types
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(args.type as string[]).map((type, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-muted border border-border rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {functionCall.result ? (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Results
                </div>
                <div className="text-xs text-foreground">
                  {Array.isArray(functionCall.result) 
                    ? `Found ${functionCall.result.length} relevant chunks`
                    : "Processing..."}
                </div>
              </div>
            ) : null}
          </div>
        );
      
      case "addNumbers":
        return (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Plus className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                  Calculation
                </div>
                <div className="text-sm text-green-900 dark:text-green-100 font-mono">
                  {String(args.a)} + {String(args.b)}
                </div>
              </div>
            </div>
            {functionCall.result ? (
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                  Result
                </div>
                <div className="text-lg font-bold text-green-900 dark:text-green-100 font-mono">
                  {functionCall.result as number}
                </div>
              </div>
            ) : null}
          </div>
        );
      
      default:
        return Object.keys(args).length > 0 ? (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Arguments</div>
            <div className="text-xs bg-gray-100 dark:bg-gray-900/50 rounded p-2 font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
              <pre>{JSON.stringify(args, null, 2)}</pre>
            </div>
            {functionCall.result ? (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Result</div>
                <div className="text-xs bg-gray-100 dark:bg-gray-900/50 rounded p-2 font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                  <pre>{JSON.stringify(functionCall.result, null, 2)}</pre>
                </div>
              </div>
            ) : null}
          </div>
        ) : null;
    }
  };

  return (
    <div className="border border-muted rounded-lg p-4 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1">
          {getFunctionIcon()}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground">
              {getFunctionTitle()}
            </div>
            <div className="text-xs text-muted-foreground">
              {getFunctionDescription()}
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              functionCall.isCompleted
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : functionCall.isInProgress
                  ? "bg-muted text-foreground border border-border"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            )}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Custom Content */}
      {renderCustomContent()}
    </div>
  );
};

