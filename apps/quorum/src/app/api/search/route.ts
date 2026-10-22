import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api";
import { demoFavorites } from "@/lib/demo";
import { loadEvents, sessionSecret } from "@/lib/store";
import { searchQloo } from "@/lib/qloo";
import { signFavoriteSelection } from "@/lib/favorite-proof";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = z.string().trim().min(1).max(80).parse(params.get("q"));
    const mode = params.get("mode") === "live" ? "live" : "demo";
    const type = z.enum(["artist", "movie", "book", "brand", "tv_show", "place"]).parse(params.get("type") || "artist");
    const event = mode === "live" ? (await loadEvents()).find(e => e.inviteToken === params.get("invite") && e.mode === "live") : undefined;
    if (mode === "live" && !event) throw new Error("A valid live event invitation is required.");
    const secret = event ? await sessionSecret() : undefined;
    const results = mode === "demo" ? demoFavorites.filter(f => f.name.toLowerCase().includes(query.toLowerCase())) : (await searchQloo(query, type)).map(favorite => ({ ...favorite, selectionProof: signFavoriteSelection(event!.id, favorite, secret!) }));
    return NextResponse.json({ mode, results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}
