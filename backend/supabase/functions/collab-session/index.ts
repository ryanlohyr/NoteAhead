// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("Collab Session Edge Function initialized");

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
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
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
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`Authenticated user: ${user.id} (${user.email})`);

    const url = new URL(req.url);
    const docId = url.searchParams.get("docId");

    if (!docId) {
      return new Response(
        JSON.stringify({ error: "docId parameter is required" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Health check endpoint
    if (req.method === "GET") {
      const channelName = `collab:${docId}`;
      
      return new Response(
        JSON.stringify({
          status: "healthy",
          channel: channelName,
          docId: docId,
          userId: user.id,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const channelName = `collab:${docId}`;

    // Subscribe to the channel and listen for broadcasts
    const channel = supabase.channel(channelName);
    
    channel
      .on("broadcast", { event: "editor-change" }, (payload) => {
        console.log("Received editor change:", payload);
        
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

    return new Response(
      JSON.stringify({
        message: "Realtime listener established",
        channel: channelName,
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

