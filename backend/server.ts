import * as dotenv from "dotenv";

// Load .env file first
dotenv.config();

const initializeServer = async () => {
  try {
    console.log("Starting server initialization...");

    // Import and start the app
    await import("./app");
    console.log("App imported successfully");
  } catch (error) {
    console.error("Server initialization failed:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    process.exit(1);
  }
};

// Start the server
initializeServer().catch((error) => {
  console.error("Fatal server error:", error);
  console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace available");
  process.exit(1);
});

