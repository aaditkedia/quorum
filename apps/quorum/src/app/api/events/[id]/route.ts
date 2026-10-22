import { NextResponse } from "next/server";
import { authorize, eventById, fail, view } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; const event = await eventById(id); return NextResponse.json(view(event, await authorize(event)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return fail(error, 403); }
}
