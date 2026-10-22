import { NextResponse } from "next/server";
import { authorize, eventById, fail, view } from "@/lib/api";
import { sameOrigin } from "@/lib/security";
import { buildPlan } from "@/lib/planner";
import { mutateEvents } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const { id } = await context.params;
    const event = await eventById(id);
    await authorize(event, true);
    const signature = JSON.stringify(event.attendees);
    const plan = await buildPlan(event);
    const updated = await mutateEvents(events => {
      const saved = events.find(e => e.id === id)!;
      if (JSON.stringify(saved.attendees) !== signature) throw new Error("The group changed while negotiating. Run again to include everyone.");
      saved.plan = plan; return saved;
    });
    return NextResponse.json(view(updated, { role: "organizer" }));
  } catch (error) { return fail(error); }
}
