import "server-only";
import { z } from "zod";
import { cacheKey, readCache, writeCache } from "./qloo-cache";
import type { Favorite } from "./types";

const entitySchema = z.object({
  entity_id: z.string().uuid().transform(id => id.toLowerCase()),
  name: z.string().min(1).max(300),
  // /v2/insights returns `subtype`; /search returns a `types` array instead.
  subtype: z.string().optional(),
  types: z.array(z.string()).optional(),
  properties: z.object({ description: z.string().optional() }).passthrough().optional(),
  // Entity tags use `tag_id` on live responses; older docs show `id`.
  tags: z.array(z.object({ id: z.string().optional(), tag_id: z.string().optional(), name: z.string() }).passthrough()).optional(),
  query: z.object({ affinity: z.number().optional(), score: z.number().optional() }).passthrough().optional(),
}).passthrough().transform(e => ({ ...e, subtype: e.subtype ?? e.types?.[0] ?? "" }));

export type QlooEntity = z.infer<typeof entitySchema>;

export const qlooReady = () => Boolean(process.env.QLOO_API_KEY && process.env.QUORUM_ENABLE_LIVE === "true");

const memoryCalls: number[] = [];

async function get(endpoint: "/search" | "/v2/insights" | "/v2/tags", params: Record<string, string>) {
  if (!qlooReady()) throw new Error("Live Qloo integration is blocked: set QLOO_API_KEY and explicitly enable QUORUM_ENABLE_LIVE.");
  const base = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
  if (!["https://hackathon.api.qloo.com", "https://api.qloo.com"].includes(base)) throw new Error("Unsupported Qloo API host.");
  const url = new URL(endpoint, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = cacheKey(url.toString());
  const cached = await readCache(key);
  if (cached !== undefined) return cached;
  const calls = memoryCalls.filter(t => t > Date.now() - 60_000);
  memoryCalls.length = 0;
  memoryCalls.push(...calls);
  if (memoryCalls.length >= 60) throw new Error("Qloo request budget reached. Wait a minute and retry.");
  memoryCalls.push(Date.now());
  const response = await fetch(url, { headers: { "X-Api-Key": process.env.QLOO_API_KEY!, accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Qloo returned HTTP ${response.status}. No synthetic fallback was substituted.`);
  const data: unknown = await response.json();
  await writeCache(key, data);
  return data;
}

function entities(data: unknown): QlooEntity[] {
  const envelope = z.object({
    success: z.boolean().optional(),
    results: z.union([
      z.array(entitySchema),
      z.object({ entities: z.array(entitySchema) }).passthrough(),
      z.object({ tags: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()) }).passthrough(),
    ]).optional(),
  }).passthrough().parse(data);
  if (envelope.success === false) throw new Error("Qloo did not report success.");
  const results = envelope.results;
  if (!results) return [];
  if (Array.isArray(results)) return results;
  if ("entities" in results && Array.isArray(results.entities)) return results.entities;
  return [];
}

export async function searchQloo(query: string, type: string): Promise<Favorite[]> {
  return entities(await get("/search", { query, types: `urn:entity:${type}`, take: "8" }))
    .filter(e => e.subtype === `urn:entity:${type}` || (e.types ?? []).includes(`urn:entity:${type}`))
    .map(e => ({ id: e.entity_id.toLowerCase(), name: e.name, type, source: "qloo" }));
}

export async function insights(favorites: Favorite[], type: string, city?: string, resultIds?: string[], tagIds?: string[]) {
  if (favorites.some(f => f.source !== "qloo" || !z.string().uuid().safeParse(f.id).success)) throw new Error("Live events require favorites resolved through Qloo search.");
  const params: Record<string, string> = { "filter.type": `urn:entity:${type}`, "signal.interests.entities": favorites.map(f => f.id).join(","), take: "30" };
  if (city && type === "place") { params["filter.location.query"] = city; params["filter.location.radius"] = "0"; }
  if (resultIds?.length) params["filter.results.entities"] = resultIds.join(",");
  if (tagIds?.length) params["filter.tags"] = tagIds.join(",");
  return entities(await get("/v2/insights", params)).filter(e => e.subtype === `urn:entity:${type}`);
}

export async function searchTags(query: string) {
  const data = await get("/v2/tags", { "filter.query": query, take: "10" });
  const parsed = z.object({
    results: z.union([
      z.object({ tags: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()) }).passthrough(),
      z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
    ]),
  }).passthrough().safeParse(data);
  if (!parsed.success) return [];
  const results = parsed.data.results;
  if (Array.isArray(results)) return results;
  return results.tags ?? [];
}
