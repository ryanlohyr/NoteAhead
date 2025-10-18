// Chat-related types

export interface AttachedFile {
  id: string;
  name: string;
  fileName?: string;
  type: string;
  size: number;
  url?: string;
  blob?: Blob;
  pageNumber?: number;
  fileId?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  attachedFiles?: AttachedFile[];
}

