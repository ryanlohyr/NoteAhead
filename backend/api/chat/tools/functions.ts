import { chunkDb, fileDb } from "#db/index";
import { embed } from "#libraries/ai/embeddings";
import { eq } from "drizzle-orm";
import { db } from "#db/index";
import { chunks } from "#db/schemas/schema";

export const addNumbersFunction = async (args: { a: number; b: number }): Promise<number> => {
  const { a, b } = args;
  return a + b;
};

export const searchKnowledgeBaseFunction = async ({
  userId,
  query,
  type,
}: {
  userId: string;
  query: string;
  type: string[];
}): Promise<
  Array<{
    urlString: string;
    content: string;
    similarity: number;
  }>
> => {
  try {
    console.log("Searching knowledge base", { userId, query, type });

    // Generate embedding for the query
    const embeddings = await embed([query]);
    const queryEmbedding = embeddings[0];

    // Search for similar chunks
    const similarChunks = await chunkDb.findSimilarChunks({
      userId,
      embedding: queryEmbedding,
      limit: 10,
      similarityThreshold: 0.3,
      // typeFilters: type.length > 0 ? type : undefined,
    });

    console.log(`Found ${similarChunks.length} similar chunks`);

    // Format the results
    const filteredSimilarChunks = similarChunks.map((chunk) => {
      return {
        urlString: `[${chunk.pageNumbers[0]}](${chunk.fileId})`,
        content: chunk.content,
        similarity: chunk.similarity,
      };
    });

    return filteredSimilarChunks;
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    throw error;
  }
};

export const readFileFunction = async ({
  userId,
  fileId,
}: {
  userId: string;
  fileId: string;
}): Promise<{
  fileName: string;
  content: string;
}> => {
  try {
    console.log("Reading file", { userId, fileId });

    // Verify file belongs to user
    const file = await fileDb.getFile(fileId, userId);
    if (!file) {
      console.error("File not found or access denied:", { userId, fileId });
      return {
        fileName: "Unknown",
        content: "Error: File ID is invalid or you don't have access to this file.",
      };
    }

    // Fetch all chunks for this file
    const fileChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.fileId, fileId));

    if (!fileChunks || fileChunks.length === 0) {
      return {
        fileName: file.name,
        content: "No content available for this file.",
      };
    }

    // Group chunks by page number
    const pageGroups = new Map<number, Array<{ content: string }>>();

    fileChunks.forEach((chunk) => {
      const pages = chunk.pageNumbers || [0];
      pages.forEach((page) => {
        if (!pageGroups.has(page)) {
          pageGroups.set(page, []);
        }
        pageGroups.get(page)!.push({
          content: chunk.content,
        });
      });
    });

    // Sort pages and format output
    const sortedPages = Array.from(pageGroups.keys()).sort((a, b) => a - b);
    const formattedContent = sortedPages
      .map((page) => {
        const pageChunks = pageGroups.get(page)!;
        const chunksText = pageChunks
          .map((chunk) => `[Page ${page}]\n${chunk.content}`)
          .join("\n\n");
        return chunksText;
      })
      .join("\n\n---\n\n");

    console.log(`Read ${fileChunks.length} chunks from file ${file.name}`);

    return {
      fileName: file.name,
      content: formattedContent,
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      fileName: "Unknown",
      content: "Error reading file. Please try again later or check if the file ID is valid.",
    };
  }
};

export const addToNotesFunction = async ({
  formattedNotes,
}: {
  formattedNotes: string;
}): Promise<{
  success: boolean;
  formattedNotes: string;
}> => {
  console.log("Adding formatted notes:", formattedNotes);
  
  // For now, just return the formatted notes
  // Future implementation will save to database
  return {
    success: true,
    formattedNotes,
  };
};

export const executeTool = async (
  toolName: string,
  args: Record<string, unknown>,
  context: { userId: string }
): Promise<unknown> => {
  switch (toolName) {
    case "addNumbers":
      return addNumbersFunction(args as { a: number; b: number });
    case "search_knowledge_base":
      return searchKnowledgeBaseFunction({
        userId: context.userId,
        query: args.query as string,
        type: args.type as string[],
      });
    case "read_file":
      return readFileFunction({
        userId: context.userId,
        fileId: args.fileId as string,
      });
    case "add_to_notes":
      return addToNotesFunction({
        formattedNotes: args.formattedNotes as string,
      });
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

