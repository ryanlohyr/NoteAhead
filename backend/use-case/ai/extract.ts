import { getMathPixService, convertMathPixToMarkdown, MathPixJson } from "#libraries/mathpix/index.js";
import { convertLatexToChunks } from "#libraries/langchain/index.js";
import { embed } from "#libraries/ai/index.js";

export interface ChunkObject {
  content: string;
  originalContent: string;
  context: string;
  pageNumbers: number[];
  type: string;
}

/**
 * Extract chunks from a PDF file
 */
export const extractChunksFromPdf = async (
  fileBuffer: Blob
): Promise<{ chunks: ChunkObject[]; summary: string; linesJsonPages: any[] }> => {
  console.log("Starting PDF extraction...");

  // Convert Blob to Buffer for MathPix
  const arrayBuffer = await fileBuffer.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Process PDF with MathPix
  const mathPixService = getMathPixService();
  const mathPixResult = await mathPixService.processPdf(buffer, {
    formats: ["lines.json"],
  });

  if (!mathPixResult.success) {
    throw new Error("Failed to process PDF with MathPix");
  }

  const linesJsonContent = mathPixResult.formats?.["lines.json"]?.content;
  if (!linesJsonContent) {
    throw new Error("No lines.json content found in MathPix result");
  }

  // Store the linesJsonPages for later use
  const linesJsonPages = linesJsonContent.pages || [];

  // Convert MathPix result to markdown pages
  const markdownPages = convertMathPixToMarkdown(mathPixResult as unknown as MathPixJson);

  if (markdownPages.length === 0) {
    throw new Error("No markdown content extracted from PDF");
  }

  console.log(`Extracted ${markdownPages.length} pages from PDF`);

  // Process each page and create chunks
  const allChunks: ChunkObject[] = [];
  
  for (const pageData of markdownPages) {
    console.log(`Processing page ${pageData.page}...`);

    // Split the page's markdown content into chunks
    const pageChunks = await convertLatexToChunks(pageData.markdown, {
      chunkSize: 512,
      chunkOverlap: 200,
    });

    for (const chunk of pageChunks) {
      allChunks.push({
        content: chunk,
        originalContent: chunk,
        context: pageData.markdown,
        pageNumbers: [pageData.page],
        type: "text",
      });
    }
  }

  console.log(`Created ${allChunks.length} chunks from PDF`);

  // Generate simple summary
  const summary = `Document with ${markdownPages.length} pages and ${allChunks.length} chunks`;

  return {
    chunks: allChunks,
    summary,
    linesJsonPages,
  };
};

/**
 * Generate embeddings for chunks
 */
export const embedChunksUseCase = async (chunks: string[]): Promise<number[][]> => {
  console.log(`Generating embeddings for ${chunks.length} chunks...`);
  const embeddings = await embed(chunks);
  console.log(`Generated ${embeddings.length} embeddings`);
  return embeddings;
};

