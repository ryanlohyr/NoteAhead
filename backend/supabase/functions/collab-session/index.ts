// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "jsr:@supabase/supabase-js@2";
import { createAIProvider, type ProviderType, type AIProvider } from "./ai-providers.ts";

console.log("Collab Session Edge Function initialized");

// Store active channels globally for cleanup
const activeChannels = new Map<string, RealtimeChannel>();

// AI Provider Configuration
// 🔧 CHANGE THIS TO SWITCH BETWEEN PROVIDERS: "openai" | "groq"
const ACTIVE_PROVIDER: ProviderType = Deno.env.get("ACTIVE_PROVIDER") ?? "openai";
const CHARACTER_THRESHOLD = 20;

/**
 * Interface for chunk data from database
 */
interface ChunkData {
  id: string;
  content: string;
  page_numbers: number[];
  type: string;
  original_content: string | null;
  embedding?: number[];
  file_id: string;
}

/**
 * Interface for chunk with metadata
 */
interface ChunkWithMetadata {
  id: string;
  content: string;
  pageNumber: number;
  embedding?: number[];
  fileId: string;
}

/**
 * Fetches all chunks for a user and formats them as a string grouped by page number
 * @param supabase - The Supabase client instance
 * @param userId - The user ID to fetch chunks for
 * @returns An object with formatted string, set of valid file IDs, and chunks with metadata
 */
async function fetchAndFormatUserChunks(
  supabase: SupabaseClient,
  userId: string
): Promise<{ formattedChunks: string; validFileIds: Set<string>; chunksWithMetadata: ChunkWithMetadata[] }> {
  try {
    console.log("Fetching chunks for user:", userId);
    // Fetch all chunks for the user with embeddings
    const { data: chunks, error } = await supabase
      .from("chunks")
      .select("id, content, page_numbers, type, original_content, embedding, file_id")
      .eq("user_id", userId);

    console.log("Chunks:", chunks);

    if (error) {
      console.error("Error fetching chunks:", error);
      return { formattedChunks: "", validFileIds: new Set(), chunksWithMetadata: [] };
    }

    if (!chunks || chunks.length === 0) {
      return { formattedChunks: "", validFileIds: new Set(), chunksWithMetadata: [] };
    }

    const typedChunks = chunks as ChunkData[];
    const validFileIds = new Set<string>();
    const chunksWithMetadata: ChunkWithMetadata[] = [];

    // Group chunks by page number
    const pageGroups = new Map<number, { id: string; content: string }[]>();

    typedChunks.forEach((chunk) => {
      validFileIds.add(chunk.file_id);
      const pages = chunk.page_numbers || [0];
      pages.forEach((page) => {
        if (!pageGroups.has(page)) {
          pageGroups.set(page, []);
        }
        pageGroups.get(page)!.push({
          id: chunk.file_id,
          content: chunk.content,
        });
        
        // Add to chunks with metadata
        chunksWithMetadata.push({
          id: chunk.id,
          content: chunk.content,
          pageNumber: page,
          embedding: chunk.embedding,
          fileId: chunk.file_id,
        });
      });
    });

    // Sort pages and format output
    const sortedPages = Array.from(pageGroups.keys()).sort((a, b) => a - b);
    const formattedChunks = sortedPages
      .map((page) => {
        const pageChunks = pageGroups.get(page)!;
        const chunksText = pageChunks
          .map((chunk) => `[${page}](${chunk.id})\n${chunk.content}`)
          .join("\n\n");
        return chunksText;
      })
      .join("\n\n---\n\n");

    console.log('formatted chunks is ', formattedChunks);

    return { formattedChunks, validFileIds, chunksWithMetadata };
  } catch (error) {
    console.error("Error in fetchAndFormatUserChunks:", error);
    return { formattedChunks: "", validFileIds: new Set(), chunksWithMetadata: [] };
  }
}

/**
 * Gets embedding for text using OpenAI API
 * @param text - The text to embed
 * @param apiKey - OpenAI API key
 * @returns The embedding vector
 */
async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI embedding API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Error getting embedding:", error);
    return null;
  }
}

/**
 * Finds the top N most similar chunks using Supabase's vector similarity search
 * @param text - The text to find similar chunks for
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter chunks by
 * @param openAiApiKey - OpenAI API key for generating embeddings
 * @param topN - Number of top chunks to return
 * @returns Array of top N most similar chunks with their similarity scores
 */
