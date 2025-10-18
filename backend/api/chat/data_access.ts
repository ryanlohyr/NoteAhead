import { Message, Chat } from "./types";

// In-memory storage
const chatsStore = new Map<string, Chat>();
const messagesStore = new Map<string, Message[]>();

export const createChat = (userId: string, title: string = "New Chat"): Chat => {
  const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const chat: Chat = {
    id: chatId,
    userId,
    title,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  chatsStore.set(chatId, chat);
  messagesStore.set(chatId, []);

  return chat;
};

export const getChatById = (chatId: string): Chat | undefined => {
  return chatsStore.get(chatId);
};

export const saveMessage = (
  chatId: string,
  userId: string,
  role: "user" | "assistant",
  content: string
): Message => {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const message: Message = {
    id: messageId,
    chatId,
    userId,
    role,
    content,
    createdAt: new Date(),
  };

  const messages = messagesStore.get(chatId) || [];
  messages.push(message);
  messagesStore.set(chatId, messages);

  // Update chat's updatedAt
  const chat = chatsStore.get(chatId);
  if (chat) {
    chat.updatedAt = new Date();
    chatsStore.set(chatId, chat);
  }

  return message;
};

export const getMessages = (chatId: string): Message[] => {
  return messagesStore.get(chatId) || [];
};

export const clearAllData = () => {
  chatsStore.clear();
  messagesStore.clear();
};

