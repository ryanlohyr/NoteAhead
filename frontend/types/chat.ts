export interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  parts?: MessagePart[];
  isStreaming?: boolean;
}

export interface ReasoningStep {
  id: string;
  step: number;
  content: string;
  type: "reasoning";
  isStreaming?: boolean;
}

export interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  isInProgress?: boolean;
  isCompleted?: boolean;
  result?: unknown;
}

export interface MessagePart {
  id: string;
  type: "content" | "reasoning" | "function_call";
  sequence: number;
  data: string | ReasoningStep | FunctionCall;
}

export type StreamingEvent =
  | { type: "content"; content: string }
  | { type: "reasoning-started" }
  | { type: "reasoning-delta"; delta: string }
  | { type: "reasoning-end" }
  | { type: "message-start"; id: string }
  | { type: "message-end"; id: string }
  | { type: "error"; error: string; details: string };

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

