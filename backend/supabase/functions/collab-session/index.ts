// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type RealtimeChannel } from "jsr:@supabase/supabase-js@2";

console.log("Collab Session Edge Function initialized");

// Store active channels globally for cleanup
const activeChannels = new Map<string, RealtimeChannel>();

// Type definitions for ProseMirror document structure
interface TextNode {
  type: string;
  text?: string;
}

interface ProseMirrorNode {
  type: string;
  content?: TextNode[];
}

/**
 * Formats a ProseMirror document into a readable line-by-line format
 * @param docContent - The doc.content array from ProseMirror
 * @param cursorPosition - The character position where the cursor is located
 * @returns Formatted string with line numbers and cursor indicator
 */
function formatDocumentLines(docContent: ProseMirrorNode[], cursorPosition: number): string {
  const lines: string[] = [];
  let charCount = 0;
  let cursorLineNumber = -1;
  let cursorOffsetInLine = -1;
  let lastLineNumber = 0;
  let lastLineLength = 0;
  
  // First pass: determine which line the cursor is on
  docContent.forEach((node, index) => {
    let lineText = "";
    
    // Extract text from the node's content array
    if (node.content && Array.isArray(node.content)) {
      lineText = node.content
        .map((textNode: TextNode) => textNode.text || "")
        .join("");
    }
    
    const lineLength = lineText.length;
    const lineStartPos = charCount;
    const lineEndPos = charCount + lineLength;
    
    // Check if cursor is within this line
    if (cursorPosition >= lineStartPos && cursorPosition <= lineEndPos) {
      cursorLineNumber = index + 1;
      cursorOffsetInLine = cursorPosition - lineStartPos;
    }
    
    // Track last line for out-of-bounds handling
    lastLineNumber = index + 1;
    lastLineLength = lineLength;
    
    // Add 1 for the newline character between lines (except we count position within content)
    charCount += lineLength + 1; // +1 for newline
  });
  
  // If cursor is out of bounds, place it at the end of the last line
  if (cursorLineNumber === -1 && docContent.length > 0) {
    cursorLineNumber = lastLineNumber;
    cursorOffsetInLine = lastLineLength;
  }
  
  // Second pass: build the formatted output
  docContent.forEach((node, index) => {
    const lineNumber = index + 1;
    let lineText = "";
    
    // Extract text from the node's content array
    if (node.content && Array.isArray(node.content)) {
      lineText = node.content
        .map((textNode: TextNode) => textNode.text || "")
        .join("");
    }
    
    // Build the line with number and content
    let formattedLine = `${lineNumber}. ${lineText}`;
    
    // Add cursor indicator if this is the cursor line
    if (lineNumber === cursorLineNumber) {
      // Insert cursor indicator at the exact position in the line
      const beforeCursor = lineText.substring(0, cursorOffsetInLine);
      const afterCursor = lineText.substring(cursorOffsetInLine);
      formattedLine = `${lineNumber}. ${beforeCursor}<cursor is here>${afterCursor}`;
    }
    
    lines.push(formattedLine);
  });
  
  return lines.join("\n");
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

  // Subscribe to the channel and listen for broadcasts
  const channel = supabase.channel(channelName);

  // Store channel reference for cleanup
  activeChannels.set(channelName, channel);

  channel
    .on("broadcast", { event: "editor-change" }, (payload) => {
      console.log("Received editor change:", JSON.stringify(payload, null, 2));

      // Extract document information
      const docContent = payload.payload?.doc?.content || [];
      const cursorPosition = payload.payload?.cursorPosition || 0;
      const markdown = payload.payload?.markdown || "";
      
      // Format and log the document structure
      if (docContent.length > 0) {
        const formattedDoc = formatDocumentLines(docContent, cursorPosition);
        console.log("\n📝 Document structure:");
        console.log(formattedDoc);
        console.log(""); // Empty line for better readability
      }

      if (markdown.toLowerCase().includes("pine")) {
        console.log("Detected 'pine' in editor - triggering text insertion");

        // Stub: For now, insert at line 3
        // In the future, this could be determined by AI or other logic
        const targetLineNumber = 3;

        channel.send({
          type: "broadcast",
          event: "insert-text",
          payload: {
            lineNumber: targetLineNumber,
            text: "🌲 tree detected! This is AI-generated content.",
            triggerWord: "pine",
            detectedAtLine: cursorLineNumber,
            serverTimestamp: new Date().toISOString(),
          },
        });
      }

      // Broadcast the change back to all clients (including sender for confirmation)
      channel.send({
        type: "broadcast",
        event: "editor-update",
        payload: {
          ...payload,
          serverTimestamp: new Date().toISOString(),
        },
      });
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
