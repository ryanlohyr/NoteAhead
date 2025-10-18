import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";

dotenv.config();

const environments = {
  production: "PRODUCTION",
  staging: "STAGING",
  development: "DEVELOPMENT",
};

const getApprovedOrigins = () => {
  if (process.env.APP_ENV === environments.production) {
    return [process.env.FRONTEND_WHITELIST as string];
  }

  if (process.env.APP_ENV === environments.staging) {
    return [process.env.FRONTEND_WHITELIST as string];
  }

  return [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://localhost:3003",
    "http://localhost:3002",
  ];
};

const port = process.env.PORT || 8080;

const app = express();
const API_PREFIX = "/api";

app.use(
  cors({
    origin: getApprovedOrigins(),
  })
);

// JSON parsing middleware
app.use(express.json({ limit: "50mb" }));

app.get("/", (req: Request, res: Response) => {
  res.send(JSON.stringify(getApprovedOrigins()));
});

app.get("/health", (req: Request, res: Response) => {
  res.send("healthy!");
});

app.use(API_PREFIX, (req: Request, res: Response, next: NextFunction) => {
  next();
});

// Global timeout middleware - 20 seconds for all routes
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = 15_000;

  const timeoutId = setTimeout(() => {
    console.error(`Request approaching timeout: ${req.method} ${req.path}`);
  }, timeout);

  // Clear timeout when response is finished
  res.on("finish", () => {
    clearTimeout(timeoutId);
  });

  // Clear timeout when response is closed
  res.on("close", () => {
    clearTimeout(timeoutId);
  });

  next();
});

// Import and register routes
import helloRoutes from "./api/hello/entry-points/api";

// Register API routes
helloRoutes(app);

const server = app.listen(port, () => {
  console.log("Server started on port", port);
});

// Set server-level timeouts to forcefully close connections
server.requestTimeout = 30_000; // 30 seconds - max time for entire request/response cycle
server.headersTimeout = 30_000; // 30 seconds - time to receive headers (should be >= requestTimeout)
server.keepAliveTimeout = 5000; // 5 seconds - how long to keep idle connections open

server.setTimeout(20_000, (socket) => {
  socket.destroy();
});

