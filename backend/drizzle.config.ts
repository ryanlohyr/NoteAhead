import "dotenv/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  out: "./supabase/migrations",
  schema: "./db/schemas/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

