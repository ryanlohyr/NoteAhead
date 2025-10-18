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

// Import and register routes
import helloRoutes from "./api/hello/entry-points/api";
import chatRoutes from "./api/chat/entry-points/api";
import authRoutes from "./api/auth/entry-points/api";
import collabRoutes from "./api/collab/entry-points/api";
import filesRoutes from "./api/files/entry-points/api";

// Register API routes
helloRoutes(app);
chatRoutes(app);
authRoutes(app);
collabRoutes(app);
filesRoutes(app);

export { app, port };

