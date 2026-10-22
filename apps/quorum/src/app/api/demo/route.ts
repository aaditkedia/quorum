import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { fail, setSession, view } from "@/lib/api";
import { seededAttendees } from "@/lib/demo";
import { buildPlan } from "@/lib/planner";
import { mutateEvents } from "@/lib/store";
import { sameOrigin } from "@/lib/security";
import type { QuorumEvent } from "@/lib/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const event: QuorumEvent = { id: randomUUID(), name: "The Friday Social", type: "social", city: "Chicago", budget: 60, date: "2026-10-30", mode: "demo", inviteToken: randomBytes(32).toString("base64url"), createdAt: new Date().toISOString(), attendees: seededAttendees() };
    event.plan = await buildPlan(event);
    await mutateEvents(events => { if (events.length >= 100) throw new Error("Local event limit reached."); events.push(event); });
    const response = NextResponse.json(view(event, { role: "organizer" }));
    await setSession(response, event.id, "organizer", randomUUID());
    return response;
  } catch (error) { return fail(error); }
}
