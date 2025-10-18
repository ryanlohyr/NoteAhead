"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading,
  onStop,
  placeholder = "Type your message...",
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSend(trimmedInput);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus textarea when loading changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  return (
    <div className="sticky bottom-0 m-4 bg-background z-100">
      {/* Custom textarea-like container */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-md bg-background min-h-[10px] flex flex-col">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full min-h-[10px] resize-none border-0 bg-transparent px-5 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none outline-none"
            rows={1}
          />
        </div>

        <div className="px-4 py-1 flex items-center justify-end">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Button
                onClick={onStop}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-500 hover:text-red-600 transition-colors"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
