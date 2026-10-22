import { createHmac, timingSafeEqual } from "node:crypto";
import type { Favorite } from "./types";

const lifetime = 15 * 60_000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const types = new Set(["artist", "movie", "book", "brand", "tv_show", "place"]);
export function signFavoriteSelection(eventId: string, favorite: Favorite, secret: string, now = Date.now()) {
  if (favorite.source !== "qloo" || !uuid.test(favorite.id) || !types.has(favorite.type)) throw new Error("Only resolved Qloo favorites can be signed.");
  const canonical: Favorite = { id: favorite.id.toLowerCase(), name: favorite.name, type: favorite.type, source: "qloo" };
  const payload = Buffer.from(JSON.stringify({ purpose: "qloo-favorite", eventId, favorite: canonical, expiresAt: now + lifetime })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyFavoriteSelection(proof: string | undefined, eventId: string, secret: string, now = Date.now()): Favorite | null {
  if (!proof || proof.length > 4096) return null;
  const [payload, signature, extra] = proof.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    const favorite = decoded.favorite;
    if (decoded.purpose !== "qloo-favorite" || decoded.eventId !== eventId || !Number.isFinite(decoded.expiresAt) || decoded.expiresAt <= now || decoded.expiresAt > now + lifetime) return null;
    if (!favorite || favorite.source !== "qloo" || typeof favorite.id !== "string" || !uuid.test(favorite.id) || typeof favorite.name !== "string" || favorite.name.length < 1 || favorite.name.length > 300 || !types.has(favorite.type)) return null;
    return { id: favorite.id.toLowerCase(), name: favorite.name, type: favorite.type, source: "qloo" };
  } catch { return null; }
}
export function resolveLiveFavorites(submitted: ReadonlyArray<Pick<Favorite, "selectionProof">>, eventId: string, secret: string, now = Date.now()): Favorite[] {
  const favorites = submitted.map(item => {
    const canonical = verifyFavoriteSelection(item.selectionProof, eventId, secret, now);
    if (!canonical) throw new Error("Choose this live favorite through Qloo search again; its selection proof is missing, invalid or expired.");
    return canonical;
  });
  if (new Set(favorites.map(f => f.id)).size !== favorites.length) throw new Error("Choose different favorites.");
  return favorites;
}
