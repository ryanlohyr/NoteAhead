import { ToolNames } from "./types";

export const addNumbersTool = {
  type: "function" as const,
  name: ToolNames.ADD_NUMBERS,
  description: "Add two numbers together and return the sum",
  parameters: {
    type: "object",
    properties: {
      a: {
        type: "number",
        description: "The first number to add",
      },
      b: {
        type: "number",
        description: "The second number to add",
      },
    },
    required: ["a", "b"],
    additionalProperties: false,
  },
  strict: true,
};

export const searchKnowledgeBaseTool = {
  type: "function" as const,
  name: ToolNames.SEARCH_KNOWLEDGE_BASE,
  description:
    "Search for relevant content in the user's knowledge base using vector similarity search. Use this when the user asks questions about their uploaded documents or needs information from their files.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "The search query to find similar content, try to be as descriptive as possible",
      },
      type: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "Definitions and Properties",
            "Question",
            "Answer",
            "Question and Answer",
            "Others",
          ],
        },
        description: `The types of content you are looking for, only return the types that are relevant to the query.
        The types are:
        - Definitions and Properties (return this if you're looking for formulas, definitions, properties, etc.)
        - Question (return this if you're looking for questions)
        - Answer (return this if you're looking for answers)
        - Question and Answer (return this if you're looking for questions and answers)
        - Others (return this if you're looking for other types of content)`,
      },
    },
    required: ["query", "type"],
    additionalProperties: false,
  },
  strict: true,
};

export const readFileTool = {
  type: "function" as const,
  name: ToolNames.READ_FILE,
  description:
    "Read the complete contents of a file by retrieving all its chunks in order. Use this when the user wants to see the full contents of a specific file or document.",
  parameters: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "The ID of the file to read",
      },
    },
    required: ["fileId"],
    additionalProperties: false,
  },
  strict: true,
};

export const addToNotesTool = {
  type: "function" as const,
  name: ToolNames.ADD_TO_NOTES,
  description:
    "Add formatted notes with highlighted points and attribution links to the user's notes. Use this when the user wants to save information to their notes with proper formatting and source attribution.",
  parameters: {
    type: "object",
    properties: {
      formattedNotes: {
        type: "string",
        description:
          "The formatted notes content with highlighting and attribution points using markdown format with links in the format [page](fileId)",
      },
    },
    required: ["formattedNotes"],
    additionalProperties: false,
  },
  strict: true,
};

