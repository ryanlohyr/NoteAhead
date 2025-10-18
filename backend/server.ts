import * as dotenv from "dotenv";
import { Server } from "http";

// Load .env file first
dotenv.config();

let server: Server | null = null;

const initializeServer = async () => {
  try {
    console.log("Starting server initialization...");

    // Import the app
    const { app, port } = await import("./app");
    console.log("App imported successfully");

    // Start the server
    server = app.listen(port, () => {
      console.log("Server started on port", port);
    });

    // Set server-level timeouts to forcefully close connections
    server.requestTimeout = 30_000; // 30 seconds - max time for entire request/response cycle
    server.headersTimeout = 30_000; // 30 seconds - time to receive headers (should be >= requestTimeout)
    server.keepAliveTimeout = 5000; // 5 seconds - how long to keep idle connections open

    server.setTimeout(20_000, (socket) => {
      socket.destroy();
    });

    console.log("Server configured successfully");
  } catch (error) {
    console.error("Server initialization failed:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log("Received shutdown signal, closing server gracefully...");
  
  if (server) {
    server.close(() => {
      console.log("Server closed successfully");
      process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});

// Start the server
initializeServer().catch((error) => {
  console.error("Fatal server error:", error);
  console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace available");
  process.exit(1);
});