async function findTopSimilarChunks(
  text: string,
  supabase: SupabaseClient,
  userId: string,
  openAiApiKey: string,
  topN: number = 2
): Promise<Array<{ chunk: ChunkWithMetadata; similarity: number }>> {
  try {
    console.log(`Finding top ${topN} similar chunks for text:`, text.substring(0, 100));

    // Get embedding for the text
    const textEmbedding = await getEmbedding(text, openAiApiKey);
    if (!textEmbedding) {
      console.warn("Failed to get embedding for text");
      return [];
    }

    // Use Supabase RPC with vector similarity
    // The RPC function should be: match_chunks(query_embedding vector, match_count int, filter_user_id uuid)
    const { data: similarChunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: textEmbedding,
      match_count: topN,
      filter_user_id: userId,
    });

    if (error) {
      console.error("Error finding similar chunks:", error);
      return [];
    }

    if (!similarChunks || similarChunks.length === 0) {
      console.log("No similar chunks found");
      return [];
    }

    // Transform the results to match our expected format
    const results = similarChunks.flatMap((chunk: any) => {
      const pages = chunk.page_numbers || [0];
      return pages.map((page: number) => ({
        chunk: {
          id: chunk.id,
          content: chunk.content,
          pageNumber: page,
          fileId: chunk.file_id,
          embedding: chunk.embedding,
        },
        similarity: chunk.similarity,
      }));
    }).slice(0, topN);

    console.log("Top similar chunks:", results.map(c => ({
      chunkId: c.chunk.id,
      fileId: c.chunk.fileId,
      pageNumber: c.chunk.pageNumber,
      similarity: c.similarity,
    })));

    return results;
  } catch (error) {
    console.error("Error finding similar chunks:", error);
    return [];
  }
}

/**
 * Inserts file references into the text after the last sentence
 * @param text - The text to insert references into
 * @param topChunks - Array of top similar chunks
 * @returns Text with file references inserted
 */
