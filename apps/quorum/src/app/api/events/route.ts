import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eventSchema, fail, readJson, setSession, view } from "@/lib/api";
import { neonAuthConfigured, organizerUserId } from "@/lib/neon-auth";
import { mutateEvents, hostedStore } from "@/lib/store";
import { sameOrigin } from "@/lib/security";
import { qlooReady } from "@/lib/qloo";
import type { QuorumEvent } from "@/lib/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = eventSchema.parse(await readJson(request));
    if (input.mode === "live" && !qlooReady()) throw new Error("Live Qloo integration is blocked. Choose synthetic demo or configure the server key.");
    let organizerUserIdValue: string | undefined;
    if (hostedStore() && neonAuthConfigured()) {
      organizerUserIdValue = await organizerUserId();
      if (!organizerUserIdValue) throw new Error("Sign in with Neon Auth before creating a hosted event.");
    }
    const event: QuorumEvent = { ...input, id: randomUUID(), inviteToken: randomBytes(32).toString("base64url"), createdAt: new Date().toISOString(), attendees: [], organizerUserId: organizerUserIdValue };
    await mutateEvents(events => { if (events.length >= 100) throw new Error("Local event limit reached. Clear .data/quorum during development."); events.push(event); });
    const response = NextResponse.json(view(event, { role: "organizer" }));
    await setSession(response, event.id, "organizer", randomUUID());
    return response;
  } catch (error) { return fail(error); }
}
