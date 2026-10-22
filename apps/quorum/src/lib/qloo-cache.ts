import "server-only";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { qlooCache } from "@/db/schema";

const memory = new Map<string, { expires: number; data: unknown }>();

export function cacheKey(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

export async function readCache(key: string): Promise<unknown | undefined> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (!process.env.DATABASE_URL) return undefined;
  const db = drizzle(neon(process.env.DATABASE_URL));
  const rows = await db.select().from(qlooCache).where(and(eq(qlooCache.requestHash, key), gt(qlooCache.expiresAt, new Date()))).limit(1);
  const row = rows[0];
  if (!row) return undefined;
  memory.set(key, { expires: row.expiresAt.getTime(), data: row.response });
  return row.response;
}

export async function writeCache(key: string, data: unknown, ttlMs = 15 * 60_000) {
  const expires = Date.now() + ttlMs;
  memory.set(key, { data, expires });
  if (memory.size > 300) memory.delete(memory.keys().next().value!);
  if (!process.env.DATABASE_URL) return;
  const db = drizzle(neon(process.env.DATABASE_URL));
  await db.insert(qlooCache).values({
    requestHash: key,
    response: data as Record<string, unknown>,
    expiresAt: new Date(expires),
  }).onConflictDoUpdate({
    target: qlooCache.requestHash,
    set: { response: data as Record<string, unknown>, expiresAt: new Date(expires) },
  });
}
