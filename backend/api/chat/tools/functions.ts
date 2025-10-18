import { chunkDb } from "#db/index";
import { embed } from "#libraries/ai/embeddings";

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
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

