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

export interface MessagePart {
  id: string;
  type: "content" | "reasoning";
  sequence: number;
  data: string | ReasoningStep;
}

export interface FunctionCallToExecute {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type StreamingEvent =
  | { type: "content"; content: string }
  | { type: "reasoning-started" }
  | { type: "reasoning-delta"; delta: string }
  | { type: "reasoning-end" }
  | { type: "function_calls_to_execute"; functionCallsToExecute: FunctionCallToExecute[] }
  | { type: "function_call_result"; id: string; result: unknown }
  | { type: "message-start"; id: string }
  | { type: "message-end"; id: string }
  | { type: "error"; error: string; details: string };

export interface StreamTextRequestBody {
  message: string;
  chatId?: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

