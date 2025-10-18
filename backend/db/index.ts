import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// https://orm.drizzle.team/docs/connect-supabase
export const client = postgres(connectionString, {
  connect_timeout: 10_000,
});
export const db = drizzle(client);

