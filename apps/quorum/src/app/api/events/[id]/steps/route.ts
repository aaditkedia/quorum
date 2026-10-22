import { NextResponse } from "next/server";
import { authorize, eventById, fail } from "@/lib/api";
import type { TraceStep } from "@/lib/types";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const event = await eventById((await context.params).id); await authorize(event);
    const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
    return NextResponse.json({ status: event.plan ? "completed" : "waiting", steps: event.plan?.steps.filter((s: TraceStep) => s.seq > after) ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error, 403); }
}
