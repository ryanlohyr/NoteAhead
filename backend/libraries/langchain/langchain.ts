import { LatexTextSplitter } from "@langchain/textsplitters";

interface ConvertLatexToChunksOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export const convertLatexToChunks = async (
  latex: string,
  options?: ConvertLatexToChunksOptions
): Promise<string[]> => {
  const latexSplitter = new LatexTextSplitter({
    chunkSize: options?.chunkSize || 512,
    chunkOverlap: options?.chunkOverlap || 200,
  });
  return await latexSplitter.splitText(latex);
};

