// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type RealtimeChannel } from "jsr:@supabase/supabase-js@2";

console.log("Collab Session Edge Function initialized");

// Store active channels globally for cleanup
const activeChannels = new Map<string, RealtimeChannel>();

// Groq API Configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CHARACTER_THRESHOLD = 20;

/**
 * Response structure from Groq API after XML parsing
 */
interface AIResponse {
  isCurrentLine: boolean;
  linePosition: number;
  textToInsert: string;
}

/**
 * Calls Groq API to generate AI suggestions based on the document content
 * @param markdown - The current markdown content from the editor
 * @param cursorCurrentLine - The line number where the cursor is currently located
 * @param cursorPositionAtCurrentLine - The position within the current line where the cursor is
 * @param groqApiKey - The Groq API key from environment variables
 * @returns Parsed AI response with isCurrentLine, linePosition, and textToInsert, or null if parsing fails
 */
async function callGroqAPI(
  markdown: string, 
  cursorCurrentLine: number,
  cursorPositionAtCurrentLine: number,
  groqApiKey: string
): Promise<AIResponse | null> {
  try {
    console.log("Calling Groq API with content:", markdown.substring(0, 50) + "...");
    console.log("Cursor info:", { cursorCurrentLine, cursorPositionAtCurrentLine });
    
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a helpful writing assistant. Analyze the user's text and provide a contextual suggestion or completion.

You MUST respond in the following XML format:
<suggestion>
  <is_current_line>true or false</is_current_line>
  <line_position>NUMBER</line_position>
  <text>Your suggestion text here</text>
</suggestion>

Guidelines:
- is_current_line: Set to "true" if the suggestion should be inserted at the user's current cursor position. Set to "false" if it should be inserted at a different line.
- line_position: If is_current_line is true, this value is ignored (the cursor position will be used). If false, this is the line number where the suggestion should be inserted.
- text: Your suggestion text (1-2 sentences max, contextual and relevant)
- Only provide the XML, no additional text

The user is currently at line ${cursorCurrentLine}, position ${cursorPositionAtCurrentLine} in the line.`
          },
          {
            role: "user",
            content: `Continue or suggest improvements for this text:\n\n${markdown}`
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;
    
    console.log("Groq API raw response:", generatedText);
    
    if (!generatedText) {
      return null;
    }

    // Parse XML response
    const isCurrentLineMatch = generatedText.match(/<is_current_line>(true|false)<\/is_current_line>/i);
    const linePositionMatch = generatedText.match(/<line_position>(\d+)<\/line_position>/);
    const textMatch = generatedText.match(/<text>([\s\S]*?)<\/text>/);

    if (!isCurrentLineMatch || !linePositionMatch || !textMatch) {
      console.error("Failed to parse XML response. Raw response:", generatedText);
      return null;
    }

    const parsedResponse: AIResponse = {
      isCurrentLine: isCurrentLineMatch[1].toLowerCase() === "true",
      linePosition: parseInt(linePositionMatch[1], 10),
      textToInsert: textMatch[1].trim(),
    };

    console.log("Parsed AI response:", parsedResponse);
    return parsedResponse;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return null;
  }
}

// Background task to keep realtime connection alive
async function realtimeBackgroundTask(
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string,
  docId: string,
  channelName: string
) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  // Get Groq API key from environment

  console.log('DENO ENV is', Deno.env.toObject());
  const groqApiKey = Deno.env.get("GROQ_API_KEY") ?? "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";
  
  if (!groqApiKey) {
    console.warn("GROQ_API_KEY not found in environment variables");
  }

  // Subscribe to the channel and listen for broadcasts
  const channel = supabase.channel(channelName);

  // Store channel reference for cleanup
  activeChannels.set(channelName, channel);

  // Flag to track if a Groq API call is in progress
  let isGroqCallInProgress = false;

  channel
    .on("broadcast", { event: "editor-change" }, async (payload) => {
      console.log("Received editor change:", JSON.stringify(payload, null, 2));

      // Extract document information
      const docContent = payload.payload?.doc?.content || [];
      const markdown = payload.payload?.markdown || "";
      const cursorCurrentLine = payload.payload?.cursorCurrentLine || 1;
      const cursorPositionAtCurrentLine = payload.payload?.cursorPositionAtCurrentLine || 0;
      
      // Check if we should call the AI (if document has enough content)
      if (docContent.length > 0 && markdown.length >= CHARACTER_THRESHOLD) {
        console.log("\n📝 Document info:", {
          cursorCurrentLine,
          cursorPositionAtCurrentLine,
          markdownLength: markdown.length,
        });

        // Check if a Groq call is already in progress
        if (isGroqCallInProgress) {
          console.log("Groq API call already in progress, skipping this request");
          return;
        }

        // Set flag to indicate call is in progress
        isGroqCallInProgress = true;

        callGroqAPI(markdown, cursorCurrentLine, cursorPositionAtCurrentLine, groqApiKey).then((aiResponse) => {
          if (aiResponse) {
            console.log("Sending AI suggestion to clients:", aiResponse);
            
            // Determine the line number and cursor position based on isCurrentLine
            const targetLineNumber = aiResponse.isCurrentLine ? cursorCurrentLine : aiResponse.linePosition;
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
                text: aiResponse.textToInsert,
                isCurrentLine: aiResponse.isCurrentLine,
                serverTimestamp: new Date().toISOString(),
              },
            });
          }
        }).catch((error) => {
          console.error("Error processing Groq API response:", error);
        }).finally(() => {
          // Reset flag when call completes (success or error)
          isGroqCallInProgress = false;
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
      realtimeBackgroundTask(supabaseUrl, supabaseAnonKey, authHeader, docId, channelName)
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
