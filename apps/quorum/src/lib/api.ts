import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { llmNarrationReady } from "./llm-narration";
import { neonAuthConfigured, organizerUserId } from "./neon-auth";
import { qlooReady } from "./qloo";
import { hostedStore, loadEvents, sessionSecret } from "./store";
import { signSession, verifySession } from "./security";
import type { EventView, QuorumEvent } from "./types";
import { readBoundedJson } from "./request-body";

export const favoriteSchema = z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(300), type: z.enum(["artist", "movie", "book", "brand", "tv_show", "place"]), source: z.enum(["synthetic", "qloo"]), selectionProof: z.string().max(4096).optional() });
export const eventSchema = z.object({ name: z.string().trim().min(2).max(80), type: z.enum(["social", "dinner", "trip"]), city: z.string().trim().min(2).max(80), budget: z.number().int().min(0).max(10000), date: z.iso.date(), mode: z.enum(["demo", "live"]).default("demo") });
export const readJson = readBoundedJson;
export const cookieName = (id: string, role: "organizer" | "attendee") => `quorum_${role}_${id.replaceAll("-", "")}`;
export async function setSession(response: NextResponse, eventId: string, role: "organizer" | "attendee", subject: string) {
  response.cookies.set(cookieName(eventId, role), signSession({ eventId, role, subject, expiresAt: Date.now() + 7 * 86400_000 }, await sessionSecret()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
}
export async function authorize(event: QuorumEvent, organizerOnly = false) {
  const jar = await cookies();
  const secret = await sessionSecret();
  const organizer = verifySession(jar.get(cookieName(event.id, "organizer"))?.value, event.id, "organizer", secret);
  if (organizer) {
    if (hostedStore() && neonAuthConfigured()) {
      const userId = await organizerUserId();
      if (!userId || event.organizerUserId !== userId) throw new Error("This organizer session does not match the signed-in Neon account.");
    }
    return { role: "organizer" as const };
  }
  if (!organizerOnly) {
    const session = verifySession(jar.get(cookieName(event.id, "attendee"))?.value, event.id, "attendee", secret);
    if (session && event.attendees.some(a => a.id === session.subject)) return { role: "attendee" as const, selfId: session.subject };
  }
  throw new Error("You do not have access to this event. Use its private invite link.");
}
export async function eventById(id: string) { const event = (await loadEvents()).find(e => e.id === id); if (!event) throw new Error("Event not found."); return event; }
export function view(event: QuorumEvent, access: { role: "organizer" | "attendee"; selfId?: string }): EventView {
  const { inviteToken, ...safe } = event;
  const llm = llmNarrationReady() ? "LLM narration enabled" : "Deterministic negotiation templates";
  const storage = hostedStore() ? "Neon Postgres" : "Local JSON (single Node process)";
  return {
    ...safe,
    ...access,
    ...(access.role === "organizer" ? { joinPath: `/join/${inviteToken}` } : {}),
    integration: {
      configured: qlooReady(),
      status: qlooReady() ? `Live Qloo · ${storage} · ${llm}` : `Synthetic demo or blocked live Qloo · ${storage} · ${llm}`,
    },
  };
}
export function fail(error: unknown, status = 400) {
  const message = error instanceof z.ZodError ? "Please check the submitted fields." : error instanceof Error ? error.message : "Request could not be completed.";
  return NextResponse.json({ error: message }, { status });
}
