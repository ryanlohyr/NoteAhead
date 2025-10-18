import { MathPixJson, ConvertedMarkdownPage, ConfidenceStats } from "./types";

/**
 * Converts MathPix JSON result to an array of markdown grouped by pages
 */
export function convertMathPixToMarkdown(mathPixJson: MathPixJson): ConvertedMarkdownPage[] {
  const pages = mathPixJson.formats["lines.json"].content.pages;
  const result: ConvertedMarkdownPage[] = [];

  for (const pageData of pages) {
    const pageNumber = pageData.page;
    const lines = pageData.lines || [];

    let markdownContent = "";
    const confidenceValues: number[] = [];
    const confidenceRateValues: number[] = [];

    for (const line of lines) {
      if (line.text_display) {
        markdownContent += line.text_display;
      }

      if (typeof line.confidence === "number") {
        confidenceValues.push(line.confidence);
      }
      if (typeof line.confidence_rate === "number") {
        confidenceRateValues.push(line.confidence_rate);
      }
    }

    if (markdownContent.trim()) {
      const confidenceStats = calculateStats(confidenceValues);
      const confidenceRateStats = calculateStats(confidenceRateValues);

      result.push({
        page: pageNumber,
        markdown: markdownContent.trim(),
        confidence: confidenceStats,
        confidence_rate: confidenceRateStats,
      });
    }
  }

  return result;
}

function calculateStats(values: number[]): ConfidenceStats {
  if (values.length === 0) {
    return {
      average: null,
      lowest: null,
      count: 0,
    };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = sum / values.length;
  const lowest = Math.min(...values);

  return {
    average: Math.round(average * 10000) / 10000,
    lowest: Math.round(lowest * 10000) / 10000,
    count: values.length,
  };
}

