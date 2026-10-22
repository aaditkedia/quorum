import type { QlooEntity } from "./qloo";

/** Normalize Qloo affinity evidence when the hackathon API omits `query.affinity`. */
export function extractAffinity(entity: QlooEntity): number | undefined {
  const fromQuery = entity.query?.affinity;
  if (typeof fromQuery === "number" && Number.isFinite(fromQuery)) return clamp01(fromQuery);
  const bag = entity as Record<string, unknown>;
  const query = bag.query;
  if (query && typeof query === "object" && !Array.isArray(query)) {
    const nested = (query as Record<string, unknown>).score;
    if (typeof nested === "number" && Number.isFinite(nested)) return clamp01(nested);
  }
  for (const key of ["affinity", "score", "taste_score", "similarity"]) {
    const value = bag[key];
    if (typeof value === "number" && Number.isFinite(value)) return clamp01(value);
  }
  return undefined;
}

function clamp01(value: number) {
  if (value > 1 && value <= 100) return value / 100;
  return Math.min(1, Math.max(0, value));
}
