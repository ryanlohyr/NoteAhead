// Database types for file management

export enum ItemType {
  FILE = 'file',
  FOLDER = 'folder',
}

export interface LinesJsonLine {
  id?: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text: string;
  text_display?: string;
  font_name?: string;
  font_size?: number;
  region?: {
    top_left_x: number;
    top_left_y: number;
    width: number;
    height: number;
  };
}

// Alias for backward compatibility
export type Line = LinesJsonLine;

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

