export interface MathPixLine {
  text_display?: string;
  confidence?: number;
  confidence_rate?: number;
}

export interface MathPixPageData {
  page: number;
  lines?: MathPixLine[];
}

export interface MathPixLinesContent {
  pages: MathPixPageData[];
}

export interface MathPixLinesFormat {
  content: MathPixLinesContent;
}

export interface MathPixFormats {
  "lines.json": MathPixLinesFormat;
}

export interface MathPixJson {
  formats: MathPixFormats;
}

export interface ConfidenceStats {
  average: number | null;
  lowest: number | null;
  count: number;
}

export interface ConvertedMarkdownPage {
  page: number;
  markdown: string;
  confidence: ConfidenceStats;
  confidence_rate: ConfidenceStats;
}