function insertFileReferences(
  text: string,
  topChunks: Array<{ chunk: ChunkWithMetadata; similarity: number }>
): string {
  if (topChunks.length === 0) {
    return text;
  }

  // Deduplicate chunks based on pageNumber and fileId combination
  const seen = new Set<string>();
  const uniqueChunks = topChunks.filter(({ chunk }) => {
    const key = `${chunk.pageNumber}-${chunk.fileId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  // Create file reference links [pageNumber](fileId)
  const references = uniqueChunks
    .map(({ chunk }) => `[${chunk.pageNumber}](${chunk.fileId})`)
    .join(" ");

  // Insert references at the end of the text
  return `${text} ${references}`;
}


// Background task to keep realtime connection alive
async function realtimeBackgroundTask(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string,
  docId: string,
  channelName: string,
  userId: string
) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  // Get API keys from environment
  
  const groqApiKey = Deno.env.get("GROQ_API_KEY") ?? "";
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  // Determine which API key to use based on active provider
  const apiKey = ACTIVE_PROVIDER === "openai" ? openAiApiKey : groqApiKey;
  
  if (!apiKey) {
    throw new Error(`${ACTIVE_PROVIDER.toUpperCase()} API key not found in environment variables`);
  }

  // Create AI provider instance
  const aiProvider: AIProvider = createAIProvider(ACTIVE_PROVIDER, {
    apiKey,
    temperature: 0.7,
    maxTokens: 150,
  });

  console.log(`Using AI provider: ${aiProvider.name}`);

  // Fetch user's chunks for context
  console.log("Fetching user chunks for context...");
  const { formattedChunks: userChunksContext, validFileIds } = await fetchAndFormatUserChunks(
    supabase,
    userId
  );

  console.log("User chunks context:", userChunksContext);
  console.log(`Fetched ${userChunksContext.length} characters of chunk context`);
  console.log(`Valid file IDs: ${Array.from(validFileIds).join(", ")}`);

  // Subscribe to the channel and listen for broadcasts
  const channel = supabase.channel(channelName);

  // Store channel reference for cleanup
  activeChannels.set(channelName, channel);

  // Flag to track if an AI API call is in progress
  let isAICallInProgress = false;

  channel
    .on("broadcast", { event: "editor-change" }, async (payload) => {
      console.log("Received editor change:", JSON.stringify(payload, null, 2));

      // Extract document information
      const docContent = payload.payload?.doc?.content || [];
      const markdown = payload.payload?.markdown || "";
      const cursorCurrentLine = payload.payload?.cursorCurrentLine || 1;
      const cursorPositionAtCurrentLine = payload.payload?.cursorPositionAtCurrentLine || 0;
      const noteName = payload.payload?.noteName || "";

      // Check if we should call the AI (if document has enough content)
      if (docContent.length > 0 && markdown.length >= CHARACTER_THRESHOLD) {
        console.log("\n📝 Document info:", {
          cursorCurrentLine,
          cursorPositionAtCurrentLine,
          markdownLength: markdown.length,
          noteName,
        });

        // Check if an AI call is already in progress
        if (isAICallInProgress) {
          console.log("AI API call already in progress, skipping this request");
          return;
        }

        // Set flag to indicate call is in progress
        isAICallInProgress = true;

        aiProvider
          .generateSuggestion(
            markdown,
            cursorCurrentLine,
            cursorPositionAtCurrentLine,
            userChunksContext,
            noteName
          )
          .then(async (aiResponse) => {
            if (aiResponse) {
              console.log("AI suggestion received:", aiResponse.textToInsert);

              // Find top 2 similar chunks for the AI's suggestion using Supabase vector search
              const topChunks = await findTopSimilarChunks(
                aiResponse.textToInsert,
                supabase,
                userId,
                openAiApiKey,
                2
              );

              // Insert file references into the text
              const textWithReferences = insertFileReferences(aiResponse.textToInsert, topChunks);
              console.log("Text with file references:", textWithReferences);

              // Determine the line number and cursor position based on isCurrentLine
              const targetLineNumber = aiResponse.isCurrentLine
                ? cursorCurrentLine
                : aiResponse.linePosition;
              const cursorPos = aiResponse.isCurrentLine ? cursorPositionAtCurrentLine : undefined;

              console.log("Insert parameters:", {
                lineNumber: targetLineNumber,
                cursorPosition: cursorPos,
                isCurrentLine: aiResponse.isCurrentLine,
              });

              channel.send({
                type: "broadcast",
                event: "insert-text",
                payload: {
                  originalText: markdown,
                  lineNumber: targetLineNumber,
                  cursorPosition: cursorPos,
                  text: textWithReferences,
                  isCurrentLine: aiResponse.isCurrentLine,
                  serverTimestamp: new Date().toISOString(),
                },
              });
            }
          })
          .catch((error) => {
            console.error("Error processing AI API response:", error);
          })
          .finally(() => {
            // Reset flag when call completes (success or error)
            isAICallInProgress = false;
          });
      }
    })
    .subscribe((status) => {
      console.log(`Channel ${channelName} subscription status:`, status);
    });

  // Keep the connection alive for 300 seconds
  await new Promise((resolve) => setTimeout(resolve, 300000));

  console.log(`Background task for ${channelName} completed after 300 seconds`);

  // Cleanup
  activeChannels.delete(channelName);
  await channel.unsubscribe();
}

// Use beforeunload event handler to be notified when function is about to shutdown
addEventListener("beforeunload", async (ev) => {
  console.log("Function will be shutdown due to", ev.detail?.reason);

  // Send renew broadcast to all active channels before shutdown
  try {
    console.log(`Sending renew broadcast to ${activeChannels.size} active channels`);

    // Send renew message to each active channel
    for (const [channelName, channel] of activeChannels.entries()) {
      try {
        await channel.send({
          type: "broadcast",
          event: "renew",
          payload: {
            message: "Function shutting down - please renew connection",
            reason: ev.detail?.reason,
            timestamp: new Date().toISOString(),
          },
        });
        console.log(`Sent renew broadcast to ${channelName}`);
      } catch (error) {
        console.error(`Failed to send renew broadcast to ${channelName}:`, error);
      }
    }
  } catch (error) {
    console.error("Error sending renew broadcasts:", error);
  }
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client to validate JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Validate the JWT and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    console.log(`Authenticated user: ${user.id} (${user.email})`);

    const url = new URL(req.url);
    const docId = url.searchParams.get("docId");

    if (!docId) {
      return new Response(JSON.stringify({ error: "docId parameter is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // // Health check endpoint
    // if (req.method === "GET") {
    //   const channelName = `collab:${docId}`;

    //   return new Response(
    //     JSON.stringify({
    //       status: "healthy",
    //       channel: channelName,
    //       docId: docId,
    //       userId: user.id,
    //       timestamp: new Date().toISOString(),
    //     }),
    //     {
    //       headers: {
    //         "Content-Type": "application/json",
    //         "Access-Control-Allow-Origin": "*",
    //       },
    //     }
    //   );
    // }

    const channelName = `collab:${docId}`;

    // Mark the realtime background task as a background task
    // ⚠️ We are NOT using `await` because we don't want it to block!
    EdgeRuntime.waitUntil(
      realtimeBackgroundTask(supabaseUrl, supabaseAnonKey, authHeader, docId, channelName, user.id)
    );

    // Respond immediately while the background task continues
    return new Response(
      JSON.stringify({
        message: "Realtime listener established in background",
        channel: channelName,
        status: "healthy",
        duration: "300s",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in collab-session:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
