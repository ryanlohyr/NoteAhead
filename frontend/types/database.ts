// Database types for file management

export enum ItemType {
  FILE = 'file',
  FOLDER = 'folder',
}

export interface LinesJsonLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text: string;
  font_name?: string;
  font_size?: number;
}

export interface LinesJsonPage {
  page: number;
  page_width: number;
  page_height: number;
  lines: LinesJsonLine[];
}

export interface DatabaseItem {
  id: string;
  name: string;
  type: ItemType;
  description?: string;
  parentId?: string | null;
  
  // File-specific properties
  fileUrl?: string;
  fileName?: string;
  embeddingsStatus?: string;
  originalName?: string;
  s3Url?: string;
  mimeType?: string;
  userId?: string;
  folderId?: string;
  createdAt?: string;
  updatedAt?: string;
  isTemplate?: boolean;
  linesJsonPages?: LinesJsonPage[];
}

