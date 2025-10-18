import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const embed = async (texts: string[]): Promise<number[][]> => {
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: texts,
  });
  return embeddings;
};

