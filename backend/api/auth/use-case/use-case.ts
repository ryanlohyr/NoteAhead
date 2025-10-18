import { db as drizzleDb } from "#db/index";
import { accounts } from "#db/schemas/schema";
import { eq } from "drizzle-orm";

export const createUser = async (userId: string) => {
  const user = await drizzleDb
    .insert(accounts)
    .values({
      userId,
    })
    .returning();

  return user[0]; // returning() returns an array, so get the first (and only) item
};

export const getUser = async (userId: string) => {
  const result = await drizzleDb
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
};

export const updateUser = async (userId: string, data: Partial<typeof accounts.$inferSelect>) => {
  const user = await drizzleDb.update(accounts).set(data).where(eq(accounts.userId, userId));
  return user;
};

