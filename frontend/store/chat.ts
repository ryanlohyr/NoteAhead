import { create } from "zustand";
import { Message, Chat } from "@/types/chat";

interface ChatState {
  messages: Message[];
  currentChat: Chat | null;
  isLoading: boolean;

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setCurrentChat: (chat: Chat | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentChat: null,
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, updates) =>
    set((state) => {
      const existingMessage = state.messages.find((msg) => msg.id === messageId);
      
      // If message doesn't exist, create it
      if (!existingMessage) {
        const newMessage: Message = {
          id: messageId,
          chatId: updates.chatId || "",
          userId: updates.userId || "",
          role: updates.role || "assistant",
          content: updates.content || "",
          createdAt: updates.createdAt || new Date(),
          parts: updates.parts || [],
          isStreaming: updates.isStreaming,
        };
        return {
          messages: [...state.messages, newMessage],
        };
      }
      
      // Otherwise update existing message
      return {
        messages: state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      };
    }),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setCurrentChat: (chat) => set({ currentChat: chat }),

  setIsLoading: (loading) => set({ isLoading: loading }),
}));

