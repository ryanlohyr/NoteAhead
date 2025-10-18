/**
 * AI Provider abstraction for text generation
 * Supports multiple providers (OpenAI, Groq) with easy switching
 */

/**
 * Response structure from AI API after XML parsing
 */
export interface AIResponse {
  isCurrentLine: boolean;
  linePosition: number;
  textToInsert: string;
}

/**
 * Configuration for AI provider
 */
export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interface for AI providers
 */
export interface AIProvider {
  name: string;
  generateSuggestion(
    markdown: string,
    cursorCurrentLine: number,
    cursorPositionAtCurrentLine: number,
    userChunksContext: string
  ): Promise<AIResponse | null>;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private apiUrl = "https://api.openai.com/v1/chat/completions";

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gpt-4.1-mini-2025-04-14";
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 150;
  }

  async generateSuggestion(
    markdown: string,
    cursorCurrentLine: number,
    cursorPositionAtCurrentLine: number,
    userChunksContext: string = ""
  ): Promise<AIResponse | null> {
    try {
      console.log(`[${this.name}] Calling API with model ${this.model}`);
      console.log("Content preview:", markdown.substring(0, 50) + "...");
      console.log("Cursor info:", { cursorCurrentLine, cursorPositionAtCurrentLine });

      const systemPrompt = this.buildSystemPrompt(
        cursorCurrentLine,
        cursorPositionAtCurrentLine,
        userChunksContext
      );

      console.log("Stats: Length of system prompt:", systemPrompt.length);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Continue the text from the current cursor position. Do not provide feedback or suggestions.\n\n${markdown}`,
            },
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
      });

      if (!response.ok) {
        console.error(`[${this.name}] API error:`, response.status, await response.text());
        return null;
      }

      const startTime = Date.now();
      const data = await response.json();
      const endTime = Date.now();
      console.log(`Stats: ${this.name} API took ${(endTime - startTime) / 1000} seconds`);

      const generatedText = data.choices?.[0]?.message?.content;
      console.log(`[${this.name}] Raw response:`, generatedText);

      if (!generatedText) {
        return null;
      }

      return this.parseResponse(generatedText);
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return null;
    }
  }

  private buildSystemPrompt(
    cursorCurrentLine: number,
    cursorPositionAtCurrentLine: number,
    userChunksContext: string
  ): string {
    return `You are an autocomplete engine. Continue the user's text by predicting the most likely next words from the current cursor position. Do not critique, explain, rephrase, or suggest changes.

${userChunksContext ? `Here is additional context from the user's uploaded documents:\n\n${userChunksContext}\n\n` : ""}You MUST respond in the following XML format:
<suggestion>
  <is_current_line>true or false</is_current_line>
  <line_position>NUMBER</line_position>
  <text>Your continuation text here</text>
</suggestion>

Guidelines:
- Continuation-only: Write the next few words or short phrase that naturally follows from the existing text at the cursor.
- No feedback or commentary: Do not critique, explain, list options, or rephrase.
- Preserve voice and formatting: Keep tone, tense, and style consistent; respect Markdown.
- Do not repeat existing text or start over; continue exactly at the cursor.
- If mid-sentence, continue the current sentence; otherwise start the next sentence.
- Use the user's documents only to inform factual continuations; do not add citations or links.
- Keep it short: aim for 5–30 words and stop at a natural boundary (end of clause or sentence).
- Output raw continuation only inside <text>: no quotes; avoid extra leading/trailing spaces unless required.
- is_current_line: Set to "true" if insertion should happen at the current cursor position; otherwise "false" and provide the line number in <line_position>.
- Only provide the XML, no additional text.

The user is currently at line ${cursorCurrentLine}, position ${cursorPositionAtCurrentLine} in the line.`;
  }

  private parseResponse(generatedText: string): AIResponse | null {
    // Parse XML response
    const isCurrentLineMatch = generatedText.match(
      /<is_current_line>(true|false)<\/is_current_line>/i
    );
    const linePositionMatch = generatedText.match(/<line_position>(\d+)<\/line_position>/);
    const textMatch = generatedText.match(/<text>([\s\S]*?)<\/text>/);

    if (!isCurrentLineMatch || !linePositionMatch || !textMatch) {
      console.error("Failed to parse XML response. Raw response:", generatedText);
      return null;
    }

    const text = textMatch[1].trim();
    console.log("Parsed suggestion text:", text);

    return {
      isCurrentLine: isCurrentLineMatch[1].toLowerCase() === "true",
      linePosition: parseInt(linePositionMatch[1], 10),
      textToInsert: text,
    };
  }
}

/**
 * Groq Provider Implementation
 */
export class GroqProvider implements AIProvider {
  name = "Groq";
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "llama-3.1-8b-instant";
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 150;
  }

  async generateSuggestion(
    markdown: string,
    cursorCurrentLine: number,
    cursorPositionAtCurrentLine: number,
    userChunksContext: string = ""
  ): Promise<AIResponse | null> {
    try {
      console.log(`[${this.name}] Calling API with model ${this.model}`);
      console.log("Content preview:", markdown.substring(0, 50) + "...");
      console.log("Cursor info:", { cursorCurrentLine, cursorPositionAtCurrentLine });

      const systemPrompt = this.buildSystemPrompt(
        cursorCurrentLine,
        cursorPositionAtCurrentLine,
        userChunksContext
      );

      console.log("Stats: Length of system prompt:", systemPrompt.length);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Continue the text from the current cursor position. Do not provide feedback or suggestions.\n\n${markdown}`,
            },
          ],
          temperature: this.temperature,
          max_completion_tokens: this.maxTokens,
        }),
      });

      if (!response.ok) {
        console.error(`[${this.name}] API error:`, response.status, await response.text());
        return null;
      }

      const startTime = Date.now();
      const data = await response.json();
      const endTime = Date.now();
      console.log(`Stats: ${this.name} API took ${(endTime - startTime) / 1000} seconds`);

      const generatedText = data.choices?.[0]?.message?.content;
      console.log(`[${this.name}] Raw response:`, generatedText);

      if (!generatedText) {
        return null;
      }

      return this.parseResponse(generatedText);
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return null;
    }
  }

  private buildSystemPrompt(
    cursorCurrentLine: number,
    cursorPositionAtCurrentLine: number,
    userChunksContext: string
  ): string {
    return `You are a helpful writing assistant. Analyze the user's text and provide a contextual suggestion or completion.

${userChunksContext ? `Here is additional context from the user's uploaded documents:\n\n${userChunksContext}\n\n` : ""}You MUST respond in the following XML format:
<suggestion>
  <is_current_line>true or false</is_current_line>
  <line_position>NUMBER</line_position>
  <text>Your suggestion text here</text>
</suggestion>

Guidelines:
- is_current_line: Set to "true" if the suggestion should be inserted at the user's current cursor position. Set to "false" if it should be inserted at a different line.
- line_position: If is_current_line is true, this value is ignored (the cursor position will be used). If false, this is the line number where the suggestion should be inserted.
- text: Your suggestion text (1-2 sentences max, contextual and relevant). Do NOT include any file references or links - just provide the text suggestion.
- Only provide the XML, no additional text
- Use the context from the user's documents to provide more relevant and accurate suggestions

The user is currently at line ${cursorCurrentLine}, position ${cursorPositionAtCurrentLine} in the line.`;
  }

  private parseResponse(generatedText: string): AIResponse | null {
    // Parse XML response
    const isCurrentLineMatch = generatedText.match(
      /<is_current_line>(true|false)<\/is_current_line>/i
    );
    const linePositionMatch = generatedText.match(/<line_position>(\d+)<\/line_position>/);
    const textMatch = generatedText.match(/<text>([\s\S]*?)<\/text>/);

    if (!isCurrentLineMatch || !linePositionMatch || !textMatch) {
      console.error("Failed to parse XML response. Raw response:", generatedText);
      return null;
    }

    const text = textMatch[1].trim();
    console.log("Parsed suggestion text:", text);

    return {
      isCurrentLine: isCurrentLineMatch[1].toLowerCase() === "true",
      linePosition: parseInt(linePositionMatch[1], 10),
      textToInsert: text,
    };
  }
}

/**
 * Factory function to create AI provider based on configuration
 * To switch providers, simply change the ACTIVE_PROVIDER constant
 */
export type ProviderType = "openai" | "groq";

export function createAIProvider(
  providerType: ProviderType,
  config: AIProviderConfig
): AIProvider {
  switch (providerType) {
    case "openai":
      return new OpenAIProvider(config);
    case "groq":
      return new GroqProvider(config);
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

